import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Users, 
  LogIn, 
  LogOut, 
  FileText, 
  Download, 
  Activity,
  Calendar,
  Clock,
  User as UserIcon,
  Globe,
  Monitor
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import luxuryBg from "@assets/stock_images/professional_busines_cc21c314.jpg";

export default function MasterControl() {
  const { data: monitoring, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/monitoring"],
    refetchInterval: 5000, // Real-time emphasis
  });

  if (isLoading) return null;

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-hidden p-6 md:p-12">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-10 blur-sm"
        style={{ backgroundImage: `url(${luxuryBg})` }}
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-12">
        <header className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <Activity className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">
              Controle <span className="text-primary">Mestre</span>
            </h1>
          </div>
          <p className="text-zinc-500 font-medium max-w-2xl">
            Monitoramento em tempo real de acessos, sessões e documentação técnica da plataforma Aura.
          </p>
        </header>

        <Tabs defaultValue="sessions" className="space-y-8">
          <TabsList className="bg-white/5 border border-white/10 p-1">
            <TabsTrigger value="sessions" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold uppercase tracking-widest text-[10px]">
              Sessões & Acessos
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-primary data-[state=active]:text-black font-bold uppercase tracking-widest text-[10px]">
              Documentos de Cadastro
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="bg-white/5 border-white/10 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Histórico de Logins Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {monitoring?.sessions.map((session: any) => (
                        <div key={session.id} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl group hover:border-primary/20 transition-all">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${session.type === 'login' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                              {session.type === 'login' ? <LogIn className="w-4 h-4 text-emerald-500" /> : <LogOut className="w-4 h-4 text-red-500" />}
                            </div>
                            <div>
                              <p className="font-black text-white uppercase tracking-tighter">{session.username}</p>
                              <div className="flex items-center gap-3 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {format(new Date(session.createdAt), 'dd MMM yyyy', { locale: ptBR })}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(session.createdAt), 'HH:mm:ss')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right hidden md:block">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                              <Globe className="w-3 h-3" /> {session.ipAddress || '---'}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">
                              <Monitor className="w-3 h-3" /> {session.userAgent?.split(' ')[0] || 'Browser'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Status do Sistema</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-black/40 rounded-xl">
                      <span className="text-[10px] font-black uppercase text-zinc-500">Acessos Hoje</span>
                      <span className="text-2xl font-black text-white">{monitoring?.sessions.filter((s: any) => new Date(s.createdAt).toDateString() === new Date().toDateString()).length}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-black/40 rounded-xl">
                      <span className="text-[10px] font-black uppercase text-zinc-500">Usuários Ativos</span>
                      <span className="text-2xl font-black text-primary">{new Set(monitoring?.sessions.filter((s: any) => s.type === 'login').map((s: any) => s.userId)).size}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              {monitoring?.enterprises.map((ent: any) => (
                <Card key={ent.id} className="bg-white/5 border-white/10 overflow-hidden group hover:border-primary/30 transition-all">
                  <CardHeader className="border-b border-white/5 bg-black/20 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-black uppercase tracking-tighter text-white">{ent.name}</CardTitle>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Cadastrado em {format(new Date(ent.createdAt), 'dd/MM/yyyy')}</p>
                    </div>
                    <Badge variant="outline" className="border-primary/20 text-primary font-black uppercase tracking-widest text-[10px]">ID: {ent.id}</Badge>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Informações Gerais</p>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-zinc-300">Email: {ent.email || 'N/A'}</p>
                          <p className="text-sm font-bold text-zinc-300">CNPJ/CPF: {ent.taxId || 'N/A'}</p>
                        </div>
                      </div>

                      {[
                        { label: 'Comprovante de Endereço', url: ent.addressProofUrl, icon: FileText },
                        { label: 'Documento (Frente)', url: ent.rgFrontUrl, icon: FileText },
                        { label: 'Documento (Verso)', url: ent.rgBackUrl, icon: FileText }
                      ].map((doc, idx) => (
                        <div key={idx} className="space-y-3">
                          <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">{doc.label}</p>
                          {doc.url ? (
                            <Button 
                              variant="outline" 
                              className="w-full bg-primary/5 border-primary/20 hover:bg-primary hover:text-black transition-all group/btn"
                              asChild
                            >
                              <a href={doc.url} download target="_blank" rel="noreferrer">
                                <Download className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform" />
                                Baixar Arquivo
                              </a>
                            </Button>
                          ) : (
                            <div className="w-full h-10 border border-white/5 rounded-md flex items-center justify-center bg-black/20">
                              <span className="text-[10px] font-bold text-zinc-700 uppercase">Não enviado</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
