import { createFileRoute, redirect } from "@tanstack/react-router";
import { accountHead } from '@/lib/parent-auth';

export const Route = createFileRoute("/studio")({
  head:()=>accountHead('Bugley’s Studio','Original stories, pictures and games for your family.'),
  beforeLoad: () => {
    throw redirect({ to: "/studio-preview" });
  },
});
