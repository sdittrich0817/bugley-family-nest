import { z } from "zod";

// Payment providers send parents back to these sites only.
const HOSTS = new Set([
  "bugley.app",
  "www.bugley.app",
  "bugley-family-nest.lovable.app",
  "id-preview--d6fd2d56-9652-4ebb-b2d7-e442a0448401.lovable.app",
  "localhost",
]);

export function isAllowedReturnUrl(value: string): boolean {
  try {
    const u = new URL(value);
    if (!HOSTS.has(u.hostname)) return false;
    return u.protocol === "https:" || u.hostname === "localhost";
  } catch {
    return false;
  }
}

export const returnUrlSchema = z.string().url().refine(isAllowedReturnUrl, "Return page must be on Bugley.");
