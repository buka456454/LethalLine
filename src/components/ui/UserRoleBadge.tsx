import { Role } from "@prisma/client";

type BadgeSize = "xs" | "sm";

const ROLE_CONFIG: Partial<Record<Role, { label: string; className: string }>> = {
  SUPERADMIN: {
    label: "Суперадмин",
    className: "role-badge-superadmin border-fuchsia-400/60 bg-fuchsia-400/15 text-fuchsia-200",
  },
  ADMIN: {
    label: "Админ",
    className: "border-cyan-400/40 bg-cyan-400/15 text-cyan-200",
  },
  JOURNALIST: {
    label: "Журналист",
    className: "border-amber-400/40 bg-amber-400/15 text-amber-200",
  },
  COMMENTATOR: {
    label: "Комментатор",
    className: "border-violet-400/40 bg-violet-400/15 text-violet-200",
  },
};

export default function UserRoleBadge({ role, size = "xs" }: { role: Role; size?: BadgeSize }) {
  const config = ROLE_CONFIG[role];
  if (!config) return null;

  const sizeClass = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-1.5 py-0.5 text-[9px]";

  return (
    <span
      className={`inline-flex items-center rounded border font-bold uppercase tracking-[0.12em] ${sizeClass} ${config.className}`}
      title={config.label}
    >
      {config.label}
    </span>
  );
}
