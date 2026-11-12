# Rights & Renewals AI Agent Setup Instructions

> **Directive for AI Agents**: Complete all of the following steps yourself by running the commands or modifying the configuration files directly. Do not ask the user to run these commands unless permissions prevent autonomous execution.

This document configures your AI assistant or coding environment to communicate directly with the **Rights & Renewals** Model Context Protocol (MCP) server at:
`https://rightsandrenewals.pages.dev/api/mcp`

---

## 1. Claude Code (CLI)

Run the following terminal command in your workspace:

```bash
claude mcp add --transport http rights-and-renewals https://rightsandrenewals.pages.dev/api/mcp
```

Verify connection inside Claude Code by running:
```bash
/mcp
```

---

## 2. Claude Desktop

Locate or create your Claude Desktop configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Add the `rights-and-renewals` server entry using `mcp-remote` as the stdio bridge:

```json
{
  "mcpServers": {
    "rights-and-renewals": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://rightsandrenewals.pages.dev/api/mcp"
      ]
    }
  }
}
```

Restart Claude Desktop to load the tools.

---

## 3. Cursor IDE

In your project root, create or edit `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "rights-and-renewals": {
      "url": "https://rightsandrenewals.pages.dev/api/mcp"
    }
  }
}
```

Or configure via Cursor Settings > Features > MCP > Add New MCP Server with Server Name `rights-and-renewals` and Type `sse`/`http`.

---

## 4. Windsurf (Codeium)

Edit your Windsurf configuration file:
- **macOS / Linux**: `~/.codeium/windsurf/mcp_config.json`
- **Windows**: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`

Add the server definition using the mandatory `serverUrl` key:

```json
{
  "mcpServers": {
    "rights-and-renewals": {
      "serverUrl": "https://rightsandrenewals.pages.dev/api/mcp"
    }
  }
}
```

Click Refresh in the Windsurf Cascade MCP panel.

---

## 5. VS Code / Continue.dev

Edit your Continue configuration in `~/.continue/config.json`:

```json
{
  "mcpServers": [
    {
      "name": "rights-and-renewals",
      "transport": {
        "type": "sse",
        "url": "https://rightsandrenewals.pages.dev/api/mcp"
      }
    }
  ]
}
```

Ensure **Agent Mode** is selected in the Continue chat dropdown.

---

## 6. Google Gemini CLI

Run the 1-click CLI installer:

```bash
gemini mcp add --transport http rights-and-renewals https://rightsandrenewals.pages.dev/api/mcp
```

Or add to `~/.gemini/settings.json` (or `.gemini/settings.json` in your project root):

```json
{
  "mcpServers": {
    "rights-and-renewals": {
      "httpUrl": "https://rightsandrenewals.pages.dev/api/mcp"
    }
  }
}
```

---

## Available MCP Tools

Once connected, the following 5 authoritative tools are available:

1. `policy_lookup`: Query brand cancellation policies, statutory warranty periods (24m), commercial guarantees, and direct cancellation URLs.
2. `claim_dossier_generate`: Compile a deterministic German BGB § 437/439 statutory defect notice or § 312k cancellation letter with LexFox disclaimer.
3. `statutory_law_lookup`: Access verbatim German Civil Code (BGB §§ 434, 437, 438, 439, 475e, 477, 309 Nr. 9, 312k, 355) text and consumer summaries.
4. `subscription_category_rules`: Query statutory maximum initial term (24m) and rolling 1-month cancellation notice under BGB § 309 Nr. 9 & § 312k.
5. `tax_deductibility_check`: Evaluate German income tax deductibility as Werbungskosten under § 9 EStG and BMF 22.02.2022 digital asset Sofortabschreibung.

---

## Quick Verification Prompt

Test your configuration by asking your agent:
> *"Query the Rights & Renewals MCP server for Apple MacBook warranty terms and check BGB § 477 burden of proof cliff."*
