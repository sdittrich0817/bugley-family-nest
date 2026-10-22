import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Wordmark } from "@/components/brand/Wordmark";
import { mainNav } from "@/lib/nav";
import { useWaitlist } from "./WaitlistModal";
import { useParentSession } from "./ParentSession";

export function SiteHeader() {
  const { open } = useWaitlist();
  const { user, signOut } = useParentSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const linkCls =
    "rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary";

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-20">
        <Wordmark />

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {mainNav.map((l) => (
            <Link key={l.to} to={l.to} className={linkCls} activeProps={{ className: "text-foreground bg-secondary" }}>
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? <><Button asChild size="sm"><Link to="/hub">Parent Hub</Link></Button><Button variant="secondary" size="sm" onClick={() => void signOut()}>Log out</Button></> : <><Button variant="secondary" size="sm" onClick={() => open("log_in")}>Log in</Button><Button size="sm" onClick={() => open("start_free")}>Start free</Button></>}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {user ? <Button asChild size="sm"><Link to="/hub">Parent Hub</Link></Button> : <Button size="sm" onClick={() => open("start_free")}>Start free</Button>}
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[85vw] max-w-sm flex-col gap-6 bg-background p-6">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <Wordmark />
              <nav aria-label="Mobile" className="flex flex-col gap-1">
                {mainNav.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-3 py-3 font-display text-lg text-foreground hover:bg-secondary"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-auto flex flex-col gap-3">
                {user ? <Button variant="secondary" onClick={() => { setMenuOpen(false); void signOut(); }}>Log out</Button> : <><Button variant="secondary" onClick={() => { setMenuOpen(false); open("log_in"); }}>Log in</Button><Button onClick={() => { setMenuOpen(false); open("start_free"); }}>Start free</Button></>}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
