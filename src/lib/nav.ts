export const mainNav = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/learning", label: "How they learn" },
  { to: "/studio-preview", label: "Bugley's Studio" },
  { to: "/safety", label: "Safety" },
  { to: "/co-ops", label: "For co-ops" },
  { to: "/pricing", label: "Pricing" },
  { to: "/mission", label: "Our mission" },
] as const;
// Links shown inline in the site header; everything else lives in the "More" menu.
export const headerNav = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/safety", label: "Safety" },
  { to: "/studio-preview", label: "Bugley's Studio" },
  { to: "/pricing", label: "Pricing" },
] as const;

export const legalNav = [
  { to: "/resources", label: "Resources" },
  { to: "/privacy", label: "Privacy policy" },
  { to: "/terms", label: "Terms" },
  { to: "/contact", label: "Contact" },
] as const;
