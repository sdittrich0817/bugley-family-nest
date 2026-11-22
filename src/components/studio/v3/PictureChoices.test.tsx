import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChangeChoices, CoverPicker, GlowConfirm, PICTURE_GLOW } from "./PictureChoices";

afterEach(cleanup);

const panels = [
  { id: "a", image: "p/a.png", url: "https://x/a.png", label: "panel 1" },
  { id: "b", image: "p/b.png", url: "https://x/b.png", label: "panel 2" },
];

describe("A3.3 Change it choices", () => {
  it("offers exactly Fix one thing, Draw a new one and Keep this picture, for every age group", () => {
    for (const band of ["sprouts", "explorers", "builders"] as const) {
      render(<ChangeChoices band={band} onFix={vi.fn()} onRedraw={vi.fn()} onKeep={vi.fn()} />);
      const names = screen.getAllByRole("button").map((b) => b.textContent ?? "");
      expect(names).toHaveLength(3);
      expect(names[0]).toContain("Fix one thing");
      expect(names[1]).toContain("Draw a new one");
      expect(names[2]).toContain("Keep this picture");
      cleanup();
    }
  });
  it("shows 3 Glow on both paid choices and FREE on Keep this picture", () => {
    render(<ChangeChoices band="explorers" onFix={vi.fn()} onRedraw={vi.fn()} onKeep={vi.fn()} />);
    const [fix, redraw, keep] = screen.getAllByRole("button");
    expect(fix?.textContent).toContain("3 Glow");
    expect(redraw?.textContent).toContain("3 Glow");
    expect(keep?.textContent).toContain("FREE");
    expect(keep?.textContent).not.toContain("Glow");
  });
  it("Keep this picture only goes back; it never starts a drawing", () => {
    const onFix = vi.fn(), onRedraw = vi.fn(), onKeep = vi.fn();
    render(<ChangeChoices band="sprouts" onFix={onFix} onRedraw={onRedraw} onKeep={onKeep} />);
    fireEvent.click(screen.getByRole("button", { name: /Keep this picture/ }));
    expect(onKeep).toHaveBeenCalledTimes(1);
    expect(onFix).not.toHaveBeenCalled();
    expect(onRedraw).not.toHaveBeenCalled();
  });
});

describe("A3.3 Glow check before a paid drawing", () => {
  it("uses the existing 3 Glow picture price", () => expect(PICTURE_GLOW).toBe(3));
  it("says what Bugley will do and the cost, and Cancel never draws", () => {
    const onConfirm = vi.fn(), onCancel = vi.fn();
    render(<GlowConfirm band="explorers" have={10} what="Bugley will draw panel 2 again." confirmLabel="Yes, draw it" onConfirm={onConfirm} onCancel={onCancel} />);
    expect(screen.getByText("Bugley will draw panel 2 again.")).toBeTruthy();
    expect(screen.getByText(/This costs 3 Glow/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
  it("draws only after the child taps the Glow button", () => {
    const onConfirm = vi.fn();
    render(<GlowConfirm band="builders" have={3} what="x" confirmLabel="Yes, draw it" onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Yes, draw it · 3 Glow" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
  it("can't be confirmed with less than 3 Glow", () => {
    const onConfirm = vi.fn();
    render(<GlowConfirm band="sprouts" have={2} what="x" confirmLabel="Yes, draw it" onConfirm={onConfirm} onCancel={vi.fn()} />);
    const go = screen.getByRole("button", { name: "Yes, draw it · 3 Glow" }) as HTMLButtonElement;
    expect(go.disabled).toBe(true);
    fireEvent.click(go);
    expect(onConfirm).not.toHaveBeenCalled();
  });
  it("can't be confirmed before the child types what to change", () => {
    render(<GlowConfirm band="explorers" have={10} ready={false} what="x" confirmLabel="Yes, make this change" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect((screen.getByRole("button", { name: "Yes, make this change · 3 Glow" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("A3.3 cover picker", () => {
  it("picking one of my pictures is free and never paints", () => {
    const onPick = vi.fn(), onPaint = vi.fn();
    render(<CoverPicker band="explorers" panels={panels} have={10} onPick={onPick} onPaint={onPaint} onPublish={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Let’s pick your comic cover!" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Use panel 2 as the cover" }));
    expect(onPick).toHaveBeenCalledWith("b");
    expect(onPaint).not.toHaveBeenCalled();
  });
  it("marks the chosen picture and lets the child publish only once a cover is chosen", () => {
    const { rerender } = render(<CoverPicker band="sprouts" panels={panels} onPick={vi.fn()} onPaint={vi.fn()} onPublish={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Publish/ })).toBeNull();
    rerender(<CoverPicker band="sprouts" panels={panels} cover="p/a.png" onPick={vi.fn()} onPaint={vi.fn()} onPublish={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Use panel 1 as the cover" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Use panel 2 as the cover" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: /Publish to my shelf/ })).toBeTruthy();
  });
  it("tapping the cover that's already chosen does nothing", () => {
    const onPick = vi.fn();
    render(<CoverPicker band="explorers" panels={panels} cover="p/a.png" onPick={onPick} onPaint={vi.fn()} onPublish={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Use panel 1 as the cover" }));
    expect(onPick).not.toHaveBeenCalled();
  });
  it("painting a new cover asks first (3 Glow), and Cancel paints nothing", () => {
    const onPaint = vi.fn();
    render(<CoverPicker band="builders" panels={panels} have={10} onPick={vi.fn()} onPaint={onPaint} onPublish={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Paint a new cover" }));
    expect(onPaint).not.toHaveBeenCalled();
    expect(screen.getByText(/This costs 3 Glow/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onPaint).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Paint a new cover" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, paint my cover · 3 Glow" }));
    expect(onPaint).toHaveBeenCalledTimes(1);
  });
});
