import ResendVerificationButton from "@/components/layout/ResendVerificationButton";
import VerifyPhoneCodeForm from "@/components/layout/VerifyPhoneCodeForm";
import { maskPhoneE164 } from "@/lib/phone";

export default function PhoneVerificationBanner({ phone }: { phone: string | null }) {
  const label = phone ? maskPhoneE164(phone) : "ваш номер";
  return (
    <div className="border-b border-[var(--ll-line)] bg-[#0d7377]/12 px-4 py-2 text-sm text-zinc-200">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p>
          Подтвердите телефон <strong className="text-[#14ffec]">{label}</strong> — в SMS придёт код из 6 цифр.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <VerifyPhoneCodeForm />
          <ResendVerificationButton />
        </div>
      </div>
    </div>
  );
}
