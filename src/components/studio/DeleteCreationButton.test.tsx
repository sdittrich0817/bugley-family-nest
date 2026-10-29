import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, describe, it, expect } from "vitest";
import { DeleteCreationButton } from "./DeleteCreationButton";

vi.mock("@/lib/studio.functions", () => ({ updateCreation: vi.fn(async () => ({ ok: true })) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("confirmed saved-work deletion", () => {
  it("removes only the deleted item and exits without waiting for refetches", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    for (const key of ["album", "in-progress", "cast"]) {
      qc.setQueryData([key, "child"], [{ id: "deleted" }, { id: "kept" }]);
    }
    vi.spyOn(qc, "invalidateQueries").mockImplementation(() => new Promise(() => {}));
    const onDeleted = vi.fn();
    render(<QueryClientProvider client={qc}><DeleteCreationButton childId="child" id="deleted" title="Test draft" onDeleted={onDeleted} /></QueryClientProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Delete Test draft" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete work" }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    for (const key of ["album", "in-progress", "cast"]) {
      expect(qc.getQueryData([key, "child"])).toEqual([{ id: "kept" }]);
    }
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });
});