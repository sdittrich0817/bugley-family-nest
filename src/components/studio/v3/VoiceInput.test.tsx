import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VoiceButton } from "./VoiceInput";

vi.mock("../Sidekick", () => ({ speak: vi.fn() }));

class FakeRecognition {
  static last: FakeRecognition | null = null;
  static failStart = false;
  lang = ""; continuous = true; interimResults = false; maxAlternatives = 1;
  onresult: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  onend: (() => void) | null = null;
  started = false; stopped = false; aborted = false;
  constructor() { FakeRecognition.last = this; }
  start() { if (FakeRecognition.failStart) throw new Error("blocked"); this.started = true; }
  stop() { this.stopped = true; this.onend?.(); }
  abort() { this.aborted = true; }
  say(words: string, isFinal = true) { this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: words }], { isFinal })] }); }
  fail(error: string) { this.onerror?.({ error }); this.onend?.(); }
}

beforeEach(() => { (window as any).webkitSpeechRecognition = FakeRecognition; FakeRecognition.failStart = false; });
afterEach(() => { cleanup(); delete (window as any).webkitSpeechRecognition; delete (window as any).SpeechRecognition; });

const start = () => fireEvent.click(screen.getByRole("button", { name: /Say it/ }));

describe("A3.2 Say it button", () => {
  it("shows Listening… and a Stop button, then puts the words in the box when speech is captured", () => {
    const onText = vi.fn();
    render(<VoiceButton ageBand="explorers" onText={onText} />);
    start();
    expect(screen.getByText("Listening…")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Stop listening" })).toBeTruthy();
    expect(FakeRecognition.last?.continuous).toBe(false);
    act(() => FakeRecognition.last!.say("a blue cat", false));
    expect(onText).not.toHaveBeenCalled(); // live words are shown, never saved
    act(() => FakeRecognition.last!.say("a blue cat with wings"));
    expect(onText).toHaveBeenCalledWith("a blue cat with wings");
    fireEvent.click(screen.getByRole("button", { name: "Stop listening" }));
    expect(screen.getByText(/Got it! Your words are in the box/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Say more/ })).toBeTruthy();
  });
  it("explains when microphone permission is denied, and typing still works", () => {
    render(<VoiceButton ageBand="sprouts" onText={vi.fn()} />);
    start();
    act(() => FakeRecognition.last!.fail("not-allowed"));
    expect(screen.getByText(/microphone is turned off/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Say it/ })).toBeTruthy();
  });
  it("says nothing was heard after silence", () => {
    render(<VoiceButton ageBand="explorers" onText={vi.fn()} />);
    start();
    act(() => FakeRecognition.last!.fail("no-speech"));
    expect(screen.getByText(/didn’t hear any words/)).toBeTruthy();
  });
  it("falls back to typing when the browser can't listen", () => {
    delete (window as any).webkitSpeechRecognition;
    render(<VoiceButton ageBand="sprouts" onText={vi.fn()} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(/Type in the box, or ask your grown-up/)).toBeTruthy();
  });
  it("Builders see no notice when voice is unavailable", () => {
    delete (window as any).webkitSpeechRecognition;
    const { container } = render(<VoiceButton ageBand="builders" onText={vi.fn()} />);
    expect(container.textContent).toBe("");
  });
  it("handles a browser that refuses to start listening", () => {
    FakeRecognition.failStart = true;
    render(<VoiceButton ageBand="explorers" onText={vi.fn()} />);
    start();
    expect(screen.getByText(/can’t listen on this device/)).toBeTruthy();
  });
  it("only one microphone listens at a time", () => {
    render(<><VoiceButton ageBand="explorers" onText={vi.fn()} /><VoiceButton ageBand="explorers" label="Say words" onText={vi.fn()} /></>);
    start();
    const first = FakeRecognition.last!;
    fireEvent.click(screen.getByRole("button", { name: /Say words/ }));
    expect(first.aborted).toBe(true);
  });
  it("stops listening when the screen goes away (no audio kept)", () => {
    const { unmount } = render(<VoiceButton ageBand="explorers" onText={vi.fn()} />);
    start();
    const r = FakeRecognition.last!;
    unmount();
    expect(r.aborted).toBe(true);
  });
});
