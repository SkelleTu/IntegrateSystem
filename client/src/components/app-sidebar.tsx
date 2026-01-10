import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem 
} from "@/components/ui/sidebar"
import { 
  Home, 
  ClipboardList, 
  BarChart3, 
  Scissors, 
  LogOut, 
  Landmark, 
  Search, 
  ShoppingCart, 
  Lock, 
  UserPlus, 
  ShieldAlert, 
  Palette,
  Building2,
  Trash2,
  Plus,
  Fingerprint,
  History
} from "lucide-react"
import { useLocation } from "wouter"
import { useUser } from "@/hooks/use-auth"
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"

export function AppSidebar({ side = "right" }: { side?: "left" | "right" }) {
  const [, setLocation] = useLocation();
  const { data: user } = useUser();
  const { toast } = useToast();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [enterprisesOpen, setEnterprisesOpen] = useState(false);
  const [timeClockOpen, setTimeClockOpen] = useState(false);
  const [fingerprintScanning, setFingerprintScanning] = useState<{
    open: boolean;
    onScan: () => void;
    title: string;
    description: string;
  }>({
    open: false,
    onScan: () => {},
    title: "",
    description: ""
  });
  const [newBarber, setNewBarber] = useState({ username: "", password: "" });
  const [newEnterprise, setNewEnterprise] = useState({ name: "", slug: "" });

  const { data: appSettings } = useQuery<any>({
    queryKey: ["/api/settings"]
  });

  const [localSettings, setLocalSettings] = useState<any>({
    siteName: "",
    logoUrl: "",
    primaryColor: "#00FF66",
    backgroundColor: "#0a0a0b"
  });

  useEffect(() => {
    if (appSettings) {
      setLocalSettings(appSettings);
      document.documentElement.style.setProperty('--primary', appSettings.primaryColor);
      document.documentElement.style.setProperty('--radius', appSettings.borderRadius);
      if (appSettings.backgroundColor) {
        document.body.style.backgroundColor = appSettings.backgroundColor;
      }
      if (appSettings.bgImageUrl) {
        document.body.style.backgroundImage = `url(${appSettings.bgImageUrl})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundAttachment = 'fixed';
      } else {
        document.body.style.backgroundImage = 'none';
      }
    }
  }, [appSettings]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setLocalSettings((prev: any) => ({ ...prev, [field]: data.url }));
        toast({ title: "Upload concluído" });
      }
    } catch (err) {
      toast({ title: "Erro no upload", variant: "destructive" });
    }
  };

  const { data: enterprisesList, refetch: refetchEnterprises } = useQuery<any[]>({
    queryKey: ["/api/admin/enterprises"],
    enabled: enterprisesOpen && user?.username === "SkelleTu"
  });

  const createEnterpriseMutation = useMutation({
    mutationFn: async (data: typeof newEnterprise) => {
      const res = await apiRequest("POST", "/api/admin/enterprises", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Empresa criada com sucesso!" });
      setNewEnterprise({ name: "", slug: "" });
      refetchEnterprises();
    }
  });

  const deleteEnterpriseMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/enterprises/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Empresa removida com sucesso!" });
      refetchEnterprises();
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Sucesso", description: "Configurações artísticas atualizadas!" });
      setSettingsOpen(false);
    }
  });

  const { data: usersList, refetch: refetchUsers } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
    enabled: adminPanelOpen && user?.username === "SkelleTu"
  });

  const registerBarberMutation = useMutation({
    mutationFn: async (data: typeof newBarber) => {
      const res = await apiRequest("POST", "/api/admin/register-barber", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Barbeiro cadastrado com sucesso!" });
      setRegisterOpen(false);
      setNewBarber({ username: "", password: "" });
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Usuário removido com sucesso!" });
      refetchUsers();
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      setLocation("/login");
    },
  });

  const { data: timeClockStatus, refetch: refetchStatus } = useQuery<any>({
    queryKey: ["/api/time-clock/status"],
    enabled: !!user
  });

  const { data: timeClockHistory } = useQuery<any[]>({
    queryKey: ["/api/time-clock/history"],
    enabled: timeClockOpen
  });

  const registerFingerprintMutation = useMutation({
    mutationFn: async () => {
      try {
        const challenge = window.crypto.getRandomValues(new Uint8Array(32));
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "BarberFlow" },
            user: {
              id: window.crypto.getRandomValues(new Uint8Array(16)),
              name: user?.username || "user",
              displayName: user?.username || "User"
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required"
            },
            timeout: 60000
          }
        });
        if (!credential) throw new Error("Falha ao acessar sensor biométrico.");
        const fpId = (credential as any).id;
        const res = await apiRequest("POST", "/api/auth/register-fingerprint", { fingerprintId: fpId });
        return res.json();
      } catch (err: any) {
        throw new Error(err.name === "NotAllowedError" ? "Operação cancelada ou sensor não encontrado." : "Erro ao ler digital.");
      }
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Sua digital real foi vinculada!" });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
    },
    onError: (error: any) => toast({ title: "Falha", description: error.message, variant: "destructive" })
  });

  const registerClockMutation = useMutation({
    mutationFn: async (type: string) => {
      if (!user?.fingerprintId) throw new Error("Cadastre sua digital primeiro!");
      
      try {
        const challenge = window.crypto.getRandomValues(new Uint8Array(32));
        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            allowCredentials: [{
              id: Uint8Array.from(atob(user.fingerprintId.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
              type: "public-key"
            }],
            userVerification: "required",
            timeout: 60000
          }
        });
        if (!assertion) throw new Error("Verificação falhou.");
        const res = await apiRequest("POST", "/api/time-clock/register", { 
          type, 
          fingerprintId: user.fingerprintId 
        });
        return res.json();
      } catch (err: any) {
        throw new Error("Falha na validação da digital.");
      }
    },
    onSuccess: (data) => {
      const labels: Record<string, string> = {
        in: "Expediente Iniciado",
        break_start: "Intervalo Iniciado",
        break_end: "Expediente Retomado",
        out: "Expediente Finalizado"
      };
      toast({ title: labels[data.type] || "Ponto Registrado", description: "Ponto batido com sucesso!" });
      refetchStatus();
    },
    onError: (error: any) => toast({ title: "Erro", description: error.message, variant: "destructive" })
  });

  const getNextAction = () => {
    if (!timeClockStatus?.latest) return { type: "in", label: "Iniciar Expediente" };
    const lastType = timeClockStatus.latest.type;
    
    // Se o último ponto foi "in", o próximo é "break_start" (Intervalo)
    if (lastType === "in") return { type: "break_start", label: "Intervalo" };
    
    // Se o último ponto foi "break_start", o próximo é "break_end" (Retomar Expediente)
    if (lastType === "break_start") return { type: "break_end", label: "Retomar Expediente" };
    
    // Se o último ponto foi "break_end", o próximo é "out" (Término de Expediente)
    if (lastType === "break_end") return { type: "out", label: "Término de Expediente" };
    
    // Se o último ponto foi "out", o ciclo reinicia com "in" (Iniciar Expediente)
    return { type: "in", label: "Iniciar Expediente" };
  };

  const currentAction = getNextAction();

  const navItems = [
    { title: "Início", url: "/", icon: Home },
    { title: "Caixa", url: "/caixa", icon: ClipboardList },
    { title: "Financeiro", url: "/financeiro", icon: Landmark, adminOnly: true },
    { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
    { title: "Estoque", url: "/inventory", icon: Search, adminOnly: true },
    { title: "Tablet Cliente", url: "/cart", icon: ShoppingCart },
    { title: "Barbearia", url: "/barber", icon: Scissors },
  ]

  const timeClockItem = {
    title: "Registro de Ponto",
    icon: Fingerprint,
    onClick: () => setTimeClockOpen(true)
  };

  if (!user) return null;

  const handleNav = (url: string, adminOnly?: boolean) => {
    if (adminOnly && user.role !== "admin") {
      toast({
        title: "Acesso Negado",
        description: "Somente o administrador pode acessar esta área.",
        variant: "destructive"
      });
      return;
    }
    setLocation(url);
  };

  return (
    <Sidebar side={side}>
      <SidebarContent className="bg-zinc-950 text-white">
        <SidebarGroup>
          <SidebarGroupLabel className="text-zinc-500 uppercase font-black italic tracking-widest text-[10px]">Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isLocked = item.adminOnly && user.role !== "admin";
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      onClick={() => handleNav(item.url, item.adminOnly)}
                      className={`transition-colors py-6 relative group ${
                        isLocked 
                          ? "opacity-40 grayscale cursor-not-allowed hover:bg-transparent" 
                          : "hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="font-bold uppercase italic tracking-tighter">{item.title}</span>
                      {isLocked && (
                        <Lock className="w-3 h-3 absolute right-2 top-2 text-zinc-500" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={timeClockItem.onClick}
                  className="hover:bg-primary/10 hover:text-primary transition-colors py-6"
                >
                  <timeClockItem.icon className="w-5 h-5" />
                  <span className="font-bold uppercase italic tracking-tighter">{timeClockItem.title}</span>
                  {timeClockStatus?.active && (
                    <div className="absolute right-2 top-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {user.role === "admin" && (
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => setRegisterOpen(true)}
                    className="hover:bg-primary/10 hover:text-primary transition-colors py-6"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span className="font-bold uppercase italic tracking-tighter">Cadastrar Barbeiro</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {user.username === "SkelleTu" && (
                <>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setSettingsOpen(true)}
                      className="hover:bg-purple-500/10 hover:text-purple-500 transition-colors py-6"
                    >
                      <Palette className="w-5 h-5" />
                      <span className="font-bold uppercase italic tracking-tighter">Estética do App</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setAdminPanelOpen(true)}
                      className="hover:bg-yellow-500/10 hover:text-yellow-500 transition-colors py-6"
                    >
                      <ShieldAlert className="w-5 h-5" />
                      <span className="font-bold uppercase italic tracking-tighter">Gestão de Contas</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => setEnterprisesOpen(true)}
                      className="hover:bg-blue-500/10 hover:text-blue-500 transition-colors py-6"
                    >
                      <Building2 className="w-5 h-5" />
                      <span className="font-bold uppercase italic tracking-tighter">Gerenciar Empresas</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                  className="hover:bg-red-500/10 hover:text-red-500 transition-colors py-6 mt-4"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="font-bold uppercase italic tracking-tighter">Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">Cadastrar Novo Barbeiro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome de Usuário</Label>
              <Input 
                value={newBarber.username}
                onChange={(e) => setNewBarber({ ...newBarber, username: e.target.value })}
                className="bg-black border-zinc-800 focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label>Senha Temporária</Label>
              <Input 
                type="password"
                value={newBarber.password}
                onChange={(e) => setNewBarber({ ...newBarber, password: e.target.value })}
                className="bg-black border-zinc-800 focus:border-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRegisterOpen(false)}>Cancelar</Button>
            <Button 
              className="bg-primary text-black font-bold hover:bg-primary/80"
              onClick={() => registerBarberMutation.mutate(newBarber)}
              disabled={registerBarberMutation.isPending}
            >
              Confirmar Cadastro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adminPanelOpen} onOpenChange={setAdminPanelOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">Gestão de Contas (SkelleTu)</DialogTitle>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-2 py-4">
            {usersList?.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <div>
                  <p className="font-bold text-sm">{u.username}</p>
                  <p className="text-[10px] uppercase text-zinc-500">{u.role}</p>
                </div>
                {u.username !== "SkelleTu" && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-zinc-500 hover:text-red-500"
                    onClick={() => {
                      if(confirm(`Deletar conta de ${u.username}?`)) deleteUserMutation.mutate(u.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" className="w-full" onClick={() => setAdminPanelOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">Personalização Artística</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label>Nome do Estabelecimento</Label>
              <Input 
                value={localSettings.siteName}
                onChange={(e) => setLocalSettings({ ...localSettings, siteName: e.target.value })}
                className="bg-black border-zinc-800 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Logo (Upload)</Label>
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "logoUrl")}
                  className="bg-black border-zinc-800 cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <Label>Background (Upload)</Label>
                <Input 
                  type="file" 
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, "bgImageUrl")}
                  className="bg-black border-zinc-800 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Estilo das Bordas</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={localSettings.borderRadius === "0px" ? "default" : "outline"}
                  onClick={() => setLocalSettings({ ...localSettings, borderRadius: "0px" })}
                  className="text-xs uppercase font-black"
                >
                  Quadradas
                </Button>
                <Button 
                  variant={localSettings.borderRadius === "1rem" ? "default" : "outline"}
                  onClick={() => setLocalSettings({ ...localSettings, borderRadius: "1rem" })}
                  className="text-xs uppercase font-black"
                >
                  Arredondadas
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cor Primária</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color"
                    value={localSettings.primaryColor}
                    onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                    className="w-10 h-10 p-1 bg-black border-zinc-800"
                  />
                  <Input 
                    value={localSettings.primaryColor}
                    onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                    className="bg-black border-zinc-800 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fundo</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color"
                    value={localSettings.backgroundColor}
                    onChange={(e) => setLocalSettings({ ...localSettings, backgroundColor: e.target.value })}
                    className="w-10 h-10 p-1 bg-black border-zinc-800"
                  />
                  <Input 
                    value={localSettings.backgroundColor}
                    onChange={(e) => setLocalSettings({ ...localSettings, backgroundColor: e.target.value })}
                    className="bg-black border-zinc-800 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>Cancelar</Button>
            <Button 
              className="bg-primary text-black font-bold hover:bg-primary/80"
              onClick={() => updateSettingsMutation.mutate(localSettings)}
              disabled={updateSettingsMutation.isPending}
            >
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={enterprisesOpen} onOpenChange={setEnterprisesOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">Gestão de Empresas</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <div className="flex-1 space-y-2">
                <Input 
                  placeholder="Nome da Empresa"
                  value={newEnterprise.name}
                  onChange={(e) => setNewEnterprise({ ...newEnterprise, name: e.target.value, slug: e.target.value.toLowerCase().replace(/ /g, "-") })}
                  className="bg-black border-zinc-800 focus:border-primary text-xs"
                />
              </div>
              <Button 
                size="icon"
                className="bg-primary text-black hover:bg-primary/80"
                onClick={() => createEnterpriseMutation.mutate(newEnterprise)}
                disabled={createEnterpriseMutation.isPending || !newEnterprise.name}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {enterprisesList?.map(ent => (
                <div key={ent.id} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                  <div>
                    <p className="font-bold text-sm">{ent.name}</p>
                    <p className="text-[10px] uppercase text-zinc-500">slug: {ent.slug}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-zinc-500 hover:text-red-500"
                    onClick={() => {
                      if(confirm(`Deletar empresa ${ent.name}? Isso removerá todas as configurações dela.`)) deleteEnterpriseMutation.mutate(ent.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="w-full" onClick={() => setEnterprisesOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={timeClockOpen} onOpenChange={setTimeClockOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
              <Fingerprint className="text-primary" /> Registro de Ponto
            </DialogTitle>
          </DialogHeader>
          <div>
            <div className="relative group mb-4">
              <div className="absolute -inset-0.5 bg-primary/20 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
              <div className="relative flex flex-col items-center justify-center p-8 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl text-center">
                <p className="text-[10px] uppercase font-black tracking-[0.2em] text-primary/50 mb-4 italic">Status de Operação</p>
                
                <div className="relative mb-6">
                  <div className="absolute -inset-12 bg-primary/30 rounded-full blur-3xl animate-pulse"></div>
                  <div className="absolute -inset-6 bg-primary/10 rounded-full blur-2xl animate-[pulse_3s_ease-in-out_infinite]"></div>
                  
                  <div className="relative z-10 flex items-center justify-center p-4">
                    {/* Realistic Fingerprint Shape SVG */}
                      {/* Dynamic light beams/rays */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                          <div 
                            key={i}
                            className="absolute h-[2px] w-24 bg-gradient-to-r from-primary/60 via-primary/20 to-transparent origin-left opacity-0 animate-[beam_4s_linear_infinite]"
                            style={{ 
                              transform: `rotate(${angle}deg)`,
                              animationDelay: `${i * 0.5}s`
                            }}
                          />
                        ))}
                      </div>

                      <svg 
                        viewBox="0 0 100 140" 
                        className="w-full h-full text-primary drop-shadow-[0_0_25px_rgba(0,255,102,0.9)] animate-[pulse_2s_ease-in-out_infinite] relative z-20"
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.5" 
                        strokeLinecap="round"
                      >
                        {/* Outer loops - defining the finger shape */}
                        <path d="M50 10 C25 10 10 35 10 70 C10 110 25 130 50 130 C75 130 90 110 90 70 C90 35 75 10 50 10" strokeOpacity="0.3" />
                        
                        {/* Fingerprint ridges */}
                        <path d="M50 30 C35 30 25 45 25 70 C25 90 35 105 50 105 C65 105 75 90 75 70 C75 45 65 30 50 30" />
                        <path d="M50 45 C42 45 35 55 35 70 C35 85 42 95 50 95 C58 95 65 85 65 70 C65 55 58 45 50 45" />
                        <path d="M50 60 C47 60 44 65 44 70 C44 75 47 80 50 80 C53 80 56 75 56 70 C56 65 53 60 50 60" />
                        
                        {/* Lower ridge patterns */}
                        <path d="M20 90 C20 105 30 115 50 115 C70 115 80 105 80 90" />
                        <path d="M15 110 C15 120 30 125 50 125 C70 125 85 120 85 110" />
                        
                        {/* Scanning line animation */}
                        <rect x="5" y="0" width="90" height="2" className="fill-primary/50 animate-[bounce_3s_linear_infinite]" />
                      </svg>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-black italic uppercase text-white tracking-tighter mb-6 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                  {currentAction.label}
                </h3>
                
                {!user.fingerprintId ? (
                  <Button 
                    size="lg"
                    className="w-full font-black uppercase italic bg-yellow-500 text-black hover:bg-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all duration-300 hover:scale-[1.02]"
                    onClick={() => registerFingerprintMutation.mutate()}
                    disabled={registerFingerprintMutation.isPending}
                  >
                    Cadastrar Digital
                  </Button>
                ) : (
                  <Button 
                    size="lg"
                    className="w-full font-black uppercase italic bg-primary text-black hover:bg-primary/80 shadow-[0_0_20px_rgba(0,255,102,0.3)] transition-all duration-300 hover:scale-[1.02] flex items-center justify-center gap-2"
                    onClick={() => registerClockMutation.mutate(currentAction.type)}
                    disabled={registerClockMutation.isPending}
                  >
                    <Fingerprint className="w-5 h-5" />
                    {currentAction.label}
                  </Button>
                )}
                <div className="mt-6 pt-4 border-t border-white/5 w-full">
                  <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">
                    Operador: <span className="text-zinc-300">{user.username}</span>
                  </p>
                  <p className="text-[9px] text-zinc-600 mt-1 uppercase font-bold">
                    {user.fingerprintId ? "Biometria Ativa" : "Biometria Pendente"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-zinc-400">
                  <History className="w-4 h-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Linha do Tempo</span>
                </div>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-primary/20 to-transparent ml-4"></div>
              </div>
              
              <div className="max-h-[250px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {timeClockHistory?.map((clock) => {
                  const labels: Record<string, string> = {
                    in: "Entrada",
                    break_start: "Intervalo",
                    break_end: "Retorno",
                    out: "Saída"
                  };
                  const colors: Record<string, string> = {
                    in: "text-primary border-primary/20 bg-primary/5",
                    break_start: "text-yellow-500 border-yellow-500/20 bg-yellow-500/5",
                    break_end: "text-blue-500 border-blue-500/20 bg-blue-500/5",
                    out: "text-red-500 border-red-500/20 bg-red-500/5"
                  };
                  return (
                    <div key={clock.id} className={`p-4 border rounded-xl backdrop-blur-sm transition-all duration-300 hover:bg-white/5 ${colors[clock.type] || "border-white/10"}`}>
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-black italic uppercase text-[11px] tracking-tight">{labels[clock.type] || "Ponto"}</p>
                        <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
                      </div>
                      <p className="text-[10px] font-bold opacity-70">{new Date(clock.timestamp).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" className="w-full" onClick={() => setTimeClockOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={fingerprintScanning.open} onOpenChange={(o) => setFingerprintScanning(prev => ({ ...prev, open: o }))}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-2">
              <Fingerprint className="text-primary animate-pulse" /> {fingerprintScanning.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-10 flex flex-col items-center justify-center space-y-6 text-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-primary/20 flex items-center justify-center">
                <Fingerprint className="w-12 h-12 text-primary" />
              </div>
              <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
            <p className="text-sm font-bold text-zinc-400 max-w-[200px]">
              {fingerprintScanning.description}
            </p>
            <Button 
              className="bg-primary text-black font-black uppercase italic w-full"
              onClick={() => fingerprintScanning.onScan()}
            >
              Simular Toque no Sensor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  )
}
