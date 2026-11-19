// A3.1: what a child sees when something goes wrong. Messages written for children by the server (guard replies,
// "Your creation changed in another window…") pass through; technical text never reaches the screen.
export const CONNECTION_LOST = "Bugley lost the connection. Your work is safe. Try again.";
export const SOMETHING_WRONG = "Something went wrong on Bugley’s side. Your work is safe. Try again.";

const NETWORK = /failed to fetch|networkerror|network error|load failed|network request failed|fetch failed|err_internet|err_network|timed? ?out|timeout|aborted|abort|offline|econn|socket|connection (?:reset|refused|closed)/i;
const TECHNICAL = /\b(?:typeerror|referenceerror|syntaxerror|rangeerror|undefined|null|nan|json|unexpected token|stack|status code|http|internal server|server error|bad gateway|service unavailable|pgrst|postgres|sql|violates|constraint|column|relation|uuid|zod|invalid_type|invalid input|expected|received|cannot read|is not a function|is not defined|supabase|replicate|worker|exception|object object)\b|\b[45]\d\d\b|[{}[\]<>]|=>|::|\\n/i;

export function childFriendlyError(e: unknown): string {
  const raw = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  const msg = raw.replace(/\s+/g, " ").trim();
  if (!msg) return SOMETHING_WRONG;
  if (NETWORK.test(msg)) return CONNECTION_LOST;
  if (TECHNICAL.test(msg) || msg.length > 220) return SOMETHING_WRONG;
  return msg;
}
