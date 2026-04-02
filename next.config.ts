import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "lethalline.ru",
    "www.lethalline.ru",
    "*.lethalline.ru",
  ],
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    contentDispositionType: "attachment",
    /** Внешние URL для next/image, если где-то останется оптимизатор; загрузки в основном через PublicImage. */
    remotePatterns: [
      { protocol: "https", hostname: "**", pathname: "/**" },
      { protocol: "http", hostname: "**", pathname: "/**" },
    ],
  },
};

export default nextConfig;
