# Bugley Kids: installation and trusted devices

The home-page **Log in** button is restored and verified. This plan covers the uploaded Bugley Kids brief.

## What changes

1. **A separate Kids experience.** Add a public Kids button, Bugley loading/offline screens, and a scoped Bugley Kids installation starting at `/kids`. Keep external links out of child screens. Unconfigured devices ask a grown-up to set them up.
2. **Parent-approved device setup.** In Family settings, verify the parent's password to trust this device. Support pairing another device with a QR code and short code that expire after exactly 10 minutes, followed by explicit parent approval.
3. **Restricted, revocable access.** Trusted devices remember only a limited device credential, never the parent's password or an unrestricted parent session. Opening the installed app or Bugley's home on a trusted device goes to “Who's playing?” Children still enter their existing PIN or picture password.
4. **Parent controls.** Add a four-digit parent PIN, protected exit, named device list with last-used dates, and immediate device removal. Enforce device and child login attempt limits, family isolation, existing plan access and daily time limits on every child request. Do not allow the limited device credential to become parent authority just because a PIN was entered.
5. **Illustrated setup help.** Provide device-specific installation steps and a reopenable settings guide. Include Guided Access and Screen Time, Android screen pinning and Family Link, and guidance for blocking a child's general browser. Show installation celebration only when installation is detected or confirmed.
6. **Verification.** Test pairing expiry/replay/approval, wrong PINs and attempt limits, revocation, cross-family denial, direct parent-page attempts and retained child limits. Check phone and tablet portrait/landscape, laptop, all three age skins, and published installation/offline behavior where available. Do not spend family Glow for these checks.

## Important limits

- Use the project's actual `bugley.app` domain, not the brief's `bugley.ai` links.
- A web app can open without ordinary browser tabs when installed, but cannot disable operating-system navigation, force installation, or guarantee App Store-like behavior on every device. Device parental controls provide that lock.
- Offline mode shows the cached Bugley shell and a friendly message only. Private family records, credentials, creations and AI responses are not cached; playing and creating still require internet.
- Installation and offline behavior are disabled in the Lovable preview. These need a published-site check and, for Safari installation, a real iPhone/iPad check. Publishing will not happen without your request.

## Technical implementation

- Introduce a separate restricted device authorization boundary and explicit Kid Zone handler allow-list. Keep managed parent authentication untouched; preserve parent-only server checks and RLS. Refactor child identity resolution across existing child handlers so trusted devices cannot select arbitrary family members or call parent operations.
- Add private device, pairing, PIN and throttling records with explicit grants and RLS. Store hashed high-entropy device/pair secrets and salted PIN hashes; use secure HttpOnly cookies for device secrets. Bind all operations to the verified device/family, require selected-child verification and check revocation on each request.
- Public pairing pages expose no family data before approval. Consume expiring pairing challenges atomically, with separate high-entropy QR proofs and throttled short-code redemption.
- Use `vite-plugin-pwa` generated service worker through one preview-safe registration wrapper, with NetworkFirst navigation, only public hashed asset caching, and exclusions for auth/OAuth/private responses. No offline parent or child API caching.
- Reuse the code-drawn Bugley brand icon, semantic theme tokens and existing shell. Preserve unique page metadata for new public and settings surfaces.
- Add focused tests next to existing tests for each security and timing rule, plus browser checks of available end-to-end flows. Report physical-device or account verification limits separately.