import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- Mocks ---------------------------------------------------------------

const signInWithOAuth = vi.fn().mockResolvedValue({ redirected: true });

vi.mock("@/integrations/lovable/index", () => ({
  lovable: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => signInWithOAuth(...args),
    },
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Heavy/visual modules — stub to keep test fast & deterministic
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
  signInWithOAuth.mockClear();
  signInWithOAuth.mockResolvedValue({ redirected: true });
});

describe("Login — Google OAuth flow", () => {
  it("forces Google account picker (prompt=select_account) on every sign-in", async () => {
    renderLogin();

    const btn = await screen.findByRole("button", { name: /google/i });
    fireEvent.click(btn);

    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));

    const [provider, opts] = signInWithOAuth.mock.calls[0];
    expect(provider).toBe("google");
    expect(opts).toMatchObject({
      redirect_uri: expect.any(String),
      extraParams: expect.objectContaining({
        prompt: expect.stringContaining("select_account"),
      }),
    });
  });

  it("re-sends prompt=select_account on a second sign-in attempt (no auto-login)", async () => {
    renderLogin();
    const btn = await screen.findByRole("button", { name: /google/i });

    fireEvent.click(btn);
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(1));

    // Simulate the user returning to the login page and clicking again.
    fireEvent.click(btn);

    // Both calls must include the select_account prompt — Google must always
    // show the account chooser, never silently reuse a cached session.
    await waitFor(() => expect(signInWithOAuth).toHaveBeenCalledTimes(2));
    for (const [, opts] of signInWithOAuth.mock.calls) {
      expect(opts.extraParams.prompt).toContain("select_account");
    }
  });
});
