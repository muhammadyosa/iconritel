import { describe, it, expect } from "vitest";
import { validateEvidenFile, visibleSenderName, evidenStats, responseMinutes, type EvidenListRow } from "./eviden";

const row = (o: Partial<EvidenListRow>): EvidenListRow => ({
  id: "1", code: "EVD-00001", status: "SENT", viewer_kind: "admin", sender_name: "A", recipient_user_id: "r",
  recipient_name: "R", recipient_team: "NOC", customer_information: "c", problem: "p", created_at: "2026-11-24T01:00:00Z",
  sent_at: "2026-11-24T01:00:00Z", opened_at: null, answered_at: null, closed_at: null, answer_count: 0, ...o,
});

describe("eviden rules", () => {
  it("rejects files above 5 MB", () => {
    expect(validateEvidenFile({ name: "a.png", type: "image/png", size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/);
    expect(validateEvidenFile({ name: "a.png", type: "image/png", size: 5 * 1024 * 1024 })).toBeNull();
  });
  it("only accepts JPG, JPEG, PNG, WEBP", () => {
    expect(validateEvidenFile({ name: "a.gif", type: "image/gif", size: 10 })).not.toBeNull();
    expect(validateEvidenFile({ name: "a.jpeg", type: "image/jpeg", size: 10 })).toBeNull();
    expect(validateEvidenFile({ name: "a.webp", type: "image/webp", size: 10 })).toBeNull();
  });
  it("recipient always sees ANONYMOUS sender", () => {
    expect(visibleSenderName("recipient", "Budi")).toBe("ANONYMOUS");
    expect(visibleSenderName("admin", "Budi")).toBe("Budi");
    expect(visibleSenderName("sender", "Budi")).toBe("Budi");
  });
  it("counts pending response as unanswered statuses", () => {
    const s = evidenStats([row({ status: "SENT" }), row({ status: "REVISION REQUESTED" }), row({ status: "ANSWERED" }), row({ status: "CLOSED" })]);
    expect(s.pending).toBe(2);
    expect(s.total).toBe(4);
  });
  it("averages response time from sent to answered", () => {
    expect(responseMinutes(row({ answered_at: "2026-11-24T02:30:00Z" }))).toBe(90);
    const s = evidenStats([row({ answered_at: "2026-11-24T02:00:00Z" }), row({ answered_at: "2026-11-24T03:00:00Z" })]);
    expect(s.avgResponseMinutes).toBe(90);
  });
});
