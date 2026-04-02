"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import PublicImage from "@/components/ui/PublicImage";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const schema = z.object({
  email: z.email(),
  username: z.string().min(3).max(24).optional(),
  password: z.string().min(8).max(128),
});

type FormData = z.infer<typeof schema>;
type LoginNotification = {
  id: string;
  message: string;
  tournament: { id: string; title: string };
  teamApplication: { id: string; teamName: string } | null;
};

function verifyErrorMessage(verifyStatus?: string) {
  if (verifyStatus === "invalid") return "Неверный код или ссылка.";
  if (verifyStatus === "expired") return "Срок действия ссылки истёк.";
  if (verifyStatus === "obsolete") return "Ссылка больше не актуальна.";
  return "";
}

export default function AuthPanel({
  logoSrc,
  initialMode = "login",
  verifyStatus,
}: {
  logoSrc?: string | null;
  initialMode?: "login" | "register";
  /** query verify с /sign-in (устаревшая ссылка, неверный код и т.д.) */
  verifyStatus?: string;
}) {
  const router = useRouter();
  const mode = initialMode;
  const googleActionLabel = mode === "register" ? "Зарегистрироваться через Google" : "Войти через Google";
  const [error, setError] = useState(() => verifyErrorMessage(verifyStatus));
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailHint, setEmailHint] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    shouldUnregister: true,
    defaultValues: { email: "", username: undefined, password: "" },
  });

  const checkEmail = async () => {
    if (mode !== "register") return;

    const email = getValues("email")?.trim().toLowerCase();
    if (!email) {
      setEmailHint("");
      return;
    }

    const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
    const body = (await response.json()) as { error?: string; available?: boolean };
    if (!response.ok) {
      setEmailHint(body.error ?? "Проверьте email");
      return;
    }

    setEmailHint(body.available ? "Email доступен для регистрации" : "Email уже используется");
  };

  const onSubmit = async (data: FormData) => {
    setError("");
    setMessage("");
    setEmailHint("");
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload =
      mode === "login"
        ? { email: data.email.trim().toLowerCase(), password: data.password }
        : {
            email: data.email.trim().toLowerCase(),
            password: data.password,
            username: data.username?.trim(),
          };

    if (mode === "register") {
      const normalizedUsername = data.username?.trim();
      if (!normalizedUsername || normalizedUsername.length < 3 || normalizedUsername.length > 24) {
        setError("Укажите ник от 3 до 24 символов");
        return;
      }

      const emailCheck = await fetch(`/api/auth/check-email?email=${encodeURIComponent(payload.email)}`);
      const emailBody = (await emailCheck.json()) as { available?: boolean };
      if (!emailCheck.ok || !emailBody.available) {
        setError("Этот email уже занят или невалиден");
        return;
      }

      payload.username = normalizedUsername;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = (await response.json()) as { error?: string };
      setError(body.error ?? "Ошибка авторизации");
      return;
    }

    const body = (await response.json()) as { notifications?: LoginNotification[] };
    if (mode === "login" && body.notifications && body.notifications.length > 0) {
      sessionStorage.setItem("ll_login_notifications", JSON.stringify(body.notifications));
    }

    router.push("/tournaments");
    router.refresh();
  };

  const resetAccountPassword = async () => {
    setError("");
    const email = getValues("email")?.trim().toLowerCase();
    if (!email) {
      setError("Введите email для сброса пароля");
      return;
    }
    if (resetPassword.length < 8) {
      setError("Новый пароль должен быть минимум 8 символов");
      return;
    }

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, newPassword: resetPassword }),
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(body.error ?? "Не удалось сбросить пароль");
      return;
    }
    setShowReset(false);
    setResetPassword("");
    setMessage("Пароль обновлен. Теперь войдите с новым паролем.");
  };

  return (
    <motion.section
      initial={false}
      className="mx-auto w-full max-w-md rounded-2xl border border-[#323232] bg-[#212121] p-6 shadow-[0_0_0_1px_#323232,0_20px_60px_rgba(0,0,0,0.45)]"
    >
      {logoSrc && (
        <div className="mb-4 flex justify-center">
          <PublicImage src={logoSrc} alt="Auth logo" width={56} height={56} className="h-14 w-14 object-contain opacity-90" />
        </div>
      )}
      <h1 className="text-2xl font-black uppercase tracking-[0.2em] text-[#14ffec]">Auth Core</h1>
      <p className="mt-2 text-sm text-zinc-300">Регистрация, вход и безопасный доступ к турнирам.</p>

      <div className="mt-5 grid grid-cols-2 overflow-hidden rounded-lg border border-[#323232]">
        <a
          href="/sign-in"
          className={`block px-3 py-2 text-center text-sm font-semibold ${mode === "login" ? "bg-[#0d7377] text-black" : "bg-[#323232] text-zinc-300"}`}
          aria-current={mode === "login" ? "page" : undefined}
        >
          Вход
        </a>
        <a
          href="/sign-in?mode=register"
          className={`block px-3 py-2 text-center text-sm font-semibold ${mode === "register" ? "bg-[#0d7377] text-black" : "bg-[#323232] text-zinc-300"}`}
          aria-current={mode === "register" ? "page" : undefined}
        >
          Регистрация
        </a>
      </div>

      <form className="mt-6 space-y-3" onSubmit={handleSubmit(onSubmit)}>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Email</span>
          <input
            {...register("email")}
            className="input-base"
            placeholder="you@team.gg"
            autoComplete="off"
            onBlur={checkEmail}
          />
          {errors.email && <span className="text-xs text-[#14ffec]">Неверный email</span>}
          {!errors.email && emailHint && (
            <span className={`text-xs ${emailHint.includes("доступен") ? "text-zinc-300" : "text-[#14ffec]"}`}>
              {emailHint}
            </span>
          )}
        </label>

        {mode === "register" && (
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Ник</span>
            <input {...register("username")} className="input-base" placeholder="n1nja" autoComplete="off" />
            {errors.username && <span className="text-xs text-[#14ffec]">3-24 символа</span>}
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-zinc-400">Пароль</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              {...register("password")}
              className="input-base pr-20"
              placeholder="********"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[#323232] bg-[#323232] px-2 py-1 text-xs text-zinc-300 hover:text-[#14ffec]"
            >
              {showPassword ? "Скрыть" : "Показать"}
            </button>
          </div>
          {errors.password && <span className="text-xs text-[#14ffec]">Минимум 8 символов</span>}
        </label>

        {error && <p className="rounded bg-[#323232] p-2 text-sm text-[#14ffec]">{error}</p>}
        {message && <p className="rounded bg-[#323232] p-2 text-sm text-zinc-300">{message}</p>}

        <button type="submit" disabled={isSubmitting} className="button-primary w-full">
          {isSubmitting ? "Обработка..." : mode === "login" ? "Войти" : "Создать аккаунт"}
        </button>

        <button
          type="button"
          onClick={() => void signIn("google", { callbackUrl: "/api/auth/oauth-bridge" })}
          className="flex w-full items-center justify-center rounded-md border-0 bg-[linear-gradient(90deg,#4285F4_0%,#34A853_35%,#FBBC05_68%,#EA4335_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(66,133,244,0.35)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14ffec] focus-visible:ring-offset-2 focus-visible:ring-offset-[#212121]"
        >
          {googleActionLabel}
        </button>

        {mode === "login" && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowReset((prev) => !prev)}
              className="text-xs uppercase tracking-[0.14em] text-zinc-400 hover:text-[#14ffec]"
            >
              {showReset ? "Скрыть сброс пароля" : "Не получается войти?"}
            </button>

            {showReset && (
              <div className="mt-3 rounded border border-[#323232] bg-[#323232] p-3">
                <p className="text-xs text-zinc-300">Укажи новый пароль и сбрось его для email из поля выше.</p>
                <input
                  type="password"
                  className="input-base mt-2"
                  placeholder="Новый пароль"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                />
                <button type="button" className="button-primary mt-3 w-full" onClick={resetAccountPassword}>
                  Сбросить пароль
                </button>
              </div>
            )}
          </div>
        )}
      </form>
    </motion.section>
  );
}
