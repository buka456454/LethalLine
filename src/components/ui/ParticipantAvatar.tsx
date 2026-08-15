import PublicImage from "@/components/ui/PublicImage";

/** Аватар участника: картинка или первая буква ника. */
export default function ParticipantAvatar({
  label,
  logoUrl,
  size = 20,
  className = "",
}: {
  label: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const initial = (label.trim().slice(0, 1) || "?").toUpperCase();
  const sizeClass = size <= 20 ? "h-5 w-5 text-[10px]" : size <= 28 ? "h-7 w-7 text-xs" : "h-10 w-10 text-sm";

  if (logoUrl) {
    return (
      <PublicImage
        src={logoUrl}
        alt={label}
        width={size}
        height={size}
        className={`rounded object-cover ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded border border-[var(--ll-line)] bg-[#212121] font-black text-[#14ffec] ${sizeClass} ${className}`}
      aria-hidden
    >
      {initial}
    </span>
  );
}
