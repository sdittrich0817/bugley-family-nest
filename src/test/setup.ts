import "@testing-library/jest-dom/vitest";

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => {},
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Older pipeline tests run with an allow-all stand-in spending gate (real gate rules are covered in spend.test.ts).
import { beforeEach as __spendBeforeEach } from "vitest";
import { setSpendRpcs as __setSpendRpcs } from "@/lib/spend.server";
__spendBeforeEach(() => { let n = 0; __setSpendRpcs({ reserve: async () => ({ ok: true, id: `test-${n++}` }), settle: async () => {} }); });
