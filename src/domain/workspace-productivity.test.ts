import { describe, expect, test } from "bun:test";
import { initialGuestDemoState } from "@/domain/guest-demo";
import { buildGuestWorkItems, searchGuestWorkspace } from "@/domain/workspace-productivity";

describe("workspace productivity", () => {
  test("searches stable entities and limits every group", () => {
    const results = searchGuestWorkspace(initialGuestDemoState, "soporte");
    expect(results.length).toBeGreaterThan(0);
    for (const kind of ["person", "project", "task", "incident"] as const) {
      expect(results.filter((result) => result.kind === kind).length).toBeLessThanOrEqual(5);
    }
    expect(results.every((result) => result.href.startsWith("/app/"))).toBe(true);
  });

  test("rejects unsafe or undersized queries", () => {
    expect(searchGuestWorkspace(initialGuestDemoState, "a")).toEqual([]);
    expect(searchGuestWorkspace(initialGuestDemoState, '<script>alert(1)</script>')).toEqual([]);
  });

  test("derives work without creating a second source of truth", () => {
    const items = buildGuestWorkItems(initialGuestDemoState);
    expect(items.length).toBeLessThanOrEqual(30);
    expect(items.filter((item) => item.kind !== "notification").every((item) => item.href.includes(`focus=${item.id}`))).toBe(true);
    expect(items.some((item) => item.kind === "notification" && item.href.startsWith("/app/"))).toBe(true);
    const rank = { critical: 0, high: 1, medium: 2, low: 3 };
    expect(items.map((item) => rank[item.priority])).toEqual(
      [...items].map((item) => rank[item.priority]).sort((a, b) => a - b),
    );
  });
});
