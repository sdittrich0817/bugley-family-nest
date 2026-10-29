import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Wonderwood } from "./Wonderwood";
import { ROUND_MS } from "./learning";
import { act } from "react";

vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe("Wonderwood adventure", () => {
  it("ends the actual active game after four minutes even if paused", () => {
    vi.useFakeTimers();
    render(<Wonderwood />);
    fireEvent.click(screen.getByRole("button", { name: /Let’s play/ }));
    fireEvent.click(screen.getByRole("button", { name: "Pause game" }));
    act(() => vi.advanceTimersByTime(ROUND_MS));
    expect(screen.getByRole("heading", { name: "Time for a rest" })).toBeDefined();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Berry$/ })).toBeNull();
  });
});