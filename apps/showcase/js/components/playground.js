/**
 * playground.js
 * Controller for Split-Screen Interactive MCP Playground (Feature 5)
 */

import { MockMcpTransport } from '../mcp/MockMcpTransport.js';

export class PlaygroundController {
  constructor(options = {}) {
    this.seedBrands = options.seedBrands || [];
    this.transport = new MockMcpTransport(this.seedBrands);
    this.activeTool = 'policy_lookup';
    this.init();
  }

  init() {
    this.cacheDom();
    this.bindEvents();
    this.populatePresets();
    this.renderActiveToolForm();
  }

  cacheDom() {
    this.toolSelect = document.getElementById('mcp-tool-select');
    this.presetSelect = document.getElementById('mcp-preset-select');
    this.argsEditor = document.getElementById('mcp-args-editor');
    this.runBtn = document.getElementById('mcp-run-btn');
    this.copyCurlBtn = document.getElementById('mcp-copy-curl-btn');
    this.openClaudeBtn = document.getElementById('mcp-open-claude-btn');
    this.clearStreamBtn = document.getElementById('mcp-clear-stream-btn');
    this.latencyBadge = document.getElementById('mcp-latency-badge');
    this.streamOutput = document.getElementById('mcp-stream-output');
  }

  bindEvents() {
    if (this.toolSelect) {
      this.toolSelect.addEventListener('change', (e) => {
        this.activeTool = e.target.value;
        this.renderActiveToolForm();
      });
    }

    if (this.presetSelect) {
      this.presetSelect.addEventListener('change', (e) => {
        this.applyPreset(e.target.value);
      });
    }

    if (this.runBtn) {
      this.runBtn.addEventListener('click', () => {
        this.executeCurrentPayload();
      });
    }

    if (this.copyCurlBtn) {
      this.copyCurlBtn.addEventListener('click', () => {
        this.copyCurlCommand();
      });
    }

    if (this.openClaudeBtn) {
      this.openClaudeBtn.addEventListener('click', () => {
        const drawer = document.getElementById('quick-connect-modal');
        if (drawer) {
          if (typeof drawer.showModal === 'function') {
            drawer.showModal();
          } else {
            drawer.setAttribute('open', '');
          }
          const claudeTab = document.querySelector('[data-tab="claude"]');
          if (claudeTab) claudeTab.click();
        }
      });
    }

    if (this.clearStreamBtn) {
      this.clearStreamBtn.addEventListener('click', () => {
        if (this.streamOutput) {
          this.streamOutput.innerHTML = '<div class="stream-empty">Wire stream cleared. Ready for next JSON-RPC 2.0 transaction.</div>';
        }
      });
    }

    // Listen to cross-component trigger events from App Simulator
    window.addEventListener('mcp:trigger-tool', (e) => {
      const { tool, args } = e.detail || {};
      if (tool) {
        this.activeTool = tool;
        if (this.toolSelect) this.toolSelect.value = tool;
        this.renderActiveToolForm(args);
        this.executeCurrentPayload();
      }
    });
  }

  populatePresets() {
    this.presets = {
      spotify: {
        tool: 'policy_lookup',
        args: { service_slug: 'spotify', category: 'subscription' }
      },
      law_477: {
        tool: 'statutory_law_lookup',
        args: { statute_section: '477', language: 'de' }
      },
      subscription_rules: {
        tool: 'subscription_category_rules',
        args: { subscription_type: 'streaming' }
      },
      tools_list: {
        tool: 'tools/list',
        args: {}
      }
    };
  }

  applyPreset(presetKey) {
    const preset = this.presets[presetKey];
    if (!preset) return;
    this.activeTool = preset.tool;
    if (this.toolSelect) this.toolSelect.value = preset.tool;
    this.renderActiveToolForm(preset.args);
  }

  renderActiveToolForm(customArgs = null) {
    if (!this.argsEditor) return;

    if (this.activeTool === 'tools/list') {
      this.argsEditor.value = JSON.stringify({}, null, 2);
    } else if (this.activeTool === 'policy_lookup') {
      const defaultArgs = customArgs || { service_slug: 'spotify' };
      this.argsEditor.value = JSON.stringify(defaultArgs, null, 2);
    } else if (this.activeTool === 'statutory_law_lookup') {
      this.argsEditor.value = JSON.stringify(customArgs || { statute_section: '477', language: 'de' }, null, 2);
    } else if (this.activeTool === 'subscription_category_rules') {
      this.argsEditor.value = JSON.stringify(customArgs || { subscription_type: 'streaming' }, null, 2);
    }
  }

  async executeCurrentPayload() {
    let args = {};
    try {
      args = JSON.parse(this.argsEditor.value || '{}');
    } catch (err) {
      this.appendStreamFrame('error', {
        title: 'Client JSON Parse Error',
        content: `Malformed JSON in arguments editor: ${err.message}`
      });
      return;
    }

    const reqId = `play-${Date.now().toString(36)}`;
    const requestPayload = {
      jsonrpc: '2.0',
      id: reqId,
      method: this.activeTool === 'tools/list' ? 'tools/list' : 'tools/call',
      params: this.activeTool === 'tools/list' ? {} : {
        name: this.activeTool,
        arguments: args
      }
    };

    // 1. Log Outbound Frame
    this.appendStreamFrame('outbound', {
      title: `--> LOCAL MOCK · JSON-RPC sample request #${reqId}`,
      payload: requestPayload
    });

    // 2. Execute via MockMcpTransport
    const response = await this.transport.handleRequest(requestPayload);
    const elapsed = response._telemetry?.elapsedMs || 4.2;

    // 3. Update Latency Badge
    this.updateLatencyBadge(elapsed);

    // 4. Log Inbound Frame
    const statusLine = response.error ? 'HTTP/1.1 400 Bad Request' : 'HTTP/1.1 200 OK';
    this.appendStreamFrame('inbound', {
      title: `<-- LOCAL SAMPLE · ${statusLine} (${elapsed}ms mock latency)`,
      payload: response
    });
  }

  updateLatencyBadge(ms) {
    if (!this.latencyBadge) return;
    this.latencyBadge.classList.remove('status-urgent', 'status-warning');
    this.latencyBadge.classList.add('status-protected');
    this.latencyBadge.innerHTML = `🧪 <strong>${ms}ms</strong> <span class="badge-label">(local mock, not live timing)</span>`;
  }

  appendStreamFrame(direction, { title, payload, content }) {
    if (!this.streamOutput) return;

    const frame = document.createElement('div');
    frame.className = `stream-frame stream-${direction}`;

    const header = document.createElement('div');
    header.className = 'stream-frame-header';
    header.innerHTML = `
      <span class="stream-frame-badge">${direction === 'outbound' ? '▲ OUTBOUND' : direction === 'inbound' ? '▼ INBOUND' : '⚠️ ERROR'}</span>
      <span class="stream-frame-title">${title}</span>
      <span class="stream-frame-time">${new Date().toLocaleTimeString()}</span>
    `;

    const body = document.createElement('pre');
    body.className = 'stream-frame-body';
    body.textContent = payload ? JSON.stringify(payload, null, 2) : content;

    frame.appendChild(header);
    frame.appendChild(body);

    const emptyMsg = this.streamOutput.querySelector('.stream-empty');
    if (emptyMsg) emptyMsg.remove();

    this.streamOutput.appendChild(frame);
    this.streamOutput.scrollTop = this.streamOutput.scrollHeight;
  }

  copyCurlCommand() {
    let args = {};
    try {
      args = JSON.parse(this.argsEditor?.value || '{}');
    } catch (e) {
      args = {};
    }

    const payload = {
      jsonrpc: '2.0',
      id: 'curl-eval',
      method: this.activeTool === 'tools/list' ? 'tools/list' : 'tools/call',
      params: this.activeTool === 'tools/list' ? {} : {
        name: this.activeTool,
        arguments: args
      }
    };

    const curl = `curl -s -X POST "https://[project].page.dev/api/mcp" \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(payload)}' | jq .`;

    navigator.clipboard.writeText(curl).then(() => {
      if (this.copyCurlBtn) {
        const originalText = this.copyCurlBtn.innerHTML;
        this.copyCurlBtn.innerHTML = '✓ Copied cURL!';
        setTimeout(() => {
          this.copyCurlBtn.innerHTML = originalText;
        }, 2000);
      }
    }).catch(() => {
      prompt('Copy cURL command:', curl);
    });
  }
}
