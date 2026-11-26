import { describe, expect, it, vi } from "vitest";
import { canSeeTab, SETTINGS_TABS } from "./rolePermissions";
import { selectFilteredIds, toggleEvaluationSelection, visiblePageSelection } from "./evidenManagement";
import { deleteEvaluations, type DeleteServices } from "../../supabase/functions/eviden-delete/flow";

describe("Eviden Data Management rules", () => {
  it("only Admin can access Data Management", () => {
    expect(canSeeTab(SETTINGS_TABS, "admin", "data-management")).toBe(true);
    for (const role of ["noc", "reviewer", "intern", "superior", "cs"] as const) {
      expect(canSeeTab(SETTINGS_TABS, role, "data-management")).toBe(false);
    }
  });
  it("Select All includes all filtered IDs across pages, not unrelated IDs", () => {
    const selected = selectFilteredIds(["filtered-page-1", "filtered-page-2", "filtered-page-2"]);
    expect([...selected]).toEqual(["filtered-page-1", "filtered-page-2"]);
    expect(selected.has("outside-filter")).toBe(false);
    expect(visiblePageSelection(selected, [{ id: "filtered-page-1" }])).toBe(true);
  });
  it("deselecting one evaluation leaves all other IDs unchanged", () => {
    const original = new Set(["a", "b", "c"]);
    expect([...toggleEvaluationSelection(original, "b")]).toEqual(["a", "c"]);
    expect([...original]).toEqual(["a", "b", "c"]);
  });
});

function services(): DeleteServices {
  return {
    prepare: vi.fn().mockResolvedValue("batch"),
    manifest: vi.fn().mockResolvedValue({ paths: [], count: 2, completed: false }),
    remove: vi.fn().mockResolvedValue(undefined),
    finalize: vi.fn().mockResolvedValue(2),
  };
}

describe("controlled Eviden deletion", () => {
  it("removes photos before finalizing selected evaluations", async () => {
    const s = services();
    const events: string[] = [];
    s.manifest = vi.fn().mockResolvedValueOnce({ paths: ["a/initial/photo.png", "b/answer/photo.png"], count: 2, completed: false }).mockResolvedValue({ paths: [], count: 2, completed: false });
    s.remove = vi.fn(async () => { events.push("files"); });
    s.finalize = vi.fn(async () => { events.push("transaction"); return 2; });
    expect(await deleteEvaluations(s, { ids: ["a", "b"] })).toEqual({ count: 2, batch_id: "batch" });
    expect(events).toEqual(["files", "transaction"]);
    expect(s.prepare).toHaveBeenCalledWith(["a", "b"]);
    expect(s.remove).toHaveBeenCalledWith(["a/initial/photo.png", "b/answer/photo.png"]);
  });
  it("never deletes relation data when private-file cleanup fails", async () => {
    const s = services();
    s.manifest = vi.fn().mockResolvedValue({ paths: ["a/initial/photo.png"], count: 1, completed: false });
    s.remove = vi.fn().mockRejectedValue(new Error("storage failed"));
    await expect(deleteEvaluations(s, { ids: ["a"] })).rejects.toThrow("storage failed");
    expect(s.finalize).not.toHaveBeenCalled();
  });
  it("resume uses the durable batch without starting another deletion", async () => {
    const s = services();
    await deleteEvaluations(s, { batch_id: "existing-batch" });
    expect(s.prepare).not.toHaveBeenCalled();
    expect(s.finalize).toHaveBeenCalledWith("existing-batch");
  });
  it("completed batch retries are idempotent", async () => {
    const s = services();
    s.manifest = vi.fn().mockResolvedValue({ paths: [], count: 2, completed: true });
    expect(await deleteEvaluations(s, { batch_id: "done" })).toEqual({ count: 2, batch_id: "done" });
    expect(s.remove).not.toHaveBeenCalled();
    expect(s.finalize).not.toHaveBeenCalled();
  });
  it("never finalizes while new or remaining files exist", async () => {
    const s = services();
    s.manifest = vi.fn().mockResolvedValue({ paths: ["a/answer/late.png"], count: 1, completed: false });
    await expect(deleteEvaluations(s, { batch_id: "pending" })).rejects.toThrow("belum selesai");
    expect(s.finalize).not.toHaveBeenCalled();
  });
});