import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Database, Server, HardDrive, Cloud, ShieldCheck, RefreshCw, UploadCloud, CheckCircle2, AlertTriangle, Clock3, FileArchive, Activity, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Status = {
  database: { primary: string; connected: boolean; latencyMs: number | null; tables: number; rows: number };
  sqlite: { enabled: boolean; fileSizeBytes: number; lastSyncAt: number | null };
  backup: { enabled: boolean; configured: boolean; lastAttemptAt: number | null; lastSuccessAt: number | null; lastFileName: string | null; lastDriveFileId: string | null; lastError: string | null; retentionDays: number; intervalMs: number; timezone: string };
  drive: { configured: boolean; folderConfigured: boolean; lastFiles: Array<{ id: string; name: string; modifiedTime?: string; size?: string }> };
};

async function fetchStatus(): Promise<Status> {
  const response = await fetch("/api/database/status");
  if (!response.ok) throw new Error("Não foi possível consultar os bancos de dados.");
  return response.json();
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatDate(value: number | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

function StateBadge({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <Badge className={ok ? "bg-emerald-500/10 text-emerald-300 border-emerald-400/20" : "bg-amber-500/10 text-amber-300 border-amber-400/20"} variant="outline">{ok ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}{children}</Badge>;
}

export default function DatabaseManager() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, isFetching } = useQuery<Status>({ queryKey: ["/api/database/status"], queryFn: fetchStatus, refetchInterval: 30000 });
  const backup = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/database/backup", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Backup não concluído.");
      return body;
    },
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: ["/api/database/status"] }); },
  });

  if (isLoading) return <div className="min-h-screen pt-24 px-5 md:px-8 text-white"><div className="max-w-7xl mx-auto animate-pulse text-sm text-zinc-400">Carregando central de bancos de dados...</div></div>;
  if (isError || !data) return <div className="min-h-screen pt-24 px-5 md:px-8 text-white"><Card className="max-w-2xl mx-auto bg-black/50 border-red-400/20"><CardContent className="p-6 text-red-300">Não foi possível carregar a Central de Bancos de Dados.</CardContent></Card></div>;

  const configured = data.backup.configured;
  const healthy = data.database.connected && configured;

  return (
    <div className="min-h-screen pt-24 pb-10 px-4 md:px-8 text-white">
      <div className="max-w-[1700px] mx-auto space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 flex items-center justify-center shadow-[0_0_25px_rgba(0,229,255,.08)]"><Database className="w-5 h-5 text-cyan-300" /></div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.35em] text-cyan-300/60 font-black">Aura System · Infraestrutura</p>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">Banco de Dados</h1>
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500 max-w-2xl">Central operacional para PostgreSQL, espelho SQLite, sincronização e proteção diária em Google Drive.</p>
          </div>
          <div className="flex items-center gap-2">
            <StateBadge ok={healthy}>{healthy ? "Operação protegida" : "Atenção necessária"}</StateBadge>
            <Button variant="outline" className="h-9 border-cyan-400/15 bg-black/30 text-zinc-200 hover:bg-cyan-400/5" onClick={() => void queryClient.invalidateQueries({ queryKey: ["/api/database/status"] })} disabled={isFetching}><RefreshCw className={`w-3.5 h-3.5 mr-2 ${isFetching ? "animate-spin" : ""}`} />Atualizar</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <Metric icon={Server} label="Banco principal" value="Neon PostgreSQL" sub={data.database.connected ? `Conectado · ${data.database.latencyMs ?? "—"} ms` : "Offline"} ok={data.database.connected} />
          <Metric icon={Layers3} label="Estrutura" value={`${data.database.tables} tabelas`} sub={`${data.database.rows.toLocaleString("pt-BR")} registros estimados`} ok={data.database.connected} />
          <Metric icon={HardDrive} label="SQLite local" value={formatBytes(data.sqlite.fileSizeBytes)} sub={data.sqlite.lastSyncAt ? `Persistido em ${formatDate(data.sqlite.lastSyncAt)}` : "Mirror ainda não registrado"} ok={data.sqlite.enabled} />
          <Metric icon={Cloud} label="Google Drive" value={data.drive.configured ? "Conectado" : "Não configurado"} sub={data.drive.folderConfigured ? "Pasta de backup definida" : "Pasta de destino ausente"} ok={data.drive.configured} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2 bg-black/35 border-white/8 backdrop-blur-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-cyan-300" />Proteção e backup</CardTitle>
              <CardDescription className="text-xs text-zinc-500">O arquivo é um SQL real do PostgreSQL e usa um único nome por dia.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Info label="Origem" value="Neon PostgreSQL" />
              <Info label="Formato" value="Plain SQL (.sql)" />
              <Info label="Nome diário" value="sqlite-DD-MM-YYYY.sql" />
              <Info label="Fuso" value="America/Sao_Paulo" />
              <Info label="Retenção" value="30 dias" />
              <Info label="Frequência" value={`A cada ${Math.round(data.backup.intervalMs / 60000)} min + acionamento manual`} />
              <Info label="Último arquivo" value={data.backup.lastFileName || "Ainda não enviado"} />
              <Info label="Último sucesso" value={formatDate(data.backup.lastSuccessAt)} />
            </CardContent>
            <div className="px-6 pb-6 flex flex-col sm:flex-row gap-2">
              <Button className="bg-cyan-500/15 border border-cyan-300/20 text-cyan-100 hover:bg-cyan-500/25" onClick={() => backup.mutate()} disabled={backup.isPending || !configured}><UploadCloud className={`w-4 h-4 mr-2 ${backup.isPending ? "animate-pulse" : ""}`} />{backup.isPending ? "Gerando e enviando SQL..." : "Executar backup agora"}</Button>
              {!configured && <p className="text-[11px] text-amber-300/80 self-center">Configure as credenciais OAuth e a pasta do Google Drive no ambiente de produção.</p>}
            </div>
            {backup.isError && <div className="mx-6 mb-6 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-300">{(backup.error as Error).message}</div>}
            {backup.isSuccess && <div className="mx-6 mb-6 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs text-emerald-300">Backup enviado e validado no Google Drive.</div>}
            {data.backup.lastError && <div className="mx-6 mb-6 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-300">{data.backup.lastError}</div>}
          </Card>

          <Card className="bg-black/35 border-white/8 backdrop-blur-xl">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-300" />Estado operacional</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Row label="PostgreSQL" ok={data.database.connected} value={data.database.connected ? "ONLINE" : "OFFLINE"} />
              <Row label="SQLite local" ok={data.sqlite.enabled} value="ATIVO" />
              <Row label="Google Drive" ok={data.drive.configured} value={data.drive.configured ? "ONLINE" : "AGUARDANDO CONFIGURAÇÃO"} />
              <Row label="Retenção" ok={data.backup.retentionDays === 30} value={`${data.backup.retentionDays} dias`} />
              <Row label="Arquivo diário" ok={!!data.backup.lastFileName} value={data.backup.lastFileName || "—"} />
            </CardContent>
          </Card>
        </div>

        <Card className="bg-black/35 border-white/8 backdrop-blur-xl">
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><FileArchive className="w-4 h-4 text-cyan-300" />Arquivos dos últimos 30 dias</CardTitle><CardDescription className="text-xs text-zinc-500">Somente arquivos no padrão diário são considerados para retenção.</CardDescription></CardHeader>
          <CardContent>
            {data.drive.lastFiles.length === 0 ? <div className="py-8 text-center text-xs text-zinc-600">Nenhum arquivo diário confirmado no Google Drive.</div> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-[9px] uppercase tracking-widest text-zinc-600"><tr><th className="py-2">Arquivo</th><th className="py-2">Tamanho</th><th className="py-2">Modificado</th><th className="py-2">ID</th></tr></thead><tbody>{data.drive.lastFiles.map((file) => <tr key={file.id} className="border-t border-white/5"><td className="py-2.5 font-mono text-cyan-100">{file.name}</td><td className="py-2.5 text-zinc-400">{file.size ? formatBytes(Number(file.size)) : "—"}</td><td className="py-2.5 text-zinc-400">{formatDate(file.modifiedTime)}</td><td className="py-2.5 font-mono text-zinc-600 max-w-[220px] truncate">{file.id}</td></tr>)}</tbody></table></div>}
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 text-[10px] text-zinc-600"><Clock3 className="w-3 h-3" />Última tentativa: {formatDate(data.backup.lastAttemptAt)} · O mesmo dia sempre reutiliza o arquivo correspondente.</div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub, ok }: { icon: any; label: string; value: string; sub: string; ok: boolean }) {
  return <Card className="bg-black/35 border-white/8 backdrop-blur-xl"><CardContent className="p-4"><div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${ok ? "border-cyan-400/15 bg-cyan-400/5" : "border-amber-400/15 bg-amber-400/5"}`}><Icon className={`w-4 h-4 ${ok ? "text-cyan-300" : "text-amber-300"}`} /></div><div className="min-w-0"><p className="text-[9px] uppercase tracking-[0.22em] text-zinc-600 font-black">{label}</p><p className="text-sm font-black text-white truncate">{value}</p><p className="text-[10px] text-zinc-500 truncate">{sub}</p></div></div></CardContent></Card>;
}
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-white/6 bg-white/[0.02] p-3"><p className="text-[9px] uppercase tracking-[0.18em] text-zinc-600">{label}</p><p className="mt-1 text-xs font-semibold text-zinc-200 break-all">{value}</p></div>; }
function Row({ label, ok, value }: { label: string; ok: boolean; value: string }) { return <div className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"><span className="text-xs text-zinc-400">{label}</span><span className={`text-[10px] font-black tracking-widest ${ok ? "text-emerald-300" : "text-amber-300"}`}>{value}</span></div>; }
