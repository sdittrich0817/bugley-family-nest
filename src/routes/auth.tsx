import { createFileRoute, redirect } from "@tanstack/react-router";
import { accountHead } from '@/lib/parent-auth';
export const Route = createFileRoute("/auth")({ head:()=>accountHead('Parent sign in','Secure sign in for your Bugley family.'), beforeLoad: () => { throw redirect({ to: "/login" }); } });