import { act, fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ComicSlideshow } from "./ComicSlideshow";

vi.mock("../ComicMaker", () => ({ PanelCanvas: ({ url }: { url: string }) => <img src={url} alt="Saved comic panel" /> }));

afterEach(() => { cleanup(); vi.useRealTimers(); });
const pages = [{ url: "/one.png" }, { url: "/two.png" }, { url: "/three.png" }];
function open() { render(<ComicSlideshow title="Comic" pages={pages} onClose={vi.fn()} />); }
function tick(ms: number) { act(() => { vi.advanceTimersByTime(ms); }); }
function loadSlide() { fireEvent.load(screen.getByRole("img")); }

describe("comic playback", () => {
  it("starts each automatic advance only after the current image loads", () => {
    vi.useFakeTimers(); open(); tick(10000);
    expect(screen.getByRole("status").textContent).toBe("1 of 3");
    loadSlide(); tick(3500);
    expect(screen.getByRole("status").textContent).toBe("2 of 3");
    tick(10000);
    expect(screen.getByRole("status").textContent).toBe("2 of 3");
    loadSlide(); tick(3500);
    expect(screen.getByRole("status").textContent).toBe("3 of 3");
  });
  it("manual navigation cancels the pending automatic advance", () => {
    vi.useFakeTimers(); open(); loadSlide(); tick(3400);
    fireEvent.click(screen.getByRole("button", { name: "Next" })); loadSlide(); tick(10000);
    expect(screen.getByRole("status").textContent).toBe("2 of 3");
    fireEvent.click(screen.getByRole("button", { name: "Play" })); tick(3499);
    expect(screen.getByRole("status").textContent).toBe("2 of 3");
    tick(1); expect(screen.getByRole("status").textContent).toBe("3 of 3");
  });
  it("stops at the last slide instead of wrapping to the cover", () => {
    vi.useFakeTimers(); open(); loadSlide(); tick(3500); loadSlide(); tick(3500); loadSlide(); tick(10000);
    expect(screen.getByRole("status").textContent).toBe("3 of 3");
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Play" })).toBeEnabled();
  });
  it("keyboard navigation pauses playback and stays within the saved slides", () => {
    vi.useFakeTimers(); open(); loadSlide(); tick(3400);
    fireEvent.keyDown(window, { key: "ArrowRight" }); loadSlide(); tick(10000);
    expect(screen.getByRole("status").textContent).toBe("2 of 3");
    fireEvent.keyDown(window, { key: "ArrowLeft" }); fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("status").textContent).toBe("1 of 3");
  });
});