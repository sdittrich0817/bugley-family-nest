export class ImageServiceError extends Error {
  constructor(message: string, public retryable = false, public retryAfterMs = 3000) { super(message); }
}

export function imageServiceFailure(status: number, detail = "", retryAfter?: string | null) {
  const wait = Number(retryAfter);
  const delay = retryAfter && Number.isFinite(wait) ? Math.max(3000, wait * 1000) : 3000;
  if (status === 402) return new ImageServiceError("Bugley’s paint box is empty right now. A grown-up needs to check the Studio account.");
  if (status === 401 || status === 403) return new ImageServiceError("Bugley’s drawing service needs a grown-up to check its access. Your original picture is safe.");
  if (status === 404) return new ImageServiceError("Bugley’s saved paintbrush is unavailable right now. Your original picture is safe.");
  if (status === 429) return new ImageServiceError("Bugley’s drawing service is busy. Please wait a little before drawing again. Your original picture is safe.", true, delay);
  if (status >= 500 || (status === 0 && /temporarily unavailable|\bE004\b/i.test(detail))) return new ImageServiceError("Bugley’s drawing service is temporarily unavailable. Please try later. Your original picture is safe.", true, delay);
  if (/safety|content.*(?:filter|refus)|moderation|flagged/i.test(detail)) return new ImageServiceError("The drawing service declined this picture during its safety check. Your original picture is safe.");
  if (status === 400 || status === 422) return new ImageServiceError("Bugley’s drawing settings need a fix. Your original picture is safe; a grown-up at Bugley can check them.");
  return new ImageServiceError("Bugley’s drawing service couldn’t finish this picture. Your original picture is safe.");
}