export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
export function allowedImageContentType(declared: string | null | undefined) {
  return !!declared && ['image/png', 'image/jpeg', 'image/webp', 'application/octet-stream', 'binary/octet-stream'].includes(declared);
}
export function imageFileType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | 'image/webp' | null {
  if (bytes.length < 12) return null;
  if ([137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n)) return 'image/png';
  if (bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'image/jpeg';
  if (String.fromCharCode(...bytes.slice(0,4))==='RIFF' && String.fromCharCode(...bytes.slice(8,12))==='WEBP') return 'image/webp';
  return null;
}