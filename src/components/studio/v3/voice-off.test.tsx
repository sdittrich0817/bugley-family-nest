import { act, cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHILD_VOICE_ENABLED } from "@/lib/kid-input";
import { VoiceButton, useVoice } from "./VoiceInput";
import { useVoiceInput } from "../Sidekick";

// Founder decision: children type only until consent and the privacy policy cover browser speech services.
let created = 0;
class FakeRecognition { constructor() { created++; } start() {} stop() {} abort() {} }
beforeEach(() => { created = 0; (window as any).webkitSpeechRecognition = FakeRecognition; });
afterEach(() => { cleanup(); delete (window as any).webkitSpeechRecognition; });

describe("child microphones are off", () => {
  it("the switch is off", () => expect(CHILD_VOICE_ENABLED).toBe(false));
  it("no Say it button or notice shows, even in a browser that can listen", () => {
    for (const band of ["sprouts", "explorers", "builders"]) {
      const { container, unmount } = render(<VoiceButton ageBand={band} onText={vi.fn()} />);
      expect(container.textContent).toBe("");
      expect(container.querySelector("button")).toBeNull();
      unmount();
    }
  });
  it("the older microphones (chat, stories, games, books) report no voice and never start listening", () => {
    const { result } = renderHook(() => useVoiceInput(vi.fn()));
    expect(result.current.supported).toBe(false);
    act(() => result.current.start());
    expect(result.current.listening).toBe(false);
    expect(created).toBe(0);
  });
  it("the comic microphone never starts listening", () => {
    const { result } = renderHook(() => useVoice(vi.fn()));
    expect(result.current.supported).toBe(false);
    act(() => result.current.start());
    expect(result.current.state).toBe("idle");
    expect(created).toBe(0);
  });
});
