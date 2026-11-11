import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Database, HardDrive, RefreshCw, ShieldCheck, CloudOff } from "lucide-react";

interface GoogleDriveStatus {
  available: boolean;
  lastSuccessfulBackupAt: number | null;
  lastErrorMessage: string | null;
}

interface BackupStatus {
  autoBackup: {
    exists: boolean;
    updatedAt?: string;
    sizeKb?: number;
    totalRows?: number;
  };
  backup: {
    complete: boolean;
    authoritativeSource: string;
    message: string;
  };
  databases: {
    primary: string;
    localMirror: boolean;
    localTelemetry: boolean;
    remote: boolean;
    authoritativeCount: number;
  };
}

const databaseLabels: Record<string, string> = {
  "neon-postgresql": "Neon PostgreSQL",
  turso: "Turso",
  "sqlite-local": "SQLite local",
};

export default function Backup() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<BackupStatus>({
    queryKey: ["/api/backup/status"],
    refetchInterval: 30000,
  });

  const { data: driveData, refetch: refetchDrive } = useQuery<GoogleDriveStatus>({
    queryKey: ["/api/google-drive/status"],
    refetchInterval: 30000,
  });

  const primary = data?.backup.authoritativeSource ?? data?.databases.primary ?? "desconhecido";
  const primaryLabel = databaseLabels[primary] ?? primary;
  const backupComplete = data?.backup.complete === true;

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("pt-BR");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Backup & Proteção de Dados</h1>
              <p className="text-sm text-zinc-400">Fonte oficial dos dados e estado da proteção remota</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => { void refetch(); void refetchDrive(); }} disabled={isFetching} className="border-zinc-700">
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {isLoading && <p className="text-sm text-zinc-400">Consultando o estado do banco e dos backups...</p>}
        {isError && (
          <Card className="bg-zinc-900/60 border-red-500/30">
            <CardContent className="p-5 text-sm text-red-300">
              Não foi possível consultar o estado de backup. Atualize a página ou verifique a conexão.
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Database className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Banco principal</p>
                    <p className="text-sm font-semibold text-white">{primaryLabel}</p>
                    <p className="text-xs text-green-400 mt-0.5">Fonte autoritativa</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${backupComplete ? "bg-green-500/10 border-green-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
                    {backupComplete ? <ShieldCheck className="w-5 h-5 text-green-400" /> : <CloudOff className="w-5 h-5 text-amber-400" />}
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Backup verificado</p>
                    <p className={`text-sm font-semibold ${backupComplete ? "text-green-400" : "text-amber-400"}`}>
                      {backupComplete ? "Configurado" : "Não configurado"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700">
                    <HardDrive className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Backup automático local</p>
                    <p className="text-sm font-semibold text-zinc-300">
                      {data.autoBackup.exists ? "Arquivo encontrado" : "Indisponível"}
                    </p>
                    {data.autoBackup.updatedAt && (
                      <p className="text-xs text-zinc-500 mt-0.5">{formatDate(data.autoBackup.updatedAt)}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-zinc-900/60 border-zinc-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${driveData?.available ? "bg-green-500/10 border-green-500/20" : "bg-amber-500/10 border-amber-500/20"}`}>
                    {driveData?.available ? <ShieldCheck className="w-5 h-5 text-green-400" /> : <CloudOff className="w-5 h-5 text-amber-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Google Drive</p>
                    <p className={`text-sm font-semibold ${driveData?.available ? "text-green-400" : "text-amber-400"}`}>
                      {driveData?.available ? "Conectado" : "Não integrado"}
                    </p>
                    {driveData?.lastErrorMessage && <p className="mt-1 text-[10px] leading-snug text-zinc-500">{driveData.lastErrorMessage}</p>}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className={`bg-zinc-900/60 ${backupComplete ? "border-green-500/30" : "border-amber-500/30"}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className={`w-5 h-5 ${backupComplete ? "text-green-400" : "text-amber-400"}`} />
                  Situação da proteção
                </CardTitle>
                <CardDescription className="text-zinc-300">
                  {data.backup.message}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-zinc-400">
                <p>Banco principal: <strong className="text-white">{primaryLabel}</strong></p>
                <p>Bancos autoritativos: <strong className="text-white">{data.databases.authoritativeCount}</strong></p>
                <p>SQLite local: <strong className="text-white">{data.databases.localTelemetry ? "telemetria local, não backup completo" : "não utilizado como fonte principal"}</strong></p>
                {!backupComplete && (
                  <p className="text-amber-300">
                    Exportação e restauração local estão bloqueadas para impedir que um espelho incompleto seja apresentado como backup integral da produção.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/60 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-base">Operações de backup</CardTitle>
                <CardDescription>
                  {backupComplete
                    ? "As operações disponíveis dependem do destino de backup verificado."
                    : "Indisponíveis até existir um processo de backup verificado para o banco principal."}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button disabled={!backupComplete} variant="outline" className="border-zinc-700">
                  Exportar backup completo
                </Button>
                <Button disabled={!backupComplete} variant="outline" className="border-zinc-700">
                  Restaurar backup
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
