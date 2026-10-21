import type { ReactNode } from "react";
import { Bugley } from "@/components/brand/Bugley";
import { Label } from "@/components/ui/label";

export function AccountFrame({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="container-page py-12 sm:py-16"><div className="mx-auto max-w-lg"><div className="mb-8 text-center"><div className="mb-4 flex justify-center"><Bugley stage="scout" expression="happy" size={88} /></div><h1 className="text-3xl sm:text-4xl">{title}</h1><p className="mt-4 leading-relaxed text-muted-foreground">{subtitle}</p></div>{children}</div></section>;
}
export function AccountField({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return <div className="flex flex-col gap-2"><Label htmlFor={id}>{label}</Label>{children}</div>;
}