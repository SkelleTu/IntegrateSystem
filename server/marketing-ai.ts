import type { Express } from "express";

type ProviderId = "huggingface" | "kilo" | "openai" | "gemini" | "openrouter" | "groq" | "invista-hf" | "invista-groq" | "compatible";
type ProviderConfig = { id: ProviderId; name: string; baseUrl: string; apiKey: string; model: string; configured: boolean; free: boolean; authHeader?: string };

const DEFAULTS = {
  huggingface: { baseUrl: "https://router.huggingface.co/v1", model: "openai/gpt-oss-120b:fastest" },
  kilo: { baseUrl: "https://ai-gateway.kilo.ai/api/v1", model: "kilo-auto/free" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4.1-mini" },
};

function providerConfigs(): ProviderConfig[] {
  const hfKey = String(process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY || "").trim();
  const kiloKey = String(process.env.KILO_API_KEY || "").trim();
  const openaiKey = String(process.env.OPENAI_API_KEY || "").trim();
  const geminiKey = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  const openrouterKey = String(process.env.OPENROUTER_API_KEY || "").trim();
  const groqKey = String(process.env.GROQ_API_KEY || "").trim();
  const invistaBridgeToken = String(process.env.INVISTA_AI_BRIDGE_TOKEN || "").trim();
  const invistaHfBase = String(process.env.INVISTA_AI_BRIDGE_BASE_URL || "https://invista-pro-v10-kzlv.onrender.com/api/internal/marketing-ai").trim().replace(/\\/$/, "");
  const invistaGroqBase = String(process.env.INVISTA_GROQ_BRIDGE_BASE_URL || "https://invista-pro-v10-kzlv.onrender.com/api/internal/marketing-groq").trim().replace(/\\/$/, "");
  const compatibleUrl = String(process.env.AURA_AI_COMPAT_BASE_URL || "").trim().replace(/\/$/, "");
  const compatibleKey = String(process.env.AURA_AI_COMPAT_API_KEY || "").trim();
  return [
    { id: "huggingface", name: "Hugging Face", baseUrl: String(process.env.HF_BASE_URL || DEFAULTS.huggingface.baseUrl).replace(/\/$/, ""), apiKey: hfKey, model: String(process.env.HF_MODEL || DEFAULTS.huggingface.model), configured: Boolean(hfKey), free: false },
    { id: "kilo", name: "Kilo AI Gateway", baseUrl: String(process.env.KILO_BASE_URL || DEFAULTS.kilo.baseUrl).replace(/\/$/, ""), apiKey: kiloKey, model: String(process.env.KILO_MODEL || DEFAULTS.kilo.model), configured: Boolean(kiloKey), free: !kiloKey },
    { id: "openai", name: "OpenAI", baseUrl: String(process.env.OPENAI_BASE_URL || DEFAULTS.openai.baseUrl).replace(/\/$/, ""), apiKey: openaiKey, model: String(process.env.OPENAI_MODEL || DEFAULTS.openai.model), configured: Boolean(openaiKey), free: false },
    { id: "gemini", name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", apiKey: geminiKey, model: String(process.env.GEMINI_MODEL || "gemini-2.5-flash"), configured: Boolean(geminiKey), free: false, authHeader: "x-goog-api-key" },
    { id: "openrouter", name: "OpenRouter", baseUrl: String(process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, ""), apiKey: openrouterKey, model: String(process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini"), configured: Boolean(openrouterKey), free: false },
    { id: "groq", name: "Groq", baseUrl: String(process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/$/, ""), apiKey: groqKey, model: String(process.env.GROQ_MODEL || "llama-3.3-70b-versatile"), configured: Boolean(groqKey), free: false },
    { id: "invista-hf", name: "Hugging Face · InvistaPro", baseUrl: invistaHfBase, apiKey: invistaBridgeToken, model: String(process.env.INVISTA_HF_MODEL || "openai/gpt-oss-120b:fastest"), configured: Boolean(invistaBridgeToken), free: false },
    { id: "invista-groq", name: "Groq · InvistaPro", baseUrl: invistaGroqBase, apiKey: invistaBridgeToken, model: String(process.env.INVISTA_GROQ_MODEL || "openai/gpt-oss-120b"), configured: Boolean(invistaBridgeToken) && process.env.INVISTA_GROQ_ENABLED === "true", free: false },
    { id: "compatible", name: String(process.env.AURA_AI_COMPAT_NAME || "OpenAI-compatible API"), baseUrl: compatibleUrl, apiKey: compatibleKey, model: String(process.env.AURA_AI_COMPAT_MODEL || ""), configured: Boolean(compatibleUrl), free: false },
  ];
}

function safeProvider(provider: ProviderConfig) {
  return { id: provider.id, name: provider.name, configured: provider.configured, free: provider.free, anonymousFree: provider.id === "kilo" && provider.free, baseUrl: provider.baseUrl, defaultModel: provider.model };
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
  if (!provider.apiKey && !(provider.id === "kilo" && provider.free)) throw new Error(`Credencial não configurada para ${provider.name}.`);
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

function providerOrder(configs: ProviderConfig[]): ProviderConfig[] {
  const requested = String(process.env.MARKETING_AI_PROVIDER_ORDER || "invista-hf,invista-groq,kilo,huggingface,openai,gemini,openrouter,groq,compatible").split(",").map((item) => item.trim().toLowerCase());
  return requested.map((id) => configs.find((provider) => provider.id === id)).filter((provider): provider is ProviderConfig => Boolean(provider && provider.configured));
}

export function registerMarketingAIRoutes(
  app: Express,
  isAuthenticated: (req: any, res: any, next: any) => any,
  marketingTenant: (req: any, res: any) => number | null,
) {
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
        free: String(item?.id || "").endsWith(":free") || item?.pricing?.prompt === "0" || item?.pricing?.completion === "0",
        contextLength: item?.context_length || item?.contextLength || null,
      })).filter((item: any) => item.id).slice(0, 200);
      res.json({ provider: provider.id, models: normalized });
    } catch (error: any) {
      res.status(502).json({ message: error?.message || "Não foi possível consultar o catálogo do provedor." });
    }
  });

  app.post("/api/marketing/ai/test", isAuthenticated, async (req: any, res: Response) => {
    if (!marketingTenant(req, res)) return;
    const configs = providerConfigs();
    const requested = String(req.body?.provider || "auto");
    const candidates = requested === "auto" ? providerOrder(configs) : configs.filter((item) => item.id === requested && (item.configured || item.id === "kilo"));
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
    const candidates = requested === "auto" ? providerOrder(configs) : configs.filter((item) => item.id === requested && (item.configured || item.id === "kilo"));
    if (!candidates.length) return res.status(503).json({ message: "Nenhum provedor de IA está disponível. Configure um provedor no Render ou use o Kilo gratuito." });
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-12).filter((item: any) => ["user", "assistant"].includes(item?.role) && typeof item?.content === "string").map((item: any) => ({ role: item.role, content: item.content.slice(0, 12000) })) : [];
    const messages = [
      { role: "system", content: `Você é ${agent}, agente especializado da Central de Marketing IA da Aura System. ${agentInstructions(agent)}\n\nTrabalhe com rigor factual. Não invente pesquisas, fontes, dados, preços ou ações externas. Quando não tiver acesso a dados ao vivo, declare isso e proponha como verificar. Não execute follow/unfollow, publicação, comentários ou mensagens sem integração oficial, permissão e confirmação aplicáveis. Responda em português brasileiro, com plano prático e próximos passos.` },
      ...history,
      { role: "user", content: message },
    ];
    const failures: string[] = [];
    for (const provider of candidates) {
      try {
        const result = await complete(provider, messages, req.body?.model);
        return res.json({ ok: true, provider: provider.id, providerName: provider.name, model: result.model, message: result.text, usage: result.usage, agent, enterpriseId });
      } catch (error: any) { failures.push(`${provider.name}: ${error?.message || String(error)}`); }
    }
    res.status(502).json({ ok: false, failures });
  });
}
