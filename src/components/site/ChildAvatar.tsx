import { Apple, Fish, Flower2, Moon, Star, Sun } from "lucide-react";
import { PICTURES } from "@/lib/family";
import { toBug } from "@/lib/bug-avatar";
import { BugAvatar } from "./BugAvatar";
const pictureIcons = { sun: Sun, moon: Moon, flower: Flower2, fish: Fish, apple: Apple, star: Star };
export function PictureIcon({ picture }: { picture: typeof PICTURES[number] }) {
  const Icon = pictureIcons[picture];
  return <Icon aria-hidden className="size-8 text-foreground" strokeWidth={1.7} />;
}
export function ChildAvatar({ avatar, className = "size-16", seed = "" }: { avatar: unknown; className?: string; seed?: string }) {
  return <BugAvatar bug={toBug(avatar, seed)} className={className} />;
}
