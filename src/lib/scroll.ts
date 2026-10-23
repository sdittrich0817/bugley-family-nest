import { useEffect } from "react";

/** Jump the window to the very top (no smooth animation, so nothing can interrupt it). */
export function scrollToTop() {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
}

/** Scroll to the top whenever `key` changes after the first render (e.g. a wizard step or screen). */
export function useScrollTopOn(key: unknown) {
  useEffect(() => {
    scrollToTop();
  }, [key]);
}
