import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, LogOut, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { ParticleBackground } from "@/components/ParticleBackground";
import plnIconPlusLogo from "@/assets/pln-icon-plus-new.png";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function PendingApproval() {
  const { signOut, user } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

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
        // Force reload to re-evaluate auth state
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/30">
      <ParticleBackground />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <Card className="border-amber-500/30 bg-background/95 backdrop-blur shadow-xl">
          <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
            <img src={plnIconPlusLogo} alt="PLN Icon Plus" className="h-12 mx-auto" />
            
            <div className="space-y-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                <ShieldAlert className="h-8 w-8 text-amber-500" />
              </div>
              <h1 className="text-xl font-bold">Menunggu Persetujuan</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Akun Anda telah berhasil dibuat, namun memerlukan persetujuan dari <strong>Admin</strong> sebelum dapat mengakses sistem NOC RITEL.
              </p>
              <p className="text-xs text-muted-foreground">
                Silakan hubungi admin untuk mempercepat proses persetujuan.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                onClick={handleCheckStatus}
                disabled={isChecking}
                className="w-full"
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
                onClick={signOut}
                className="w-full text-muted-foreground"
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
