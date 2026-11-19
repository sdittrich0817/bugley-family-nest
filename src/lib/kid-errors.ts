// A3.1: what a child sees when something goes wrong. Messages written for children by the server (guard replies,
// "Your creation changed in another window…") pass through; technical text never reaches the screen.
export const CONNECTION_LOST = "Bugley lost the connection. Your work is safe. Try again.";
export const SOMETHING_WRONG = "Something went wrong on Bugley’s side. Your work is safe. Try again.";

const NETWORK = /failed to fetch|networkerror|network error|load failed|network request failed|fetch failed|err_internet|err_network|timed? ?out|timeout|aborted|abort|offline|econn|socket|connection (?:reset|refused|closed)/i;
const TECHNICAL = /\b(?:typeerror|referenceerror|syntaxerror|rangeerror|undefined|null|nan|json|unexpected token|stack|status code|http|internal server|server error|bad gateway|service unavailable|pgrst|postgres|sql|violates|constraint|column|relation|uuid|zod|invalid_type|invalid input|expected|received|cannot read|is not a function|is not defined|supabase|replicate|worker|exception|object object)\b|\b[45]\d\d\b|[{}[\]<>]|=>|::|\\n/i;

// A3.1: the server's sign-in limit (5 tries per 15 minutes) stays exactly as it is; this only words it for a child.
export const SIGN_IN_RESTING = "Too many tries for now, so sign-in is taking a rest. Please wait about 15 minutes, or ask your grown-up for help.";
export const SIGN_IN_TROUBLE = "Bugley couldn’t check that just now. Please try again.";
export function kidSignInError(e: unknown): string {
  const raw = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  if (/too many tries/i.test(raw)) return SIGN_IN_RESTING;
  return NETWORK.test(raw) ? CONNECTION_LOST : SIGN_IN_TROUBLE;
}

export function childFriendlyError(e: unknown): string {
  const raw = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  const msg = raw.replace(/\s+/g, " ").trim();
  if (!msg) return SOMETHING_WRONG;
  if (NETWORK.test(msg)) return CONNECTION_LOST;
  if (TECHNICAL.test(msg) || msg.length > 220) return SOMETHING_WRONG;
  return msg;
}
