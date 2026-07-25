import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Download,
  Upload,
  Save,
  RotateCcw,
  Database,
  Wifi,
  HardDrive,
  Clock,
  FileJson,
  ShieldCheck,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface BackupStatus {
  autoBackup: {
    exists: boolean;
    updatedAt?: string;
    sizeKb?: number;
    totalRows?: number;
  };
  databases: {
    local: boolean;
    remote: boolean;
    count: number;
  };
}

interface BackupFile {
  filename: string;
  name: string;
  createdAt: string;
  sizeKb: number;
  totalRows: number;
}

export default function Backup() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saveName, setSaveName] = useState("");
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status
  const { data: status, refetch: refetchStatus } = useQuery<BackupStatus>({
    queryKey: ["/api/backup/status"],
    refetchInterval: 30000,
  });

  // Lista de backups
  const { data: backups = [], refetch: refetchList } = useQuery<BackupFile[]>({
    queryKey: ["/api/backup/list"],
  });

  // Salvar backup nomeado
  const saveMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest("POST", "/api/backup/save", { name }),
    onSuccess: (data: any) => {
      toast({ title: "✅ Backup salvo!", description: data.message });
      setSaveName("");
      refetchList();
      refetchStatus();
    },
    onError: (e: any) => {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    },
  });

  // Restaurar de arquivo salvo
  const restoreMutation = useMutation({
    mutationFn: (filename: string) =>
      apiRequest("POST", `/api/backup/restore/${encodeURIComponent(filename)}`),
    onSuccess: (data: any) => {
      toast({
        title: "✅ Dados restaurados!",
        description: `${data.rowsRestored} linhas em ${data.tablesRestored} tabelas restauradas.`,
      });
      setIsRestoring(null);
      qc.invalidateQueries();
    },
    onError: (e: any) => {
      toast({ title: "Erro ao restaurar", description: e.message, variant: "destructive" });
      setIsRestoring(null);
    },
  });

  // Restaurar auto-backup
  const restoreAutoMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/backup/restore-auto"),
    onSuccess: (data: any) => {
      toast({
        title: "✅ Auto-backup restaurado!",
        description: `${data.rowsRestored} linhas em ${data.tablesRestored} tabelas.`,
      });
      qc.invalidateQueries();
    },
    onError: (e: any) => {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    },
  });

  // Import de arquivo local (upload)
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        const res = await apiRequest("POST", "/api/backup/import", json);
        const data = res as any;
        toast({
          title: "✅ Import concluído!",
          description: `${data.rowsRestored} linhas em ${data.tablesRestored} tabelas restauradas.`,
        });
        qc.invalidateQueries();
      } catch (err: any) {
        toast({ title: "Erro no import", description: err.message, variant: "destructive" });
      }
    };
    reader.readAsText(file);
    // reset input
    e.target.value = "";
  };

  const handleExport = () => {
    window.open("/api/backup/export", "_blank");
  };

  const handleDownload = (filename: string) => {
    window.open(`/api/backup/download/${encodeURIComponent(filename)}`, "_blank");
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  const dbCount = status?.databases.count ?? 1;
  const remoteOk = status?.databases.remote ?? false;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Backup & Proteção de Dados</h1>
            <p className="text-zinc-400 text-sm">Seus dados são salvos simultaneamente em {dbCount} banco{dbCount > 1 ? "s" : ""} de dados</p>
          </div>
        </div>

        {/* Status dos bancos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SQLite Local */}
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <HardDrive className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">SQLite Local</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-sm font-semibold text-green-400">Ativo</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Turso Remote */}
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg border ${remoteOk ? "bg-blue-500/10 border-blue-500/20" : "bg-zinc-800 border-zinc-700"}`}>
                <Wifi className={`w-5 h-5 ${remoteOk ? "text-blue-400" : "text-zinc-500"}`} />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Turso (Nuvem)</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {remoteOk ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-sm font-semibold text-blue-400">Conectado</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-sm text-zinc-500">Não configurado</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-backup */}
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg border ${status?.autoBackup.exists ? "bg-primary/10 border-primary/20" : "bg-zinc-800 border-zinc-700"}`}>
                <RefreshCw className={`w-5 h-5 ${status?.autoBackup.exists ? "text-primary" : "text-zinc-500"}`} />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider">Auto-backup JSON</p>
                {status?.autoBackup.exists ? (
                  <p className="text-xs text-primary font-medium mt-0.5">
                    {status.autoBackup.totalRows?.toLocaleString()} linhas · {status.autoBackup.sizeKb}KB
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500 mt-0.5">Aguardando primeiro save...</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Auto-backup info */}
        {status?.autoBackup.updatedAt && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 px-1">
            <Clock className="w-3.5 h-3.5" />
            Último auto-backup automático: {formatDate(status.autoBackup.updatedAt)}
          </div>
        )}

        {/* ── SAVE ── */}
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Save className="w-4 h-4 text-primary" />
              Salvar SAVE
            </CardTitle>
            <CardDescription>
              Cria um snapshot nomeado de todos os dados da plataforma (salvo no projeto e no GitHub)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Nome do save (ex: antes-migracao)"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveMutation.mutate(saveName)}
                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              />
              <Button
                onClick={() => saveMutation.mutate(saveName)}
                disabled={saveMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-black font-bold px-6 whitespace-nowrap"
              >
                {saveMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span className="ml-2">Salvar</span>
              </Button>
            </div>
            <p className="text-xs text-zinc-500">
              O arquivo ficará em <code className="text-zinc-400">attached_assets/backups/</code> e será commitado junto com o código no GitHub.
            </p>
          </CardContent>
        </Card>

        {/* ── EXPORT / IMPORT ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="w-4 h-4 text-green-400" />
                Exportar JSON
              </CardTitle>
              <CardDescription>Baixa todos os dados como arquivo JSON</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleExport}
                variant="outline"
                className="w-full border-green-500/30 text-green-400 hover:bg-green-500/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar backup completo
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/60 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Upload className="w-4 h-4 text-orange-400" />
                Importar JSON
              </CardTitle>
              <CardDescription>Restaura dados a partir de um arquivo de backup</CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileImport}
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Carregar arquivo JSON
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-900 border-zinc-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle>⚠️ Confirmar importação</AlertDialogTitle>
                    <AlertDialogDescription>
                      Isso irá mesclar os dados do arquivo com o banco atual (INSERT OR REPLACE).
                      Linhas com o mesmo ID serão substituídas. Esta ação não pode ser desfeita facilmente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      Continuar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>

        {/* ── Auto-backup restore ── */}
        {status?.autoBackup.exists && (
          <Card className="bg-zinc-900/60 border-primary/20 border">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Restaurar auto-backup mais recente</p>
                  <p className="text-xs text-zinc-400">
                    {status.autoBackup.totalRows?.toLocaleString()} linhas · {status.autoBackup.sizeKb}KB
                    {status.autoBackup.updatedAt && ` · ${formatDate(status.autoBackup.updatedAt)}`}
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10 shrink-0">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restaurar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-zinc-900 border-zinc-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle>⚠️ Restaurar auto-backup?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Os dados atuais serão mesclados com o auto-backup. Linhas com o mesmo ID serão substituídas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => restoreAutoMutation.mutate()}
                      className="bg-primary text-black"
                    >
                      Restaurar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        )}

        {/* ── Lista de saves ── */}
        <Card className="bg-zinc-900/60 border-zinc-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4 text-zinc-400" />
                Saves salvos ({backups.length})
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => refetchList()}
                className="text-zinc-500 hover:text-white"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {backups.length === 0 ? (
              <div className="text-center py-10 text-zinc-500">
                <FileJson className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum save criado ainda</p>
                <p className="text-xs mt-1">Use "Salvar SAVE" acima para criar o primeiro</p>
              </div>
            ) : (
              <div className="space-y-2">
                {backups.map((b) => (
                  <div
                    key={b.filename}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileJson className="w-4 h-4 text-zinc-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{b.name}</p>
                        <p className="text-xs text-zinc-500">
                          {formatDate(b.createdAt)} · {b.totalRows.toLocaleString()} linhas · {b.sizeKb}KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(b.filename)}
                        className="h-8 px-2 text-zinc-400 hover:text-white"
                        title="Baixar"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isRestoring === b.filename}
                            className="h-8 px-2 text-primary hover:text-primary/80"
                            title="Carregar LOAD"
                          >
                            {isRestoring === b.filename ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zinc-900 border-zinc-700">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Carregar este save?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Vai restaurar <strong>{b.name}</strong> ({b.totalRows.toLocaleString()} linhas) em todos os bancos ativos.
                              Dados com o mesmo ID serão sobrescritos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                setIsRestoring(b.filename);
                                restoreMutation.mutate(b.filename);
                              }}
                              className="bg-primary text-black"
                            >
                              LOAD — Carregar save
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-500 space-y-1.5">
          <p className="font-semibold text-zinc-400 mb-2">Como funciona a proteção de dados</p>
          <p>• Cada write na plataforma é salvo simultaneamente em <strong className="text-zinc-300">todos os bancos ativos</strong> ({dbCount} banco{dbCount > 1 ? "s" : ""})</p>
          <p>• Um auto-backup JSON é gerado automaticamente a cada modificação importante (debounce 5s)</p>
          <p>• Os saves ficam em <code className="text-zinc-400">attached_assets/backups/</code> — commitados no GitHub e nunca perdidos</p>
          <p>• Para migrar de conta no Replit: faça um <strong className="text-zinc-300">SAVE</strong> antes, clone o repositório no novo Replit, e dê <strong className="text-zinc-300">LOAD</strong></p>
          <p>• O sistema suporta até 3 bancos simultâneos: SQLite local, Turso (nuvem) + futuros</p>
        </div>
      </div>
    </div>
  );
}
