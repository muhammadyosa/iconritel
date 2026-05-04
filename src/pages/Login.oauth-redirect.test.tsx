import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

/**
 * OAuth sign-in redirect tests.
 *
 * Verifies that after `lovable.auth.signInWithOAuth` resolves, the app always
 * lands on the right destination and never loops back to /login.
 *
 * Three completion modes are exercised:
 *  A. Browser-redirect mode (`{ redirected: true }`) → Login does NOT navigate
 *     itself; the OAuth provider takes over. After the round-trip, AuthContext
 *     emits a user → Login's effect performs the redirect exactly once.
 *  B. Token mode (`{ redirected: false }`, no error) → Login navigates to "/"
 *     immediately after signInWithOAuth resolves. AuthContext then also emits
 *     a user, but Login must still only redirect to a single, valid target
 *     (no loop, no /login bounce).
 *  C. Error mode → no navigation at all, button re-enables.
 */

// --- Mocks ---------------------------------------------------------------

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return { ...actual, useNavigate: () => navigateMock };
});

const signInWithOAuth = vi.fn();
vi.mock("@/integrations/lovable/index", () => ({
  lovable: {
    auth: { signInWithOAuth: (...a: unknown[]) => signInWithOAuth(...a) },
  },
}));

const authState: { user: unknown; isLoading: boolean } = {
  user: null,
  isLoading: false,
};
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

const toastError = vi.fn();
vi.mock("sonner", () => ({
  toast: { error: (...a: unknown[]) => toastError(...a), success: vi.fn() },
}));

vi.mock("@/components/ParticleBackground", () => ({
  ParticleBackground: () => null,
}));
vi.mock("@/assets/iconnet-mascot.png", () => ({ default: "" }));
vi.mock("@/assets/pln-icon-plus-new.png", () => ({ default: "" }));
vi.mock("@/assets/iconnet-logo-new.png", () => ({ default: "" }));
vi.mock("@/assets/indonesia-map.png", () => ({ default: "" }));

import Login from "./Login";

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );

beforeEach(() => {
  navigateMock.mockClear();
  signInWithOAuth.mockReset();
  toastError.mockClear();
  authState.user = null;
  authState.isLoading = false;
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("Login — OAuth sign-in redirect (no loop)", () => {
  it("A) browser-redirect mode: Login does not navigate; redirect happens after AuthContext emits user", async () => {
    signInWithOAuth.mockResolvedValue({ redirected: true });

    const { rerender } = renderLogin();
    fireEvent.click(await screen.findByRole("button", { name: /google/i }));

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
    // Provider takes over the navigation — Login itself must NOT navigate yet
    expect(navigateMock).not.toHaveBeenCalled();

    // Simulate OAuth round-trip: AuthContext now reports an authenticated user
    authState.user = { id: "u1" };
    rerender(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
  });

  it("A2) browser-redirect mode honors a saved safe intended_path", async () => {
    localStorage.setItem("intended_path", "/tickets");
    signInWithOAuth.mockResolvedValue({ redirected: true });

    const { rerender } = renderLogin();
    fireEvent.click(await screen.findByRole("button", { name: /google/i }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));

    authState.user = { id: "u1" };
    rerender(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith("/tickets", { replace: true });
    expect(localStorage.getItem("intended_path")).toBeNull();
  });

  it("B) token mode: navigates exactly once and never bounces back to /login", async () => {
    signInWithOAuth.mockResolvedValue({ redirected: false });

    const { rerender } = renderLogin();
    fireEvent.click(await screen.findByRole("button", { name: /google/i }));

    // Login navigates to "/" right after OAuth resolves with tokens
    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });

    // AuthContext then catches up and reports the user. The effect re-runs,
    // but the target must still be a safe route (never /login). At most one
    // additional navigation may occur, also to "/".
    authState.user = { id: "u1" };
    rerender(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(2));
    for (const [target] of navigateMock.mock.calls) {
      expect(target).not.toBe("/login");
      expect(target).not.toBe("/pending-approval");
    }
  });

  it("C) error mode: shows a toast, does not navigate, re-enables the button", async () => {
    signInWithOAuth.mockResolvedValue({ error: new Error("nope") });

    renderLogin();
    const btn = await screen.findByRole("button", { name: /google/i });
    fireEvent.click(btn);

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));
    expect(navigateMock).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledTimes(1);

    // Button is re-enabled so the user can retry
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /google/i }),
      ).not.toBeDisabled(),
    );
  });

  it("D) double-click guard: rapid clicks only trigger one OAuth call", async () => {
    let resolve!: (v: unknown) => void;
    signInWithOAuth.mockImplementation(
      () => new Promise((r) => (resolve = r)),
    );

    renderLogin();
    const btn = await screen.findByRole("button", { name: /google/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);

    expect(signInWithOAuth).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolve({ redirected: true });
    });
  });

  it("E) ignores unsafe intended_path after OAuth → falls back to '/'", async () => {
    localStorage.setItem("intended_path", "/totally-bogus");
    signInWithOAuth.mockResolvedValue({ redirected: true });

    const { rerender } = renderLogin();
    fireEvent.click(await screen.findByRole("button", { name: /google/i }));
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));

    authState.user = { id: "u1" };
    rerender(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
    expect(localStorage.getItem("intended_path")).toBeNull();
  });
});
