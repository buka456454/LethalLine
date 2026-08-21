import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const host = "https://lethalline.ru";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/account", "/chats", "/sign-in"],
      },
    ],
    sitemap: `${host}/sitemap.xml`,
    host,
  };
}
