import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation, useRouterState } from '@tanstack/react-router';
import { Bugley } from '@/components/brand/Bugley';

/** Feedback is independent of access: a pending destination never renders private content. */
export function NavigationProgress({ checking = false }: { checking?: boolean }) {
  const pending = useRouterState({ select: state => state.status === 'pending' || state.isLoading });
  if (!pending && !checking) return null;
  return <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-primary/20">
    <span className="sr-only">Opening page…</span>
    <div className="navigation-progress h-full w-1/3 bg-primary" />
  </div>;
}

export function PagePending() {
  return <div role="status" aria-live="polite" className="flex min-h-[65dvh] flex-col items-center justify-center gap-3 px-5">
    <Bugley stage="scout" expression="happy" glow size={96} />
    <p className="text-sm text-muted-foreground">Opening page…</p>
  </div>;
}

/** Animate the surface, not a keyed Outlet: nested layouts and saved work stay mounted. */
export function PageContent({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const surface = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = surface.current?.animate([{ opacity: 0.85 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' });
    return () => animation?.cancel();
  }, [pathname]);
  return <div ref={surface}>{children}</div>;
}