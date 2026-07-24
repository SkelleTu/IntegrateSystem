import { Link, useLocation } from "wouter";
import { useUser, useLogout } from "@/hooks/use-auth";
import { 
  LayoutDashboard,
  ClipboardList, 
  TrendingUp,
  Landmark, 
  BarChart3, 
  Package,
  FileText,
  Tag,
  Activity,
  ShieldAlert,
  LogOut, 
  User,
  Menu,
  Fingerprint,
  Users,
  ChevronDown,
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
  const [location, setLocation] = useLocation();
  const { data: user } = useUser();
  const logout = useLogout();
  const [guardOpen, setGuardOpen] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  if (!user) return null;

  const handleNavigation = (url: string) => {
    const freeRoutes = ["/app", "/caixa", "/ponto", "/cart"];
    if (user.username === "SkelleTu" || freeRoutes.includes(url)) {
      setLocation(url);
    } else {
      setPendingUrl(url);
      setGuardOpen(true);
    }
  };

  const navItems = [
    { title: "Dashboard", url: "/app",               icon: LayoutDashboard },
    { title: "Caixa",     url: "/caixa",             icon: ClipboardList },
    { title: "Financeiro",url: "/financeiro",        icon: Landmark },
    { title: "Relatórios",url: "/relatorios",        icon: BarChart3 },
    { title: "Estoque",   url: "/inventory",         icon: Package },
    { title: "Fiscal",    url: "/fiscal",            icon: FileText },
    { title: "Etiquetas", url: "/admin/labels",      icon: Tag },
    { title: "Monitor",   url: "/admin/monitoring",  icon: Activity },
  ];

  const funcionariosItems = [
    { title: "Ponto", url: "/ponto", icon: Fingerprint },
  ];

  const isFuncionariosActive = funcionariosItems.some(i => location === i.url);

  const isActive = (url: string) => location === url;

  return (
    <nav className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] w-[98%] max-w-[1700px] h-12 flex items-center justify-between px-3 md:px-4 rounded-2xl shadow-2xl"
      style={{
        background: "linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(0,20,30,0.75) 100%)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(0,229,255,0.12)",
        boxShadow: "0 0 0 1px rgba(0,229,255,0.05), 0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* Left spacer (keeps right side balanced) */}
      <div className="shrink-0 w-4" />

      {/* Nav items — desktop */}
      <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center px-2">
        {/* Logo junto ao Dashboard */}
        <Link href="/app" className="flex items-center mr-1 shrink-0">
          <img
            src={auraLogo}
            alt="Aura"
            className="h-9 w-auto object-contain transition-all duration-300 hover:scale-105 hover:drop-shadow-[0_0_8px_rgba(0,229,255,0.6)] active:scale-95"
          />
        </Link>
        {navItems.map((item) => {
          const active = isActive(item.url);
          return (
            <button
              key={item.url}
              onClick={() => handleNavigation(item.url)}
              className="relative group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 shrink-0"
              style={{
                background: active
                  ? "linear-gradient(135deg, rgba(0,229,255,0.12), rgba(0,180,220,0.06))"
                  : "transparent",
                border: active
                  ? "1px solid rgba(0,229,255,0.3)"
                  : "1px solid transparent",
                boxShadow: active
                  ? "0 0 12px rgba(0,229,255,0.15), inset 0 0 8px rgba(0,229,255,0.04)"
                  : "none",
              }}
              onMouseEnter={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(0,229,255,0.06)";
                  (e.currentTarget as HTMLElement).style.border = "1px solid rgba(0,229,255,0.15)";
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.border = "1px solid transparent";
                }
              }}
            >
              <item.icon
                className="w-3 h-3 transition-all duration-200"
                style={{
                  color: active ? "#00e5ff" : "rgba(160,160,180,1)",
                  filter: active ? "drop-shadow(0 0 4px rgba(0,229,255,0.7))" : "none",
                }}
              />
              <span
                className="text-[9px] font-black uppercase tracking-widest transition-all duration-200"
                style={{
                  color: active ? "#00e5ff" : "rgba(160,160,180,1)",
                  textShadow: active ? "0 0 10px rgba(0,229,255,0.6)" : "none",
                  letterSpacing: "0.12em",
                }}
              >
                {item.title}
              </span>
              {/* Active underline glow */}
              {active && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/5 h-px rounded-full"
                  style={{ background: "linear-gradient(90deg, transparent, #00e5ff, transparent)" }}
                />
              )}
            </button>
          );
        })}

        {/* Funcionários dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200 shrink-0 outline-none"
              style={{
                background: isFuncionariosActive
                  ? "linear-gradient(135deg, rgba(0,229,255,0.12), rgba(0,180,220,0.06))"
                  : "transparent",
                border: isFuncionariosActive
                  ? "1px solid rgba(0,229,255,0.3)"
                  : "1px solid transparent",
                boxShadow: isFuncionariosActive
                  ? "0 0 12px rgba(0,229,255,0.15), inset 0 0 8px rgba(0,229,255,0.04)"
                  : "none",
              }}
              onMouseEnter={e => {
                if (!isFuncionariosActive) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(0,229,255,0.06)";
                  (e.currentTarget as HTMLElement).style.border = "1px solid rgba(0,229,255,0.15)";
                }
              }}
              onMouseLeave={e => {
                if (!isFuncionariosActive) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.border = "1px solid transparent";
                }
              }}
            >
              <Users
                className="w-3 h-3"
                style={{
                  color: isFuncionariosActive ? "#00e5ff" : "rgba(160,160,180,1)",
                  filter: isFuncionariosActive ? "drop-shadow(0 0 4px rgba(0,229,255,0.7))" : "none",
                }}
              />
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{
                  color: isFuncionariosActive ? "#00e5ff" : "rgba(160,160,180,1)",
                  textShadow: isFuncionariosActive ? "0 0 10px rgba(0,229,255,0.6)" : "none",
                  letterSpacing: "0.12em",
                }}
              >
                Funcionários
              </span>
              <ChevronDown
                className="w-2.5 h-2.5 transition-transform duration-200 group-data-[state=open]:rotate-180"
                style={{ color: isFuncionariosActive ? "#00e5ff" : "rgba(120,120,140,1)" }}
              />
              {isFuncionariosActive && (
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/5 h-px rounded-full"
                  style={{ background: "linear-gradient(90deg, transparent, #00e5ff, transparent)" }}
                />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-[160px] p-1.5 z-[200]"
            align="center"
            style={{
              background: "linear-gradient(135deg, rgba(0,0,0,0.93) 0%, rgba(0,15,25,0.96) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(0,229,255,0.18)",
              boxShadow: "0 0 0 1px rgba(0,229,255,0.05), 0 16px 40px rgba(0,0,0,0.7), 0 0 20px rgba(0,229,255,0.07)",
              borderRadius: "12px",
            }}
          >
            <DropdownMenuLabel
              className="px-2 pb-1 text-[8px] font-black uppercase tracking-[0.2em]"
              style={{ color: "rgba(0,229,255,0.4)" }}
            >
              Funcionários
            </DropdownMenuLabel>
            <DropdownMenuSeparator style={{ background: "rgba(0,229,255,0.1)", margin: "4px 0" }} />
            {funcionariosItems.map((item) => {
              const active = isActive(item.url);
              return (
                <DropdownMenuItem
                  key={item.url}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 outline-none focus:outline-none"
                  style={{
                    background: active ? "rgba(0,229,255,0.1)" : "transparent",
                    border: active ? "1px solid rgba(0,229,255,0.2)" : "1px solid transparent",
                  }}
                  onClick={() => handleNavigation(item.url)}
                >
                  <item.icon
                    className="w-3.5 h-3.5 shrink-0"
                    style={{
                      color: active ? "#00e5ff" : "rgba(160,160,180,1)",
                      filter: active ? "drop-shadow(0 0 4px rgba(0,229,255,0.6))" : "none",
                    }}
                  />
                  <span
                    className="text-[9px] font-black uppercase tracking-widest"
                    style={{
                      color: active ? "#00e5ff" : "rgba(200,200,220,1)",
                      textShadow: active ? "0 0 8px rgba(0,229,255,0.5)" : "none",
                      letterSpacing: "0.12em",
                    }}
                  >
                    {item.title}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Divider */}
        <div className="w-px h-5 mx-1 shrink-0" style={{ background: "rgba(0,229,255,0.15)" }} />

        {/* Mestre — destaque especial */}
        {(() => {
          const active = isActive("/admin/master");
          return (
            <button
              onClick={() => handleNavigation("/admin/master")}
              className="relative group flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 shrink-0"
              style={{
                background: active
                  ? "linear-gradient(135deg, rgba(255,60,60,0.18), rgba(200,0,80,0.08))"
                  : "linear-gradient(135deg, rgba(255,60,60,0.08), rgba(200,0,80,0.03))",
                border: active
                  ? "1px solid rgba(255,80,80,0.5)"
                  : "1px solid rgba(255,80,80,0.2)",
                boxShadow: active
                  ? "0 0 14px rgba(255,60,60,0.2), inset 0 0 6px rgba(255,60,60,0.05)"
                  : "none",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(255,60,60,0.15), rgba(200,0,80,0.08))";
                (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,80,80,0.4)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 12px rgba(255,60,60,0.2)";
              }}
              onMouseLeave={e => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(255,60,60,0.08), rgba(200,0,80,0.03))";
                  (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,80,80,0.2)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }
              }}
            >
              <ShieldAlert
                className="w-3 h-3 transition-all duration-200"
                style={{
                  color: active ? "#ff4444" : "rgba(255,100,100,0.9)",
                  filter: active ? "drop-shadow(0 0 4px rgba(255,60,60,0.8))" : "drop-shadow(0 0 2px rgba(255,60,60,0.4))",
                }}
              />
              <span
                className="text-[9px] font-black uppercase tracking-widest"
                style={{
                  color: active ? "#ff6666" : "rgba(255,120,120,0.9)",
                  textShadow: active ? "0 0 10px rgba(255,60,60,0.7)" : "0 0 6px rgba(255,60,60,0.3)",
                  letterSpacing: "0.12em",
                }}
              >
                Mestre
              </span>
            </button>
          );
        })()}
      </div>

      {/* Right side — mobile menu + user */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Mobile menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:bg-white/10 h-8 w-8"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-zinc-950 border-white/10 text-white z-[200]" align="end">
            <DropdownMenuLabel className="font-black uppercase text-[10px] tracking-widest text-zinc-500">Menu</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            {navItems.map((item) => (
              <DropdownMenuItem
                key={item.url}
                className="cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors py-3"
                onClick={() => handleNavigation(item.url)}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span className="font-bold uppercase text-[10px] tracking-widest">{item.title}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem
              className="cursor-pointer text-red-400 hover:bg-red-500/10 transition-colors py-3"
              onClick={() => handleNavigation("/admin/master")}
            >
              <ShieldAlert className="mr-2 h-4 w-4" />
              <span className="font-bold uppercase text-[10px] tracking-widest">Mestre</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem
              className="cursor-pointer text-red-500 hover:bg-red-500/10 transition-colors py-3"
              onClick={() => logout.mutate()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span className="font-bold uppercase text-[10px] tracking-widest">Sair do Sistema</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl cursor-pointer transition-all duration-200 shrink-0"
              style={{
                background: "rgba(0,229,255,0.05)",
                border: "1px solid rgba(0,229,255,0.12)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(0,229,255,0.1)";
                (e.currentTarget as HTMLElement).style.border = "1px solid rgba(0,229,255,0.25)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "rgba(0,229,255,0.05)";
                (e.currentTarget as HTMLElement).style.border = "1px solid rgba(0,229,255,0.12)";
              }}
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,180,220,0.1))",
                  border: "1px solid rgba(0,229,255,0.3)",
                  boxShadow: "0 0 8px rgba(0,229,255,0.2)",
                }}
              >
                <User className="w-3 h-3" style={{ color: "#00e5ff", filter: "drop-shadow(0 0 3px rgba(0,229,255,0.6))" }} />
              </div>
              <div className="hidden xl:block">
                <p className="text-[9px] font-black text-white uppercase tracking-widest leading-none" style={{ textShadow: "0 0 8px rgba(0,229,255,0.3)" }}>
                  {user.username}
                </p>
                <p className="text-[7px] font-bold uppercase tracking-widest mt-0.5" style={{ color: "rgba(0,229,255,0.5)" }}>
                  {user.role}
                </p>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-zinc-950 border-white/10 text-white z-[200]" align="end">
            <DropdownMenuLabel className="font-black uppercase text-[10px] tracking-widest text-zinc-500">Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/5" />
            <DropdownMenuItem
              className="cursor-pointer text-red-500 hover:bg-red-500/10 transition-colors py-3"
              onClick={() => logout.mutate()}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span className="font-bold uppercase text-[10px] tracking-widest">Sair do Sistema</span>
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
