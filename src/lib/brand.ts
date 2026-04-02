import { readdir } from "node:fs/promises";
import path from "node:path";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

export type BrandLogo = {
  src: string;
  name: string;
};

export async function getBrandLogos() {
  const logosDir = path.join(process.cwd(), "public", "logos");

  try {
    const entries = await readdir(logosDir, { withFileTypes: true });
    const logos = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "ru"));

    return logos.map((name) => ({ src: `/logos/${name}`, name })) as BrandLogo[];
  } catch {
    return [];
  }
}

export function pickBrandLogo(logos: BrandLogo[], slot: number) {
  if (logos.length === 0) return null;
  const index = ((slot % logos.length) + logos.length) % logos.length;
  return logos[index];
}

export function pickBlueBrandLogo(logos: BrandLogo[]) {
  if (logos.length === 0) return null;
  const blueKeywords = ["blue", "cyan", "aqua", "teal", "azure", "голуб", "син"];
  const found = logos.find((logo) => {
    const normalized = logo.name.toLowerCase();
    return blueKeywords.some((keyword) => normalized.includes(keyword));
  });
  return found ?? logos[0];
}
