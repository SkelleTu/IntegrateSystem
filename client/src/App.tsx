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
// Admin page removed as it does not exist
// import Admin from "@/pages/Admin";
import DigitalMenu from "@/pages/DigitalMenu";
import BarberQueue from "@/pages/BarberQueue";
import Cashier from "@/pages/Cashier";
import CashierClose from "@/pages/CashierClose";
import Financeiro from "@/pages/Financeiro";
import Reports from "@/pages/Reports";
import Inventory from "@/pages/Inventory";
import ClientCart from "@/pages/ClientCart";
import TimeClock from "@/pages/TimeClock";
import FiscalConfig from "@/pages/fiscal/FiscalConfig";
import LabelSystem from "@/pages/LabelSystem";
import NotFound from "@/pages/not-found";
import { BackgroundIcons } from "@/components/BackgroundIcons";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Menu } from "lucide-react";
import auraLogo from "@assets/AURA_1768346008566.png";

import { Navbar } from "@/components/layout/Navbar";
import { StatusBar } from "@/components/layout/StatusBar";
import { Button } from "@/components/ui/button";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import MasterControl from "./pages/MasterControl";
import WindowsAppRunner from "./pages/admin/WindowsAppRunner";
import AuraWindows from "./pages/AuraWindows";
import Backup from "./pages/Backup";
import SetupEnterprise from "./pages/SetupEnterprise";
import { TourProvider } from "@/components/tour/TourContext";
import { TourEngine } from "@/components/tour/TourEngine";

function Router() {
  const { data: user, isLoading } = useUser();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const publicPages = ["/", "/quem-somos", "/solucoes", "/casos-de-sucesso", "/blog", "/contato", "/privacy", "/terms", "/login", "/register", "/setup"];
    const isPublicPage = publicPages.includes(location) || location.startsWith("/blog/");
    if (!isLoading && !user && !isPublicPage) {
      setLocation("/login?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }
    // Usuário logado mas sem estabelecimento → forçar setup
    if (!isLoading && user && !user.enterpriseId && location !== "/setup") {
      setLocation("/setup");
    }
  }, [user, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  // Routes that should be full screen without the main layout
  const isAuthPage = ["/login", "/register", "/setup"].includes(location);

  if (isAuthPage) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={LandingPage} />
        <Route path="/setup" component={SetupEnterprise} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  const isCashierPage = location === "/caixa" || location === "/financeiro" || location === "/relatorios";

  return (
    <div className={`flex h-screen w-full ${isCashierPage ? "overflow-hidden" : ""}`}>
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <main className={`flex-1 relative ${isCashierPage ? "overflow-hidden" : "overflow-y-auto custom-scrollbar"}`}>
          <Switch>
            <Route path="/" component={LandingPage} />
            <Route path="/quem-somos" component={AboutUs} />
            <Route path="/solucoes" component={Solutions} />
            <Route path="/casos-de-sucesso" component={SuccessCases} />
            <Route path="/privacy" component={PrivacyPolicy} />
            <Route path="/terms" component={TermsOfService} />
            <Route path="/blog" component={Blog} />
            <Route path="/blog/:id" component={Blog} />
            <Route path="/contato" component={Contact} />
            <Route path="/app" component={Home} />
            <Route path="/barber" component={BarberHome} />
            <Route path="/menu" component={DigitalMenu} />
            <Route path="/barber-queue" component={BarberQueue} />
            <Route path="/ponto" component={TimeClock} />
            <Route path="/caixa" component={Cashier} />
            <Route path="/caixa/fechar" component={CashierClose} />
            <Route path="/financeiro" component={Financeiro} />
            <Route path="/relatorios" component={Reports} />
            <Route path="/inventory" component={Inventory} />
            <Route path="/fiscal" component={FiscalConfig} />
            <Route path="/admin/labels" component={LabelSystem} />
            <Route path="/admin/monitoring" component={MasterControl} />
            <Route path="/cart" component={ClientCart} />
            <Route path="/admin/master" component={MasterControl} />
            <Route path="/admin/windows-app" component={WindowsAppRunner} />
            <Route path="/aura-windows" component={AuraWindows} />
            <Route path="/backup" component={Backup} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function LandingNavigation() {
  const [location, setLocation] = useLocation();
  const { data: user } = useUser();
  const isLandingPage = ["/", "/quem-somos", "/solucoes", "/casos-de-sucesso", "/blog", "/contato", "/privacy", "/terms"].includes(location);

  if (!isLandingPage || user) return null;

  const navLinks = [
    { href: "/", label: "Início" },
    { href: "/quem-somos", label: "Quem Somos" },
    { href: "/solucoes", label: "Soluções" },
    { href: "/casos-de-sucesso", label: "Impacto Aura" },
    { href: "/blog", label: "Insights" },
    { href: "/contato", label: "Contato" },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-[100] px-4 md:px-6 py-3 flex items-center justify-between border-b border-white/5 bg-black/50 backdrop-blur-md">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        <img src={auraLogo} alt="Aura Logo" className="h-10 md:h-14 w-auto" />
      </div>

      {/* Desktop nav — only shows on large screens where all items fit */}
      <div className="hidden lg:flex items-center gap-6 xl:gap-8">
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-zinc-400 hover:text-white text-[11px] font-bold uppercase tracking-widest transition-colors whitespace-nowrap"
          >
            {link.label}
          </a>
        ))}
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Desktop auth buttons */}
        <div className="hidden lg:flex items-center gap-4">
          <a href="/login" className="text-white font-bold text-xs uppercase tracking-widest hover:text-primary transition-colors whitespace-nowrap">
            Entrar
          </a>
          <a href="/register" className="bg-primary text-white font-black text-xs uppercase tracking-widest px-6 py-2 rounded-md hover:scale-105 transition-transform shadow-[0_0_20px_rgba(0,229,255,0.3)] whitespace-nowrap">
            Assinar
          </a>
        </div>

        {/* Mobile/Tablet: compact auth + hamburger */}
        <div className="lg:hidden flex items-center gap-2">
          <a href="/login" className="text-white font-bold text-[10px] uppercase tracking-widest hover:text-primary transition-colors whitespace-nowrap">
            Entrar
          </a>
          <a href="/register" className="bg-primary text-white font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-md shadow-[0_0_15px_rgba(0,229,255,0.3)] whitespace-nowrap">
            Assinar
          </a>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-9 w-9 shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-zinc-950 border-white/10 p-0 w-[280px] z-[99999]">
              <div className="flex flex-col p-6 gap-6">
                <div className="flex flex-col gap-4">
                  <p className="text-primary text-[10px] tracking-[0.4em] font-bold uppercase mb-2">Navegação</p>
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="text-lg font-bold text-white/70 hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
                <div className="h-[1px] w-full bg-white/5" />
                <div className="flex flex-col gap-4">
                  <p className="text-primary text-[10px] tracking-[0.4em] font-bold uppercase mb-2">Acesso</p>
                  <Button
                    variant="outline"
                    className="w-full justify-start border-white/10 text-white font-bold uppercase tracking-widest text-xs h-12"
                    onClick={() => setLocation("/login")}
                  >
                    Entrar
                  </Button>
                  <Button
                    className="w-full justify-start bg-primary text-white font-black uppercase tracking-widest text-xs h-12"
                    onClick={() => setLocation("/register")}
                  >
                    Assinar Agora
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

function AppContent() {
  const { data: user } = useUser();
  const [location] = useLocation();
  const isLandingPage = ["/", "/quem-somos", "/solucoes", "/casos-de-sucesso", "/blog", "/contato", "/privacy", "/terms"].includes(location);
  const isCashierPage = location === "/caixa" || location === "/financeiro" || location === "/relatorios";

  return (
    <div className={`relative min-h-screen w-full bg-black pb-8 ${isCashierPage ? "overflow-hidden" : "overflow-x-hidden"}`}>
      <BackgroundIcons />
      <div className="flex flex-col w-full bg-transparent relative z-10 min-h-screen">
        <main className={`flex-1 relative bg-transparent flex flex-col ${!isLandingPage && !isCashierPage ? "mb-12 sm:mb-0" : ""}`}>
          <LandingNavigation />
          {user && !isLandingPage && location !== "/setup" && <Navbar />}
          <Router />
        </main>
      </div>
      <Toaster />
      {user && <StatusBar />}
      {/* Floating Mini Logo Overlay */}
      <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none opacity-20 hover:opacity-40 transition-opacity duration-500 hidden sm:block">
        <img 
          src={auraLogo} 
          alt="Aura Logo Overlay" 
          className="w-12 h-auto grayscale brightness-200"
        />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TourProvider>
          <AppContent />
          <TourEngine />
        </TourProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
