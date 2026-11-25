import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ShieldCheck, UserPlus, RefreshCw, Trash2, LockKeyhole, UnlockKeyhole } from "lucide-react";

type Action = "view" | "create" | "edit" | "delete" | "approve" | "administer";
type Account = { id:number; username:string; email?:string|null; role:string; enterpriseId:number|null; enterpriseName?:string|null; status:"active"|"suspended"; activeSessions?:number; lastIp?:string|null; lastDevice?:string|null; lastActivity?:string|null; permissions:Record<string,Partial<Record<Action,boolean>>>; lastLogin?:string|null };
const actionLabels:Record<Action,string> = { view:"Visualizar",create:"Criar",edit:"Editar",delete:"Excluir",approve:"Aprovar",administer:"Administrar" };
type AccessMode = "none" | "view" | "full";
const accessLabels:Record<AccessMode,string> = { none:"Sem acesso", view:"Somente visualizar", full:"Acesso completo" };
const moduleLabels:Record<string,string> = { dashboard:"Dashboard",cashier:"Caixa",finance:"Financeiro",reports:"Relatórios",inventory:"Estoque",fiscal:"Fiscal",labels:"Etiquetas",monitoring:"Monitor",timeclock:"Ponto e funcionários",master:"Controle mestre",account_branches:"Ramificação de contas",variable_income:"Renda Variável",settings:"Configurações" };
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
  const [linkUsername,setLinkUsername] = useState("");
  const [linking,setLinking] = useState(false);
  const {data,isLoading,error} = useQuery<{accounts:Account[];audit:any[];modules:string[]}>({queryKey:["/api/admin/account-branches"],refetchInterval:10000});
  const accounts = data?.accounts || [];
  const activeAccount = accounts.find(a=>a.id===selected) || null;
  const [draft,setDraft] = useState<Record<string,Partial<Record<Action,boolean>>>>({});
  const create = useMutation({mutationFn:()=>apiRequest("POST","/api/admin/account-branches",{username,password,email,accountType}),onSuccess:()=>{setUsername("");setPassword("");setEmail("");setMessage("Conta criada e vinculada ao estabelecimento master.");qc.invalidateQueries({queryKey:["/api/admin/account-branches"]});},onError:(e:any)=>setMessage(e.message||"Falha ao criar conta.")});
  const update = useMutation({mutationFn:(payload:any)=>apiRequest("PATCH",`/api/admin/account-branches/${selected}`,payload),onSuccess:()=>{setMessage("Alterações salvas.");setSelected(null);setEditPassword("");qc.invalidateQueries({queryKey:["/api/admin/account-branches"]});},onError:(e:any)=>setMessage(e.message||"Falha ao salvar.")});
  const remove = useMutation({mutationFn:(id:number)=>apiRequest("DELETE",`/api/admin/account-branches/${id}`),onSuccess:()=>{setMessage("Conta removida.");setSelected(null);qc.invalidateQueries({queryKey:["/api/admin/account-branches"]});},onError:(e:any)=>setMessage(e.message||"Falha ao remover.")});
  const linkExisting = useMutation({mutationFn:()=>apiRequest("POST","/api/admin/account-branches/link-existing",{username:linkUsername}),onSuccess:()=>{setLinkUsername("");setMessage("Conta subordinada vinculada ao estabelecimento desta conta master.");qc.invalidateQueries({queryKey:["/api/admin/account-branches"]});},onError:(e:any)=>setMessage(e.message||"Falha ao vincular a conta.")});
  const modules = useMemo(()=>data?.modules||Object.keys(moduleLabels),[data]);
  const toggle = (module:string,action:Action,value:boolean)=>setDraft(old=>({...old,[module]:{...(old[module]||activeAccount?.permissions?.[module]||{}),[action]:value}}));
  const openEditor = (account:Account)=>{setSelected(account.id);setEditUsername(account.username);setEditEmail(account.email||"");setEditPassword("");setDraft(JSON.parse(JSON.stringify(account.permissions||{})));setMessage("");};
  if(isLoading) return <div className="min-h-screen bg-black text-white grid place-items-center">Carregando ramificação de contas…</div>;
  if(error) return <div className="min-h-screen bg-black text-red-300 p-8">Não foi possível carregar o painel. Verifique se a conta possui privilégio master e se o banco de produção está disponível.</div>;
  return <div className="account-branches-page min-h-screen bg-[#05080c] text-white px-4 pt-24 pb-16 md:px-8 md:pt-28">
    <div className="mx-auto max-w-7xl space-y-7">
      <header className="flex flex-wrap items-start justify-between gap-5 rounded-2xl border border-cyan-400/15 bg-[#071018]/90 p-5 md:p-6 shadow-[0_12px_40px_rgba(0,0,0,.28)]"><div className="max-w-3xl"><p className="text-[10px] font-black tracking-[.32em] text-cyan-300 uppercase">Administração exclusiva</p><h1 className="text-3xl md:text-4xl font-black tracking-tight mt-2 text-white">Ramificação de contas</h1><p className="text-sm md:text-base text-zinc-300 mt-2 leading-relaxed">Contas vinculadas ao mesmo estabelecimento, permissões granulares e trilha de auditoria.</p></div><button onClick={()=>qc.invalidateQueries({queryKey:["/api/admin/account-branches"]})} className="rounded-xl border border-cyan-400/30 bg-white/[.04] px-4 py-3 flex gap-2 items-center font-bold text-white hover:bg-cyan-400/10 transition-colors"><RefreshCw size={16}/> Atualizar</button></header>
      {message&&<div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3 text-sm font-semibold text-cyan-50 shadow-[0_8px_30px_rgba(0,229,255,.08)]">{message}</div>}
      <section className="rounded-2xl border border-white/12 bg-[#071018]/90 p-5 md:p-6 space-y-4 shadow-[0_12px_40px_rgba(0,0,0,.25)]">
        <h2 className="text-lg font-black flex items-center gap-2 text-white"><span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-400/10 border border-cyan-400/20"><UserPlus size={18} className="text-cyan-300"/></span> Criar conta</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Nome de usuário" className="rounded-xl bg-black/60 border border-white/20 p-3 text-white placeholder:text-zinc-500 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"/>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Senha (4 dígitos)" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" className="rounded-xl bg-black/60 border border-white/20 p-3 text-white placeholder:text-zinc-500 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"/>
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="E-mail (opcional)" className="rounded-xl bg-black/60 border border-white/20 p-3 text-white placeholder:text-zinc-500 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"/>
          <select value={accountType} onChange={e=>setAccountType(e.target.value as any)} className="rounded-xl bg-black/60 border border-white/20 p-3 text-white placeholder:text-zinc-500 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"><option value="staff">Conta subordinada</option><option value="master">Outra conta master</option></select>
        </div>
        <button
          type="button"
          disabled={create.isPending || username.trim().length < 3 || !/^\d{4}$/.test(password)}
          onClick={() => create.mutate()}
          className="rounded-xl bg-cyan-400 px-5 py-3 font-black text-black shadow-[0_0_24px_rgba(0,229,255,.18)] hover:bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {create.isPending ? "Criando…" : "Criar conta vinculada"}
        </button>
        <p className="text-xs leading-relaxed text-zinc-300">
          Usuário: mínimo 3 caracteres · Senha: exatamente 4 dígitos · E-mail: opcional.
          A empresa é herdada no servidor da conta master autenticada. Nenhuma conta subordinada precisa cadastrar outro estabelecimento.
        </p>
      </section>
      <section className="rounded-2xl border border-amber-400/25 bg-[#171208]/75 p-5 md:p-6 space-y-3 shadow-[0_12px_40px_rgba(0,0,0,.22)]">
        <div>
          <h2 className="text-lg font-black text-white">Vincular conta subordinada existente</h2>
          <p className="text-sm text-zinc-300 mt-1 leading-relaxed">Use apenas para contas antigas que ainda aparecem sem estabelecimento. O vínculo sempre usa o estabelecimento da master autenticada.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input value={linkUsername} onChange={e=>setLinkUsername(e.target.value)} placeholder="Nome de usuário da conta subordinada" className="flex-1 min-w-[240px] rounded-xl bg-black/60 border border-white/20 p-3 text-white placeholder:text-zinc-500 outline-none focus:border-amber-300/60 focus:ring-2 focus:ring-amber-300/10"/>
          <button disabled={linking||linkExisting.isPending||linkUsername.trim().length<3} onClick={()=>linkExisting.mutate()} className="rounded-xl border border-amber-400/40 bg-amber-400/5 px-5 py-3 font-black text-amber-200 hover:bg-amber-400/10 disabled:opacity-40 transition-colors">{linkExisting.isPending?"Vinculando…":"Vincular ao estabelecimento"}</button>
        </div>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
        <h2 className="text-lg font-black mb-4 text-white">Contas cadastradas <span className="text-cyan-300">({accounts.length})</span></h2>
        <div className="overflow-x-auto rounded-xl border border-white/10"><table className="w-full text-sm min-w-[900px]"><thead className="text-left text-zinc-300 bg-black/40 border-b border-white/10"><tr><th className="p-3">Conta</th><th className="p-3">Perfil</th><th className="p-3">Estabelecimento</th><th className="p-3">Status</th><th className="p-3">Sessões</th><th className="p-3">Último acesso / atividade</th><th className="p-3">Ações</th></tr></thead><tbody>{accounts.map(a=><tr key={a.id} className="border-b border-white/8 hover:bg-white/[.025] transition-colors"><td className="p-3 font-bold text-white">{a.username}<div className="text-xs text-zinc-500">{a.email||"—"} · #{a.id}</div></td><td className="p-3">{a.role}</td><td className="p-3">{a.enterpriseName||"Sem vínculo"}<div className="text-xs text-zinc-500">ID {a.enterpriseId??"—"}</div></td><td className="p-3"><span className={a.status==="active"?"text-emerald-400":"text-red-400"}>{a.status==="active"?"Ativa":"Suspensa"}</span></td><td className="p-3">{a.activeSessions??0} ativa(s)</td><td className="p-3">{a.lastLogin?new Date(a.lastLogin).toLocaleString():"Nunca"}<div className="text-xs text-zinc-500">{a.lastIp||"IP indisponível"}</div><div className="text-xs text-zinc-500 max-w-[180px] truncate">{a.lastDevice||"Dispositivo indisponível"}</div><div className="text-xs text-cyan-500/80">Atividade: {a.lastActivity?new Date(a.lastActivity).toLocaleString():"Sem registro"}</div></td><td className="p-3"><div className="flex gap-2"><button onClick={()=>openEditor(a)} className="rounded-lg border border-cyan-400/25 bg-cyan-400/5 px-3 py-2 font-bold text-white hover:bg-cyan-400/10 transition-colors">Gerir</button>{a.id!==accounts.find(x=>x.role==="owner"&&x.username.toLowerCase()==="skelletu")?.id&&<button title="Remover conta" onClick={()=>{if(confirm("Remover permanentemente esta conta?"))remove.mutate(a.id)}} className="rounded-lg border border-red-400/30 bg-red-400/5 p-2 text-red-300 hover:bg-red-400/10 transition-colors"><Trash2 size={15}/></button>}</div></td></tr>)}</tbody></table></div>
      </section>
      {activeAccount&&<section className="rounded-2xl border border-cyan-400/30 bg-[#071018]/95 p-5 md:p-6 space-y-5 shadow-[0_16px_50px_rgba(0,229,255,.07)]">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white">Permissões: <span className="text-cyan-300">{activeAccount.username}</span></h2>
            <p className="text-sm text-zinc-300 mt-1 leading-relaxed">Cada setor é independente. Marque o setor e, dentro dele, selecione exatamente os escopos que esta conta poderá executar.</p>
          </div>
          <button onClick={()=>setSelected(null)} className="rounded-lg border border-white/15 bg-white/[.03] px-3 py-2 text-sm font-bold text-zinc-200 hover:text-white hover:bg-white/[.06]">Fechar</button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-xs font-semibold text-zinc-300">Usuário<input value={editUsername} onChange={e=>setEditUsername(e.target.value)} className="mt-1 block w-full rounded-xl bg-black/60 border border-white/20 p-2.5 text-white placeholder:text-zinc-500 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"/></label>
          <label className="text-xs font-semibold text-zinc-300">E-mail<input value={editEmail} onChange={e=>setEditEmail(e.target.value)} className="mt-1 block w-full rounded-xl bg-black/60 border border-white/20 p-2.5 text-white placeholder:text-zinc-500 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"/></label>
          <label className="text-xs font-semibold text-zinc-300">Nova senha (opcional)<input value={editPassword} onChange={e=>setEditPassword(e.target.value)} type="password" placeholder="Exatamente 4 dígitos" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" className="mt-1 block w-full rounded-xl bg-black/60 border border-white/20 p-2.5 text-white placeholder:text-zinc-500 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/10"/></label>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="text-sm">Status <select id="account-status" defaultValue={activeAccount.status} className="ml-2 rounded-xl bg-black/60 border border-white/20 p-2 text-white"><option value="active">Ativa</option><option value="suspended">Suspensa</option></select></label>
          <label className="text-sm">Perfil <select id="account-role" defaultValue={activeAccount.role} className="ml-2 rounded-xl bg-black/60 border border-white/20 p-2 text-white"><option value="barber">Subordinada</option><option value="admin">Administradora</option><option value="owner">Master</option></select></label>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <div>
              <p className="text-sm font-black text-white">Setores e escopos</p>
              <p className="text-xs leading-relaxed text-zinc-300">As permissões abaixo pertencem exclusivamente ao setor selecionado.</p>
            </div>
            <button
              type="button"
              onClick={()=>{
                const allEnabled=modules.every(module=>{
                  const g:any=draft[module]||activeAccount.permissions?.[module]||{};
                  return Boolean(g.view||g.create||g.edit||g.delete||g.approve||g.administer);
                });
                setDraft(old=>Object.fromEntries(modules.map(module=>[module, allEnabled
                  ? {access:"none",view:false,create:false,edit:false,delete:false,approve:false,administer:false}
                  : {access:"full",view:true,create:true,edit:true,delete:true,approve:true,administer:true}
                ])));
              }}
              className="rounded-xl border border-cyan-400/35 bg-cyan-400/5 px-3 py-2 text-xs font-black text-cyan-200 hover:bg-cyan-400/10 transition-colors"
            >
              {modules.every(module=>{
                const g:any=draft[module]||activeAccount.permissions?.[module]||{};
                return Boolean(g.view||g.create||g.edit||g.delete||g.approve||g.administer);
              }) ? "Desmarcar todos" : "Marcar todos"}
            </button>
          </div>

          {modules.map(module=>{
            const grant:any = draft[module] || activeAccount.permissions?.[module] || {};
            const enabled = Boolean(grant.view||grant.create||grant.edit||grant.delete||grant.approve||grant.administer);
            const checkedCount = allActions.filter(action=>Boolean(grant[action])).length;
            const fullAccess = checkedCount === allActions.length;
            const setSectorEnabled=(value:boolean)=>{
              if(!value){
                setDraft(old=>({...old,[module]:{access:"none",view:false,create:false,edit:false,delete:false,approve:false,administer:false}}));
                return;
              }
              setDraft(old=>({...old,[module]:{...(old[module]||grant),access:fullAccess?"full":"view",view:true}}));
            };
            const setAction=(action:Action,value:boolean)=>{
              setDraft(old=>{
                const current:any={...(old[module]||grant)};
                current[action]=value;
                if(action!=="view" && value) current.view=true;
                const count=allActions.filter(a=>Boolean(current[a])).length;
                current.access=count===0?"none":count===allActions.length?"full":"view";
                return {...old,[module]:current};
              });
            };
            return <div key={module} className={`rounded-2xl border ${enabled?"border-cyan-400/35 bg-cyan-400/[.055]":"border-white/12 bg-black/35"} overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,.18)]`}>
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={e=>setSectorEnabled(e.target.checked)}
                    className="h-5 w-5 accent-cyan-500"
                  />
                  <span>
                    <span className="block font-black text-white">{moduleLabels[module]||module}</span>
                    <span className="block text-[11px] text-zinc-300 mt-0.5">{enabled ? `${checkedCount}/${allActions.length} escopos ativos` : "Sem acesso"}</span>
                  </span>
                </label>
                <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-300">{fullAccess ? "Acesso completo" : enabled ? "Acesso personalizado" : "Bloqueado"}</span>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-3 ${enabled?"":"opacity-60"}`}>
                {allActions.map(action=><label key={action} className={`flex items-center gap-3 rounded-xl border border-white/12 bg-black/25 px-3 py-2.5 ${enabled?"cursor-pointer hover:bg-white/[.06]":"cursor-not-allowed"}`}>
                  <input
                    type="checkbox"
                    checked={Boolean(grant[action])}
                    disabled={!enabled}
                    onChange={e=>setAction(action,e.target.checked)}
                    className="h-4 w-4 accent-cyan-500"
                  />
                  <span className="text-sm font-semibold text-zinc-100">{actionLabels[action]}</span>
                </label>)}
              </div>

              {enabled && <div className="px-4 pb-3 text-xs text-zinc-300">Visualizar é a base de acesso. Ao marcar qualquer ação operacional, a visualização permanece habilitada.</div>}
            </div>;
          })}
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={()=>update.mutate({status:(document.getElementById("account-status") as HTMLSelectElement).value,role:(document.getElementById("account-role") as HTMLSelectElement).value,username:editUsername,email:editEmail,password:editPassword||undefined,permissions:{...activeAccount.permissions,...draft}})} disabled={update.isPending} className="rounded-xl bg-cyan-400 px-5 py-3 font-black text-black shadow-[0_0_24px_rgba(0,229,255,.16)] hover:bg-cyan-300 disabled:opacity-40 transition-colors">Salvar alterações</button>
          <button onClick={()=>update.mutate({status:activeAccount.status==="active"?"suspended":"active"})} className="rounded-xl border border-white/20 bg-white/[.03] px-4 py-3 flex items-center gap-2 font-bold text-white hover:bg-white/[.07] transition-colors">{activeAccount.status==="active"?<LockKeyhole size={16}/>:<UnlockKeyhole size={16}/>} {activeAccount.status==="active"?"Suspender":"Reativar"}</button>
        </div>
      </section>}
      <section className="rounded-2xl border border-white/12 bg-[#071018]/90 p-5 md:p-6 shadow-[0_12px_40px_rgba(0,0,0,.25)]"><h2 className="text-lg font-black text-white flex items-center gap-2 mb-4"><ShieldCheck size={18}/> Auditoria administrativa recente</h2><div className="space-y-2 max-h-[420px] overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3">{(data?.audit||[]).map((item:any)=><div key={item.id} className="border-b border-white/8 py-3 text-xs flex flex-wrap justify-between gap-2 last:border-0"><span className="text-cyan-300">{item.action}</span><span className="text-zinc-400">Responsável #{item.actorUserId} · Conta #{item.targetUserId}</span><span className="text-zinc-500">{new Date(item.createdAt).toLocaleString()}</span></div>)}{!data?.audit?.length&&<p className="text-sm text-zinc-500">Nenhuma ação registrada ainda.</p>}</div></section>
    </div>
  </div>;
}
