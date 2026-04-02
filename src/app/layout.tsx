import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import ScrollBackgroundFx from "@/components/layout/ScrollBackgroundFx";
import { getBrandLogos, pickBlueBrandLogo } from "@/lib/brand";

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
  description: "Платформа регистрации и проведения киберспортивных турниров.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const logos = await getBrandLogos();
  const bgLogo = pickBlueBrandLogo(logos);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#212121] text-zinc-100">
        <ScrollBackgroundFx logoSrc={bgLogo?.src ?? null} />
        <Header />
        <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
