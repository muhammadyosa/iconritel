import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }
  }, [location.pathname]);

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
