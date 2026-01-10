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
  Plus
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

  const navItems = [
    { title: "Início", url: "/", icon: Home },
    { title: "Caixa", url: "/caixa", icon: ClipboardList },
    { title: "Financeiro", url: "/financeiro", icon: Landmark, adminOnly: true },
    { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
    { title: "Estoque", url: "/inventory", icon: Search, adminOnly: true },
    { title: "Tablet Cliente", url: "/cart", icon: ShoppingCart },
    { title: "Barbearia", url: "/barber", icon: Scissors },
  ]

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
    </Sidebar>
  )
}
