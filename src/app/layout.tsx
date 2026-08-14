import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ScrollBackgroundFx from "@/components/layout/ScrollBackgroundFx";
import SiteChrome from "@/components/layout/SiteChrome";
import MotionProvider from "@/components/motion/MotionProvider";
import ScrollProgress from "@/components/motion/ScrollProgress";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lethal Line Esports",
  description:
    "Онлайн-турниры по CS2, Dota 2 и Valorant: собери команду, играй с соперниками своего уровня и забери призовой фонд в рублях.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[#141414] text-zinc-100">
        <ScrollBackgroundFx />
        <MotionProvider>
          <ScrollProgress />
          <SiteChrome>{children}</SiteChrome>
        </MotionProvider>
      </body>
    </html>
  );
}
