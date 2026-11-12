import { describe, it, expect } from "vitest";
import { buildPeriod, computeKpis, performanceTier, previousPeriod, rankUsers, weeklyBuckets, type ArchivedIncident } from "./nocAnalytics";

const inc = (o: Partial<ArchivedIncident>): ArchivedIncident => ({
  ticketId: "T", constraint: "LINK LOSS", category: "RITEL", serpo: "SERPO A", status: "On Progress", description: "",
  createdAt: new Date(2026, 10, 3, 9).toISOString(), createdByUserId: "u1", createdByName: "Ani",
  resolvedAt: null, resolvedByUserId: null, resolvedByName: null, reopenCount: 0, ...o,
});
const now = new Date(2026, 11, 31);

describe("nocAnalytics period rules", () => {
  it("weeks run Monday to Sunday", () => {
    const p = buildPeriod("week", new Date(2026, 10, 11)); // Wed 11 Nov 2026
    expect(p.start.getDay()).toBe(1);
    expect(p.start.getDate()).toBe(9);
    expect(p.end.getDate()).toBe(15);
  });
  it("counts created by createdAt and resolved by resolvedAt", () => {
    const nov = buildPeriod("month", new Date(2026, 10, 1));
    const list = [inc({ ticketId: "A", createdAt: new Date(2026, 9, 31, 22).toISOString(), status: "Resolved", resolvedAt: new Date(2026, 10, 1, 2).toISOString(), resolvedByUserId: "u2", resolvedByName: "Budi" })];
    const k = computeKpis(list, nov, now);
    expect(k.created).toBe(0);
    expect(k.resolved).toBe(1);
    expect(k.slaPct).toBe(100);
  });
  it("outstanding includes backlog from earlier periods still open at period end", () => {
    const nov = buildPeriod("month", new Date(2026, 10, 1));
    const list = [inc({ ticketId: "OLD", createdAt: new Date(2026, 8, 1).toISOString() }), inc({ ticketId: "LATER", status: "Resolved", createdAt: new Date(2026, 10, 20).toISOString(), resolvedAt: new Date(2026, 11, 2).toISOString() })];
    expect(computeKpis(list, nov, now).outstanding).toBe(2);
  });
  it("previous custom range has same length", () => {
    const p = buildPeriod("custom", new Date(2026, 10, 10), new Date(2026, 10, 14));
    const prev = previousPeriod(p);
    expect(prev.start.getDate()).toBe(5);
    expect(prev.end.getDate()).toBe(9);
  });
  it("a month has Week 1..5 buckets from Monday weeks", () => {
    expect(weeklyBuckets([], buildPeriod("month", new Date(2026, 10, 1)), now).length).toBe(6); // Nov 2026 spans 6 Mon–Sun weeks
  });
});

describe("performanceTier", () => {
  it("marks scores 90–100 as Excellent", () => {
    expect(performanceTier(90)).toBe("Excellent");
    expect(performanceTier(100)).toBe("Excellent");
  });
  it("marks scores 80–89 as Very Good", () => {
    expect(performanceTier(80)).toBe("Very Good");
    expect(performanceTier(89)).toBe("Very Good");
  });
  it("marks scores 70–79 as Good", () => {
    expect(performanceTier(70)).toBe("Good");
    expect(performanceTier(79)).toBe("Good");
  });
  it("marks scores 60–69 as Average", () => {
    expect(performanceTier(60)).toBe("Average");
    expect(performanceTier(69)).toBe("Average");
  });
  it("marks scores below 60 as Needs Improvement", () => {
    expect(performanceTier(59)).toBe("Needs Improvement");
    expect(performanceTier(0)).toBe("Needs Improvement");
  });
});

describe("rankUsers", () => {
  it("normalizes Created and Resolved to 0–100 and weights each indicator 50%", () => {
    const nov = buildPeriod("month", new Date(2026, 10, 1));
    const created = [
      ["C1", "u1", "Ani"], ["C2", "u1", "Ani"], ["C3", "u1", "Ani"], ["C4", "u1", "Ani"],
      ["C5", "u2", "Budi"], ["C6", "u2", "Budi"], ["C7", "u3", "Citra"],
    ].map(([ticketId, createdByUserId, createdByName]) => inc({ ticketId, createdByUserId, createdByName }));
    const resolved = [
      inc({ ticketId: "R1", createdAt: new Date(2026, 9, 30).toISOString(), status: "Resolved", resolvedAt: new Date(2026, 10, 4).toISOString(), resolvedByUserId: "u1", resolvedByName: "Ani" }),
      inc({ ticketId: "R2", createdAt: new Date(2026, 9, 30).toISOString(), status: "Resolved", resolvedAt: new Date(2026, 10, 5).toISOString(), resolvedByUserId: "u1", resolvedByName: "Ani" }),
      inc({ ticketId: "R3", createdAt: new Date(2026, 9, 30).toISOString(), status: "Resolved", resolvedAt: new Date(2026, 10, 6).toISOString(), resolvedByUserId: "u2", resolvedByName: "Budi" }),
    ];
    const rows = rankUsers([...created, ...resolved], [], nov, now);
    const ani = rows.find((r) => r.key === "u1")!;
    const budi = rows.find((r) => r.key === "u2")!;
    const citra = rows.find((r) => r.key === "u3")!;
    expect([ani.createdScore, ani.resolvedScore, ani.score]).toEqual([100, 100, 100]);
    expect([budi.createdScore, budi.resolvedScore, budi.score]).toEqual([50, 50, 50]);
    expect([citra.createdScore, citra.resolvedScore, citra.score]).toEqual([25, 0, 13]);
    expect(rows.map((r) => r.key)).toEqual(["u1", "u2", "u3"]);
    expect(ani.createdIncidents).toHaveLength(4);
    expect(ani.resolvedIncidents).toHaveLength(2);
  });
  it("credits the resolver, counts reopened incidents once, and marks empty resolvers Unassigned", () => {
    const nov = buildPeriod("month", new Date(2026, 10, 1));
    const list = [
      inc({ ticketId: "A", status: "Resolved", resolvedAt: new Date(2026, 10, 3, 11).toISOString(), resolvedByUserId: "u2", resolvedByName: "Budi", reopenCount: 2 }),
      inc({ ticketId: "B", status: "Resolved", resolvedAt: new Date(2026, 10, 4).toISOString() }),
    ];
    const rows = rankUsers(list, [{ ticketId: "A", userId: "u2", userName: "Budi", at: new Date(2026, 10, 3, 10).toISOString() }, { ticketId: "A", userId: "u2", userName: "Budi", at: new Date(2026, 10, 3, 11).toISOString() }], nov, now);
    const budi = rows.find((r) => r.key === "u2")!;
    expect(budi.resolved).toBe(1);
    expect(budi.handled).toBe(1);
    expect(rows.find((r) => r.key === "unassigned")?.name).toBe("Unassigned");
    expect(rows.find((r) => r.key === "u1")?.created).toBe(2);
  });
});

import { productivityRanking as _pr } from "./nocAnalytics";
describe("productivityRanking", () => {
  it("sorts by created+handled+resolved and drops idle users", () => {
    const u = (name: string, c: number, h: number, r: number) => ({ name, created: c, handled: h, resolved: r } as never);
    expect(_pr([u("A", 1, 0, 1), u("B", 2, 2, 2), u("C", 0, 0, 0)]).map((x) => x.name)).toEqual(["B", "A"]);
  });
});
