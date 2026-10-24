import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { isKidZoneLocked, isKidZonePath, kidZoneRedirect, subscribeKidZone, setKidZoneLocked } from "@/lib/kid-zone";
import { getDeviceMode, lockKidDevice } from '@/lib/parent-device.functions';
import { useParentSession } from '@/components/site/ParentSession';
import { scrollToTop } from "@/lib/scroll";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { WaitlistProvider } from "@/components/site/WaitlistModal";
import { Bugley } from "@/components/brand/Bugley";
import { Toaster } from "@/components/ui/sonner";
import { ParentSessionProvider } from "@/components/site/ParentSession";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mb-4 flex justify-center"><Bugley stage="scout" expression="oops" size={140} /></div>
        <h1 className="text-7xl text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Oops! Bugley flew off course. This page doesn't exist or has moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 font-display text-sm text-primary-foreground shadow-glow transition-colors hover:bg-primary-hover"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="mb-4 flex justify-center"><Bugley stage="scout" expression="oops" size={120} /></div>
        <h1 className="text-xl text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 font-display text-sm text-primary-foreground shadow-glow transition-colors hover:bg-primary-hover"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Bugley" },
      { name: "description", content: "Figure out AI, together." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Nunito:wght@800&family=Bangers&family=Comic+Neue:wght@700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ParentSessionProvider>
      <WaitlistProvider>
        <KidZoneShell />
        <Toaster />
      </WaitlistProvider>
      </ParentSessionProvider>
    </QueryClientProvider>
  );
}

function KidZoneShell() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const router = useRouter();
  const {user}=useParentSession();
  const [checkedPath,setCheckedPath]=useState('');
  useEffect(()=>{if(!user){setCheckedPath(pathname);return;}let active=true;const check=async()=>{if(isKidZonePath(pathname)){setKidZoneLocked(true);await lockKidDevice();if(active)setCheckedPath(pathname);return;}const mode=await getDeviceMode();if(!active)return;setKidZoneLocked(mode.locked);if(mode.locked){void navigate({to:'/kids',replace:true});}else setCheckedPath(pathname);};void check().catch(()=>{if(active)void navigate({to:'/kids',replace:true});});return()=>{active=false;};},[pathname,user?.id]);
  const locked = useSyncExternalStore(subscribeKidZone, isKidZoneLocked, () => false);
  // Do not redirect using stale browser state while the server check is pending.
  const target = checkedPath === pathname ? kidZoneRedirect(pathname, locked) : null;
  useEffect(() => { if (target) void navigate({ to: "/kids", replace: true }); }, [target, navigate]);
  // Every new page starts at the top once it has finished loading and drawing.
  // Links to a #section still jump there, and Back/Forward keep their old spot.
  useEffect(() => {
    let wentBack = false;
    const onPop = () => { wentBack = true; };
    window.addEventListener("popstate", onPop);
    const toTop = () => {
      if (wentBack) { wentBack = false; return; }
      if (window.location.hash) return;
      scrollToTop();
      // Pages that finish drawing a moment later (signed-in pages) get a second nudge.
      requestAnimationFrame(() => { if (!window.location.hash) scrollToTop(); });
    };
    const offResolved = router.subscribe("onResolved", toTop);
    return () => { offResolved(); window.removeEventListener("popstate", onPop); };
  }, [router]);
  if (target || (user && checkedPath!==pathname)) return null;
  if (isKidZonePath(pathname) || pathname === "/table") return <main className="min-h-screen"><Outlet /></main>;
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
