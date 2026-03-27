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
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserMenu } from "@/components/UserMenu";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useTicketNotifications } from "@/hooks/useTicketNotifications";
import { ScrollToTop } from "@/components/ScrollToTop";
import { RouteScrollReset } from "@/components/RouteScrollReset";
import { NetworkStatus } from "@/components/NetworkStatus";
import plnIconPlusLogo from "@/assets/pln-icon-plus.png";
import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";

const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const TicketManagement = React.lazy(() => import("./pages/TicketManagement"));
const Teams = React.lazy(() => import("./pages/Teams"));
const FATList = React.lazy(() => import("./pages/FATList"));
const FDTList = React.lazy(() => import("./pages/FDTList"));
const OLTDeviceList = React.lazy(() => import("./pages/OLTDeviceList"));
const UPEList = React.lazy(() => import("./pages/UPEList"));
const BNGList = React.lazy(() => import("./pages/BNGList"));
const AKVList = React.lazy(() => import("./pages/AKVList"));
const ListNote = React.lazy(() => import("./pages/ListNote"));
const Report = React.lazy(() => import("./pages/Report"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Install = React.lazy(() => import("./pages/Install"));
const Login = React.lazy(() => import("./pages/Login"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const PendingApproval = React.lazy(() => import("./pages/PendingApproval"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/pending-approval" element={<PageTransition><PendingApproval /></PageTransition>} />
          <Route path="/" element={<ProtectedRoute><PageTransition><Dashboard /></PageTransition></ProtectedRoute>} />
          <Route path="/tickets" element={<ProtectedRoute><PageTransition><TicketManagement /></PageTransition></ProtectedRoute>} />
          <Route path="/teams" element={<ProtectedRoute><PageTransition><Teams /></PageTransition></ProtectedRoute>} />
          <Route path="/akv" element={<ProtectedRoute><PageTransition><AKVList /></PageTransition></ProtectedRoute>} />
          <Route path="/fat" element={<ProtectedRoute><PageTransition><FATList /></PageTransition></ProtectedRoute>} />
          <Route path="/fdt" element={<ProtectedRoute><PageTransition><FDTList /></PageTransition></ProtectedRoute>} />
          <Route path="/olt" element={<ProtectedRoute><PageTransition><OLTDeviceList /></PageTransition></ProtectedRoute>} />
          <Route path="/upe" element={<ProtectedRoute><PageTransition><UPEList /></PageTransition></ProtectedRoute>} />
          <Route path="/bng" element={<ProtectedRoute><PageTransition><BNGList /></PageTransition></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><PageTransition><Report /></PageTransition></ProtectedRoute>} />
          <Route path="/notes" element={<ProtectedRoute><PageTransition><ListNote /></PageTransition></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><PageTransition><Settings /></PageTransition></ProtectedRoute>} />
          <Route path="/install" element={<ProtectedRoute><PageTransition><Install /></PageTransition></ProtectedRoute>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function TicketNotificationProvider({ children }: { children: React.ReactNode }) {
  useTicketNotifications();
  return <>{children}</>;
}

function AppLayout() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";
  const isPendingPage = location.pathname === "/pending-approval";

  if (isLoginPage || isPendingPage) {
    return <AnimatedRoutes />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 h-12 sm:h-14 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 transition-shadow duration-200">
            <div className="flex h-12 sm:h-14 items-center px-2 sm:px-4 gap-2 sm:gap-3 justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <SidebarTrigger className="hover:bg-accent/50 active:scale-95 transition-all" />
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <img 
                    src={plnIconPlusLogo} 
                    alt="PLN Icon Plus" 
                    className="h-6 xs:h-7 sm:h-8 md:h-9 w-auto flex-shrink-0 object-contain" 
                  />
                  <span className="font-semibold text-xs xs:text-sm sm:text-base md:text-lg truncate hidden xs:inline bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    NOC RITEL
                  </span>
                </div>
              </div>
              <UserMenu />
            </div>
          </header>
          <main className="flex-1 p-2 sm:p-4 md:p-6 overflow-x-hidden overflow-y-auto scroll-smooth">
            <RouteScrollReset />
            <AnimatedRoutes />
          </main>
          <ScrollToTop />
        </div>
      </div>
    </SidebarProvider>
  );
}

const App = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <TooltipProvider>
            <AuthProvider>
              <Toaster />
              <Sonner position="top-right" />
              <BrowserRouter>
                <TicketNotificationProvider>
                  <AppLayout />
                </TicketNotificationProvider>
              </BrowserRouter>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
