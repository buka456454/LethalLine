import type { MetadataRoute } from "next";

const host = "https://lethalline.ru";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const paths = ["", "/tournaments", "/teammates", "/guide", "/offer"];

  return paths.map((path) => ({
    url: `${host}${path || "/"}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
