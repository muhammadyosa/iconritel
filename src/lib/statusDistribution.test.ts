import { describe, expect, it } from "vitest";
import { countIncidentStatuses, filterStatusPeriod } from "./statusDistribution";
import type { Ticket } from "@/types/ticket";

const now = new Date(2026, 9, 21, 9, 24); // Wednesday; week starts Monday October 19.
const incident = (id: string, date: Date, status: Ticket["status"] = "Critical") => ({ id, createdISO: date.toISOString(), status });
const tickets = [
  incident("september", new Date(2026, 8, 30, 23, 59)),
  incident("month-start", new Date(2026, 9, 1), "Resolved"),
  incident("sunday", new Date(2026, 9, 18, 23, 59), "Pending"),
  incident("monday", new Date(2026, 9, 19), "On Progress"),
  incident("yesterday", new Date(2026, 9, 20, 23, 59)),
  incident("today", new Date(2026, 9, 21), "Resolved"),
  incident("future", new Date(2026, 9, 22)),
];

describe("live Status Distribution", () => {
  it("Hari Ini includes local midnight and excludes yesterday and future days", () => {
    expect(filterStatusPeriod(tickets, "today", now).map(t => t.id)).toEqual(["today"]);
  });
  it("Minggu Ini starts Monday, not a rolling seven days", () => {
    expect(filterStatusPeriod(tickets, "week", now).map(t => t.id)).toEqual(["monday", "yesterday", "today"]);
  });
  it("Bulan Ini starts on the first and excludes other months and future days", () => {
    expect(filterStatusPeriod(tickets, "month", now).map(t => t.id)).toEqual(["month-start", "sunday", "monday", "yesterday", "today"]);
  });
  it("Semua preserves every current incident without a date restriction", () => {
    expect(filterStatusPeriod(tickets, "all", now)).toEqual(tickets);
  });
  it("recalculates all four statuses after live updates, inserts, and deletes", () => {
    const scope = filterStatusPeriod(tickets, "month", now);
    expect(countIncidentStatuses(scope)).toEqual({ "On Progress": 1, Critical: 1, Resolved: 2, Pending: 1 });
    const updated = scope.filter(t => t.id !== "sunday").map(t => t.id === "monday" ? { ...t, status: "Resolved" as const } : t);
    updated.push(incident("new", now, "Pending"));
    expect(countIncidentStatuses(updated)).toEqual({ "On Progress": 0, Critical: 1, Resolved: 3, Pending: 1 });
  });
  it("rolls calendar filters forward after midnight, month and year changes", () => {
    const boundary = [incident("old", new Date(2026, 11, 31, 23, 59)), incident("new", new Date(2027, 0, 1))];
    expect(filterStatusPeriod(boundary, "today", new Date(2027, 0, 1)).map(t => t.id)).toEqual(["new"]);
    expect(filterStatusPeriod(boundary, "month", new Date(2027, 0, 1)).map(t => t.id)).toEqual(["new"]);
    expect(filterStatusPeriod(boundary, "week", new Date(2027, 0, 1)).map(t => t.id)).toEqual(["old", "new"]);
  });
  it("ignores invalid creation dates only for dated filters", () => {
    const invalid = [{ id: "invalid", createdISO: "invalid", status: "Pending" as const }];
    expect(filterStatusPeriod(invalid, "today", now)).toEqual([]);
    expect(countIncidentStatuses(filterStatusPeriod(invalid, "all", now)).Pending).toBe(1);
  });
});