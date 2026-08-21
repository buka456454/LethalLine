import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ScrollBackgroundFx from "@/components/layout/ScrollBackgroundFx";
import SiteChrome from "@/components/layout/SiteChrome";
import MotionProvider from "@/components/motion/MotionProvider";
import ScrollProgress from "@/components/motion/ScrollProgress";

const siteUrl = "https://lethalline.ru";
const siteName = "Lethal Line";
const siteDescription =
  "Lethal Line — киберспортивная платформа онлайн-турниров по CS2, Dota 2 и Valorant. Собери команду, играй с соперниками своего уровня и забери призовой фонд в рублях.";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Lethal Line — киберспортивные турниры CS2, Dota 2, Valorant",
    template: "%s | Lethal Line",
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    "Lethal Line",
    "LethalLine",
    "lethalline",
    "киберспорт",
    "esports",
    "турниры CS2",
    "турниры Dota 2",
    "турниры Valorant",
    "киберспортивные турниры",
    "онлайн турниры",
  ],
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: siteUrl,
    siteName,
    title: "Lethal Line — киберспортивные турниры",
    description: siteDescription,
    images: [
      {
        url: "/brand/og-logo.png",
        width: 1200,
        height: 1200,
        alt: "Lethal Line",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Lethal Line — киберспортивные турниры",
    description: siteDescription,
    images: ["/brand/og-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: siteName,
      alternateName: ["LethalLine", "Lethal Line Esports"],
      url: siteUrl,
      logo: `${siteUrl}/brand/icon-512.png`,
      sameAs: ["https://t.me/LethalLine", "https://kick.com/lethalline"],
      email: "LethalLineEsports@yandex.ru",
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: siteName,
      alternateName: ["LethalLine", "lethalline.ru"],
      description: siteDescription,
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: "ru-RU",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[#141414] text-zinc-100">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ScrollBackgroundFx />
        <MotionProvider>
          <ScrollProgress />
          <SiteChrome>{children}</SiteChrome>
        </MotionProvider>
      </body>
    </html>
  );
}
