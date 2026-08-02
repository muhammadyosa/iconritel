import { Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const INTERN_ALLOWED_PATHS = new Set(["/", "/tickets", "/teams", "/report"]);
const ADMIN_NOC_ONLY_PATHS = new Set(["/notes"]);

// Daftar rute valid yang bisa dipakai sebagai intended_path.
// Harus selaras dengan pageComponents di App.tsx + halaman protected lain.
export const SAFE_PROTECTED_PATHS = new Set<string>([
  "/",
  "/tickets",
  "/teams",
  "/akv",
  "/fat",
  "/fdt",
  "/olt",
  "/upe",
  "/bng",
  "/notes",
  "/report",
  "/settings",
  "/install",
]);

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, isLoading } = useAuth();
  const { isIntern, isAdmin, isNOC, isLoading: isRoleLoading } = useUserRole();
  const location = useLocation();

  // Simpan tujuan awal saat user belum login, agar bisa di-redirect kembali setelah login.
  // Pakai localStorage supaya tetap bertahan kalau user me-refresh halaman login
  // atau menyelesaikan OAuth di tab/sesi baru.
  useEffect(() => {
    if (!isLoading && !user && location.pathname !== "/login") {
      const fullPath = location.pathname + location.search;
      // Hanya simpan kalau path-nya memang rute valid & aman
      if (SAFE_PROTECTED_PATHS.has(location.pathname)) {
        try {
          localStorage.setItem("intended_path", fullPath);
        } catch {
          /* ignore */
        }
      } else {
        // Bersihkan kalau path tidak dikenali untuk hindari loop ke rute mati
        try {
          localStorage.removeItem("intended_path");
        } catch {
          /* ignore */
        }
      }
    }
  }, [isLoading, user, location.pathname, location.search]);

  // Hanya tunggu auth utama. Profile & role di-fetch paralel; UI tetap dirender.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Cek approval hanya jika profile sudah dimuat. Jika belum, render saja
  // (ProtectedRoute akan re-evaluate begitu profile masuk; halaman tetap snappy).
  if (profile && !profile.is_approved) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Pembatasan berbasis role hanya diterapkan setelah role selesai dimuat,
  // agar tidak terjadi redirect prematur. Sebelum role siap, izinkan render.
  if (!isRoleLoading) {
    if (isIntern && !INTERN_ALLOWED_PATHS.has(location.pathname)) {
      return <Navigate to="/tickets" replace />;
    }
    if (ADMIN_NOC_ONLY_PATHS.has(location.pathname) && !isAdmin && !isNOC) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
