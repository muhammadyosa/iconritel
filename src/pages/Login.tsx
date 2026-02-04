import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import plnIconPlusLogo from "@/assets/pln-icon-plus.png";
import indonesiaMap from "@/assets/indonesia-map.png";

export default function Login() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/", { replace: true });
    }
  }, [user, isLoading, navigate]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (error) {
        console.error("OAuth error:", error);
        toast.error("Gagal masuk dengan Google. Silakan coba lagi.");
      }
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("Terjadi kesalahan saat masuk.");
    } finally {
      setIsSigningIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      {/* Soft gradient base */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-primary/[0.02]" />
      
      {/* Background Map - perfectly centered with responsive sizing */}
      <div className="absolute inset-0 flex items-end justify-center pb-[5vh] sm:pb-[8vh] md:items-center md:pb-0">
        <img 
          src={indonesiaMap} 
          alt="" 
          className="w-[95vw] sm:w-[85vw] md:w-[75vw] lg:w-[65vw] xl:w-[55vw] max-w-5xl h-auto object-contain opacity-[0.15] dark:opacity-[0.08] select-none pointer-events-none"
        />
      </div>
      
      {/* Radial fade for card focus */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_30%,hsl(var(--background)/0.6)_60%,hsl(var(--background))_100%)]" />
      
      <Card className="w-full max-w-sm shadow-2xl border-border/40 backdrop-blur-lg bg-card/90 relative z-10">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <img 
              src={plnIconPlusLogo} 
              alt="PLN Icon Plus" 
              className="h-14 sm:h-16 w-auto object-contain" 
            />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">
              NOC RITEL
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Masuk untuk mengakses dashboard
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-4 pb-6">
          <Button 
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full h-11 text-sm font-medium gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
            variant="outline"
          >
            {isSigningIn ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {isSigningIn ? "Memproses..." : "Masuk dengan Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
