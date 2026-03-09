import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, LogOut, RefreshCw } from "lucide-react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { ParticleBackground } from "@/components/ParticleBackground";
import plnIconPlusLogo from "@/assets/pln-icon-plus-new.png";
import iconnetLogo from "@/assets/iconnet-logo-new.png";
import indonesiaMap from "@/assets/indonesia-map.png";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PendingApproval() {
  const { signOut, user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { stiffness: 150, damping: 20 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => { mouseX.set(0); mouseY.set(0); };
  const handleCheckStatus = async () => {
    if (!user) return;
    setIsChecking(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (data?.is_approved) {
        toast.success("Akun telah disetujui! Mengalihkan...");
        window.location.href = "/";
      } else {
        toast.info("Akun belum disetujui. Hubungi admin.");
      }
    } catch {
      toast.error("Gagal memeriksa status");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a1628] to-slate-950">
      {/* Indonesia Map Background */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <img 
          src={indonesiaMap} 
          alt="" 
          className="w-full h-full opacity-[0.30]"
          style={{ filter: 'brightness(0.8) saturate(1)', objectFit: 'contain', objectPosition: 'center' }}
        />
      </div>

      <ParticleBackground />

      {/* Top Left - PLN Icon Plus Logo */}
      <motion.div 
        className="absolute top-4 left-4 sm:top-6 sm:left-6 z-20"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <img src={plnIconPlusLogo} alt="PLN Icon Plus" className="h-8 sm:h-10 w-auto object-contain drop-shadow-[0_0_10px_rgba(56,189,248,0.3)]" />
      </motion.div>

      {/* Top Right - ICONNET Logo */}
      <motion.div 
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <img src={iconnetLogo} alt="ICONNET" className="h-8 sm:h-10 w-auto object-contain drop-shadow-[0_0_10px_rgba(56,189,248,0.3)]" />
      </motion.div>

      {/* Radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 2 }}>
        <div className="w-[600px] h-[600px] bg-cyan-500/8 rounded-full blur-[120px]" />
      </div>

      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 1000 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <Card className="border-cyan-500/20 bg-slate-900/80 backdrop-blur-xl shadow-[0_0_40px_rgba(6,182,212,0.1)]">
          <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
            <div className="space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-amber-400" />
              </div>
              <h1 className="text-xl font-bold text-cyan-50">Menunggu Persetujuan</h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Akun Anda telah berhasil dibuat, namun memerlukan persetujuan dari <strong className="text-cyan-300">Admin</strong> sebelum dapat mengakses sistem NOC RITEL.
              </p>
              <p className="text-xs text-slate-500">
                Silakan hubungi admin untuk mempercepat proses persetujuan.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={handleCheckStatus}
                disabled={isChecking}
                className="w-full border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200"
              >
                {isChecking ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Cek Status Persetujuan
              </Button>
              <Button
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  signOut();
                }}
                className="w-full text-slate-500 hover:text-slate-300 relative z-20"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Keluar
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
