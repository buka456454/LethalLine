import type { ShellData } from "@/lib/shellData";
import { formatRubFromMinor } from "@/lib/money";
import StatusStrip from "@/components/ui/StatusStrip";

export default function SiteStatusStrip({ shell }: { shell: ShellData }) {
  const { cup, session, rankVerified } = shell;
  const items: Array<{ label: string; value: string; href?: string; live?: boolean }> = [];

  if (cup) {
    items.push({ label: "турнир недели", value: cup.title, href: `/tournaments/${cup.id}`, live: true });
    items.push({ label: "свободных мест", value: `${cup.slotsLeft} из ${cup.maxTeams}` });
    if (cup.entryFeeMinor > 0) {
      items.push({ label: "взнос", value: formatRubFromMinor(cup.entryFeeMinor) });
    }
  } else {
    items.push({ label: "турнир недели", value: "скоро объявим" });
  }

  if (session) {
    items.push({ label: "ваш ранг", value: rankVerified ? "подтверждён" : "не подтверждён" });
  } else {
    items.push({ label: "вы вошли как", value: "гость" });
  }

  return <StatusStrip items={items} />;
}
