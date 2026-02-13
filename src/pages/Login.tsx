import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { ParticleBackground } from "@/components/ParticleBackground";
import iconnetMascot from "@/assets/iconnet-mascot.png";
import plnIconPlusLogo from "@/assets/pln-icon-plus-new.png";
import iconnetLogo from "@/assets/iconnet-logo-new.png";
import indonesiaMap from "@/assets/indonesia-map.png";

export default function Login() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Parallax effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { stiffness: 150, damping: 20 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  useEffect(() => {
    if (!isLoading && user) {
      const timer = setTimeout(() => {
        navigate("/", { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [user, isLoading, navigate]);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (result.redirected) return;

      if (result.error) {
        console.error("OAuth error:", result.error);
        toast.error("Gagal masuk dengan Google. Silakan coba lagi.");
        setIsSigningIn(false);
        return;
      }

      navigate("/", { replace: true });
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("Terjadi kesalahan saat masuk.");
      setIsSigningIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a1628] to-slate-950">
      {/* Indonesia Map Background */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <img 
          src={indonesiaMap} 
          alt="" 
          className="w-full h-full opacity-[0.30]"
          style={{ filter: 'brightness(0.8) saturate(1)', objectFit: 'contain', objectPosition: 'center' }}
        />
      </div>

      {/* Particle Background */}
      <ParticleBackground />

      {/* Top Left - PLN Icon Plus Logo */}
      <motion.div 
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <img 
          src={plnIconPlusLogo} 
          alt="PLN Icon Plus" 
          className="h-8 sm:h-10 w-auto object-contain drop-shadow-[0_0_10px_rgba(56,189,248,0.3)]" 
        />
      </motion.div>

      {/* Top Right - ICONNET Logo */}
      <motion.div 
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <img 
          src={iconnetLogo} 
          alt="ICONNET" 
          className="h-8 sm:h-10 w-auto object-contain drop-shadow-[0_0_10px_rgba(56,189,248,0.3)]" 
        />
      </motion.div>

      {/* Radial glow behind card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 2 }}>
        <div className="w-[600px] h-[600px] bg-cyan-500/8 rounded-full blur-[120px]" />
      </div>

      {/* Content with Parallax */}
      <motion.div
        ref={cardRef}
        className="relative z-10 flex flex-col items-center gap-4"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          perspective: 1000,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* ICONNET Mascot */}
        <motion.div 
          className="relative group cursor-pointer"
          style={{ transform: "translateZ(40px)" }}
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ 
            opacity: 1, 
            y: [0, -8, 0], 
            scale: 1,
          }}
          transition={{ 
            opacity: { duration: 0.7, delay: 0.3 },
            scale: { duration: 0.7, delay: 0.3 },
            y: { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 },
          }}
          whileHover={{ scale: 1.1, rotate: [0, -2, 2, 0] }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/30 via-teal-500/30 to-blue-500/30 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <img 
            src={iconnetMascot} 
            alt="ICONNET Mascot" 
            className="relative h-20 sm:h-24 w-auto object-contain drop-shadow-[0_0_25px_rgba(56,189,248,0.5)] transition-all duration-300 group-hover:drop-shadow-[0_0_35px_rgba(56,189,248,0.7)]" 
          />
        </motion.div>

        {/* NOC RITEL Title */}
        <motion.div 
          className="text-center space-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          style={{ transform: "translateZ(30px)" }}
        >
          <motion.h1 
            className="text-xl sm:text-2xl font-extrabold tracking-[0.35em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-cyan-400 to-teal-300"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            style={{
              textShadow: '0 0 20px rgba(56,189,248,0.25)',
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            NOC RITEL
          </motion.h1>
          
          <motion.p 
            className="text-xs text-slate-400"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            Masuk untuk mengakses dashboard
          </motion.p>
        </motion.div>


        {/* Login Button */}
        <motion.div
          className="w-full max-w-[240px]"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 1.1 }}
        >
          <Button 
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full h-10 text-xs font-semibold gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/20 text-white shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.35)] hover:scale-[1.03] active:scale-[0.97] rounded-lg"
          >
            {isSigningIn ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {isSigningIn ? "Memproses..." : "Masuk dengan Google"}
          </Button>
        </motion.div>

      </motion.div>
    </div>
  );
}
