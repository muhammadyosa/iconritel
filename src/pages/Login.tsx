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

// Typing animation component
const TypingText = ({ text, delay = 0 }: { text: string; delay?: number }) => {
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayedText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(interval);
          // Hide cursor after typing is complete
          setTimeout(() => setShowCursor(false), 1000);
        }
      }, 120);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay]);

  return (
    <span className="relative">
      {displayedText}
      {showCursor && (
        <motion.span
          className="inline-block w-0.5 h-[1em] bg-cyan-400 ml-0.5 align-middle"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </span>
  );
};

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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(56, 189, 248, 0.3) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(56, 189, 248, 0.3) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />
      
      {/* Particle Background */}
      <ParticleBackground />

      {/* Radial glow behind card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 2 }}>
        <div className="w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Glass Card with Parallax */}
      <motion.div
        ref={cardRef}
        className="relative z-10 w-full max-w-sm"
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
        {/* Card glow border effect */}
        <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-500/50 via-blue-500/50 to-purple-500/50 rounded-2xl blur-sm opacity-60" />
        
        {/* Main card */}
        <div className="relative bg-slate-900/70 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Inner glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-2xl pointer-events-none" />
          
          {/* Content */}
          <div className="relative space-y-6">
            {/* Logos - Side by side with parallax */}
            <div className="flex flex-col items-center gap-6">
              {/* ICONNET Mascot */}
              <motion.div 
                className="relative group cursor-pointer"
                style={{ transform: "translateZ(40px)" }}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ scale: 1.08, y: -5, rotate: [0, -3, 3, 0] }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/40 via-teal-500/40 to-blue-500/40 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <img 
                  src={iconnetMascot} 
                  alt="ICONNET Mascot" 
                  className="relative h-28 sm:h-36 w-auto object-contain drop-shadow-[0_0_25px_rgba(56,189,248,0.5)] transition-all duration-300 group-hover:drop-shadow-[0_0_40px_rgba(56,189,248,0.7)]" 
                />
              </motion.div>

              {/* NOC RITEL Title with Enhanced Hover Animation */}
              <motion.div 
                className="text-center space-y-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.6 }}
                style={{ transform: "translateZ(30px)" }}
              >
                {/* Animated NOC RITEL */}
                <motion.div className="relative py-2">
                  {/* Glow effect behind text */}
                  <motion.div 
                    className="absolute inset-0 blur-2xl pointer-events-none"
                    animate={{ 
                      background: [
                        'radial-gradient(ellipse at center, rgba(56,189,248,0.3) 0%, transparent 70%)',
                        'radial-gradient(ellipse at center, rgba(139,92,246,0.3) 0%, transparent 70%)',
                        'radial-gradient(ellipse at center, rgba(56,189,248,0.3) 0%, transparent 70%)'
                      ]
                    }}
                    transition={{ duration: 4, repeat: Infinity }}
                  />
                  <h1 className="relative text-3xl sm:text-4xl font-black tracking-widest flex justify-center">
                    {"NOC RITEL".split("").map((char, index) => (
                      <motion.span
                        key={index}
                        className="inline-block cursor-pointer select-none"
                        initial={{ opacity: 0, y: 30, rotateX: -90 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        transition={{ 
                          duration: 0.5, 
                          delay: 0.8 + index * 0.08,
                          ease: [0.22, 1, 0.36, 1]
                        }}
                        whileHover={{ 
                          scale: 1.3, 
                          y: -8,
                          rotate: [0, -5, 5, 0],
                          transition: { duration: 0.3 }
                        }}
                        whileTap={{ scale: 0.9 }}
                        style={{
                          background: 'linear-gradient(180deg, #ffffff 0%, #67e8f9 50%, #06b6d4 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          textShadow: 'none',
                          filter: 'drop-shadow(0 0 8px rgba(56,189,248,0.5))',
                        }}
                      >
                        {char === " " ? "\u00A0\u00A0" : char}
                      </motion.span>
                    ))}
                  </h1>
                  {/* Animated underline */}
                  <motion.div 
                    className="h-0.5 mx-auto mt-3 rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: '100%', opacity: 1 }}
                    transition={{ duration: 0.8, delay: 1.8 }}
                  />
                </motion.div>

                <motion.p 
                  className="text-sm text-slate-400"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2.2, duration: 0.5 }}
                >
                  Masuk untuk mengakses dashboard
                </motion.p>
              </motion.div>
            </div>

            {/* Decorative line */}
            <motion.div 
              className="flex items-center gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.2 }}
            >
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
              <motion.div 
                className="w-1.5 h-1.5 rounded-full bg-cyan-400/60"
                animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
            </motion.div>

            {/* Login Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 2.3 }}
            >
              <Button 
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="w-full h-12 text-sm font-medium gap-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border-0 text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:shadow-cyan-500/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSigningIn ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#fff"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#fff"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#fff"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#fff"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                {isSigningIn ? "Memproses..." : "Masuk dengan Google"}
              </Button>
            </motion.div>

            {/* Footer decoration */}
            <motion.div 
              className="flex justify-center gap-1.5 pt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.5 }}
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-1 h-1 rounded-full bg-cyan-400/40"
                  animate={{
                    opacity: [0.4, 1, 0.4],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                />
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" style={{ zIndex: 5 }} />
    </div>
  );
}
