import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { PageTransition } from "@/components/PageTransition";
import { AnimatePresence } from "framer-motion";
import plnIconPlusLogo from "@/assets/pln-icon-plus.png";
import Dashboard from "./pages/Dashboard";
import TicketManagement from "./pages/TicketManagement";
import Teams from "./pages/Teams";
import FATList from "./pages/FATList";
import FDTList from "./pages/FDTList";
import OLTDeviceList from "./pages/OLTDeviceList";
import UPEList from "./pages/UPEList";
import BNGList from "./pages/BNGList";
import AKVList from "./pages/AKVList";
import Report from "./pages/Report";
import Settings from "./pages/Settings";
import Install from "./pages/Install";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
        <Route path="/tickets" element={<PageTransition><TicketManagement /></PageTransition>} />
        <Route path="/teams" element={<PageTransition><Teams /></PageTransition>} />
        <Route path="/akv" element={<PageTransition><AKVList /></PageTransition>} />
        <Route path="/fat" element={<PageTransition><FATList /></PageTransition>} />
        <Route path="/fdt" element={<PageTransition><FDTList /></PageTransition>} />
        <Route path="/olt" element={<PageTransition><OLTDeviceList /></PageTransition>} />
        <Route path="/upe" element={<PageTransition><UPEList /></PageTransition>} />
        <Route path="/bng" element={<PageTransition><BNGList /></PageTransition>} />
        <Route path="/report" element={<PageTransition><Report /></PageTransition>} />
        <Route path="/settings" element={<PageTransition><Settings /></PageTransition>} />
        <Route path="/install" element={<PageTransition><Install /></PageTransition>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-right" />
          <BrowserRouter>
            <SidebarProvider>
              <div className="flex min-h-screen w-full overflow-x-hidden">
                <AppSidebar />
                <div className="flex-1 flex flex-col min-w-0">
                  <header className="sticky top-0 z-10 h-12 sm:h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="flex h-12 sm:h-14 items-center px-2 sm:px-4 gap-2 sm:gap-3">
                      <SidebarTrigger />
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <img 
                          src={plnIconPlusLogo} 
                          alt="PLN Icon Plus" 
                          className="h-6 xs:h-7 sm:h-8 md:h-9 w-auto flex-shrink-0 object-contain" 
                        />
                        <span className="font-semibold text-xs xs:text-sm sm:text-base md:text-lg truncate hidden xs:inline">
                          NOC RITEL
                        </span>
                      </div>
                    </div>
                  </header>
                  <main className="flex-1 p-2 sm:p-4 md:p-6 overflow-x-hidden overflow-y-auto">
                    <AnimatedRoutes />
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
