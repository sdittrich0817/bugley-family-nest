import { Apple, Fish, Flower2, Moon, Star, Sun } from "lucide-react";
import { AVATARS, PICTURES } from "@/lib/family";
const pictureIcons = { sun: Sun, moon: Moon, flower: Flower2, fish: Fish, apple: Apple, star: Star };
export function PictureIcon({ picture }: { picture: typeof PICTURES[number] }) {
  const Icon = pictureIcons[picture];
  return <Icon aria-hidden className="size-8 text-foreground" strokeWidth={1.7} />;
}
export function ChildAvatar({ avatar, className = "size-16" }: { avatar: typeof AVATARS[number]; className?: string }) {
  return <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`${avatar} avatar`}>
    <circle cx="50" cy="50" r="48" className="fill-accent" />
    {avatar === "bunny" ? <g className="fill-card stroke-foreground" strokeWidth="2.5"><ellipse cx="35" cy="26" rx="10" ry="23" /><ellipse cx="65" cy="26" rx="10" ry="23" /></g> : avatar === "frog" ? <g className="fill-leaf stroke-foreground" strokeWidth="2.5"><circle cx="29" cy="34" r="14" /><circle cx="71" cy="34" r="14" /></g> : <g className="fill-primary stroke-foreground" strokeWidth="2.5">{avatar === "bear" ? <><circle cx="25" cy="30" r="13" /><circle cx="75" cy="30" r="13" /></> : <><path d="M20 47 L20 16 L44 36Z" /><path d="M80 47 L80 16 L56 36Z" /></>}</g>}
    <ellipse cx="50" cy="57" rx="33" ry="29" className={`${avatar === "frog" ? "fill-leaf" : avatar === "bunny" || avatar === "cat" ? "fill-card" : "fill-primary"} stroke-foreground`} strokeWidth="2.5" />
    {avatar === "owl" && <g className="fill-card"><circle cx="36" cy="50" r="14" /><circle cx="64" cy="50" r="14" /></g>}
    <g className="fill-foreground"><ellipse cx="36" cy="51" rx="3.5" ry="5" /><ellipse cx="64" cy="51" rx="3.5" ry="5" /><path d="M46 61 Q50 57 54 61 L50 66Z" /></g>
    <path d="M41 69 Q50 77 59 69" className="stroke-foreground" fill="none" strokeWidth="2.5" strokeLinecap="round" />
    {avatar === "cat" && <g className="stroke-foreground" strokeWidth="2" strokeLinecap="round"><path d="M20 60 L9 57 M20 65 L8 67 M80 60 L91 57 M80 65 L92 67" /></g>}
  </svg>;
}