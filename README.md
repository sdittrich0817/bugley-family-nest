# Bugley Family Nest

Set up the foundation for Bugley using the brand in Project Knowledge. Don't build page content yet.

1. Design system: set up the Bugley colors, fonts (Nunito Extra Bold headlines, Inter body), spacing, and rounded corners as reusable tokens. Create reusable components: primary button (Glow yellow), secondary button, card, section header, badge, and a soft "glow" effect that can sit behind images or icons.
2. Site shell: a sticky header with the Bugley wordmark on the left; nav links for How it works, Bugley's Studio, Safety, For co-ops, Pricing, Our mission; and two buttons on the right: "Log in" (secondary) and "Start free" (primary). On mobile, collapse the nav into a menu.
3. Footer: Bugley wordmark, tagline "Figure out AI, together.", links to all main pages plus Privacy policy, Terms, and Contact, and a small line: "No ads. We never sell your family's data."
4. Create empty placeholder pages for every nav link, plus /privacy, /terms, /contact, and /resources, so no link is broken.
5. Waitlist for now: "Start free" and "Log in" both open a friendly modal that collects parent first name, email, and number of kids, and says "We're opening the doors soon. Be first in line!" Save submissions to the database.

Make everything mobile-first and responsive.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://bugley-family-nest.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d6fd2d56-9652-4ebb-b2d7-e442a0448401).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
