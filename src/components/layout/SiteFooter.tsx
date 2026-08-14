import Link from "next/link";
import { getBrandLogos, pickBrandLogo } from "@/lib/brand";
import PublicImage from "@/components/ui/PublicImage";

const kickChannel = process.env.NEXT_PUBLIC_KICK_CHANNEL ?? "lethalline";

export default async function SiteFooter() {
  const logos = await getBrandLogos();
  const logo = pickBrandLogo(logos, 0);

  return (
    <footer className="relative mt-10 overflow-hidden border-t border-[var(--ll-line)] px-4 py-8">
      <p className="pointer-events-none absolute inset-x-0 -bottom-4 select-none text-center text-[16vw] font-black leading-none tracking-[0.08em] text-white/[0.022]">
        LETHAL LINE
      </p>
      <div className="relative mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-2">
          {logo ? (
            <PublicImage
              src={logo.src}
              alt=""
              width={22}
              height={22}
              className="h-5 w-5 object-contain transition-transform duration-500 group-hover:rotate-[8deg]"
            />
          ) : null}
          <span className="text-[11px] font-black tracking-[0.2em] text-[#14ffec]">LL</span>
        </Link>
        <a
          href="mailto:LethalLineEsports@yandex.ru"
          className="group flex items-center gap-3 text-[11px] uppercase tracking-[0.16em] text-zinc-400 transition-colors duration-200 hover:text-[#14ffec]"
        >
          <span className="ll-underline relative">Связь / партнёрство</span>
          <span className="ll-icon-btn" aria-hidden>
            ↗
          </span>
        </a>
        <nav className="flex flex-wrap gap-5 text-[11px] lowercase tracking-[0.08em] text-zinc-500">
          <a
            href="https://t.me/LethalLine"
            target="_blank"
            rel="noreferrer"
            className="ll-underline relative transition-colors duration-200 hover:text-[#14ffec]"
          >
            telegram
          </a>
          <a
            href={`https://kick.com/${kickChannel}`}
            target="_blank"
            rel="noreferrer"
            className="ll-underline relative transition-colors duration-200 hover:text-[#14ffec]"
          >
            kick
          </a>
          <Link href="/guide" className="ll-underline relative transition-colors duration-200 hover:text-[#14ffec]">
            первые шаги
          </Link>
          <Link href="/offer" className="ll-underline relative transition-colors duration-200 hover:text-[#14ffec]">
            оферта
          </Link>
        </nav>
      </div>
    </footer>
  );
}
