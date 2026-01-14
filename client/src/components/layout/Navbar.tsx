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
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import auraLogo from "@assets/AURA_1768346008566.png";

export function Navbar() {
  const [, setLocation] = useLocation();
  const { data: user } = useUser();
  const logout = useLogout();

  if (!user) return null;

  const navItems = [
    { title: "Dashboard", url: "/app", icon: Home },
    { title: "Ponto", url: "/ponto", icon: Fingerprint },
    { title: "Caixa", url: "/caixa", icon: ClipboardList },
    { title: "Financeiro", url: "/financeiro", icon: Landmark, adminOnly: true },
    { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
    { title: "Estoque", url: "/inventory", icon: Search, adminOnly: true },
    { title: "Tablet", url: "/cart", icon: ShoppingCart },
    { title: "Barbearia", url: "/barber", icon: Scissors },
  ];

  const filteredItems = navItems.filter(item => !item.adminOnly || user.role === "admin");

  return (
    <nav className="sticky top-0 z-[100] w-full bg-black/60 backdrop-blur-xl border-b border-white/10 px-4 md:px-8 h-20 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <div className="fixed left-0 top-0 z-[110] pointer-events-none">
          <Link href="/app" className="pointer-events-auto">
            <div className="relative group pl-10 -mt-3">
              <div className="absolute -inset-2 bg-primary/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <img src={auraLogo} alt="Aura Logo" className="h-[5.72rem] w-auto relative z-10" />
            </div>
          </Link>
        </div>

        <div className="pl-40 hidden lg:flex items-center gap-1">
          {filteredItems.map((item) => (
            <Button
              key={item.url}
              variant="ghost"
              className="text-zinc-400 hover:text-primary hover:bg-primary/5 px-4 h-12 flex items-center gap-2 font-bold uppercase italic text-[10px] tracking-widest transition-all"
              onClick={() => setLocation(item.url)}
            >
              <item.icon className="w-4 h-4" />
              {item.title}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-black text-white leading-none uppercase italic">{user.username}</p>
            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{user.role}</p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="icon"
          className="border-red-500/20 bg-red-500/5 hover:bg-red-500 hover:text-white text-red-500 transition-all rounded-full h-10 w-10"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </nav>
  );
}