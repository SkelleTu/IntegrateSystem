import type { Express, Response } from "express";
import { neonPool } from "./neon-db.js";

type ProviderId = "huggingface" | "kilo" | "openai" | "gemini" | "openrouter" | "groq" | "cerebras" | "deepseek" | "mistral" | "nvidia" | "compatible";
type ProviderConfig = {
  id: ProviderId; name: string; baseUrl: string; apiKey: string; model: string;
  configured: boolean; free: boolean; anonymousFree?: boolean; authHeader?: string; privacyWarning?: string;
};
const DEFAULTS = {
  huggingface: { baseUrl: "https://router.huggingface.co/v1", model: "openai/gpt-oss-120b:fastest" },
  kilo: { baseUrl: "https://ai-gateway.kilo.ai/api/v1", model: "kilo-auto/free" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini" },
};
function env(name: string, fallback = ""): string { return String(process.env[name] || fallback).trim(); }
function providerConfigs(): ProviderConfig[] {
  const hfKey = env("HF_TOKEN") || env("HUGGINGFACE_API_KEY");
  const kiloKey = env("KILO_API_KEY");
  const openaiKey = env("OPENAI_API_KEY");
  const geminiKey = env("GEMINI_API_KEY") || env("GOOGLE_API_KEY");
  const openrouterKey = env("OPENROUTER_API_KEY");
  const groqKey = env("GROQ_API_KEY");
  const cerebrasKey = env("CEREBRAS_API_KEY");
  const deepseekKey = env("DEEPSEEK_API_KEY");
  const mistralKey = env("MISTRAL_API_KEY");
  const nvidiaKey = env("NVIDIA_API_KEY");
  const compatibleUrl = env("AURA_AI_COMPAT_BASE_URL").replace(/\/$/, "");
  const compatibleKey = env("AURA_AI_COMPAT_API_KEY");
  const kiloAnonymous = !kiloKey;
  return [
    { id: "kilo", name: "Kilo AI Gateway", baseUrl: env("KILO_BASE_URL", DEFAULTS.kilo.baseUrl).replace(/\/$/, ""), apiKey: kiloKey, model: env("KILO_MODEL", DEFAULTS.kilo.model), configured: Boolean(kiloKey), free: kiloAnonymous, anonymousFree: kiloAnonymous, privacyWarning: kiloAnonymous ? "O Kilo Auto Free não exige chave nem créditos, mas o provedor informa que prompts podem ser registrados e usados para melhoria. Não envie dados pessoais, dados de clientes ou informações comerciais confidenciais." : undefined },
    { id: "huggingface", name: "Hugging Face Inference Providers", baseUrl: env("HF_BASE_URL", DEFAULTS.huggingface.baseUrl).replace(/\/$/, ""), apiKey: hfKey, model: env("HF_MODEL", DEFAULTS.huggingface.model), configured: Boolean(hfKey), free: false },
    { id: "openrouter", name: "OpenRouter", baseUrl: env("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1").replace(/\/$/, ""), apiKey: openrouterKey, model: env("OPENROUTER_MODEL", "openrouter/free"), configured: Boolean(openrouterKey), free: false },
    { id: "groq", name: "Groq", baseUrl: env("GROQ_BASE_URL", "https://api.groq.com/openai/v1").replace(/\/$/, ""), apiKey: groqKey, model: env("GROQ_MODEL", "openai/gpt-oss-120b"), configured: Boolean(groqKey), free: false },
    { id: "gemini", name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", apiKey: geminiKey, model: env("GEMINI_MODEL", "gemini-2.5-flash"), configured: Boolean(geminiKey), free: false, authHeader: "x-goog-api-key" },
    { id: "openai", name: "OpenAI", baseUrl: env("OPENAI_BASE_URL", DEFAULTS.openai.baseUrl).replace(/\/$/, ""), apiKey: openaiKey, model: env("OPENAI_MODEL", DEFAULTS.openai.model), configured: Boolean(openaiKey), free: false },
    { id: "cerebras", name: "Cerebras Inference", baseUrl: env("CEREBRAS_BASE_URL", "https://api.cerebras.ai/v1").replace(/\/$/, ""), apiKey: cerebrasKey, model: env("CEREBRAS_MODEL", "gpt-oss-120b"), configured: Boolean(cerebrasKey), free: false },
    { id: "deepseek", name: "DeepSeek", baseUrl: env("DEEPSEEK_BASE_URL", "https://api.deepseek.com").replace(/\/$/, ""), apiKey: deepseekKey, model: env("DEEPSEEK_MODEL", "deepseek-flash"), configured: Boolean(deepseekKey), free: false },
    { id: "mistral", name: "Mistral AI", baseUrl: env("MISTRAL_BASE_URL", "https://api.mistral.ai/v1").replace(/\/$/, ""), apiKey: mistralKey, model: env("MISTRAL_MODEL", "mistral-small-latest"), configured: Boolean(mistralKey), free: false },
    { id: "nvidia", name: "NVIDIA NIM", baseUrl: env("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1").replace(/\/$/, ""), apiKey: nvidiaKey, model: env("NVIDIA_MODEL", "meta/llama-3.3-70b-instruct"), configured: Boolean(nvidiaKey), free: false, privacyWarning: "Endpoints NVIDIA gratuitos de avaliação podem ter retenção de prompts conforme os termos do serviço. Não envie dados confidenciais." },
    { id: "compatible", name: env("AURA_AI_COMPAT_NAME", "API OpenAI-compatible personalizada"), baseUrl: compatibleUrl, apiKey: compatibleKey, model: env("AURA_AI_COMPAT_MODEL"), configured: Boolean(compatibleUrl && compatibleKey), free: false },
  ];
}
function safeProvider(provider: ProviderConfig) {
  return { id: provider.id, name: provider.name, configured: provider.configured, free: provider.free, anonymousFree: Boolean(provider.anonymousFree), baseUrl: provider.baseUrl, defaultModel: provider.model, privacyWarning: provider.privacyWarning || null };
}

function agentInstructions(agent: string): string {
  const instructions: Record<string, string> = {
    "Market Research": "Pesquise e avalie mercados, nichos, demanda, tamanho de oportunidade, sinais e fontes verificáveis.",
    "Trend Hunter": "Identifique tendências emergentes, separe evidências de especulação e informe sinais de aceleração.",
    "Competitor Analyst": "Analise concorrentes, posicionamento, ofertas, preços, canais, diferenciais e vulnerabilidades.",
    "Opportunity Scorer": "Pontue oportunidades por demanda, margem, concorrência, custo, risco e facilidade de execução.",
    "Product Hunter": "Avalie produtos, fornecedores, diferenciação, custos, preço e potencial comercial.",
    "Profit Analyst": "Calcule custos, margem bruta, margem líquida, CAC, ROI e cenários financeiros quando houver dados.",
    "Brand Manager": "Atue como gestor de marca: posicionamento, proposta de valor, identidade e consistência.",
    "Creative Director": "Crie estratégias criativas, conceitos, roteiros, copies e campanhas orientadas ao público.",
    "Social Media Manager": "Planeje calendário editorial, conteúdo por canal, formatos, distribuição e métricas.",
    "Audience Researcher": "Segmente públicos, personas, dores, interesses, intenção de compra e jornada.",
    "Community Manager": "Prepare respostas úteis, moderação, relacionamento e fluxos de atendimento.",
    "Lead Hunter": "Defina critérios de prospecção, qualificação, ICP e cadências respeitosas.",
    "Conversion Analyst": "Analise funil, conversão, retenção, CAC, LTV e oportunidades de otimização.",
    "Financial Analyst": "Consolide receitas, despesas, margem, fluxo de caixa e cenários."
  };
  return instructions[agent] || "Você é um agente especialista de marketing e inteligência comercial da Aura System.";
}

function extractMessage(payload: any): string {
  const choice = payload?.choices?.[0]?.message;
  if (typeof choice?.content === "string") return choice.content;
  if (Array.isArray(choice?.content)) return choice.content.map((part: any) => part?.text || "").join("\n");
  return "";
}

async function listModels(provider: ProviderConfig): Promise<any[]> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (provider.apiKey) headers[provider.authHeader || "Authorization"] = provider.authHeader ? provider.apiKey : `Bearer ${provider.apiKey}`;
  const response = await fetch(`${provider.baseUrl}/models`, { headers, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`Catálogo ${provider.name}: HTTP ${response.status}`);
  const data: any = await response.json();
  return Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.models) ? data.models : [];
}

async function complete(provider: ProviderConfig, messages: any[], model?: string): Promise<{ text: string; model: string; usage: any }> {
  const selectedModel = String(model || provider.model || "").trim();
  if (!selectedModel) throw new Error(`Modelo não definido para ${provider.name}.`);
  if (!provider.apiKey && !(provider.id === "kilo" && (selectedModel === "kilo-auto/free" || selectedModel === "openrouter/free" || selectedModel.endsWith(":free")))) throw new Error("Acesso sem chave permitido somente a modelos gratuitos do Kilo. Configure uma credencial para usar modelos pagos.");
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (provider.apiKey) headers[provider.authHeader || "Authorization"] = provider.authHeader ? provider.apiKey : `Bearer ${provider.apiKey}`;
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({ model: selectedModel, messages, temperature: 0.5, max_tokens: 1400 }),
    signal: AbortSignal.timeout(60000),
  });
  const raw = await response.text();
  let payload: any;
  try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { error: raw.slice(0, 1000) }; }
  if (!response.ok) throw new Error(`${provider.name} respondeu HTTP ${response.status}: ${String(payload?.error?.message || payload?.message || raw).slice(0, 500)}`);
  const text = extractMessage(payload);
  if (!text) throw new Error(`${provider.name} retornou uma resposta vazia.`);
  return { text, model: String(payload?.model || selectedModel), usage: payload?.usage || null };
}

function providerOrder(configs: ProviderConfig[], agent = ""): ProviderConfig[] {
  const research = ["gemini", "openrouter", "groq", "cerebras", "huggingface", "deepseek", "mistral", "openai", "nvidia", "compatible", "kilo"];
  const analysis = ["openai", "gemini", "deepseek", "groq", "cerebras", "openrouter", "huggingface", "mistral", "nvidia", "compatible", "kilo"];
  const creative = ["gemini", "openai", "mistral", "openrouter", "groq", "cerebras", "huggingface", "deepseek", "nvidia", "compatible", "kilo"];
  const group = ["Profit Analyst", "Financial Analyst", "Opportunity Scorer", "Conversion Analyst"].includes(agent)
    ? analysis
    : ["Brand Manager", "Creative Director", "Social Media Manager", "Community Manager"].includes(agent)
      ? creative
      : research;
  const configuredOrder = env("MARKETING_AI_PROVIDER_ORDER").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  const requested = [...configuredOrder, ...group].filter((id, index, all) => all.indexOf(id) === index);
  const ordered = requested.map((id) => configs.find((provider) => provider.id === id)).filter((provider): provider is ProviderConfig => Boolean(provider && (provider.configured || (provider.id === "kilo" && provider.anonymousFree))));
  return ordered.flatMap((provider) => {
    if (provider.id !== "kilo" || !provider.anonymousFree || !agent) return [provider];
    const preferredModel = ["Profit Analyst", "Financial Analyst", "Opportunity Scorer", "Conversion Analyst"].includes(agent)
      ? "nvidia/nemotron-3-ultra-550b-a55b:free"
      : ["Brand Manager", "Creative Director", "Social Media Manager", "Community Manager"].includes(agent)
        ? "baidu/ernie-5.5-flash-preview:free"
        : "nvidia/nemotron-3-ultra-550b-a55b:free";
    return [{ ...provider, model: preferredModel }, { ...provider, model: "kilo-auto/free" }];
  });
}

let agentSchemaPromise: Promise<void> | null = null;
async function ensureAgentSchema() {
  if (!neonPool) throw new Error("MARKETING_DATABASE_UNAVAILABLE");
  if (!agentSchemaPromise) {
    agentSchemaPromise = (async () => {
      await neonPool.query(`CREATE TABLE IF NOT EXISTS aura_marketing_agent_runs (
        id BIGSERIAL PRIMARY KEY, enterprise_id INTEGER NOT NULL, actor_user_id INTEGER NOT NULL,
        agent VARCHAR(80) NOT NULL, provider VARCHAR(40) NOT NULL, model VARCHAR(180) NOT NULL,
        prompt TEXT NOT NULL, response TEXT NOT NULL, usage JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
      await neonPool.query("CREATE INDEX IF NOT EXISTS aura_marketing_agent_runs_tenant_created_idx ON aura_marketing_agent_runs (enterprise_id, created_at DESC)");
      await neonPool.query(`CREATE TABLE IF NOT EXISTS aura_marketing_agent_memory (
        id BIGSERIAL PRIMARY KEY, enterprise_id INTEGER NOT NULL, agent VARCHAR(80) NOT NULL,
        memory_key VARCHAR(120) NOT NULL, memory_value TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (enterprise_id, agent, memory_key)
      )`);
    })().catch((error) => { agentSchemaPromise = null; throw error; });
  }
  await agentSchemaPromise;
}

export function registerMarketingAIRoutes(
  app: Express,
  isAuthenticated: (req: any, res: any, next: any) => any,
  marketingTenant: (req: any, res: any) => number | null,
) {
  app.get("/api/marketing/ai/runs", isAuthenticated, async (req: any, res: Response) => {
    const enterpriseId = marketingTenant(req, res); if (!enterpriseId) return;
    try {
      await ensureAgentSchema();
      const agent = String(req.query.agent || "").trim().slice(0, 80);
      const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 50);
      const result = await neonPool!.query(
        "SELECT id,agent,provider,model,prompt,response,usage,created_at AS \"createdAt\" FROM aura_marketing_agent_runs WHERE enterprise_id=$1" + (agent ? " AND agent=$2" : "") + " ORDER BY created_at DESC LIMIT " + limit,
        agent ? [enterpriseId, agent] : [enterpriseId],
      );
      return res.json({ runs: result.rows });
    } catch (error: any) {
      console.error("[MARKETING AI] run history unavailable:", error?.message || error);
      return res.status(503).json({ message: "Histórico dos agentes temporariamente indisponível." });
    }
  });

  app.get("/api/marketing/ai/memory", isAuthenticated, async (req: any, res: Response) => {
    const enterpriseId = marketingTenant(req, res); if (!enterpriseId) return;
    try {
      await ensureAgentSchema();
      const agent = String(req.query.agent || "").trim().slice(0, 80);
      const result = await neonPool!.query(
        "SELECT agent,memory_key AS \"key\",memory_value AS value,updated_at AS \"updatedAt\" FROM aura_marketing_agent_memory WHERE enterprise_id=$1" + (agent ? " AND agent IN ($2,'*')" : "") + " ORDER BY updated_at DESC LIMIT 100",
        agent ? [enterpriseId, agent] : [enterpriseId],
      );
      return res.json({ memory: result.rows });
    } catch (error: any) {
      console.error("[MARKETING AI] memory unavailable:", error?.message || error);
      return res.status(503).json({ message: "Memória dos agentes temporariamente indisponível." });
    }
  });

  app.post("/api/marketing/ai/memory", isAuthenticated, async (req: any, res: Response) => {
    const enterpriseId = marketingTenant(req, res); if (!enterpriseId) return;
    const agent = String(req.body?.agent || "*").trim().slice(0, 80) || "*";
    const key = String(req.body?.key || "").trim().slice(0, 120);
    const value = String(req.body?.value || "").trim();
    if (!key || !value || value.length > 4000) return res.status(400).json({ message: "Informe uma chave e um valor de até 4.000 caracteres." });
    try {
      await ensureAgentSchema();
      const result = await neonPool!.query(
        "INSERT INTO aura_marketing_agent_memory (enterprise_id,agent,memory_key,memory_value) VALUES ($1,$2,$3,$4) ON CONFLICT (enterprise_id,agent,memory_key) DO UPDATE SET memory_value=EXCLUDED.memory_value,updated_at=NOW() RETURNING agent,memory_key AS \"key\",memory_value AS value,updated_at AS \"updatedAt\"",
        [enterpriseId, agent, key, value],
      );
      return res.status(200).json({ memory: result.rows[0] });
    } catch (error: any) {
      console.error("[MARKETING AI] memory save failed:", error?.message || error);
      return res.status(503).json({ message: "Não foi possível salvar a memória do agente." });
    }
  });

  app.get("/api/marketing/ai/providers", isAuthenticated, (req: any, res: any) => {
    if (!marketingTenant(req, res)) return;
    const providers = providerConfigs();
    res.json({ providers: providers.map(safeProvider), defaultOrder: providerOrder(providers).map((provider) => provider.id), multiProvider: true });
  });

  app.get("/api/marketing/ai/models", isAuthenticated, async (req: any, res: Response) => {
    if (!marketingTenant(req, res)) return;
    const id = String(req.query.provider || "");
    const provider = providerConfigs().find((item) => item.id === id && (item.configured || item.id === "kilo"));
    if (!provider) return res.status(400).json({ message: "Provedor indisponível ou não configurado." });
    try {
      const models = await listModels(provider);
      const normalized = models.map((item: any) => ({
        id: String(item?.id || item?.model || ""),
        name: String(item?.name || item?.id || item?.model || ""),
        free: typeof item?.isFree === "boolean" ? item.isFree : (String(item?.id || "").endsWith(":free") || (String(item?.pricing?.prompt ?? "") === "0" && String(item?.pricing?.completion ?? "") === "0")),
        contextLength: item?.context_length || item?.contextLength || item?.top_provider?.context_length || null,
        privacyWarning: item?.mayTrainOnYourPrompts === true ? "O provedor pode registrar ou usar prompts para melhoria." : null,
        chatCompatible: !Array.isArray(item?.architecture?.output_modalities) || (item.architecture.output_modalities.includes("text") && !item.architecture.output_modalities.includes("audio") && !item.architecture.output_modalities.includes("video")),
      })).filter((item: any) => item.id && item.chatCompatible && (!(provider.id === "kilo" && provider.anonymousFree) || item.free)).slice(0, 200);
      res.json({ provider: provider.id, models: normalized });
    } catch (error: any) {
      res.status(502).json({ message: error?.message || "Não foi possível consultar o catálogo do provedor." });
    }
  });

  app.post("/api/marketing/ai/test", isAuthenticated, async (req: any, res: Response) => {
    if (!marketingTenant(req, res)) return;
    const configs = providerConfigs();
    const requested = String(req.body?.provider || "auto");
    const candidates = requested === "auto" ? providerOrder(configs, String(req.body?.agent || "")) : configs.filter((item) => item.id === requested && (item.configured || (item.id === "kilo" && item.anonymousFree)));
    if (!candidates.length) return res.status(503).json({ message: "Nenhum provedor de IA está disponível para teste." });
    const messages = [
      { role: "system", content: "Responda em português brasileiro. Você está verificando conectividade. Responda apenas: CONEXÃO IA OK." },
      { role: "user", content: "Confirme que recebeu esta solicitação." },
    ];
    const failures: string[] = [];
    for (const provider of candidates) {
      try {
        const result = await complete(provider, messages, req.body?.model);
        return res.json({ ok: true, provider: provider.id, providerName: provider.name, model: result.model, response: result.text, usage: result.usage });
      } catch (error: any) { failures.push(`${provider.name}: ${error?.message || String(error)}`); }
    }
    res.status(502).json({ ok: false, failures });
  });

  app.post("/api/marketing/ai/chat", isAuthenticated, async (req: any, res: Response) => {
    const enterpriseId = marketingTenant(req, res); if (!enterpriseId) return;
    const message = String(req.body?.message || "").trim();
    if (!message || message.length > 12000) return res.status(400).json({ message: "Informe uma mensagem de até 12.000 caracteres." });
    const agent = String(req.body?.agent || "Market Research").slice(0, 80);
    const requested = String(req.body?.provider || "auto");
    const configs = providerConfigs();
    const candidates = requested === "auto" ? providerOrder(configs, agent) : configs.filter((item) => item.id === requested && (item.configured || (item.id === "kilo" && item.anonymousFree)));
    if (!candidates.length) return res.status(503).json({ message: "Nenhum provedor de IA está disponível. Configure um provedor no Render ou use o Kilo gratuito." });
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-12).filter((item: any) => ["user", "assistant"].includes(item?.role) && typeof item?.content === "string").map((item: any) => ({ role: item.role, content: item.content.slice(0, 12000) })) : [];
    let memoryContext = "";
    try {
      await ensureAgentSchema();
      const memory = await neonPool!.query(
        "SELECT memory_key,memory_value FROM aura_marketing_agent_memory WHERE enterprise_id=$1 AND agent IN ($2,'*') ORDER BY updated_at DESC LIMIT 30",
        [enterpriseId, agent],
      );
      if (memory.rows.length) memoryContext = "\\n\\nMEMÓRIA OPERACIONAL DA EMPRESA:\\n" + memory.rows.map((row: any) => "- " + row.memory_key + ": " + row.memory_value).join("\\n");
    } catch (error: any) {
      console.error("[MARKETING AI] memory read failed:", error?.message || error);
    }
    const messages = [
      { role: "system", content: `Você é ${agent}, agente especializado da Central de Marketing IA da Aura System. ${agentInstructions(agent)}\n\nTrabalhe com rigor factual. Não invente pesquisas, fontes, dados, preços ou ações externas. Quando não tiver acesso a dados ao vivo, declare isso e proponha como verificar. Não execute follow/unfollow, publicação, comentários ou mensagens sem integração oficial, permissão e confirmação aplicáveis. Responda em português brasileiro, com plano prático e próximos passos.` },
      ...history,
      { role: "user", content: message },
    ];
    const failures: string[] = [];
    for (const provider of candidates) {
      try {
        const result = await complete(provider, messages, req.body?.model);
        try {
          await ensureAgentSchema();
          await neonPool!.query(
            "INSERT INTO aura_marketing_agent_runs (enterprise_id,actor_user_id,agent,provider,model,prompt,response,usage) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)",
            [enterpriseId, Number(req.user?.id), agent, provider.id, result.model, message, result.text, JSON.stringify(result.usage || {})],
          );
        } catch (persistError: any) {
          console.error("[MARKETING AI] run persistence failed:", persistError?.message || persistError);
        }
        return res.json({ ok: true, provider: provider.id, providerName: provider.name, model: result.model, message: result.text, usage: result.usage, agent, enterpriseId });
      } catch (error: any) { failures.push(`${provider.name}: ${error?.message || String(error)}`); }
    }
    res.status(502).json({ ok: false, failures });
  });
}
