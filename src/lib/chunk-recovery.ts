const PREFIX = 'bugley-chunk-recovery:';
const RETRY_WINDOW = 60_000;

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /^load failed$|^failed to fetch$|networkerror when attempting to fetch|importing a module script failed|failed to fetch dynamically imported module|error loading dynamically imported module|loading chunk .+ failed/i.test(message);
}

// Keep authentication and player storage untouched; never reload indefinitely.
export function recoverChunkLoad(error: unknown, pathname: string, storage: Pick<Storage, 'getItem' | 'setItem'>, reload: () => void, now = Date.now()): boolean {
  if (!isChunkLoadError(error)) return false;
  try {
    const key = PREFIX + pathname;
    const previous = storage.getItem(key);
    if (previous !== null && now - Number(previous) < RETRY_WINDOW) return false;
    storage.setItem(key, String(now));
  } catch {
    // If we cannot record the retry, leave the manual refresh control available.
    return false;
  }
  reload();
  return true;
}