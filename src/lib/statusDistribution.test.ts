import { describe, expect, it } from "vitest";
import { countIncidentStatuses, filterStatusPeriod, summarizeIncidentStatuses } from "./statusDistribution";
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
  it("keeps counts, total, percentages, dominant status, and resolution rate aligned to the live list", () => {
    const initial = [
      incident("critical", now, "Critical"),
      incident("progress", now, "On Progress"),
      incident("resolved", now, "Resolved"),
      incident("pending", now, "Pending"),
    ];
    expect(summarizeIncidentStatuses(initial)).toMatchObject({
      counts: { "On Progress": 1, Critical: 1, Resolved: 1, Pending: 1 },
      total: 4,
      percentages: { "On Progress": 25, Critical: 25, Resolved: 25, Pending: 25 },
      dominantStatus: "On Progress",
      resolutionRate: 25,
    });

    const currentList = initial
      .filter((ticket) => ticket.id !== "pending")
      .map((ticket) => ticket.id === "progress" ? { ...ticket, status: "Resolved" as const } : ticket);
    currentList.push(incident("new", now, "Pending"));
    expect(summarizeIncidentStatuses(currentList)).toMatchObject({
      counts: { "On Progress": 0, Critical: 1, Resolved: 2, Pending: 1 },
      total: 4,
      percentages: { "On Progress": 0, Critical: 25, Resolved: 50, Pending: 25 },
      dominantStatus: "Resolved",
      resolutionRate: 50,
    });
    expect(countIncidentStatuses(currentList)).toEqual(summarizeIncidentStatuses(currentList).counts);
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