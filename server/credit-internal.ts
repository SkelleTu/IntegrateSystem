import type { Express, Request } from "express";
import { neonPool } from "./neon-db.js";

const LEGAL_MONTHLY_PCT = 0.749583;
const PENALTY_PCT = 2;

function master(req: Request) {
  const u: any = req.user;
  return Boolean(req.isAuthenticated?.() && u && (String(u.role || "").toLowerCase() === "owner" || String(u.username || "").toLowerCase() === "skelletu" || u.__masterAccessAuthorized === true));
}
function eid(req: Request) { return Number((req.user as any)?.enterpriseId || 0); }
function cents(v: any) { return Math.max(0, Math.round(Number(String(v ?? 0).replace(",", ".")) * 100)); }
function money(v: any) { return Number(v || 0) / 100; }

export async function ensureCreditInternalSchema() {
  if (!neonPool) return;
  await neonPool.query(
    "CREATE TABLE IF NOT EXISTS credit_internal_customers (" +
    "id SERIAL PRIMARY KEY, enterprise_id INTEGER NOT NULL, full_name TEXT NOT NULL, cpf TEXT NOT NULL, rg TEXT, birth_date DATE, " +
    "address TEXT NOT NULL, address_number TEXT, complement TEXT, neighborhood TEXT, city TEXT, state TEXT, zip_code TEXT, phone TEXT, email TEXT, " +
    "credit_limit_cents BIGINT NOT NULL DEFAULT 0, original_limit_cents BIGINT NOT NULL DEFAULT 0, payment_cycle_days INTEGER NOT NULL DEFAULT 30, " +
    "status TEXT NOT NULL DEFAULT 'good', risk_reduction_cents BIGINT NOT NULL DEFAULT 0, observation_started_at TIMESTAMPTZ, contract_version INTEGER NOT NULL DEFAULT 1, " +
    "signature_type TEXT, contract_signed_at TIMESTAMPTZ, contract_file_url TEXT, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), last_risk_event_at TIMESTAMPTZ)"
  );
  await neonPool.query("ALTER TABLE credit_internal_customers ADD COLUMN IF NOT EXISTS last_risk_event_at TIMESTAMPTZ");
  await neonPool.query(
    "CREATE TABLE IF NOT EXISTS credit_internal_purchases (" +
    "id SERIAL PRIMARY KEY, enterprise_id INTEGER NOT NULL, customer_id INTEGER NOT NULL REFERENCES credit_internal_customers(id) ON DELETE CASCADE, " +
    "description TEXT NOT NULL, amount_cents BIGINT NOT NULL, paid_cents BIGINT NOT NULL DEFAULT 0, purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), " +
    "due_at TIMESTAMPTZ NOT NULL, status TEXT NOT NULL DEFAULT 'open', notes TEXT)"
  );
  await neonPool.query(
    "CREATE TABLE IF NOT EXISTS credit_internal_payments (" +
    "id SERIAL PRIMARY KEY, enterprise_id INTEGER NOT NULL, customer_id INTEGER NOT NULL REFERENCES credit_internal_customers(id) ON DELETE CASCADE, " +
    "purchase_id INTEGER NOT NULL REFERENCES credit_internal_purchases(id) ON DELETE CASCADE, principal_cents BIGINT NOT NULL, penalty_cents BIGINT NOT NULL DEFAULT 0, " +
    "interest_cents BIGINT NOT NULL DEFAULT 0, total_cents BIGINT NOT NULL, days_late INTEGER NOT NULL DEFAULT 0, interest_monthly_pct NUMERIC(12,8) NOT NULL DEFAULT 0.749583, paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
  );
  await neonPool.query(
    "CREATE TABLE IF NOT EXISTS credit_internal_authorizations (" +
    "id SERIAL PRIMARY KEY, enterprise_id INTEGER NOT NULL, customer_id INTEGER NOT NULL REFERENCES credit_internal_customers(id) ON DELETE CASCADE, authorized_by INTEGER, " +
    "extra_limit_cents BIGINT NOT NULL DEFAULT 0, valid_until TIMESTAMPTZ NOT NULL, payment_due_at TIMESTAMPTZ, reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
  );
  await neonPool.query(
    "CREATE TABLE IF NOT EXISTS credit_internal_audit (" +
    "id BIGSERIAL PRIMARY KEY, enterprise_id INTEGER NOT NULL, customer_id INTEGER, actor_user_id INTEGER, action TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
  );
}

async function audit(req: Request, customerId: number | null, action: string, details: any) {
  if (!neonPool) return;
  await neonPool.query(
    "INSERT INTO credit_internal_audit(enterprise_id,customer_id,actor_user_id,action,details) VALUES($1,$2,$3,$4,$5::jsonb)",
    [eid(req), customerId, Number((req.user as any)?.id || 0) || null, action, JSON.stringify(details || {})]
  );
}

async function evaluate(req: Request, c: any) {
  if (!neonPool) return c;
  const q = await neonPool.query("SELECT amount_cents,paid_cents,due_at,status FROM credit_internal_purchases WHERE enterprise_id=$1 AND customer_id=$2 AND status<>'paid'", [eid(req), c.id]);
  let overdue = 0, maxDays = 0;
  for (const p of q.rows) {
    const remaining = Number(p.amount_cents) - Number(p.paid_cents);
    if (remaining <= 0) continue;
    const days = Math.max(0, Math.floor((Date.now() - new Date(p.due_at).getTime()) / 86400000));
    if (days > 0) { overdue += remaining; maxDays = Math.max(maxDays, days); }
  }
  if (maxDays >= 32 && Number(c.credit_limit_cents) > 0) {
    const last = c.last_risk_event_at ? new Date(c.last_risk_event_at).getTime() : 0;
    const elapsed = last ? Math.floor((Date.now() - last) / 86400000) : 99999;
    const cycles = Math.max(1, Math.floor(elapsed / 30));
    if (!last || cycles >= 1) {
      const reduction = Math.max(1, Math.floor(Number(c.credit_limit_cents) * 0.10));
      const newLimit = Math.max(0, Number(c.credit_limit_cents) - reduction);
      await neonPool.query("UPDATE credit_internal_customers SET credit_limit_cents=$1,risk_reduction_cents=risk_reduction_cents+$2,observation_started_at=COALESCE(observation_started_at,NOW()),last_risk_event_at=NOW(),updated_at=NOW(),status=$3 WHERE id=$4 AND enterprise_id=$5", [newLimit,reduction,newLimit<=0?"blocked":"attention",c.id,eid(req)]);
      await audit(req,c.id,"credit.limit_reduced",{reductionCents:reduction,newLimitCents:newLimit,reason:"delay_32_plus_days"});
      c.credit_limit_cents=newLimit;
      c.risk_reduction_cents=Number(c.risk_reduction_cents||0)+reduction;
      c.last_risk_event_at=new Date().toISOString();
    }
  }
  let status = maxDays >= 32 ? "blocked" : maxDays > 0 ? "attention" : "good";
  if (status === "blocked" && Number(c.risk_reduction_cents || 0) === 0) {
    const reduction = Math.min(Math.max(0, Number(c.credit_limit_cents)), Math.round(Number(c.original_limit_cents || c.credit_limit_cents) * 0.10));
    if (reduction > 0) {
      await neonPool.query("UPDATE credit_internal_customers SET credit_limit_cents=GREATEST(0,credit_limit_cents-$1),risk_reduction_cents=risk_reduction_cents+$1,observation_started_at=NOW(),updated_at=NOW() WHERE id=$2 AND enterprise_id=$3", [reduction,c.id,eid(req)]);
      await audit(req,c.id,"credit.limit_reduced",{reductionCents:reduction,reason:"qualifying_overdue"});
      c.credit_limit_cents=Number(c.credit_limit_cents)-reduction;
      c.risk_reduction_cents=Number(c.risk_reduction_cents)+reduction;
      c.observation_started_at=new Date().toISOString();
    }
  }
  if (status === "good" && Number(c.risk_reduction_cents) > 0 && c.observation_started_at) {
    const observed = Math.floor((Date.now() - new Date(c.observation_started_at).getTime()) / 86400000);
    if (observed >= 90) {
      const recover = Math.min(Number(c.risk_reduction_cents), Math.max(0, Number(c.original_limit_cents) - Number(c.credit_limit_cents)));
      if (recover > 0) {
        await neonPool.query("UPDATE credit_internal_customers SET credit_limit_cents=credit_limit_cents+$1,risk_reduction_cents=GREATEST(0,risk_reduction_cents-$1),observation_started_at=NULL,status='good',updated_at=NOW() WHERE id=$2 AND enterprise_id=$3", [recover,c.id,eid(req)]);
        await audit(req,c.id,"credit.limit_recovered",{recoveredCents:recover});
        c.credit_limit_cents=Number(c.credit_limit_cents)+recover;
        c.risk_reduction_cents=Number(c.risk_reduction_cents)-recover;
        c.observation_started_at=null;
      }
    }
  }
  c.status=status; c.overdue_cents=overdue; c.max_days_late=maxDays;
  return c;
}

async function list(req: Request) {
  const r = await neonPool!.query("SELECT * FROM credit_internal_customers WHERE enterprise_id=$1", [eid(req)]);
  const rows:any[]=[];
  for(const c of r.rows) rows.push(await evaluate(req,c));
  const rank=(c:any)=>({good:0,attention:1,bad:2,blocked:3}[c.status] ?? 4)*1000000000000 + Number(c.overdue_cents||0)*1000 + Number(c.max_days_late||0);
  rows.sort((a,b)=>rank(a)-rank(b));
  for(const c of rows){
    const q=await neonPool!.query("SELECT COALESCE(SUM(amount_cents-paid_cents),0) open FROM credit_internal_purchases WHERE enterprise_id=$1 AND customer_id=$2 AND status<>'paid'",[eid(req),c.id]);
    c.open_debt_cents=Number(q.rows[0]?.open||0);
    c.available_cents=Math.max(0,Number(c.credit_limit_cents)-c.open_debt_cents);
  }
  return rows.map(c=>({...c,creditLimit:money(c.credit_limit_cents),originalLimit:money(c.original_limit_cents),overdue:money(c.overdue_cents),openDebt:money(c.open_debt_cents),available:money(c.available_cents),riskReduction:money(c.risk_reduction_cents)}));
}

export function registerCreditInternalRoutes(app: Express) {
  app.get("/api/credit-internal/status", async (req,res)=>{
    if(!master(req)) return res.status(403).json({message:"Acesso exclusivo da Conta Mestre."});
    await ensureCreditInternalSchema();
    res.json({ok:true,toleranceDays:31,blockAfterDays:32,recoveryDays:90,penaltyPct:PENALTY_PCT,legalMonthlyPct:LEGAL_MONTHLY_PCT,legalReference:"Taxa Legal — art. 406 do Código Civil — BCB, novembro/2026"});
  });
  app.get("/api/credit-internal/customers", async (req,res)=>{
    if(!master(req)) return res.status(403).json({message:"Acesso exclusivo da Conta Mestre."});
    await ensureCreditInternalSchema(); res.json(await list(req));
  });
  app.get("/api/credit-internal/summary", async (req,res)=>{
    if(!master(req)) return res.status(403).json({message:"Acesso exclusivo da Conta Mestre."});
    await ensureCreditInternalSchema(); const rows=await list(req);
    res.json({customers:rows.length,good:rows.filter(c=>c.status==="good").length,attention:rows.filter(c=>c.status==="attention").length,bad:rows.filter(c=>c.status==="bad").length,blocked:rows.filter(c=>c.status==="blocked").length,limit:rows.reduce((n,c)=>n+c.creditLimit,0),openDebt:rows.reduce((n,c)=>n+c.openDebt,0),available:rows.reduce((n,c)=>n+c.available,0),customersList:rows});
  });
  app.post("/api/credit-internal/customers", async (req,res)=>{
    if(!master(req)) return res.status(403).json({message:"Acesso exclusivo da Conta Mestre."});
    await ensureCreditInternalSchema(); const b=req.body||{}; const limit=cents(b.creditLimit);
    if(!String(b.fullName||"").trim()||!String(b.cpf||"").trim()||!String(b.address||"").trim()) return res.status(400).json({message:"Nome, CPF e endereço são obrigatórios."});
    const r=await neonPool!.query("INSERT INTO credit_internal_customers(enterprise_id,full_name,cpf,rg,birth_date,address,address_number,complement,neighborhood,city,state,zip_code,phone,email,credit_limit_cents,original_limit_cents,payment_cycle_days,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$15,$16,$17) RETURNING *",[eid(req),b.fullName,b.cpf,b.rg||null,b.birthDate||null,b.address,b.addressNumber||null,b.complement||null,b.neighborhood||null,b.city||null,b.state||null,b.zipCode||null,b.phone||null,b.email||null,limit,Number(b.paymentCycleDays||30),b.notes||null]);
    await audit(req,r.rows[0].id,"credit.customer_created",{creditLimitCents:limit}); res.status(201).json(r.rows[0]);
  });
  app.get("/api/credit-internal/customers/:id", async(req,res)=>{
    if(!master(req)) return res.status(403).json({message:"Acesso exclusivo da Conta Mestre."});
    await ensureCreditInternalSchema(); const id=Number(req.params.id);
    const cQ=await neonPool!.query("SELECT * FROM credit_internal_customers WHERE id=$1 AND enterprise_id=$2",[id,eid(req)]); if(!cQ.rows[0]) return res.status(404).json({message:"Cliente não encontrado."});
    const c=await evaluate(req,cQ.rows[0]); const pQ=await neonPool!.query("SELECT * FROM credit_internal_purchases WHERE customer_id=$1 AND enterprise_id=$2 ORDER BY due_at DESC",[id,eid(req)]);
    const aQ=await neonPool!.query("SELECT * FROM credit_internal_authorizations WHERE customer_id=$1 AND enterprise_id=$2 ORDER BY created_at DESC",[id,eid(req)]);
    res.json({...c,creditLimit:money(c.credit_limit_cents),purchases:pQ.rows.map(p=>({...p,amount:money(p.amount_cents),paid:money(p.paid_cents),remaining:money(Number(p.amount_cents)-Number(p.paid_cents),),dueAt:new Date(p.due_at).toISOString()})),authorizations:aQ.rows});
  });
  app.post("/api/credit-internal/customers/:id/purchases", async(req,res)=>{
    if(!master(req)) return res.status(403).json({message:"Acesso exclusivo da Conta Mestre."});
    await ensureCreditInternalSchema(); const id=Number(req.params.id); const amount=cents(req.body?.amount);
    const cQ=await neonPool!.query("SELECT * FROM credit_internal_customers WHERE id=$1 AND enterprise_id=$2",[id,eid(req)]); if(!cQ.rows[0]) return res.status(404).json({message:"Cliente não encontrado."});
    const c=await evaluate(req,cQ.rows[0]); const openQ=await neonPool!.query("SELECT COALESCE(SUM(amount_cents-paid_cents),0) open FROM credit_internal_purchases WHERE customer_id=$1 AND enterprise_id=$2 AND status<>'paid'",[id,eid(req)]);
    const authQ=await neonPool!.query("SELECT COALESCE(SUM(extra_limit_cents),0) extra FROM credit_internal_authorizations WHERE customer_id=$1 AND enterprise_id=$2 AND valid_until>=NOW()",[id,eid(req)]);
    const available=Number(c.credit_limit_cents)+Number(authQ.rows[0]?.extra||0)-Number(openQ.rows[0]?.open||0);
    if(c.status==="blocked" && Number(authQ.rows[0]?.extra||0)<=0) return res.status(409).json({message:"Crédito bloqueado. É necessária autorização excepcional da Conta Mestre."});
    if(amount<=0||amount>available) return res.status(409).json({message:"Limite de crédito insuficiente."});
    const due=new Date(); due.setDate(due.getDate()+Number(c.payment_cycle_days||30));
    const r=await neonPool!.query("INSERT INTO credit_internal_purchases(enterprise_id,customer_id,description,amount_cents,due_at,notes) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",[eid(req),id,String(req.body?.description||"Compra no Crédito Interno"),amount,due,req.body?.notes||null]);
    await audit(req,id,"credit.purchase_created",{purchaseId:r.rows[0].id,amountCents:amount,dueAt:due.toISOString()}); res.status(201).json({...r.rows[0],amount:money(amount),dueAt:due.toISOString()});
  });
  app.post("/api/credit-internal/customers/:id/payments", async(req,res)=>{
    if(!master(req)) return res.status(403).json({message:"Acesso exclusivo da Conta Mestre."});
    await ensureCreditInternalSchema(); const id=Number(req.params.id); const pid=Number(req.body?.purchaseId); const amount=cents(req.body?.amount);
    const q=await neonPool!.query("SELECT * FROM credit_internal_purchases WHERE id=$1 AND customer_id=$2 AND enterprise_id=$3",[pid,id,eid(req)]); if(!q.rows[0]) return res.status(404).json({message:"Obrigação não encontrada."});
    const p=q.rows[0]; const remaining=Number(p.amount_cents)-Number(p.paid_cents); const principal=Math.min(amount||remaining,remaining); if(principal<=0) return res.status(409).json({message:"Obrigação já quitada."});
    const days=Math.max(0,Math.floor((Date.now()-new Date(p.due_at).getTime())/86400000)); const penalty=days>0?Math.round(remaining*PENALTY_PCT/100):0; const interest=Math.round(remaining*(LEGAL_MONTHLY_PCT/100)*(days/30)); const total=principal+penalty+interest;
    await neonPool!.query("INSERT INTO credit_internal_payments(enterprise_id,customer_id,purchase_id,principal_cents,penalty_cents,interest_cents,total_cents,days_late,interest_monthly_pct) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",[eid(req),id,pid,principal,penalty,interest,total,days,LEGAL_MONTHLY_PCT]);
    const newPaid=Number(p.paid_cents)+principal; await neonPool!.query("UPDATE credit_internal_purchases SET paid_cents=$1,status=$2 WHERE id=$3",[newPaid,newPaid>=Number(p.amount_cents)?"paid":"open",pid]);
    await audit(req,id,"credit.payment_recorded",{purchaseId:pid,principalCents:principal,penaltyCents:penalty,interestCents:interest,daysLate:days,totalCents:total});
    res.status(201).json({principal:money(principal),penalty:money(penalty),interest:money(interest),daysLate:days,total:money(total)});
  });
  app.post("/api/credit-internal/customers/:id/authorization", async(req,res)=>{
    if(!master(req)) return res.status(403).json({message:"Acesso exclusivo da Conta Mestre."});
    await ensureCreditInternalSchema(); const id=Number(req.params.id); const extra=cents(req.body?.extraLimit); const until=new Date(String(req.body?.validUntil)); if(!extra||Number.isNaN(until.getTime())) return res.status(400).json({message:"Limite extra e validade são obrigatórios."});
    const r=await neonPool!.query("INSERT INTO credit_internal_authorizations(enterprise_id,customer_id,authorized_by,extra_limit_cents,valid_until,payment_due_at,reason) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",[eid(req),id,Number((req.user as any).id),extra,until,req.body?.paymentDueAt?new Date(req.body.paymentDueAt):null,req.body?.reason||null]);
    await audit(req,id,"credit.exception_authorization",{authorizationId:r.rows[0].id,extraLimitCents:extra,validUntil:until.toISOString()}); res.status(201).json(r.rows[0]);
  });
  app.get("/api/credit-internal/customers/:id/term", async(req,res)=>{
    if(!master(req)) return res.status(403).json({message:"Acesso exclusivo da Conta Mestre."});
    await ensureCreditInternalSchema(); const id=Number(req.params.id);
    const q=await neonPool!.query("SELECT * FROM credit_internal_customers WHERE id=$1 AND enterprise_id=$2",[id,eid(req)]);
    if(!q.rows[0]) return res.status(404).json({message:"Cliente não encontrado."});
    const c=q.rows[0];
    res.json({
      title:"Termo de Crédito Interno",
      version:c.contract_version,
      customer:{name:c.full_name,cpf:c.cpf,rg:c.rg,address:c.address,addressNumber:c.address_number,phone:c.phone,email:c.email},
      credit:{limit:money(c.credit_limit_cents),paymentCycleDays:c.payment_cycle_days},
      rules:{toleranceDays:31,blockAfterDays:32,reductionPct:10,recoveryDays:90,penaltyPct:PENALTY_PCT,interestReference:"Taxa Legal do art. 406 do Código Civil, vigente no período quando aplicável."},
      signature:{type:c.signature_type,signedAt:c.contract_signed_at}
    });
  });
  app.delete("/api/credit-internal/customers/:id", async(req,res)=>{
    if(!master(req)) return res.status(403).json({message:"Acesso exclusivo da Conta Mestre."});
    await ensureCreditInternalSchema();
    const id=Number(req.params.id);
    const q=await neonPool!.query("DELETE FROM credit_internal_customers WHERE id=$1 AND enterprise_id=$2 RETURNING id",[id,eid(req)]);
    if(!q.rows[0]) return res.status(404).json({message:"Cliente não encontrado."});
    await audit(req,id,"credit.customer_deleted",{});
    res.json({ok:true,id});
  });
  app.post("/api/credit-internal/customers/:id/signature", async(req,res)=>{
    if(!master(req)) return res.status(403).json({message:"Acesso exclusivo da Conta Mestre."});
    await ensureCreditInternalSchema(); const id=Number(req.params.id); const type=String(req.body?.type||"").toLowerCase();
    if(type!=="manual" && type!=="electronic") return res.status(400).json({message:"Tipo de assinatura inválido."});
    const r=await neonPool!.query("UPDATE credit_internal_customers SET signature_type=$1,contract_signed_at=NOW(),updated_at=NOW() WHERE id=$2 AND enterprise_id=$3 RETURNING signature_type,contract_signed_at,contract_version",[type,id,eid(req)]);
    if(!r.rows[0]) return res.status(404).json({message:"Cliente não encontrado."});
    await audit(req,id,"credit.contract_signed",{signatureType:type,contractVersion:r.rows[0].contract_version});
    res.json(r.rows[0]);
  });
  app.post("/api/credit-internal/customers/:id/signature", async(req,res)=>{
    if(!master(req)) return res.status(403).json({message:"Acesso exclusivo da Conta Mestre."});
    await ensureCreditInternalSchema();
    const id=Number(req.params.id);
    const type=String(req.body?.signatureType||"").toLowerCase();
    if(!["manual","electronic"].includes(type)) return res.status(400).json({message:"Tipo de assinatura inválido."});
    const q=await neonPool!.query("SELECT id FROM credit_internal_customers WHERE id=$1 AND enterprise_id=$2",[id,eid(req)]);
    if(!q.rows[0]) return res.status(404).json({message:"Cliente não encontrado."});
    await neonPool!.query("UPDATE credit_internal_customers SET signature_type=$1,contract_signed_at=NOW(),contract_version=contract_version+1,updated_at=NOW() WHERE id=$2 AND enterprise_id=$3",[type,id,eid(req)]);
    await audit(req,id,"credit.contract_signed",{signatureType:type});
    res.json({ok:true,signatureType:type,signedAt:new Date().toISOString()});
  });
  app.get("/api/credit-internal/legal-rate", async(req,res)=>{
    if(!master(req)) return res.status(403).json({message:"Acesso exclusivo da Conta Mestre."});
    res.json({monthlyPct:LEGAL_MONTHLY_PCT,dailyApproxPct:LEGAL_MONTHLY_PCT/30,penaltyPct:PENALTY_PCT,reference:"BCB Comunicado 46.215 — novembro/2026"});
  });
}
