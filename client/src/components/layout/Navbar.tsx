import { Link, useLocation } from "wouter";
import { useUser, useLogout } from "@/hooks/use-auth";
import { 
  Home, 
  ClipboardList, 
  BarChart3, 
  Scissors, 
  LogOut, 
  Landmark, 
  Search, 
  ShoppingCart,
  Fingerprint,
  User,
  ShieldAlert,
  Menu,
  FileText,
  UserPlus
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import auraLogo from "@assets/AURA_1768346008566.png";
import { useState } from "react";
import { MasterPasswordGuard } from "@/components/MasterPasswordGuard";

export function Navbar() {
  const [, setLocation] = useLocation();
  const { data: user } = useUser();
  const logout = useLogout();
  const [guardOpen, setGuardOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  if (!user) return null;

  const handleNavigation = (url: string) => {
    // Rotas liberadas para todos sem senha master
    const freeRoutes = ["/app", "/caixa", "/ponto", "/cart"];
    
    if (user.username === "SkelleTu" || freeRoutes.includes(url)) {
      setLocation(url);
    } else {
      setPendingUrl(url);
      setGuardOpen(true);
    }
  };

  const navItems = [
    { title: "Dashboard", url: "/app", icon: Home },
    { title: "Ponto", url: "/ponto", icon: Fingerprint },
    { title: "Caixa", url: "/caixa", icon: ClipboardList },
    { title: "Financeiro", url: "/financeiro", icon: Landmark },
    { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
    { title: "Estoque", url: "/inventory", icon: Search },
    { title: "Fiscal", url: "/fiscal", icon: FileText },
    { title: "Etiquetas", url: "/admin/labels", icon: FileText },
    { title: "Monitoramento", url: "/admin/monitoring", icon: BarChart3 },
    { title: "Tablet", url: "/cart", icon: ShoppingCart },
  ];

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[98%] max-w-[1700px] bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-3 md:px-5 h-14 flex items-center justify-between shadow-2xl">
      <div className="flex items-center gap-3 overflow-hidden flex-1 mr-4">
        <div className="relative shrink-0 flex items-center justify-center">
          <Link href="/app" className="flex items-center">
            <img src={auraLogo} alt="Aura Logo" className="h-10 w-auto object-contain transition-transform duration-300 hover:scale-105 active:scale-95" />
          </Link>
        </div>

        <div className="hidden lg:flex items-center gap-0 overflow-x-auto no-scrollbar mask-fade-right pr-2 flex-1 justify-end">
          {navItems.map((item) => (
            <Button
              key={item.url}
              variant="ghost"
              className="text-zinc-400 hover:text-primary hover:bg-primary/10 px-2 h-9 flex items-center gap-1 font-bold uppercase italic text-[8.5px] tracking-tight transition-all shrink-0 no-default-hover-elevate"
              onClick={() => handleNavigation(item.url)}
            >
              <item.icon className="w-3 h-3" />
              <span>{item.title}</span>
            </Button>
          ))}
          <Button
            variant="ghost"
            className="text-zinc-400 hover:text-primary hover:bg-primary/10 px-2 h-9 flex items-center gap-1 font-bold uppercase italic text-[8.5px] tracking-tight transition-all shrink-0 no-default-hover-elevate"
            onClick={() => handleNavigation("/admin")}
          >
            <UserPlus className="w-3 h-3" />
            Admin
          </Button>
          <Button
            variant="ghost"
            className="text-zinc-400 hover:text-primary hover:bg-primary/10 px-2 h-9 flex items-center gap-1 font-bold uppercase italic text-[8.5px] tracking-tight transition-all shrink-0 no-default-hover-elevate mr-2"
            onClick={() => handleNavigation("/admin/master")}
          >
            <ShieldAlert className="w-3 h-3" />
            Mestre
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="lg:hidden text-white hover:bg-white/10"
              data-testid="button-mobile-menu"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-zinc-950 border-white/10 text-white z-[200]" align="end">
            <DropdownMenuLabel className="font-black uppercase italic text-[10px] tracking-widest text-zinc-500">Menu</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            {navItems.map((item) => (
              <DropdownMenuItem 
                key={item.url}
                className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors py-3"
                onClick={() => handleNavigation(item.url)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span className="font-bold uppercase italic text-[10px] tracking-widest">{item.title}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem 
              className="cursor-pointer text-red-500 hover:bg-red-500/10 transition-colors py-3"
              onClick={() => logout.mutate()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span className="font-bold uppercase italic text-[10px] tracking-widest">Sair do Sistema</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-all shrink-0">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <User className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="hidden xl:block">
                <p className="text-[9px] font-black text-white leading-none uppercase italic">{user.username}</p>
                <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">{user.role}</p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-zinc-950 border-white/10 text-white z-[200]" align="end">
            <DropdownMenuLabel className="font-black uppercase italic text-[10px] tracking-widest text-zinc-500">Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem 
              className="cursor-pointer text-red-500 hover:bg-red-500/10 transition-colors py-3"
              onClick={() => logout.mutate()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span className="font-bold uppercase italic text-[10px] tracking-widest">Sair do Sistema</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <MasterPasswordGuard 
        open={guardOpen}
        onOpenChange={setGuardOpen}
        onSuccess={() => pendingUrl && setLocation(pendingUrl)}
      />
    </nav>
  );
}
