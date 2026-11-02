# Bugley site audit — November 2, 2026

## Goal
Easy parent setup, independent child entry, home-screen access, and dependable parent oversight without granting children adult access. Audit first; application changes require approval.

## Evidence and limits
- Live public home, kids entry, and pairing screens loaded without page errors.
- Restored parent session redirected `/hub` to `/kids`; successful parent unlock, child login, and signed-in Hub interaction remain unverified. No lock bypass or credential reset performed.
- Thirty targeted access, report-isolation, and safety tests passed. Access investigation separately reports 38 passing tests; counts overlap and must not be added.
- Source audits cover routing, installation, family setup, authorization and recovery. Real-device installation, deployed authorization behavior and delivery of notifications are not certified.
- Quick database scan flagged anonymous waitlist/demo inserts and shared print-format reads. These align with intended public submission/catalog functions; they are not proof of exposed child records. Submission abuse controls merit review.
- Deep security scan started; results pending.

## Priority findings: access and setup
1. **Equivalent child-session enforcement is missing from the parent-bearer fallback.** Trusted devices enforce selected-child verification, but `src/lib/kid-device-auth.ts:20–30` accepts a verified parent bearer without a server-selected child. `src/lib/kid.functions.ts:7–27` verifies credentials but returns only `{ok}`. Browser player storage is not an equivalent authorization boundary. This weakens sibling/PIN separation, not established cross-family access. Prefer a clear trusted-device handoff or equivalent server child session.
2. **Locked recovery excludes password-reset pages.** `src/lib/kid-zone.ts:8–14` permits kids-entry/login/pair but not forgot/reset-password. Valid trusted devices immediately return from kids-entry to kids. Review an authenticated recovery path without unlocking private parent content.
3. **Credential resets do not invalidate remembered access.** `src/lib/family.functions.ts:24–39` changes child credentials without clearing existing device verification. Parent-PIN changes similarly leave current unlock windows. Define and test reset invalidation.
4. **Family setup finishes before device handoff.** `src/routes/_authenticated/setup.tsx:17–20` and `src/lib/family.functions.ts:46–51` finish after profiles, while trust/pairing and prerequisite parent PIN remain in separate settings. Offer this-device/another-device/later handoff.
5. **Device expiry and failures are not clearly surfaced.** Trust has a 180-day expiry; settings show last use but not expiry. “Always” must not imply permanent device trust. Add retry/pending/error visibility.

## Priority findings: installation and experience
- Home-screen web installation already exists: `/kids` start URL, standalone display, icons and Apple metadata. No App Store approval is needed; it remains a web app, not a downloaded non-HTML executable.
- Entry does not expose installation or remote-pairing choices (`src/routes/kids-entry.tsx:8`). Guide is inside authorized `/kids/install`; make a public parent explanation discoverable.
- Guide listens for `beforeinstallprompt` only when mounted, can miss the event, and retains a consumed event after dismissal (`KidsInstallGuide.tsx:7–9`). Capture once and clear after any outcome.
- “Your players will be waiting” and “on your home screen now” exceed what current display-mode detection establishes. Real iOS installed-context continuity requires testing; provide a safe setup-again fallback.
- Narrow `/kids` scope excludes login/pair recovery. Preserve scope unless intentionally redesigning; test grown-up handoff and return on real devices.
- Root, kid layout and kid home repeat device checks. Measure and deduplicate eligible concurrent requests without caching away revocation/authorization.
- Closed Hub disclosure sections still mount fetching children. Defer heavy history/printing/conversation panels until expansion.
- Prioritize child access/readiness and concerning updates; keep Shea's news prominent but not above an urgent family action. Do not remove or bury news contrary to existing preference.
- Add keyboard skip/destination focus support, review small child controls, and measure global four-font loading and tablet navigation density.

## Confirmed architectural strengths
Hashed child/device secrets; trusted selected-child/family checks; explicit expiring parent-approved pairing; stale/revoked-device fail-closed behavior; parent PIN does not grant parent-data access; server-enforced trusted 24-hour remembrance without timestamp renewal; local parent-session signout during device handoff.

## Pending audit sections
- Full recording coverage, concerning-event categories, parent notification configuration and actual external delivery.
- Deep security scan results.

## Implementation boundary
No application behavior changed. Fixes should be presented in a phased approval plan after consolidating all findings. Keep independent child access separate from parent authority. Do not change offline support, billing, rewards, family credentials or published commentary as part of this audit.