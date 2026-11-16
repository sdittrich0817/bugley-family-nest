import { describe, expect, it } from "vitest";
import { DEMO_LIMITS, submitDemoRequest } from "./demo.server";

const input = { leaderName: "Ana", email: "Ana@Coop.org ", groupName: "Oak Co-op", cityState: "Austin, TX", familiesCount: 12, ageRange: "7–9" as const };

function fakeAdmin() {
  const counts = new Map<string, number>();
  const rows: Record<string, unknown>[] = [];
  return {
    rows,
    rpc: async (_fn: string, a: { _key: string; _limit: number }) => {
      const n = (counts.get(a._key) ?? 0) + 1; counts.set(a._key, n);
      return { data: n <= a._limit };
    },
    from: () => ({ insert: async (row: Record<string, unknown>) => { rows.push(row); return { error: null }; } }),
  };
}

describe("co-op demo requests", () => {
  it("accepts a legitimate anonymous request and stores a lowercased email", async () => {
    const a = fakeAdmin();
    expect(await submitDemoRequest(a as never, "1.1.1.1", input)).toEqual({ ok: true });
    expect(a.rows[0]?.["email"]).toBe("ana@coop.org");
  });
  it("limits one network to 5 requests per hour", async () => {
    const a = fakeAdmin();
    for (let i = 0; i < DEMO_LIMITS.ip.limit; i++) await submitDemoRequest(a as never, "2.2.2.2", { ...input, email: `p${i}@x.org` });
    expect(await submitDemoRequest(a as never, "2.2.2.2", { ...input, email: "late@x.org" })).toEqual({ ok: false, limited: true });
    expect(a.rows).toHaveLength(5);
  });
  it("limits one email to 3 requests per day across networks", async () => {
    const a = fakeAdmin();
    for (let i = 0; i < DEMO_LIMITS.email.limit; i++) await submitDemoRequest(a as never, `3.3.3.${i}`, input);
    expect(await submitDemoRequest(a as never, "3.3.3.9", input)).toEqual({ ok: false, limited: true });
    expect(a.rows).toHaveLength(3);
  });
  it("other visitors are not affected by someone else's limit", async () => {
    const a = fakeAdmin();
    for (let i = 0; i < 6; i++) await submitDemoRequest(a as never, "4.4.4.4", { ...input, email: `s${i}@x.org` });
    expect(await submitDemoRequest(a as never, "5.5.5.5", { ...input, email: "fresh@x.org" })).toEqual({ ok: true });
  });
});
