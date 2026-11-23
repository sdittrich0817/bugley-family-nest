// A3.4.1 idea-first screens: exact idea shown back, other-look characters faded and not choosable, up to three
// characters, Explorers' "Anyone else?", Builders' combined screen, and no microphone anywhere. No server is reached.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn, createServerFn: () => { const c: any = { middleware: () => c, inputValidator: () => c, handler: () => vi.fn() }; return c; } }));
vi.mock("@/lib/v3.functions", () => ({ saveV3Idea: vi.fn() }));
vi.mock("../Sidekick", () => ({ speak: vi.fn() }));
vi.mock("@/lib/stripe", () => ({ getStripeEnvironment: () => "sandbox" }));
import { IdeaCast, IdeaEntry } from "./IdeaStart";
import { ideaComicDetails } from "@/lib/comic-idea";
import { workspaceOf } from "@/lib/workspace";

afterEach(cleanup);
const IDEA = "A dragon is scared to fly… but Moss helps!";
const kid = (age_band: string) => ({ id: "c1", nickname: "Ada", age: age_band === "builders" ? 11 : 8, age_band, bugley_stage: "scout" }) as never;
const member = (id: string, title: string, styleKey = "cartoon") => ({ id, title, styleKey, url: `https://x/${id}.png`, details: null });
const project = (ids: string[] = []) => {
  const details = { ...ideaComicDetails(IDEA, 4, "Adventure", "cast"), characterIds: ids };
  return { id: "p1", kind: "comic", title: "My comic idea", body: "", images: [], styleKey: "cartoon", updatedAt: "t", details, workspace: workspaceOf(details), urls: {} } as never;
};
const cast = [member("pip", "Pip"), member("luna", "Luna"), member("zed", "Zed", "crayon")];

describe("idea screen", () => {
  it("needs at least three letters before 'That's my idea!' and has no microphone", () => {
    render(<IdeaEntry child={kid("explorers")} project={null} onCreated={vi.fn()} onDone={vi.fn()} onBack={vi.fn()} />);
    const go = screen.getByRole("button", { name: /That’s my idea!/ });
    expect(go).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("What’s your comic about?"), { target: { value: "ab" } });
    expect(go).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("What’s your comic about?"), { target: { value: "A dragon" } });
    expect(go).toHaveProperty("disabled", false);
    expect(screen.queryByRole("button", { name: /Say it|microphone/i })).toBeNull();
  });
  it("Explorers see three sparks straight away; Builders only after 'Help me think'", () => {
    render(<IdeaEntry child={kid("explorers")} project={null} onCreated={vi.fn()} onDone={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: /^…/ })).toHaveLength(3);
    cleanup();
    render(<IdeaEntry child={kid("builders")} project={null} onCreated={vi.fn()} onDone={vi.fn()} onBack={vi.fn()} />);
    expect(screen.queryAllByRole("button", { name: /^…/ })).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: /Help me think/ }));
    expect(screen.getAllByRole("button", { name: /^…/ })).toHaveLength(3);
  });
  it("a spark only adds to the end of the child's own words", () => {
    render(<IdeaEntry child={kid("explorers")} project={null} onCreated={vi.fn()} onDone={vi.fn()} onBack={vi.fn()} />);
    const box = screen.getByLabelText("What’s your comic about?") as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "A dragon" } });
    const spark = screen.getAllByRole("button", { name: /^…/ })[0]!;
    fireEvent.click(spark);
    expect(box.value.startsWith("A dragon ")).toBe(true);
    expect(box.value).toBe(`A dragon ${spark.textContent!.replace(/^…\s*/, "")}`);
  });
  it("resuming shows the saved idea exactly", () => {
    const details = ideaComicDetails(IDEA, 4);
    render(<IdeaEntry child={kid("builders")} project={{ id: "p1", kind: "comic", workspace: workspaceOf(details), details } as never} onCreated={vi.fn()} onDone={vi.fn()} onBack={vi.fn()} />);
    expect((screen.getByLabelText("What’s your comic about?") as HTMLTextAreaElement).value).toBe(IDEA);
  });
});

describe("choosing characters", () => {
  it("shows the idea exactly and asks who the star is; every look is choosable before the first pick", () => {
    render(<IdeaCast child={kid("explorers")} project={project()} cast={cast} castReady busy="" onSet={vi.fn()} onNew={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText(IDEA)).toBeTruthy();
    expect(screen.getByText("I love that idea! Who’s the star?")).toBeTruthy();
    for (const n of ["Pip", "Luna", "Zed"]) expect(screen.getByRole("button", { name: `Choose ${n}` })).toHaveProperty("disabled", false);
    expect(screen.queryByRole("button", { name: /Let’s make it!/ })).toBeNull();
  });
  it("after the first pick, characters in another look are shown faded and can't be chosen", () => {
    const onSet = vi.fn();
    render(<IdeaCast child={kid("builders")} project={project(["pip"])} cast={cast} castReady busy="" onSet={onSet} onNew={vi.fn()} onConfirm={vi.fn()} />);
    const zed = screen.getByRole("button", { name: /Zed \(other drawing style/ });
    expect(zed).toHaveProperty("disabled", true);
    expect(screen.getByText(/same drawing style/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Choose Luna" }));
    expect(onSet).toHaveBeenCalledWith({ characterIds: ["pip", "luna"] });
  });
  it("Explorers are asked 'Anyone else in your comic?' with an easy way to continue", () => {
    const onConfirm = vi.fn();
    render(<IdeaCast child={kid("explorers")} project={project(["pip"])} cast={cast} castReady busy="" onSet={vi.fn()} onNew={vi.fn()} onConfirm={onConfirm} />);
    expect(screen.getByText("Pip is ready! Anyone else in your comic?")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Add another/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Let’s make it!/ }));
    expect(onConfirm).toHaveBeenCalledWith(["pip"]);
  });
  it("Builders get one screen with the cast and the open plan, then 'Start panel 1'", () => {
    render(<IdeaCast child={kid("builders")} project={project(["pip"])} cast={cast} castReady busy="" onSet={vi.fn()} onNew={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText("What kind of comic?")).toBeTruthy();
    expect(screen.getByText("How many panels?")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Start panel 1/ })).toBeTruthy();
    expect(screen.queryByText(/Anyone else in your comic/)).toBeNull();
  });
  it("no more characters can be added once there are three", () => {
    const four = [...cast.slice(0, 2), member("mo", "Mo"), member("ike", "Ike")];
    render(<IdeaCast child={kid("builders")} project={project(["pip", "luna", "mo"])} cast={four} castReady busy="" onSet={vi.fn()} onNew={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Choose Ike" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Make a new one/ })).toBeNull();
  });
  it("a character deleted before panel 1 drops out, with a calm note", () => {
    render(<IdeaCast child={kid("explorers")} project={project(["gone", "pip"])} cast={cast} castReady busy="" onSet={vi.fn()} onNew={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText(/isn’t in My Characters any more/)).toBeTruthy();
    expect(screen.getByText("Pip is ready! Anyone else in your comic?")).toBeTruthy();
  });
});

describe("the idea stays out of drawing instructions and Story Memory", () => {
  it("no comic prompt, memory or cover code reads the original idea", () => {
    for (const f of ["comic-continuity.ts", "comic-memory.ts", "comic-memory.server.ts", "cover-cast.ts", "comic.server.ts", "images.server.ts"])
      expect(readFileSync(`src/lib/${f}`, "utf8")).not.toContain("originalIdea");
    // In the V3 server steps it is read only for one-picture creations, never for comics.
    const all = readFileSync("src/lib/v3.functions.ts", "utf8").split("\n");
    const uses = all.map((l, i) => (l.includes("workspace.originalIdea") ? `${all[i - 1]}\n${l}` : "")).filter(Boolean);
    expect(uses.length).toBeGreaterThan(0);
    for (const u of uses) expect(u).toMatch(/kind === "picture"/);
  });
});
