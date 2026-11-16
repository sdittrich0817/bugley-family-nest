import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect, beforeEach } from "vitest";

const notice = vi.hoisted(() => ({ message: null as string | null }));
vi.mock("@/lib/service-notice.functions", () => ({ drawingNoticeOptions: { queryKey: ["service-notice", "drawing"], queryFn: async () => ({ message: notice.message }) } }));
vi.mock("@/components/brand/Bugley", () => ({ Bugley: () => null }));
import { DrawingRestNotice } from "./DrawingRestNotice";

const MSG = "Bugley's drawing magic is taking a little break. You can come back and create pictures soon!";
const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><DrawingRestNotice /></QueryClientProvider>);

describe("temporary drawing notice", () => {
  beforeEach(() => { notice.message = null; });
  it("shows the approved wording while the notice is switched on", async () => {
    notice.message = MSG;
    mount();
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe(MSG));
  });
  it("shows nothing once the notice is switched off", async () => {
    const { container } = mount();
    await new Promise((r) => setTimeout(r, 20));
    expect(container.innerHTML).toBe("");
  });
});
