import { Buffer } from "node:buffer";
import { imageSize } from "image-size";
import { imageFileType, MAX_IMAGE_BYTES } from "./image-file";

/** Full original pixels, not a resized/cheaper safety input. Astra's documented 32px patches × 1.2. */
export function astraImageTokens(width: number, height: number) {
  if (![width, height].every(n => Number.isSafeInteger(n) && n > 0 && n <= 65535)) throw new Error("Unreviewed image dimensions.");
  const patches = Math.ceil(width / 32) * Math.ceil(height / 32);
  if (patches > 30000) throw new Error("Image exceeds Astra's accepted patch limit.");
  return Math.ceil(patches * 1.2);
}

async function readImage(url: string): Promise<Uint8Array> {
  if (url.startsWith("data:")) {
    const match = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(url);
    const encoded = match?.[1];
    if (!encoded || encoded.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new Error("Invalid AI image.");
    return new Uint8Array(Buffer.from(encoded, "base64"));
  }
  if (new URL(url).protocol !== "https:") throw new Error("Invalid AI image URL.");
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok || !response.body || Number(response.headers.get("content-length") ?? 0) > MAX_IMAGE_BYTES) throw new Error("AI image unavailable.");
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      length += part.value.length; if (length > MAX_IMAGE_BYTES) throw new Error("AI image too large.");
      chunks.push(part.value);
    }
  } finally { await reader.cancel(); }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

/** Embed the bytes actually measured, avoiding mutable-URL cost races. No files or child content are logged/saved. */
export async function prepareAiImages(urls: string[]) {
  return Promise.all(urls.map(async url => {
    const bytes = await readImage(url); const type = imageFileType(bytes);
    if (!type || bytes.length > MAX_IMAGE_BYTES) throw new Error("Invalid AI image.");
    const { width, height } = imageSize(bytes);
    return { url: `data:${type};base64,${Buffer.from(bytes).toString("base64")}`, tokens: astraImageTokens(width, height) };
  }));
}