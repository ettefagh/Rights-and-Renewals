/**
 * apps/showcase/src/components/webmcp.ts
 * Browser Model Context Protocol (WebMCP) client tool registration
 * Registers policy_lookup and statutory_law_lookup with document.modelContext / navigator.modelContext.
 */

function resolveModelContext(): any {
  if (typeof document !== 'undefined' && typeof (document as any).modelContext?.registerTool === 'function') {
    return (document as any).modelContext;
  }
  if (typeof navigator !== 'undefined' && typeof (navigator as any).modelContext?.registerTool === 'function') {
    return (navigator as any).modelContext;
  }
  return undefined;
}

export function registerWebMcpTools(): void {
  const context = resolveModelContext();
  if (!context) {
    return;
  }

  try {
    context.registerTool({
      name: 'policy_lookup',
      description: 'Look up German statutory warranty and cancellation policies for a brand or service.',
      inputSchema: {
        type: 'object',
        properties: {
          service_slug: { type: 'string', description: 'Brand or service slug (e.g. apple, spotify)' },
          brand_slug: { type: 'string', description: 'Alias for service_slug' }
        },
        required: ['service_slug']
      },
      annotations: { readOnlyHint: true },
      execute: async (input: { service_slug?: string; brand_slug?: string }) => {
        const slug = input.service_slug || input.brand_slug;
        const res = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'webmcp-' + Date.now(),
            method: 'tools/call',
            params: {
              name: 'policy_lookup',
              arguments: { service_slug: slug }
            }
          })
        });
        if (!res.ok) {
          throw new Error(`MCP policy lookup failed with HTTP ${res.status}`);
        }
        return await res.json();
      }
    });

    context.registerTool({
      name: 'statutory_law_lookup',
      description: 'Access verbatim German Civil Code (BGB) articles and consumer rights summaries.',
      inputSchema: {
        type: 'object',
        properties: {
          statute_section: {
            type: 'string',
            enum: ['434', '437', '438', '439', '475e', '477', '309_nr_9', '312k', '355'],
            description: 'BGB section number'
          }
        },
        required: ['statute_section']
      },
      annotations: { readOnlyHint: true },
      execute: async (input: { statute_section: string }) => {
        const res = await fetch('/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'webmcp-' + Date.now(),
            method: 'tools/call',
            params: {
              name: 'statutory_law_lookup',
              arguments: { statute_section: input.statute_section }
            }
          })
        });
        if (!res.ok) {
          throw new Error(`MCP statutory law lookup failed with HTTP ${res.status}`);
        }
        return await res.json();
      }
    });
  } catch (err) {
    console.debug('WebMCP tool registration notice:', err);
  }
}

// Auto-register when imported in browser
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerWebMcpTools);
  } else {
    registerWebMcpTools();
  }
}
