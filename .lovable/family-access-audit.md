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

## Priority findings: parent oversight and alerts
1. **Alerts are saved in-app, not externally delivered.** `src/lib/studio.server.ts:64–69` inserts a notification; Hub fetches it. No child-safety email/push preferences or sending/retry/receipt pipeline was found in the inspected repository. Auth emails do not establish safety-alert delivery. Parents outside the Hub are not proactively contacted by this path.
2. **Unsafe content does not produce the same prominent alert.** `studio.server.ts:33–38,62–70` classifies bullying/self-harm/sexual/violent content as unsafe and logs it, but creates a notification only for personal-information decisions. Define distinct concerning-content severity and escalation rather than treating every age-inappropriate fantasy as an emergency or making clinical judgments.
3. **Read acknowledgement can falsely succeed.** `src/lib/studio.functions.ts:112–116` ignores the update error and always returns success. Check persistence before showing acknowledged status.
4. **Pen-name approval tasks masquerade as privacy incidents.** `src/lib/book.functions.ts:104–109` reuses the notification format without checking insert errors; Hub/history label all these rows as personal disclosures. Add typed tasks/alerts and checked writes.
5. **Parent work lists can silently omit entries.** Book/game parent fetchers catch individual load failures and skip them (`book.functions.ts:134–140`, `game-builder.functions.ts:41–46`). Show unavailable-item/error state rather than pretending the list is complete.
6. **History is not every interaction or edit.** FamilyHistory reconstructs creation/latest-update/deletion records from current state; it does not expose full workspace revisions. Local Guesses/Dragon/Meadow play is not included; server games expose start/finish summaries rather than every move. Permanent purges remove creation evidence. Define a bounded retained activity contract and honest exclusions, preserving privacy and no-reward rules.
7. **Learning can partially succeed without complete evidence.** `src/lib/curriculum.functions.ts:70–85,108` ignores downstream completion/badge errors and can treat failed reads as empty lists. Check failures and ensure consistent completion recording.
8. **Safety claims need correction and legal review.** `/safety` says no child personal information is collected, but blocked input is retained in private events/alerts. It also describes a universal answer safety/fact check and AI writing prose that are not established by this audit and conflict with child-led authorship. Do not claim certified compliance or total oversight without supporting evidence. Review actual moderation processing, retention and parent-visible coverage before changing public promises.

## Recommended approval sequence
1. **Access safety and recovery:** unify server child authorization; preserve adult separation; invalidate remembered verification on credential reset; safe forgotten-PIN/password recovery. Add direct-request and database-backed tests.
2. **Parent-ready handoff:** integrated profile → secret → parent PIN → this/another device → approval → home-screen guide → test child sign-in. Clearly distinguish device trust expiry from remembered login policy; retain Always default and 24-hour option.
3. **Dependable parent alerts:** typed privacy/concern/approval/service-error events, clear settings and severity, verified contact delivery, retry/deduplication and read status. Default to minimal content in external messages and an authenticated Hub link rather than sending child text by email/push. Channel choices and escalation wording require product approval.
4. **Honest complete-enough oversight:** fix swallowed errors, show missing evidence, document local-play/edit exclusions or approve extra recording, expose child/date filters and report limitations, review safety/privacy language and retention.
5. **Site polish:** lazily load expanded panels, deduplicate concurrent checks without weakening authorization, make install help discoverable, improve keyboard focus/child targets, and measure transitions/font cost on real devices. Keep Shea's reviewed news prominent.

## Remaining verification and blockers
- Deep security scan results are pending; no clean-security certification.
- Successful unlocked parent and fresh child workflows require normal user unlock/sign-in; available restored session remains locked. No credentials were requested, reset, exposed or bypassed.
- Real iPhone/iPad/Android installation and background email/push delivery require implementation plus published-device checks; desktop preview cannot establish them.
- Existing legal, printing, billing, art-budget and Wave 2 blockers in roadmap remain outside this audit's implementation scope.

## Implementation boundary
No application behavior changed. Fixes should be presented in a phased approval plan after consolidating all findings. Keep independent child access separate from parent authority. Do not change offline support, billing, rewards, family credentials or published commentary as part of this audit.