export const PAIR_SECONDS = 600;
export const DEVICE_SECONDS = 180 * 86400;
export const PIN_ATTEMPTS = 5;
export const PIN_WINDOW_SECONDS = 900;
export function pairingAvailable(pair: { expires_at: string; consumed_at: string | null }, now = Date.now()) {
  return !pair.consumed_at && Date.parse(pair.expires_at) > now;
}
export function deviceAvailable(device: { expires_at: string; revoked_at: string | null }, now = Date.now()) {
  return !device.revoked_at && Date.parse(device.expires_at) > now;
}
export function childAuthorized(selected: string | null, requested: unknown) {
  return Boolean(selected) && (requested === undefined || requested === selected);
}