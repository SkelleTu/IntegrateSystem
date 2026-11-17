import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ShieldCheck, UserPlus, RefreshCw, Trash2, LockKeyhole, UnlockKeyhole } from "lucide-react";

type Action = "view" | "create" | "edit" | "delete" | "approve" | "administer";
type Account = { id:number; username:string; email?:string|null; role:string; enterpriseId:number|null; status:"active"|"suspended"; activeSessions?:number; lastIp?:string|null; lastDevice?:string|null; lastActivity?:string|null; permissions:Record<string,Partial<Record<Action,boolean>>>; lastLogin?:string|null };
const actionLabels:Record<Action,string> = { view:"Visualizar",create:"Criar",edit:"Editar",delete:"Excluir",approve:"Aprovar",administer:"Administrar" };
const moduleLabels:Record<string,string> = { dashboard:"Dashboard",cashier:"Caixa",finance:"Financeiro",reports:"Relatórios",inventory:"Estoque",fiscal:"Fiscal",labels:"Etiquetas",monitoring:"Monitor",timeclock:"Ponto e funcionários",master:"Controle mestre",account_branches:"Ramificação de contas",settings:"Configurações" };
const allActions:Action[] = ["view","create","edit","delete","approve","administer"];

export default function AccountBranches() {
  const qc = useQueryClient();
  const [username,setUsername] = useState("");
  const [password,setPassword] = useState("");
  const [email,setEmail] = useState("");
  const [accountType,setAccountType] = useState<"staff"|"master">("staff");
  const [selected,setSelected] = useState<number|null>(null);
  const [editUsername,setEditUsername] = useState("");
  const [editEmail,setEditEmail] = useState("");
  const [editPassword,setEditPassword] = useState("");
  const [message,setMessage] = useState("");
  const {data,isLoading,error} = useQuery<{accounts:Account[];audit:any[];modules:string[]}>({queryKey:["/api/admin/account-branches"],refetchInterval:10000});
  const accounts = data?.accounts || [];
  const activeAccount = accounts.find(a=>a.id===selected) || null;
  const [draft,setDraft] = useState<Record<string,Partial<Record<Action,boolean>>>>({});
  const create = useMutation({mutationFn:()=>apiRequest("POST","/api/admin/account-branches",{username,password,email,accountType}),onSuccess:()=>{setUsername("");setPassword("");setEmail("");setMessage("Conta criada e vinculada ao estabelecimento master.");qc.invalidateQueries({queryKey:["/api/admin/account-branches"]});},onError:(e:any)=>setMessage(e.message||"Falha ao criar conta.")});
  const update = useMutation({mutationFn:(payload:any)=>apiRequest("PATCH",`/api/admin/account-branches/${selected}`,payload),onSuccess:()=>{setMessage("Alterações salvas.");setSelected(null);setEditPassword("");qc.invalidateQueries({queryKey:["/api/admin/account-branches"]});},onError:(e:any)=>setMessage(e.message||"Falha ao salvar.")});
  const remove = useMutation({mutationFn:(id:number)=>apiRequest("DELETE",`/api/admin/account-branches/${id}`),onSuccess:()=>{setMessage("Conta removida.");setSelected(null);qc.invalidateQueries({queryKey:["/api/admin/account-branches"]});},onError:(e:any)=>setMessage(e.message||"Falha ao remover.")});
  const modules = useMemo(()=>data?.modules||Object.keys(moduleLabels),[data]);
  const toggle = (module:string,action:Action,value:boolean)=>setDraft(old=>({...old,[module]:{...(old[module]||activeAccount?.permissions?.[module]||{}),[action]:value}}));
  const openEditor = (account:Account)=>{setSelected(account.id);setEditUsername(account.username);setEditEmail(account.email||"");setEditPassword("");setDraft(JSON.parse(JSON.stringify(account.permissions||{})));setMessage("");};
  if(isLoading) return <div className="min-h-screen bg-black text-white grid place-items-center">Carregando ramificação de contas…</div>;
  if(error) return <div className="min-h-screen bg-black text-red-300 p-8">Não foi possível carregar o painel. Verifique se a conta possui privilégio master e se o banco de produção está disponível.</div>;
  return <div className="min-h-screen bg-[#05080c] text-white px-4 py-24 md:px-8">
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs tracking-[.3em] text-cyan-400 uppercase">Administração exclusiva</p><h1 className="text-3xl md:text-4xl font-black mt-2">Ramificação de contas</h1><p className="text-sm text-zinc-400 mt-2">Contas vinculadas ao mesmo estabelecimento, permissões granulares e trilha de auditoria.</p></div><button onClick={()=>qc.invalidateQueries({queryKey:["/api/admin/account-branches"]})} className="rounded-xl border border-white/15 px-4 py-3 flex gap-2 items-center"><RefreshCw size={16}/> Atualizar</button></header>
      {message&&<div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm">{message}</div>}
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5 space-y-4">
        <h2 className="font-bold flex items-center gap-2"><UserPlus size={18}/> Criar conta</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Nome de usuário" className="rounded-lg bg-black border border-white/15 p-3"/>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Senha (mínimo 12 caracteres)" className="rounded-lg bg-black border border-white/15 p-3"/>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mail (opcional)" className="rounded-lg bg-black border border-white/15 p-3"/>
          <select value={accountType} onChange={e=>setAccountType(e.target.value as any)} className="rounded-lg bg-black border border-white/15 p-3"><option value="staff">Conta subordinada</option><option value="master">Outra conta master</option></select>
        </div>
        <button disabled={create.isPending||username.length<3||password.length<12} onClick={()=>create.mutate()} className="rounded-lg bg-cyan-500 px-5 py-3 font-bold text-black disabled:opacity-40">{create.isPending?"Criando…":"Criar conta vinculada"}</button>
        <p className="text-xs text-zinc-500">A empresa é herdada no servidor da conta master autenticada. Nenhuma conta subordinada precisa cadastrar outro estabelecimento.</p>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <h2 className="font-bold mb-4">Contas cadastradas ({accounts.length})</h2>
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[720px]"><thead className="text-left text-zinc-500 border-b border-white/10"><tr><th className="p-3">Conta</th><th className="p-3">Perfil</th><th className="p-3">Estabelecimento</th><th className="p-3">Status</th><th className="p-3">Sessões</th><th className="p-3">Último acesso / atividade</th><th className="p-3">Ações</th></tr></thead><tbody>{accounts.map(a=><tr key={a.id} className="border-b border-white/5"><td className="p-3 font-semibold">{a.username}<div className="text-xs text-zinc-500">{a.email||"—"} · #{a.id}</div></td><td className="p-3">{a.role}</td><td className="p-3">{a.enterpriseId??"Sem vínculo"}</td><td className="p-3"><span className={a.status==="active"?"text-emerald-400":"text-red-400"}>{a.status==="active"?"Ativa":"Suspensa"}</span></td><td className="p-3">{a.activeSessions??0} ativa(s)</td><td className="p-3">{a.lastLogin?new Date(a.lastLogin).toLocaleString():"Nunca"}<div className="text-xs text-zinc-500">{a.lastIp||"IP indisponível"}</div><div className="text-xs text-zinc-500 max-w-[180px] truncate">{a.lastDevice||"Dispositivo indisponível"}</div><div className="text-xs text-cyan-500/80">Atividade: {a.lastActivity?new Date(a.lastActivity).toLocaleString():"Sem registro"}</div></td><td className="p-3"><div className="flex gap-2"><button onClick={()=>openEditor(a)} className="rounded-lg border border-white/15 px-3 py-2">Gerir</button>{a.id!==accounts.find(x=>x.role==="owner"&&x.username.toLowerCase()==="skelletu")?.id&&<button title="Remover conta" onClick={()=>{if(confirm("Remover permanentemente esta conta?"))remove.mutate(a.id)}} className="rounded-lg border border-red-500/30 p-2 text-red-300"><Trash2 size={15}/></button>}</div></td></tr>)}</tbody></table></div>
      </section>
      {activeAccount&&<section className="rounded-2xl border border-cyan-500/30 bg-white/[.03] p-5 space-y-5">
        <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-bold text-xl">Permissões: {activeAccount.username}</h2><p className="text-xs text-zinc-500">Controle por módulo e por ação. Alterações são registradas na auditoria.</p></div><button onClick={()=>setSelected(null)} className="text-zinc-400">Fechar</button></div>
        <div className="grid gap-3 md:grid-cols-3"><label className="text-xs text-zinc-400">Usuário<input value={editUsername} onChange={e=>setEditUsername(e.target.value)} className="mt-1 block w-full rounded-lg bg-black border border-white/20 p-2 text-white"/></label><label className="text-xs text-zinc-400">E-mail<input value={editEmail} onChange={e=>setEditEmail(e.target.value)} className="mt-1 block w-full rounded-lg bg-black border border-white/20 p-2 text-white"/></label><label className="text-xs text-zinc-400">Nova senha (opcional)<input value={editPassword} onChange={e=>setEditPassword(e.target.value)} type="password" placeholder="Mínimo 12 caracteres" className="mt-1 block w-full rounded-lg bg-black border border-white/20 p-2 text-white"/></label></div><div className="flex flex-wrap gap-3"><label className="text-sm">Status <select id="account-status" defaultValue={activeAccount.status} className="ml-2 rounded-lg bg-black border border-white/20 p-2"><option value="active">Ativa</option><option value="suspended">Suspensa</option></select></label><label className="text-sm">Perfil <select id="account-role" defaultValue={activeAccount.role} className="ml-2 rounded-lg bg-black border border-white/20 p-2"><option value="barber">Subordinada</option><option value="admin">Administradora</option><option value="owner">Master</option></select></label></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="text-left text-zinc-400 border-b border-white/10"><th className="p-2">Módulo</th>{allActions.map(x=><th key={x} className="p-2">{actionLabels[x]}</th>)}</tr></thead><tbody>{modules.map(module=><tr key={module} className="border-b border-white/5"><td className="p-2 font-semibold">{moduleLabels[module]||module}</td>{allActions.map(action=><td key={action} className="p-2"><input type="checkbox" checked={Boolean((draft[module]||activeAccount.permissions?.[module])?.[action])} onChange={e=>toggle(module,action,e.target.checked)} aria-label={`${moduleLabels[module]||module}: ${actionLabels[action]}`}/></td>)}</tr>)}</tbody></table></div>
        <div className="flex flex-wrap gap-3"><button onClick={()=>update.mutate({status:(document.getElementById("account-status") as HTMLSelectElement).value,role:(document.getElementById("account-role") as HTMLSelectElement).value,username:editUsername,email:editEmail,password:editPassword||undefined,permissions:{...activeAccount.permissions,...draft}})} disabled={update.isPending} className="rounded-lg bg-cyan-500 px-5 py-3 font-bold text-black">Salvar alterações</button><button onClick={()=>update.mutate({status:activeAccount.status==="active"?"suspended":"active"})} className="rounded-lg border border-white/20 px-4 py-3 flex items-center gap-2">{activeAccount.status==="active"?<LockKeyhole size={16}/>:<UnlockKeyhole size={16}/>} {activeAccount.status==="active"?"Suspender":"Reativar"}</button></div>
      </section>}
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5"><h2 className="font-bold flex items-center gap-2 mb-4"><ShieldCheck size={18}/> Auditoria administrativa recente</h2><div className="space-y-2 max-h-[420px] overflow-y-auto">{(data?.audit||[]).map((item:any)=><div key={item.id} className="border-b border-white/5 py-2 text-xs flex flex-wrap justify-between gap-2"><span className="text-cyan-300">{item.action}</span><span className="text-zinc-400">Responsável #{item.actorUserId} · Conta #{item.targetUserId}</span><span className="text-zinc-500">{new Date(item.createdAt).toLocaleString()}</span></div>)}{!data?.audit?.length&&<p className="text-sm text-zinc-500">Nenhuma ação registrada ainda.</p>}</div></section>
    </div>
  </div>;
}
