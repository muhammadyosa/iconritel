import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// --- Mocks ---------------------------------------------------------------

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

// Auth state is controlled per-test via this mutable object
const authState: { user: unknown; isLoading: boolean } = {
  user: null,
  isLoading: false,
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/integrations/lovable/index", () => ({
  lovable: {
    auth: { signInWithOAuth: vi.fn().mockResolvedValue({ redirected: true }) },
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Stub heavy/visual deps
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
  authState.user = null;
  authState.isLoading = false;
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("Login — redirect behavior after authentication", () => {
  it("does NOT redirect while still loading or when no user is present", () => {
    authState.isLoading = true;
    const { unmount } = renderLogin();
    expect(navigateMock).not.toHaveBeenCalled();
    unmount();

    authState.isLoading = false;
    authState.user = null;
    renderLogin();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("login success → redirects to '/' when no intended_path is stored", async () => {
    authState.user = { id: "u1" };
    renderLogin();

    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
  });

  it("login success → redirects to a saved safe intended_path and consumes it", async () => {
    localStorage.setItem("intended_path", "/tickets?foo=1");
    authState.user = { id: "u1" };
    renderLogin();

    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith("/tickets?foo=1", {
      replace: true,
    });
    // Flag must be consumed so subsequent sessions don't loop back
    expect(localStorage.getItem("intended_path")).toBeNull();
  });

  it("ignores unsafe / unknown intended_path and falls back to '/'", async () => {
    localStorage.setItem("intended_path", "/totally-unknown-route");
    authState.user = { id: "u1" };
    renderLogin();

    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
    expect(localStorage.getItem("intended_path")).toBeNull();
  });

  it("never redirects back to /login or /pending-approval (avoids loop)", async () => {
    localStorage.setItem("intended_path", "/login");
    authState.user = { id: "u1" };
    const { unmount } = renderLogin();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
    unmount();

    navigateMock.mockClear();
    localStorage.setItem("intended_path", "/pending-approval");
    renderLogin();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
  });

  it("page refresh on /login while already authenticated still redirects (no loop)", async () => {
    // Simulate refresh: user resolves after the first render
    authState.isLoading = true;
    const { rerender } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    expect(navigateMock).not.toHaveBeenCalled();

    // Auth finishes loading, session is rehydrated
    authState.isLoading = false;
    authState.user = { id: "u1" };
    rerender(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
  });

  it("logout → re-login flow: each fresh login still triggers a redirect", async () => {
    // First login
    authState.user = { id: "u1" };
    const { unmount } = renderLogin();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith("/", { replace: true });
    unmount();

    // User logs out → AuthContext clears user; back on /login
    navigateMock.mockClear();
    authState.user = null;
    const { unmount: unmount2 } = renderLogin();
    expect(navigateMock).not.toHaveBeenCalled();
    unmount2();

    // User logs in again with a saved intended path
    localStorage.setItem("intended_path", "/teams");
    authState.user = { id: "u2" };
    renderLogin();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith("/teams", { replace: true });
    expect(localStorage.getItem("intended_path")).toBeNull();
  });

  it("migrates legacy intended_path from sessionStorage to localStorage on login", async () => {
    sessionStorage.setItem("intended_path", "/report");
    authState.user = { id: "u1" };
    renderLogin();

    await waitFor(() => expect(navigateMock).toHaveBeenCalledTimes(1));
    expect(navigateMock).toHaveBeenCalledWith("/report", { replace: true });
    // Legacy key cleared, localStorage consumed
    expect(sessionStorage.getItem("intended_path")).toBeNull();
    expect(localStorage.getItem("intended_path")).toBeNull();
  });
});
