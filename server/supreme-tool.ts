export const SUPREME_OPERATOR_TOOL = {
  name: "supreme_operator",
  version: "1.0.0",
  mode: "supreme",
  correlation: ["traceId", "requestId"],
  targets: ["aurora", "universal", "integratesystem"],
  operations: ["health", "capabilities", "diagnostics", "action"],
  input: {
    type: "object",
    required: ["target", "operation"],
    properties: {
      target: { type: "string" },
      operation: { type: "string" },
      domain: { type: "string" },
      action: { type: "string" },
      args: { type: "object" },
      traceId: { type: "string" },
      requestId: { type: "string" },
    },
  },
} as const;

export function supremeToolContext(req: { get(name: string): string | undefined }) {
  return {
    traceId: req.get("x-trace-id") ?? crypto.randomUUID(),
    requestId: req.get("x-request-id") ?? crypto.randomUUID(),
    operatorMode: "supreme",
  };
}
