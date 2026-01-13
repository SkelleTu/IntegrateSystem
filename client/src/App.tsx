import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUser } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import LandingPage from "@/pages/LandingPage";
import Home from "@/pages/Home";
import BarberHome from "@/pages/BarberHome";
import Login from "@/pages/Login";
import Admin from "@/pages/Admin";
import DigitalMenu from "@/pages/DigitalMenu";
import BarberQueue from "@/pages/BarberQueue";
import Cashier from "@/pages/Cashier";
import Financeiro from "@/pages/Financeiro";
import Reports from "@/pages/Reports";
import Inventory from "@/pages/Inventory";
import ClientCart from "@/pages/ClientCart";
import TimeClock from "@/pages/TimeClock";
import NotFound from "@/pages/not-found";
import { BackgroundIcons } from "@/components/BackgroundIcons";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Menu } from "lucide-react";
import auraLogo from "@assets/AURA_1768346008566.png";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { data: user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login?redirect=" + encodeURIComponent(window.location.pathname));
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <Component {...rest} />;
}

function Router() {
  const { data: user, isLoading } = useUser();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/app" component={Home} />
      <Route path="/barber" component={BarberHome} />
      <Route path="/login" component={Login} />
      <Route path="/menu" component={DigitalMenu} />
      <Route path="/barber-queue" component={BarberQueue} />
      <Route path="/ponto">
        {() => <ProtectedRoute component={TimeClock} />}
      </Route>
      <Route path="/admin">
        {() => <ProtectedRoute component={Admin} />}
      </Route>
      <Route path="/caixa">
        {() => <ProtectedRoute component={Cashier} />}
      </Route>
      <Route path="/financeiro">
        {() => <ProtectedRoute component={Financeiro} />}
      </Route>
      <Route path="/relatorios">
        {() => <ProtectedRoute component={Reports} />}
      </Route>
      <Route path="/inventory">
        {() => <ProtectedRoute component={Inventory} />}
      </Route>
      <Route path="/cart" component={ClientCart} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="relative min-h-screen w-full bg-transparent overflow-x-hidden pb-safe">
          <BackgroundIcons />
                <SidebarProvider defaultOpen={false}>
                  <div className="flex w-full bg-transparent relative z-10 min-h-screen">
                    <AppSidebar side="right" />
                    <div className="flex-1 flex flex-col min-w-0 bg-transparent min-h-screen">
                      <header className="fixed top-4 right-4 z-[9999]">
                        <SidebarTrigger data-testid="button-sidebar-toggle" className="text-white hover:text-primary transition-colors bg-black/60 backdrop-blur-xl border border-white/20 h-14 w-14 rounded-full shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center">
                          <Menu className="w-7 h-7" />
                        </SidebarTrigger>
                      </header>
                      <main className="flex-1 relative bg-transparent flex flex-col mb-12 sm:mb-0">
                        <Router />
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
        </div>
        <Toaster />
      {/* Floating Mini Logo Overlay */}
      <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none opacity-20 hover:opacity-40 transition-opacity duration-500 hidden sm:block">
        <img 
          src={auraLogo} 
          alt="Aura Logo Overlay" 
          className="w-12 h-auto grayscale brightness-200"
        />
      </div>
    </TooltipProvider>
    </QueryClientProvider>
  );
}
