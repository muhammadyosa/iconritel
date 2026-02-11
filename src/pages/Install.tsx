import { useState, useEffect } from "react";
import { Download, Smartphone, Monitor, CheckCircle2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-primary/10 rounded-full">
            <Zap className="h-12 w-12 text-primary" />
          </div>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Install NOC RITEL</h1>
        <p className="text-muted-foreground mt-2">
          Pasang aplikasi untuk akses cepat dan penggunaan offline
        </p>
      </div>

      {isInstalled ? (
        <Card className="border-green-500/50 bg-green-500/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-8 w-8" />
              <div>
                <h3 className="font-semibold text-lg">Aplikasi Sudah Terinstall!</h3>
                <p className="text-sm opacity-80">
                  NOC RITEL sudah terpasang di perangkat Anda
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Android/Desktop Install */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Desktop & Android
              </CardTitle>
              <CardDescription>
                Klik tombol install untuk memasang aplikasi
              </CardDescription>
            </CardHeader>
            <CardContent>
              {deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full" size="lg">
                  <Download className="mr-2 h-5 w-5" />
                  Install Sekarang
                </Button>
              ) : (
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>Cara install dari browser:</p>
                  <ol className="list-decimal list-inside space-y-2">
                    <li>Klik menu browser (⋮ atau ⋯)</li>
                    <li>Pilih "Install app" atau "Add to Home screen"</li>
                    <li>Konfirmasi instalasi</li>
                  </ol>
                </div>
              )}
            </CardContent>
          </Card>

          {/* iOS Install */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                iPhone & iPad
              </CardTitle>
              <CardDescription>
                Tambahkan ke Home Screen dari Safari
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Cara install di iOS:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Buka di Safari (bukan Chrome)</li>
                  <li>
                    Tap tombol Share{" "}
                    <span className="inline-block px-1.5 py-0.5 bg-muted rounded text-xs">
                      ⬆️
                    </span>
                  </li>
                  <li>Scroll dan pilih "Add to Home Screen"</li>
                  <li>Tap "Add" di pojok kanan atas</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Keuntungan Install Aplikasi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Akses Cepat</h4>
                <p className="text-sm text-muted-foreground">
                  Buka langsung dari home screen
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Mode Offline</h4>
                <p className="text-sm text-muted-foreground">
                  Tetap bisa digunakan tanpa internet
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Monitor className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Fullscreen</h4>
                <p className="text-sm text-muted-foreground">
                  Tampilan layar penuh tanpa browser bar
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Smartphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium">Multi Device</h4>
                <p className="text-sm text-muted-foreground">
                  Bisa dipakai di HP, tablet, laptop
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
