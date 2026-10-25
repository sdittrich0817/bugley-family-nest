<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Site shell (header, footer, waitlist modal provider) lives in `src/routes/__root.tsx`; pages render only their own content. Why: one shell, no duplication.
- Nav link lists live in `src/lib/nav.ts`; every entry must have a matching route file. Why: no broken links.
- Brand tokens (colors, fonts, spacing, radii, glow) live only in `src/styles.css`; components use semantic classes and cva variants. Why: consistent theming.
- Waitlist submissions go through the `joinWaitlist` server function (publishable client, insert-only RLS). Why: anonymous visitors can add but never read entries.
- Bugley the character is one code-drawn SVG (`src/components/brand/Bugley.tsx`) with stage/expression props; never use raster images of Bugley. Why: identical everywhere at any size.
- Age-band looks are CSS classes (`skin-sprouts`, `skin-explorers`, `skin-builders`) that override tokens on a subtree. Why: one component set, three themes.
- Parent session state has one root-mounted subscriber; protected pages use the authenticated layout and user-scoped server functions. Why: no competing session listeners or private-data leaks.
- Parent signup records validated adult attestation and versioned consent atomically in an auth lifecycle trigger; consent rows are immutable to users, and RLS requires verified email plus recorded consent. Why: bypassing the signup UI must not bypass consent or family isolation.
- Existing waitlist action context now navigates to real account pages while retaining the insert-only waitlist storage. Why: every existing CTA changes consistently without deleting historical entries.
- Family setup and settings share a parent-scoped child editor and server functions; database-generated placement and a locked-parent trigger enforce age placement and family capacity. Why: direct requests and concurrent additions cannot bypass family rules.
- Child credentials are salted PBKDF2 hashes computed only in server handlers and excluded from authenticated SELECT grants; they are not independent adult auth accounts. Why: child secrets must never be readable or grant parent privileges.
- Root shell alone locks entry; child pages never relock. `_kid` uses restricted child auth; parent sessions unlock by password, trusted devices by PIN plus normal parent sign-in for Hub data. Details in src/lib/AGENTS.md. Why: no stale relocks or device-to-parent privilege escalation.
- The Parent Hub (/hub) is the signed-in home; /account holds profile and consent. Per-child controls live in a parent-scoped table written only through user-scoped server functions. Why: one home base, and controls stay private to each family.
- Curriculum content (Seasons > Units > Sessions > Activities with per-band versions, printables) is database-driven and edited only in /admin, gated by the has_role admin check in RLS and server functions; families read only published Seasons, and the current session is the first one not completed. Why: new content ships without code and drafts stay hidden.
- Glow balances live in database tables with no client write grants; every change (lazy nightly refill in the family time zone, spend, gift) goes through security-definer functions executable only by service_role, called from server code after an ownership check, and each writes the glow ledger. Studio image handlers must call chargeGlow (src/lib/glow.server.ts) before generating. Why: the browser can never alter glow, and every change is audited.
- Billing state lives in the webhook-fed `subscriptions` table (filtered by environment); a trigger copies the plan into family glow settings, and Kid Zone access is decided server-side by `hasAccess` in `src/lib/billing.ts`. Why: the browser can't grant itself a plan, and glow follows billing automatically.
- Bugley's Studio lives at /kids/studio (inside the Kid Zone lock). Every piece of child text goes through `guardChildText` in `src/lib/studio.server.ts` (family-name/pattern checks plus an AI check) before any AI model sees it; every decision is logged to `studio_events`, personal-info hits create `parent_notifications`, and all Bugley replies come from the `askBugley` server function. Why: no child text reaches a model unchecked, and parents see everything.
- Every Studio image goes through `src/lib/images.server.ts`; Character Lock and pipeline rules live in `src/lib/AGENTS.md`. Why: one audited image path.
- PLAY launches through PlayStudio with bounded private sessions, reusable safe stickers and server-rendered doodles; persistence and rewards follow src/lib/AGENTS.md. Why: games share safety and rewards without exposing family data.
- New PLAY games use ExtraRound; Glow Dash uses a deterministic Matter.js simulation shared by client and server, with input replay grading and allow-listed remixes saved in parent-scoped dash_remixes. Mystery solutions and guessing secrets live only in non-readable play_sessions.private_state. Why: real gameplay without client-controlled scores, generated code or exposed answers.

- Subdirectories may have their own `AGENTS.md` (see `src/lib/AGENTS.md` for Studio makers and books); read it before changing files there.
- Scroll-to-top on navigation is handled once in the root shell after each page resolves; screens that switch steps without changing the URL call `useScrollTopOn` from `src/lib/scroll.ts`. Why: every new page or step starts at the top.
- Child avatars are code-drawn bug portraits (`BugAvatar`) built from allow-listed parts stored in `children.bug`; kids build them in the Kid Zone (parts picker or words that AI maps to parts, guarded first), parents never pick. Why: safe, consistent, no generated images or uploads.
- Studio makers and Book Builder use sequential questions, paged choices and opt-in typed/spoken answers; one route-level `BugleyGuide` uses `chat.say`, and Story/Comic share `MakerSetup`. Why: simplify creation while preserving exact child words and existing guarded save actions.
