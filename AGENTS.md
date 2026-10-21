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
