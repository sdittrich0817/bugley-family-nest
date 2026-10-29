// Device-level Kid Zone lock. While locked, the app only renders /kids routes.
const KEY = "bugley-kid-zone-lock";
const listeners = new Set<() => void>();
export function isKidZonePath(pathname: string) {
  return pathname === "/kids" || pathname.startsWith("/kids/");
}
/** Recovery screens contain no parent data and must remain reachable when entry fails. */
export function isKidZoneRecoveryPath(pathname: string) {
  return pathname === "/kids-entry" || pathname === "/login" || pathname === "/pair";
}
/** A lock blocks parent content, never the sign-in/device recovery screens. */
export function kidZoneRedirect(pathname: string, locked: boolean) {
  return locked && !isKidZonePath(pathname) && !isKidZoneRecoveryPath(pathname) ? "/kids" : null;
}
export function isKidZoneLocked() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}
export function setKidZoneLocked(locked: boolean) {
  if (locked) window.localStorage.setItem(KEY, "1");
  else window.localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}
export function subscribeKidZone(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) listener(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(listener); window.removeEventListener("storage", onStorage); };
}
export const BAND_COPY = {
  sprouts: { task: "Let’s play!", mission: "Today’s fun", studio: "Make with Bugley", badges: "My stars", shelf: "My shelf", greeting: (n: string) => `Hi ${n}! I’m Bugley. Let’s play!` },
  explorers: { task: "Today’s mission", mission: "Today’s mission", studio: "Bugley’s Studio", badges: "My badges", shelf: "My shelf", greeting: (n: string) => `Ready for adventure, ${n}? Your next mission is waiting!` },
  builders: { task: "Today’s project", mission: "Today’s project", studio: "Bugley’s Studio", badges: "Badges", shelf: "My shelf", greeting: (n: string) => `Hey ${n}. Got a new project lined up for you.` },
} as const;
export type Band = keyof typeof BAND_COPY;
// The child currently playing on this device (per browser tab session). Server functions still check family ownership.
const PLAYER_KEY = "bugley-kid-player";
// A signed-in child stays chosen on this device for a few hours so new tabs/reloads don't ask "Who's playing?" again.
const PLAYER_TTL = 4 * 60 * 60 * 1000;
export function getActivePlayer() {
  if (typeof window === "undefined") return null;
  const tab = window.sessionStorage.getItem(PLAYER_KEY);
  if (tab) return tab;
  try {
    const saved = JSON.parse(window.localStorage.getItem(PLAYER_KEY) ?? "null") as { id: string; at: number } | null;
    if (saved && Date.now() - saved.at < PLAYER_TTL) { window.sessionStorage.setItem(PLAYER_KEY, saved.id); return saved.id; }
  } catch { /* ignore */ }
  window.localStorage.removeItem(PLAYER_KEY);
  return null;
}
export function setActivePlayer(id: string | null) {
  if (id) { window.sessionStorage.setItem(PLAYER_KEY, id); window.localStorage.setItem(PLAYER_KEY, JSON.stringify({ id, at: Date.now() })); }
  else { window.sessionStorage.removeItem(PLAYER_KEY); window.localStorage.removeItem(PLAYER_KEY); }
}
