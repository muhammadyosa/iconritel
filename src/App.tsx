import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

import { ThemeProvider } from "next-themes";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarFloatingTrigger } from "@/components/SidebarFloatingTrigger";
import { AppSidebar } from "@/components/AppSidebar";
import { PageTransition } from "@/components/PageTransition";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UserMenu } from "@/components/UserMenu";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useTicketNotifications } from "@/hooks/useTicketNotifications";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useSwipeToOpenSidebar } from "@/hooks/useSwipeSidebar";
import { TopNavTabs } from "@/components/TopNavTabs";
import { TabProvider, useOpenTabs, pathMap } from "@/contexts/TabContext";
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
const AutoConfig = React.lazy(() => import("./pages/AutoConfig"));
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

// Component map for tab-based rendering
const pageComponents: Record<string, React.LazyExoticComponent<React.ComponentType<any>>> = {
  "/": Dashboard,
  "/tickets": TicketManagement,
  "/teams": Teams,
  "/akv": AKVList,
  "/fat": FATList,
  "/fdt": FDTList,
  "/olt": OLTDeviceList,
  "/upe": UPEList,
  "/bng": BNGList,
  "/notes": ListNote,
  "/auto-config": AutoConfig,
  "/report": Report,
  "/settings": Settings,
};

// Non-tab routes (login, pending, install, 404)
function NonTabRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location} key={location.pathname}>
          <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
          <Route path="/pending-approval" element={<PageTransition><PendingApproval /></PageTransition>} />
          <Route path="/install" element={<ProtectedRoute><PageTransition><Install /></PageTransition></ProtectedRoute>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

// Renders all open tabs, keeping them mounted but hiding inactive ones
// to preserve in-progress form state, scroll position, and component state
// when switching between tabs.
function TabbedContent() {
  const location = useLocation();
  const { openTabs, activeTransition } = useOpenTabs();
  const currentPath = location.pathname;

  const isTabPath = currentPath in pageComponents;

  // Track every tab path that has ever been visited in this session so we
  // keep it mounted even after the user navigates away.
  const mountedPathsRef = React.useRef<Set<string>>(new Set());
  if (isTabPath) mountedPathsRef.current.add(currentPath);
  // Also keep all currently open tabs mounted.
  openTabs.forEach((t) => {
    if (pageComponents[t.path]) mountedPathsRef.current.add(t.path);
  });

  // Drop tabs that have been closed (no longer in openTabs) AND are not the
  // current path, so closing a tab actually resets its state next time.
  const openPathSet = new Set(openTabs.map((t) => t.path));
  const pathsToRender = Array.from(mountedPathsRef.current).filter(
    (p) => openPathSet.has(p) || p === currentPath
  );
  mountedPathsRef.current = new Set(pathsToRender);

  if (!isTabPath) {
    return <NonTabRoutes />;
  }

  return (
    <ProtectedRoute>
      <Suspense fallback={<PageLoader />}>
        {pathsToRender.map((path) => {
          const PageComponent = pageComponents[path];
          if (!PageComponent) return null;
          const isActive = path === currentPath;
          return (
            <div
              key={path}
              style={{ display: isActive ? undefined : "none" }}
              className={cn(
                "h-full",
                isActive && activeTransition === path && "animate-fade-in"
              )}
              aria-hidden={!isActive}
            >
              <PageComponent />
            </div>
          );
        })}
      </Suspense>
    </ProtectedRoute>
  );
}
function TicketNotificationProvider({ children }: { children: React.ReactNode }) {
  useTicketNotifications();
  return <>{children}</>;
}

function SwipeHandler() {
  useSwipeToOpenSidebar();
  return null;
}

function AppLayout() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";
  const isPendingPage = location.pathname === "/pending-approval";

  if (isLoginPage || isPendingPage) {
    return (
      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
            <Route path="/pending-approval" element={<PageTransition><PendingApproval /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    );
  }

  return (
    <SidebarProvider>
      <SwipeHandler />
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <AppSidebar />
        <SidebarFloatingTrigger />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 h-12 sm:h-14 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 transition-shadow duration-200">
            <div className="flex h-12 sm:h-14 items-center px-2 sm:px-4 gap-2 sm:gap-3 justify-between">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                {/* Spacer for mobile hamburger button */}
                <div className="w-8 md:hidden flex-shrink-0" />
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
          <TopNavTabs />
          <main className="flex-1 p-2 sm:p-4 md:p-6 overflow-x-hidden overflow-y-auto scroll-smooth">
            <TabbedContent />
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
                <NetworkStatus />
                <TicketNotificationProvider>
                  <TabProvider>
                    <AppLayout />
                  </TabProvider>
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
