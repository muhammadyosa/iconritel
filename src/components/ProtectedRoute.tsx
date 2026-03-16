import { Navigate, useLocation } from "react-router-dom";
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

  if (isLoading || isRoleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && !profile.is_approved) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Intern restriction
  if (isIntern && !INTERN_ALLOWED_PATHS.has(location.pathname)) {
    return <Navigate to="/tickets" replace />;
  }

  // Admin/NOC only pages
  if (ADMIN_NOC_ONLY_PATHS.has(location.pathname) && !isAdmin && !isNOC) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
