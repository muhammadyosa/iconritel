import { Link, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }
  }, [location.pathname]);

  // If a logged-in user lands on an unknown route (common after OAuth redirects),
  // send them back to the dashboard instead of showing a dead-end 404.
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center px-4">
        <h1 className="mb-2 text-4xl font-bold">404</h1>
        <p className="mb-4 text-sm text-muted-foreground">Halaman tidak ditemukan</p>
        <Link to="/" className="story-link text-sm text-primary">
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
