import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUser } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import LandingPage from "@/pages/LandingPage";
import AboutUs from "@/pages/AboutUs";
import Solutions from "@/pages/Solutions";
import SuccessCases from "@/pages/SuccessCases";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import Blog from "@/pages/Blog";
import Contact from "@/pages/Contact";
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

import MasterControl from "./pages/MasterControl";

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
      <Route path="/quem-somos" component={AboutUs} />
      <Route path="/solucoes" component={Solutions} />
      <Route path="/casos-de-sucesso" component={SuccessCases} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/blog" component={Blog} />
      <Route path="/contato" component={Contact} />
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
      
      <Route path="/admin/master">
        {() => <ProtectedRoute component={MasterControl} />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function LandingNavigation() {
  const [location] = useLocation();
  const { data: user } = useUser();
  const isLandingPage = ["/", "/quem-somos", "/solucoes", "/casos-de-sucesso", "/blog", "/contato", "/privacy", "/terms"].includes(location);

  if (!isLandingPage || user) return null;

  return (
    <nav className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/50 backdrop-blur-md">
      <div className="flex items-center gap-2 pl-4 -mt-1">
        <img src={auraLogo} alt="Aura Logo" className="h-[4.33rem] w-auto" />
      </div>
      <div className="hidden md:flex items-center gap-8">
        <a href="/" className="text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Início</a>
        <a href="/quem-somos" className="text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Quem Somos</a>
        <a href="/solucoes" className="text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Soluções</a>
        <a href="/casos-de-sucesso" className="text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Impacto Aura</a>
        <a href="/blog" className="text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Blog</a>
        <a href="/contato" className="text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Contato</a>
      </div>
      <div className="flex items-center gap-4">
        <a href="/login" className="text-white font-bold text-xs uppercase tracking-widest hover:text-primary transition-colors">Entrar</a>
        <a href="/register" className="bg-primary text-white font-black text-xs uppercase tracking-widest px-6 py-2 rounded-md hover:scale-105 transition-transform shadow-[0_0_20px_rgba(0,229,255,0.3)]">Assinar</a>
      </div>
    </nav>
  );
}

import { Navbar } from "@/components/layout/Navbar";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="relative min-h-screen w-full bg-black overflow-x-hidden pb-safe">
          <BackgroundIcons />
          <div className="flex flex-col w-full bg-transparent relative z-10 min-h-screen">
            <main className="flex-1 relative bg-transparent flex flex-col mb-12 sm:mb-0">
              <LandingNavigation />
              <Navbar />
              <Router />
            </main>
          </div>
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
