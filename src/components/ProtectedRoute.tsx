import { Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const INTERN_ALLOWED_PATHS = new Set(["/", "/tickets", "/teams"]);
const ADMIN_NOC_ONLY_PATHS = new Set(["/notes"]);

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, isLoading } = useAuth();
  const { isIntern, isAdmin, isNOC, isLoading: isRoleLoading } = useUserRole();
  const location = useLocation();

  // Simpan tujuan awal saat user belum login, agar bisa di-redirect kembali setelah login
  useEffect(() => {
    if (!isLoading && !user && location.pathname !== "/login") {
      try {
        sessionStorage.setItem(
          "intended_path",
          location.pathname + location.search,
        );
      } catch {
        /* ignore */
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
