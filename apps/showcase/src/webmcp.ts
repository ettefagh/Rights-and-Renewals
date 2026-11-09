/**
 * W3C WebMCP in-browser tool registration for AI agents.
 * Specification: https://webmachinelearning.github.io/webmcp/
 */
export function registerWebMcpTools() {
  if (typeof window === "undefined") return;

  const mc = (navigator as any).modelContext || (document as any).modelContext;
  if (!mc || typeof mc.registerTool !== "function") return;

  mc.registerTool({
    name: "policy_lookup",
    description: "Lookup German statutory consumer protection, warranty and cancellation policies for top brands",
    inputSchema: {
      type: "object",
      properties: {
        brand: { type: "string", description: "Brand name or service slug" }
      },
      required: ["brand"]
    },
    execute: async ({ brand }: { brand: string }) => {
      return { status: "success", brand, rights: "BGB §§ 437, 438, 477" };
    }
  });
}

if (typeof window !== "undefined") {
  registerWebMcpTools();
}
