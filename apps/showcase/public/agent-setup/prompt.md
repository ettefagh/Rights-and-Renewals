# Rights & Renewals MCP Setup

Use this guide to connect an AI coding environment to the Rights & Renewals MCP server:

`https://rightsandrenewals.pages.dev/api/mcp`

## Safe setup and verification

1. Identify the current client and consult its official documentation if a command, configuration format, or UI label below does not match the installed version.
2. Review the server URL and the requested configuration change with the user. MCP tools can provide data or take actions; only connect to a server the user intends to trust.
3. Before editing configuration or running a setup command, show the exact change and ask the user to approve it. Preserve existing entries in shared configuration files. Never overwrite a file, expose credentials, or add secrets to a snippet.
4. After the user approves setup, make only the approved change. Restart or reload the client if required.
5. Verify the live connection using the client's status or server list. Run the read-only tool `policy_lookup` with `{"service_slug":"spotify"}`. Confirm the result contains Spotify policy data.
6. Report the configuration location, connection status, tool-call result, and any limitation separately. A copied command or saved configuration is not proof that the server connected. Do not claim verification unless the live checks succeeded.

## Recommended clients

### Antigravity

Add a remote Streamable HTTP server in Antigravity's MCP Servers UI or configure it in the workspace file `.agents/mcp_config.json` (global file: `~/.gemini/config/mcp_config.json`):

```json
{
  "mcpServers": {
    "rights-and-renewals": {
      "serverUrl": "https://rightsandrenewals.pages.dev/api/mcp"
    }
  }
}
```

In the agent panel, open **⋯ > MCP Servers**. Confirm the server is connected and its tools are listed, then call a read-only tool.

### Claude Code

Add the HTTP server with:

```sh
claude mcp add --transport http rights-and-renewals https://rightsandrenewals.pages.dev/api/mcp
```

Run `/mcp` in Claude Code to check the server status and available tools. Then call a read-only tool and inspect the response.

### Codex

Add the server with the Codex CLI:

```sh
codex mcp add rights-and-renewals --url https://rightsandrenewals.pages.dev/api/mcp
```

Check the saved server entry with `codex mcp list`. In a Codex session, verify the server tools are available and call one read-only tool. Confirm its result before reporting success.

### VS Code with GitHub Copilot

For Copilot Agent mode, create `.vscode/mcp.json` in the workspace using VS Code's `servers` format:

```json
{
  "servers": {
    "rights-and-renewals": {
      "type": "http",
      "url": "https://rightsandrenewals.pages.dev/api/mcp"
    }
  }
}
```

Open Copilot Chat in **Agent** mode. Run **MCP: List Servers** from the Command Palette, confirm the server is enabled, and invoke a read-only tool.

### Cursor

Create `.cursor/mcp.json` in the project (or `~/.cursor/mcp.json` for global setup):

```json
{
  "mcpServers": {
    "rights-and-renewals": {
      "url": "https://rightsandrenewals.pages.dev/api/mcp"
    }
  }
}
```

Open Cursor Settings > Tools & MCP. Confirm the server and tools are available, then call a read-only tool and inspect its response.

### Claude Desktop

In **Customize → Connectors**, add a custom connector named **Rights & Renewals** using the server URL above. Choose **No sign in** if asked. Enable it in a conversation and run the Spotify lookup. See the [Claude connector guide](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp).

### Windsurf

In the Cascade MCP settings, open the raw configuration and merge this entry under `mcpServers`. Refresh the MCP tools and run the Spotify lookup.

```json
{
  "mcpServers": {
    "rights-and-renewals": {
      "serverUrl": "https://rightsandrenewals.pages.dev/api/mcp"
    }
  }
}
```

### Gemini CLI

Add the Streamable HTTP server with:

```sh
gemini mcp add --transport http rights-and-renewals https://rightsandrenewals.pages.dev/api/mcp
```

Restart Gemini CLI and run `/mcp list`. Confirm the server is Connected and its tools are listed, then call a read-only tool.

## Available read-only check

Use `policy_lookup` to query a brand's published cancellation policy or warranty information. Report the returned data as server output rather than treating it as legal advice.

## Official client references

- [Google Antigravity MCP documentation](https://antigravity.google/docs/mcp)
- [Anthropic Claude Code MCP documentation](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [OpenAI Codex MCP documentation](https://developers.openai.com/resources/docs-mcp)
- [VS Code MCP configuration reference](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)
- [Cursor MCP documentation](https://docs.cursor.com/context/model-context-protocol)
- [Windsurf MCP configuration](https://docs.devin.ai/desktop/devin-local/customizations)
- [Gemini CLI MCP documentation](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md)
