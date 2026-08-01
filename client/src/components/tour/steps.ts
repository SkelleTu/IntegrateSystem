import type { TourStep } from "./types";

// ─── Tour Rápido ─────────────────────────────────────────────────────────────
// ~5 steps, covers the main modules without deep detail

export const quickSteps: TourStep[] = [
  {
    target: null,
    title: "Bem-vindo ao Aura System! 🚀",
    description:
      "Este é o Tutorial Rápido. Em poucos passos você vai conhecer as principais funções da plataforma. Use as setas para avançar ou voltar.",
    position: "auto",
  },
  {
    target: "dashboard-header",
    title: "Seu Painel Principal",
    description:
      "Esta é a tela inicial do sistema. Daqui você acessa todos os módulos da plataforma. O logotipo Aura confirma que você está autenticado.",
    position: "bottom",
    padding: 16,
  },
  {
    target: "card-caixa",
    title: "Módulo Caixa",
    description:
      "Aqui você abre e gerencia atendimentos, registra vendas, controla a fila de espera e finaliza pagamentos. É o coração do dia a dia.",
    position: "bottom",
    padding: 12,
  },
  {
    target: "card-financeiro",
    title: "Módulo Financeiro",
    description:
      "Controle completo de entradas e saídas, fechamento de caixa e relatórios financeiros. Acesso restrito ao administrador.",
    position: "bottom",
    padding: 12,
  },
  {
    target: "card-estoque",
    title: "Módulo Estoque",
    description:
      "Gerencie produtos, lotes, preços e fornecedores. O sistema alerta automaticamente quando o estoque cai abaixo do mínimo configurado.",
    position: "bottom",
    padding: 12,
  },
  {
    target: "tour-toggle",
    title: "Modo Tutorial",
    description:
      "Este botão re-ativa o tutorial sempre que precisar revisar. Você pode alternar entre Tutorial Rápido e Detalhado a qualquer momento.",
    position: "top",
    padding: 12,
  },
  {
    target: null,
    title: "Tudo pronto! ✅",
    description:
      "Você conhece as principais funções. Para se aprofundar em cada módulo, ative o Tutorial Detalhado pelo botão no dashboard. Boas vendas!",
    position: "auto",
  },
];

// ─── Tour Detalhado ───────────────────────────────────────────────────────────
// ~12 steps, explains nuances, tips and hidden features

export const detailedSteps: TourStep[] = [
  {
    target: null,
    title: "Tutorial Detalhado — Bem-vindo! 📖",
    description:
      "Vamos explorar cada seção do Aura System com profundidade. Este guia cobre desde o básico até funcionalidades avançadas. Use as setas ou clique em Próximo para continuar.",
    position: "auto",
  },
  {
    target: "dashboard-header",
    title: "Dashboard — Central de Controle",
    description:
      "O dashboard é sua base de operações. Usuários admin têm acesso completo a todos os módulos. Barbeiros e funcionários têm acesso limitado ao Caixa e Registro de Ponto.",
    position: "bottom",
    padding: 20,
  },
  {
    target: "card-caixa",
    title: "Caixa — PDV Completo",
    description:
      "Abra comandas com o botão \"+\", adicione produtos e serviços, vincule o barbeiro responsável e finalize com Dinheiro, PIX ou Cartão. Tickets pausados ficam salvos automaticamente.",
    position: "bottom",
    padding: 12,
  },
  {
    target: "card-financeiro",
    title: "Financeiro — Controle Total",
    description:
      "Aqui ficam os relatórios de vendas por período, por barbeiro e por produto. Realize o fechamento do caixa e exporte comprovantes em PDF. Exclusivo para administradores.",
    position: "bottom",
    padding: 12,
  },
  {
    target: "card-estoque",
    title: "Estoque — Gestão de Mercadorias",
    description:
      "Cadastre produtos com SKU, código de barras, preço de custo e venda. Lotes garantem rastreabilidade por validade e fornecedor. Cada lote pode ter preço de venda próprio.",
    position: "bottom",
    padding: 12,
  },
  {
    target: "benefits-section",
    title: "Diferenciais da Plataforma",
    description:
      "Fila virtual inteligente elimina esperas, atendimento premium para seus clientes e tecnologia que combina o clássico com o moderno. Esses pilares guiam cada funcionalidade.",
    position: "top",
    padding: 16,
  },
  {
    target: "sidebar-area",
    title: "Menu Lateral — Navegação Completa",
    description:
      "Expanda o menu passando o mouse sobre ele (desktop) ou pelo ícone de menu (mobile). Lá estão: Ponto, Fiscal, AURA Windows, Relatórios, Tablet Cliente e Sistema de Etiquetas.",
    position: "right",
    padding: 8,
  },
  {
    target: "download-btn",
    title: "Aura Windows — Gateway",
    description:
      "Baixe o AuraPrinter.exe para conectar sua balança e impressora de etiquetas ao sistema via WebSocket. Funciona em segundo plano consumindo menos de 10MB de RAM.",
    position: "top",
    padding: 12,
  },
  {
    target: "tour-toggle",
    title: "Botão de Tutorial",
    description:
      "Este toggle liga e desliga o modo tutorial. Desative quando não precisar mais e reative sempre que quiser revisar. Você também pode trocar entre Rápido e Detalhado.",
    position: "top",
    padding: 12,
  },
  {
    target: null,
    title: "Você está pronto! 🎉",
    description:
      "Parabéns por concluir o Tutorial Detalhado! Explore o sistema com confiança. Se tiver dúvidas, reative o tutorial pelo botão no dashboard. Sucesso nas vendas!",
    position: "auto",
  },
];
