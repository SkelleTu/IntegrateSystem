import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Scissors, LogOut, Monitor, Users } from "lucide-react";
import { useUser, useLogout } from "@/hooks/use-auth";
import { NeonButton } from "./NeonButton";

interface LayoutProps {
  children: ReactNode;
  isAdmin?: boolean;
}

export function Layout({ children, isAdmin = false }: LayoutProps) {
  const [location] = useLocation();
  const { data: user } = useUser();
  const { mutate: logout } = useLogout();

  return (
    <div className="min-h-screen bg-transparent text-foreground flex flex-col font-body selection:bg-primary/30 selection:text-primary">
      {isAdmin ? (
        <nav className="h-16 md:h-20 border-b border-white/10 flex items-center justify-between px-4 md:px-8 bg-black/30 backdrop-blur-lg sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Scissors className="text-primary w-5 h-5 md:w-8 md:h-8" />
            <span className="font-display font-bold text-lg md:text-2xl tracking-widest text-white">
              BARBER<span className="text-primary">ADMIN</span>
            </span>
          </div>
          
          <div className="flex items-center gap-3 md:gap-8 overflow-x-auto no-scrollbar py-2 max-w-[40%] md:max-w-none">
            <Link href="/admin" className={`text-[10px] md:text-sm font-black whitespace-nowrap hover:text-primary transition-colors tracking-tighter md:tracking-widest ${location === '/admin' ? 'text-primary' : 'text-white/60'}`}>
              DASHBOARD
            </Link>
            <Link href="/barber" className="text-[10px] md:text-sm font-black whitespace-nowrap text-white/60 hover:text-primary transition-colors flex items-center gap-1 tracking-tighter md:tracking-widest">
              <Monitor className="w-3 h-3 md:w-4 md:h-4" /> BARBER VIEW
            </Link>
             <Link href="/" className="text-[10px] md:text-sm font-black whitespace-nowrap text-white/60 hover:text-primary transition-colors flex items-center gap-1 tracking-tighter md:tracking-widest">
              <Users className="w-3 h-3 md:w-4 md:h-4" /> CUSTOMER VIEW
            </Link>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <span className="text-xs md:text-sm text-white/40 hidden lg:inline-block font-bold">
              {user?.username}
            </span>
            <NeonButton variant="ghost" className="px-2 py-1 md:px-4 md:py-2 text-[10px] md:text-xs h-auto uppercase font-black" onClick={() => logout()}>
              <LogOut className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" /> EXIT
            </NeonButton>
          </div>
        </nav>
      ) : null}

      <main className="flex-1 w-full relative bg-transparent overflow-x-hidden">
        <div className="max-w-[2560px] mx-auto w-full h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
