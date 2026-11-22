import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUserRole } from "@/hooks/useUserRole";

const maybeSingleMock = vi.hoisted(() => vi.fn());

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
      })),
    })),
  },
}));

describe("fetchUserRole", () => {
  beforeEach(() => {
    maybeSingleMock.mockReset();
  });

  it("mempertahankan peran admin yang tersimpan", async () => {
    maybeSingleMock.mockResolvedValue({ data: { role: "admin" }, error: null });

    await expect(fetchUserRole("admin-user")).resolves.toBe("admin");
  });

  it("menggunakan NOC hanya ketika pengguna memang belum memiliki baris peran", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    await expect(fetchUserRole("new-user")).resolves.toBe("noc");
  });

  it("tidak menurunkan admin menjadi NOC ketika pembacaan peran ditolak", async () => {
    const permissionError = {
      code: "42501",
      message: "permission denied for function has_role",
    };
    maybeSingleMock.mockResolvedValue({ data: null, error: permissionError });

    await expect(fetchUserRole("admin-user")).rejects.toBe(permissionError);
  });
});
