# Rights & Renewals service access

This page describes the public consumer rights resources and MCP endpoint. It is not an OAuth registration guide.

## Public resources

- Policy Wiki: `/wiki`
- Public MCP endpoint: `{{ORIGIN}}/api/mcp`
- MCP Server Card: `/.well-known/mcp/server-card.json`
- Agent Skills index: `/.well-known/agent-skills/index.json`
- API Catalog: `/.well-known/api-catalog`

The public MCP endpoint accepts JSON-RPC requests without OAuth sign-in. Connect a compatible MCP client using the endpoint URL. Do not send credentials or personal records to this public service.

## MCP connection

Configure the client with the endpoint above and its Streamable HTTP transport. Use the client's server list to confirm the connection and inspect the tools actually exposed by the server card. A configuration entry alone does not prove a live connection.

## Authentication boundaries

The public `/api/mcp` endpoint does not require OAuth sign-in. OAuth used by the separate EmDash CMS, if enabled, applies only to EmDash's own protected resources and does not authenticate or authorize requests to this public MCP endpoint.

For setup examples, see [`/agent-setup`](/agent-setup).
