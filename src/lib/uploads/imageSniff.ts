export type SniffedImage = {
  mime: "image/png" | "image/jpeg" | "image/webp";
  extension: ".png" | ".jpg" | ".webp";
};

/**
 * Определяет тип по сигнатуре файла (не доверяем расширению и client MIME).
 */
export function sniffImageBuffer(buf: Buffer): SniffedImage | null {
  if (buf.length < 12) return null;

  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { mime: "image/png", extension: ".png" };
  }

  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mime: "image/jpeg", extension: ".jpg" };
  }

  const riff =
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50;
  if (riff) {
    return { mime: "image/webp", extension: ".webp" };
  }

  return null;
}
