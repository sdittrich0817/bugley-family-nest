// Device-level Kid Zone lock. While locked, the app only renders /kids routes.
const KEY = "bugley-kid-zone-lock";
const listeners = new Set<() => void>();
export function isKidZonePath(pathname: string) {
  return pathname === "/kids" || pathname.startsWith("/kids/");
}
/** Where a locked device may go: any non-Kid-Zone path is sent back to /kids. */
export function kidZoneRedirect(pathname: string, locked: boolean) {
  return locked && !isKidZonePath(pathname) ? "/kids" : null;
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
