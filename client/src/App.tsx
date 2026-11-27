import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUser } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import LandingPage from "@/pages/LandingPage";










// Admin page removed as it does not exist
// import Admin from "@/pages/Admin";











import NotFound from "@/pages/not-found";
import { BackgroundIcons } from "@/components/BackgroundIcons";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Menu } from "lucide-react";
const auraLogo = "/aura-system-logo.webp?v=1";

const AboutUs = lazy(() => import("@/pages/AboutUs"));
const Solutions = lazy(() => import("@/pages/Solutions"));
const SuccessCases = lazy(() => import("@/pages/SuccessCases"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("@/pages/TermsOfService"));
const Blog = lazy(() => import("@/pages/Blog"));
const Contact = lazy(() => import("@/pages/Contact"));
const Home = lazy(() => import("@/pages/Home"));
const BarberHome = lazy(() => import("@/pages/BarberHome"));
const Login = lazy(() => import("@/pages/Login"));
const DigitalMenu = lazy(() => import("@/pages/DigitalMenu"));
const BarberQueue = lazy(() => import("@/pages/BarberQueue"));
const Cashier = lazy(() => import("@/pages/Cashier"));
const CashierClose = lazy(() => import("@/pages/CashierClose"));
const Financeiro = lazy(() => import("@/pages/Financeiro"));
const Reports = lazy(() => import("@/pages/Reports"));
const Inventory = lazy(() => import("@/pages/Inventory"));
const ClientCart = lazy(() => import("@/pages/ClientCart"));
const TimeClock = lazy(() => import("@/pages/TimeClock"));
import FiscalConfig from "@/pages/fiscal/FiscalConfig";
const LabelSystem = lazy(() => import("@/pages/LabelSystem"));
import MasterControl from "./pages/MasterControl";
import CreditoInterno from "./pages/CreditoInterno";
const AccountBranches = lazy(() => import("./pages/AccountBranches"));
import Monitoring from "./pages/Monitoring";
const WindowsAppRunner = lazy(() => import("./pages/admin/WindowsAppRunner"));
const AuraWindows = lazy(() => import("./pages/AuraWindows"));
const Backup = lazy(() => import("./pages/Backup"));
const SetupEnterprise = lazy(() => import("./pages/SetupEnterprise"));
const MarketingHub = lazy(() => import("./pages/MarketingHub"));
const RendaVariavel = lazy(() => import("./pages/RendaVariavel"));

function RouteLoading() {
  return (
    <div className="min-h-[50vh] w-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  );
}


import { Navbar } from "@/components/layout/Navbar";
import { MasterAuthorizationDialog } from "@/components/MasterAuthorizationDialog";
import { StatusBar } from "@/components/layout/StatusBar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";







import { TourProvider } from "@/components/tour/TourContext";
import { TourEngine } from "@/components/tour/TourEngine";

function Router() {
  const { data: user, isLoading, error } = useUser();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const publicPages = ["/", "/quem-somos", "/solucoes", "/casos-de-sucesso", "/blog", "/contato", "/privacy", "/terms", "/login", "/register", "/setup"];
    const isPublicPage = publicPages.includes(location) || location.startsWith("/blog/");
    if (!isLoading && !user && !isPublicPage) {
      setLocation("/login?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }
    // Somente contas que podem criar/selecionar estabelecimento devem entrar no setup.
    // Contas subordinadas sem vínculo são bloqueadas em modo de recuperação, sem permitir
    // que o fluxo tente criar um estabelecimento próprio.
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

  if (error) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/70 p-6 text-center text-white backdrop-blur-xl">
          <h1 className="text-lg font-black">Não foi possível validar a sessão</h1>
          <p className="mt-2 text-sm text-zinc-400">{error instanceof Error ? error.message : "O servidor não respondeu corretamente."}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-black text-white transition hover:opacity-90"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Routes that should be full screen without the main layout
  const isAuthPage = ["/login", "/register", "/setup"].includes(location);

  if (isAuthPage) {
    return (
      <Suspense fallback={<RouteLoading />}>
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/register" component={LandingPage} />
          <Route path="/setup" component={SetupEnterprise} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    );
  }

  const isCashierPage = location === "/caixa" || location === "/financeiro" || location === "/relatorios";
  const isRendaVariavelPage = location === "/renda-variavel";
  const isImmersivePage = isCashierPage || isRendaVariavelPage;

  return (
    <div className={`flex h-screen w-full ${isImmersivePage ? "overflow-hidden" : ""}`}>
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <main className={`aura-module-theme flex-1 relative ${isImmersivePage ? "overflow-hidden" : "overflow-y-auto custom-scrollbar"} ${["/financeiro", "/inventory", "/admin/monitoring", "/renda-variavel"].includes(location) ? "pt-20" : ""}`}>
          <Suspense fallback={<RouteLoading />}>
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
            <Route path="/admin/monitoring" component={Monitoring} />
            <Route path="/cart" component={ClientCart} />
            <Route path="/admin/master" component={MasterControl} />
            <Route path="/admin/credito-interno" component={CreditoInterno} />
            <Route path="/admin/account-branches" component={AccountBranches} />
            <Route path="/admin/windows-app" component={WindowsAppRunner} />
            <Route path="/aura-windows" component={AuraWindows} />
            <Route path="/backup" component={Backup} />\n            <Route path="/database" component={DatabaseManager} />
            <Route path="/marketing" component={MarketingHub} />
            <Route path="/renda-variavel" component={RendaVariavel} />
            <Route component={NotFound} />
          </Switch>
          </Suspense>
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
      <div className="flex items-center gap-2 shrink-0">
        <img src={auraLogo} alt="Aura Logo" className="h-10 md:h-14 w-auto" />
        <span className="text-white font-black text-base md:text-xl tracking-[-0.03em] drop-shadow-[0_0_14px_rgba(0,229,255,0.28)]">Aura System</span>
      </div>
      <div className="hidden lg:flex items-center gap-6 xl:gap-8">
        {navLinks.map((link) => (
          <a key={link.href} href={link.href} className="text-zinc-400 hover:text-white text-[11px] font-bold uppercase tracking-widest transition-colors whitespace-nowrap">
            {link.label}
          </a>
        ))}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden lg:flex items-center gap-4">
          <a href="/login" className="text-white font-bold text-xs uppercase tracking-widest hover:text-primary transition-colors whitespace-nowrap">Entrar</a>
          <a href="/register" className="bg-primary text-white font-black text-xs uppercase tracking-widest px-6 py-2 rounded-md hover:scale-105 transition-transform shadow-[0_0_20px_rgba(0,229,255,0.3)] whitespace-nowrap">Assinar</a>
        </div>
        <div className="lg:hidden flex items-center gap-2">
          <a href="/login" className="text-white font-bold text-[10px] uppercase tracking-widest hover:text-primary transition-colors whitespace-nowrap">Entrar</a>
          <a href="/register" className="bg-primary text-white font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-md shadow-[0_0_15px_rgba(0,229,255,0.3)] whitespace-nowrap">Assinar</a>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-9 w-9 shrink-0"><Menu className="w-5 h-5" /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-zinc-950 border-white/10 p-0 w-[280px] z-[99999]">
              <div className="flex flex-col p-6 gap-6">
                <div className="flex flex-col gap-4">
                  <p className="text-primary text-[10px] tracking-[0.4em] font-bold uppercase mb-2">Navegação</p>
                  {navLinks.map((link) => <a key={link.href} href={link.href} className="text-lg font-bold text-white/70 hover:text-primary transition-colors">{link.label}</a>)}
                </div>
                <div className="h-[1px] w-full bg-white/5" />
                <div className="flex flex-col gap-4">
                  <p className="text-primary text-[10px] tracking-[0.4em] font-bold uppercase mb-2">Acesso</p>
                  <Button variant="outline" className="w-full justify-start border-white/10 text-white font-bold uppercase tracking-widest text-xs h-12" onClick={() => setLocation("/login")}>Entrar</Button>
                  <Button className="w-full justify-start bg-primary text-white font-black uppercase tracking-widest text-xs h-12" onClick={() => setLocation("/register")}>Assinar Agora</Button>
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
  const isRendaVariavelPage = location === "/renda-variavel";
  const isImmersivePage = isCashierPage || isRendaVariavelPage;

  return (
    <div className={`relative min-h-screen w-full bg-black ${isImmersivePage ? "overflow-hidden pb-0" : "overflow-x-hidden pb-8"}`}>
      <BackgroundIcons />
      <div className="flex flex-col w-full bg-transparent relative z-10 min-h-screen">
        <main className={`flex-1 relative bg-transparent flex flex-col ${!isLandingPage && !isImmersivePage ? "mb-12 sm:mb-0" : ""}`}>
          <LandingNavigation />
          {user && !isLandingPage && location !== "/setup" && <Navbar />}
          <Router />
        </main>
      </div>
      <Toaster />
      <MasterAuthorizationDialog />
      {user && <StatusBar />}
      <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none opacity-20 hover:opacity-40 transition-opacity duration-500 hidden sm:block">
        <img src={auraLogo} alt="Aura Logo Overlay" className="w-12 h-auto grayscale brightness-200" />
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
