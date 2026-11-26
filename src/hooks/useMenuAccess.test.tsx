import { renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useUserRole", () => ({ useUserRole: () => ({ role: "noc", isLoading: false }) }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: null, isLoading: false, refetch: vi.fn() }), useQueryClient: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { useMenuAccess } from "./useMenuAccess";

it("keeps effective menu paths stable across unrelated renders so search effects cannot loop", () => {
  const { result, rerender } = renderHook(() => useMenuAccess());
  const paths = result.current.allowedPaths;
  rerender();
  expect(result.current.allowedPaths).toBe(paths);
  expect(paths).toContain("/eviden");
});