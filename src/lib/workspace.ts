import { z } from "zod";
import { defaultLength, guidedPages, lengthBand, type StoryLength } from "./story";
import { guidedComicPages } from "./comic";

export const workspaceSchema = z.object({
  version: z.literal(1), originalIdea: z.string().max(600),
  v3: z.literal(true).optional(),
  activity: z.enum(["imagine", "make", "finish"]).default("imagine"),
  outlineApproved: z.boolean().default(false),
  facts: z.object({ genre: z.string(), heroName: z.string(), heroLooks: z.string(), place: z.string(), problem: z.string() }).optional(),
  characterDraft: z.object({ name: z.string().max(40), kind: z.string().max(160), special: z.string().max(160), personality: z.string().max(80),
    options: z.array(z.object({ path: z.string(), url: z.string().optional() })).max(3).default([]) }).optional(),
  castVersions: z.record(z.string(), z.string()).default({}),
});
export type WorkspaceMeta = z.infer<typeof workspaceSchema>;
export type OutputKind = "comic" | "story" | "picture";
export type WorkspaceProject = { id: string; kind: OutputKind; title: string; body: string | null; images: string[]; styleKey: string; updatedAt: string; details: any; urls: Record<string, string>; workspace: WorkspaceMeta };
export const EMPTY_FACTS = { genre: "", heroName: "", heroLooks: "", place: "", problem: "" };
export function assertWorkspaceIdle(details: any) {
  if (details?.paintState === "painting" || details?.upgradeState === "painting") throw new Error("Your drawing is still being painted. Try again when it is saved.");
}
export function invalidatePicture(project: WorkspaceProject) {
  project.images = [];
  project.details = { ...project.details, mode: "draft", paintState: "ready", upgradeState: "ready" };
  delete project.details.paintOp;
  project.workspace.activity = "make";
}
export function workspaceOf(details: any, body = ""): WorkspaceMeta {
  const parsed = workspaceSchema.safeParse(details?.workspace);
  return parsed.success ? parsed.data : { version: 1, originalIdea: body, activity: details?.finished || details?.mode === "final" ? "finish" : "make", outlineApproved: true, castVersions: {} };
}
export function resizeWorkspace(details: any, kind: "comic" | "story", length: StoryLength) {
  if (kind === "story") {
    const target = guidedPages(lengthBand(length));
    if (details.pages.slice(target.length).some((p: any) => p.text || p.image)) throw new Error("Those pages have your work. Keep them or start another chapter.");
    return { ...details, length, pages: target.map((p, i) => details.pages[i] ?? p), outline: undefined };
  }
  const target = guidedComicPages(lengthBand(length));
  const old = details.pages.flatMap((p: any) => p.panels);
  const count = target.reduce((n, p) => n + p.panels.length, 0);
  if (old.slice(count).some((p: any) => p.description || p.image || p.sketch || p.layers.length)) throw new Error("Those panels have your work. Keep them or start another issue.");
  let at = 0;
  return { ...details, length, outline: undefined, pages: target.map((p, i) => { const panels = p.panels.map(blank => old[at++] ?? blank); const big = p.panels.findIndex(panel => panel.id === p.widePanelId); return { ...p, id: details.pages[i]?.id ?? p.id, panels, widePanelId: big >= 0 ? panels[big]?.id : undefined }; }) };
}
export const initialLength = defaultLength;