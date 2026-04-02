import ResendVerificationButton from "@/components/layout/ResendVerificationButton";
import VerifyPhoneCodeForm from "@/components/layout/VerifyPhoneCodeForm";
import { maskPhoneE164 } from "@/lib/phone";

export default function PhoneVerificationBanner({ phone }: { phone: string | null }) {
  const label = phone ? maskPhoneE164(phone) : "ваш номер";
  return (
    <div className="border-b border-amber-500/35 bg-amber-500/10 px-4 py-2 text-sm text-amber-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <p className="text-amber-100/95">
          Подтвердите телефон <strong className="text-amber-50">{label}</strong> — в SMS придёт <strong>код из 6 цифр</strong>.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <VerifyPhoneCodeForm />
          <ResendVerificationButton />
        </div>
      </div>
    </div>
  );
}
