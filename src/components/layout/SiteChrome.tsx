import type { ReactNode } from "react";
import { Suspense } from "react";
import Header from "@/components/layout/Header";
import SiteStatusStrip from "@/components/layout/SiteStatusStrip";
import ContextTabBar from "@/components/layout/ContextTabBar";
import SiteFooter from "@/components/layout/SiteFooter";
import MobileDock from "@/components/layout/MobileDock";
import PhoneVerificationBanner from "@/components/layout/PhoneVerificationBanner";
import QuestionnaireBanner from "@/components/layout/QuestionnaireBanner";
import QuestionnaireNudge from "@/components/home/QuestionnaireNudge";
import FriendRequestToast from "@/components/friends/FriendRequestToast";
import { loadShellData } from "@/lib/shellData";
import { getBrandLogos, pickBrandLogo } from "@/lib/brand";

export default async function SiteChrome({ children }: { children: ReactNode }) {
  const [shell, logos] = await Promise.all([loadShellData(), getBrandLogos()]);
  const headerLogo = pickBrandLogo(logos, 3) ?? pickBrandLogo(logos, 0);

  return (
    <>
      <Header shell={shell} logoSrc={headerLogo?.src} />
      <SiteStatusStrip shell={shell} />
      {shell.needsPhoneVerify ? <PhoneVerificationBanner phone={shell.phone} /> : null}
      {shell.session && !shell.hasQuestionnaire ? <QuestionnaireBanner /> : null}
      <Suspense fallback={null}>
        <ContextTabBar />
      </Suspense>
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 px-4 py-6 pb-24 md:pb-6">{children}</main>
      <SiteFooter />
      <MobileDock shell={shell} />
      <QuestionnaireNudge enabled={Boolean(shell.session && !shell.hasQuestionnaire)} />
      <FriendRequestToast
        enabled={Boolean(shell.session)}
        initialIncoming={shell.incomingFriendRequests}
      />
    </>
  );
}
