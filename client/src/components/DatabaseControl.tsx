import { useEffect, useRef, useState } from "react";
import { Database, Download, Upload, History, RotateCcw, X, ShieldCheck, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

type BackupEntry = {
  filename: string;
  name: string;
  createdAt: string;
  sizeKb: number;
  totalRows: number;
  format?: "json" | "sql";
};

type ImportResult = {
  ok?: boolean;
  tablesRestored?: number;
  rowsRestored?: number;
  errors?: string[];
  comparison?: {
    tablesAdded: string[];
    tablesRemoved: string[];
    tablesChanged: string[];
    rowsAdded: number;
    rowsRemoved: number;
    rowsChanged: number;
  };
  warning?: string;
};

declare global {
  interface Window {
    aura?: {
      saveTextFile?: (data: { defaultFileName: string; content: string }) => Promise<{ saved: boolean; path?: string }>;
    };
  }
}

export default function DatabaseControl() {
  const { data: user } = useUser();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [message, setMessage] = useState<string>("");
  const [comparison, setComparison] = useState<ImportResult["comparison"]>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canManage = !!user;

  const loadHistory = async () => {
    if (!canManage) return;
    try {
      const result = await apiRequest("GET", "/api/backup/list");
      const data = (await result.json()) as BackupEntry[];
      setBackups(data.filter((item) => item.format === "sql" || item.filename.endsWith(".sql")).slice(0, 30));
    } catch {
      setBackups([]);
    }
  };

  useEffect(() => {
    if (open) loadHistory();
  }, [open, canManage]);

  const requireAccess = () => {
    if (!canManage) {
      setMessage("Faça login para administrar o banco de dados.");
      return false;
    }
    return true;
  };

  const downloadTextToLocalMachine = async (filename: string, content: string) => {
    if (window.aura?.saveTextFile) {
      const result = await window.aura.saveTextFile({ defaultFileName: filename, content });
      if (result.saved) return;
    }

    const picker = (window as any).showSaveFilePicker;
    if (typeof picker === "function") {
      const handle = await picker({
        suggestedName: filename,
        types: [{ description: "SQL Database", accept: { "application/sql": [".sql"] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      return;
    }

    const blob = new Blob([content], { type: "application/sql;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const saveSql = async () => {
    if (!requireAccess()) return;
    setBusy("save");
    setMessage("");
    try {
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const response = await apiRequest("POST", "/api/backup/save", { name: `__SQL__aura-database-${stamp}` });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Falha ao gerar o banco SQL.");
      const downloadResponse = await fetch(`/api/backup/download/${encodeURIComponent(data.filename)}`);
      if (!downloadResponse.ok) throw new Error("Não foi possível recuperar o SQL gerado.");
      const sql = await downloadResponse.text();
      await downloadTextToLocalMachine(data.filename, sql);
      setMessage(`Banco SQL salvo: ${data.filename}`);
      await loadHistory();
    } catch (error: any) {
      setMessage(error?.message || "Falha ao salvar o banco SQL.");
    } finally {
      setBusy(null);
    }
  };

  const importSql = async (file: File) => {
    if (!requireAccess()) return;
    setBusy("load");
    setMessage("");
    setComparison(undefined);
    try {
      const sql = await file.text();
      if (!/^\s*(?:--[^\n]*\n\s*)*(?:PRAGMA|BEGIN|CREATE)/i.test(sql)) {
        throw new Error("O arquivo não parece ser um dump SQL válido da Aura System.");
      }
      const response = await apiRequest("POST", "/api/backup/import", { _sql: sql });
      const data = (await response.json()) as ImportResult;
      if (!response.ok) throw new Error(data?.errors?.join("; ") || "Falha ao importar o banco SQL.");
      setComparison(data.comparison);
      setMessage(data.warning ? `SQL carregado com aviso: ${data.warning}` : "Banco SQL carregado e validado com sucesso.");
      await loadHistory();
    } catch (error: any) {
      setMessage(error?.message || "Falha ao carregar o banco SQL.");
    } finally {
      setBusy(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const restore = async (filename: string) => {
    if (!requireAccess()) return;
    if (!window.confirm(`Restaurar a versão ${filename}? Um backup do estado atual será criado antes da restauração.`)) return;
    setBusy(`restore:${filename}`);
    setMessage("");
    setComparison(undefined);
    try {
      const response = await apiRequest("POST", `/api/backup/restore/${encodeURIComponent(filename)}`);
      const data = (await response.json()) as ImportResult;
      if (!response.ok) throw new Error(data?.errors?.join("; ") || "Falha ao restaurar.");
      setComparison(data.comparison);
      setMessage(data.warning ? `Versão restaurada com aviso: ${data.warning}` : "Versão restaurada com sucesso. O estado anterior foi preservado como backup.");
      await loadHistory();
    } catch (error: any) {
      setMessage(error?.message || "Falha ao restaurar a versão.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Banco de Dados"
        onClick={() => setOpen((value) => !value)}
        className="fixed right-4 bottom-[5.5rem] sm:right-6 sm:bottom-24 z-[9998] inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-zinc-950/90 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-2xl backdrop-blur-md transition hover:border-cyan-300/60 hover:bg-zinc-900 pointer-events-auto"
      >
        <Database className="h-4 w-4 text-cyan-300" />
        <span className="hidden sm:inline">Banco de Dados</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          <div className="absolute right-3 bottom-3 sm:right-6 sm:bottom-5 w-[min(92vw,480px)] max-h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 text-white shadow-2xl backdrop-blur-xl pointer-events-auto">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 p-2"><ShieldCheck className="h-4 w-4 text-cyan-300" /></div>
                <div><div className="text-sm font-semibold">Banco de Dados</div><div className="text-[11px] text-zinc-500">Controle global · SQL · versões · restauração</div></div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-white"><X className="h-4 w-4" /></Button>
            </div>

            <div className="max-h-[calc(100vh-11rem)] overflow-y-auto p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button disabled={!canManage || !!busy} onClick={saveSql} className="h-11 bg-cyan-400 text-black hover:bg-cyan-300">
                  {busy === "save" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />} Salvar Banco SQL
                </Button>
                <>
                  <input ref={fileInputRef} type="file" accept=".sql,text/plain" className="hidden" onChange={(event) => event.target.files?.[0] && importSql(event.target.files[0])} />
                  <Button disabled={!canManage || !!busy} onClick={() => fileInputRef.current?.click()} variant="outline" className="h-11 border-orange-400/30 text-orange-300 hover:bg-orange-400/10">
                    {busy === "load" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Carregar Banco SQL
                  </Button>
                </>
              </div>

              {!canManage && <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-3 text-xs text-yellow-200">O controle permanece visível na Landing Page e em toda a aplicação, mas operações de banco exigem autenticação.</div>}
              {message && <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-zinc-300">{message}</div>}

              {comparison && (
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-xs space-y-2">
                  <div className="font-semibold text-cyan-200">Resumo da comparação</div>
                  <div className="grid grid-cols-3 gap-2 text-zinc-300">
                    <div><b className="text-white">{comparison.tablesAdded.length}</b> tabelas novas</div>
                    <div><b className="text-white">{comparison.tablesRemoved.length}</b> removidas</div>
                    <div><b className="text-white">{comparison.tablesChanged.length}</b> alteradas</div>
                    <div><b className="text-emerald-300">{comparison.rowsAdded}</b> linhas novas</div>
                    <div><b className="text-red-300">{comparison.rowsRemoved}</b> removidas</div>
                    <div><b className="text-yellow-300">{comparison.rowsChanged}</b> modificadas</div>
                  </div>
                  {comparison.tablesAdded.length > 0 && <div className="text-[10px] text-zinc-400">Novas: {comparison.tablesAdded.join(", ")}</div>}
                  {comparison.tablesRemoved.length > 0 && <div className="text-[10px] text-zinc-400">Removidas: {comparison.tablesRemoved.join(", ")}</div>}
                  {comparison.tablesChanged.length > 0 && <div className="text-[10px] text-zinc-400">Alteradas: {comparison.tablesChanged.join(", ")}</div>}
                </div>
              )}

              <div className="rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4 text-cyan-300" /> Histórico SQL</div>
                  <button type="button" onClick={loadHistory} className="text-[11px] text-zinc-400 hover:text-white">Atualizar</button>
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  {backups.length === 0 ? <div className="p-4 text-center text-xs text-zinc-500">Nenhuma versão SQL registrada ainda.</div> : backups.map((backup) => (
                    <div key={backup.filename} className="group flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-white/[0.04]">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-zinc-200">{backup.name}</div>
                        <div className="text-[10px] text-zinc-500">{new Date(backup.createdAt).toLocaleString("pt-BR")} · {backup.sizeKb} KB · {backup.totalRows.toLocaleString()} linhas</div>
                      </div>
                      <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => restore(backup.filename)} className="shrink-0 text-zinc-400 hover:text-white" title="Restaurar esta versão">
                        {busy === `restore:${backup.filename}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-zinc-600"><Database className="h-3 w-3" /> O controle é isolado da árvore de layout e não ocupa espaço nas páginas.</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
