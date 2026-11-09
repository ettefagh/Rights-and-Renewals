# DNS-AID & DNSSEC Zone Configuration Guide

**Ecosystem**: CM-LAB Sovereign Rights & Renewals  
**Target Web Properties**:
- Showcase: `https://rightsandrenewals.pages.dev` (`apps/showcase`)
- Sovereign App: `https://rightsandrenewals-app.pages.dev` (`apps/app`)  
**Standard**: DNS for AI Discovery (DNS-AID) / RFC 9460 SVCB/HTTPS Resource Records  
**DNSSEC Security Profile**: Algorithm 13 (`ECDSAP256SHA256` / Curve P-256)

---

## 1. Overview

DNS for AI Discovery (**DNS-AID**) allows autonomous AI agents and client frameworks to discover Model Context Protocol (MCP) servers, Agent Skills manifests, and Agent-to-Agent (A2A) endpoints directly through the Domain Name System without intermediary registries.

This guide provides the authoritative zone file configurations for BIND 9, NSD, and Cloudflare DNS, along with DNSSEC signing specifications.

---

## 2. Discovery Records Topology

All discovery endpoints are rooted under the `_agents` namespace label:

```
<domain>
└── _agents
    ├── _index   --> Organization Agent Skills Index & ARD Manifest
    ├── _mcp     --> SEP-1649 Model Context Protocol Server (/api/mcp)
    ├── _a2a     --> Agent-to-Agent Interface (/agent-card.json)
    └── _catalog --> Direct ARD ai-catalog.json URL pointer
```

---

## 3. BIND 9 Zone Syntax

Add the following records to the zone file of each domain (replace `<domain>` with `rightsandrenewals.pages.dev` or custom domain):

```dns
; ==============================================================================
; DNS-AID (RFC 9460 HTTPS) Discovery Records
; ==============================================================================

; Organizational Agent Skills Index
_index._agents.<domain>.   3600 IN HTTPS 1 . (
                               alpn="h3,h2"
                               port=443
                               mandatory=alpn,port
                               well-known="agent-skills/index.json,ai-catalog.json"
                               key65301="/.well-known/agent-skills/index.json"
                           )

; MCP Server Discovery
_mcp._agents.<domain>.     3600 IN HTTPS 1 . (
                               alpn="h3,h2"
                               port=443
                               mandatory=alpn,port
                               well-known="mcp/server-card.json"
                               key65301="/api/mcp"
                           )

; A2A Agent Card Discovery
_a2a._agents.<domain>.     3600 IN HTTPS 1 . (
                               alpn="h3,h2"
                               port=443
                               mandatory=alpn,port
                               well-known="agent-card.json"
                               key65301="/.well-known/agent-card.json"
                           )

; Auxiliary Text Fallbacks
_catalog._agents.<domain>. 3600 IN TXT   "url=https://<domain>/.well-known/ai-catalog.json"
_index._agents.<domain>.   3600 IN TXT   "v=dnsaid1 services=_mcp,_a2a index=/.well-known/agent-skills/index.json catalog=/.well-known/ai-catalog.json"
_mcp._agents.<domain>.     3600 IN TXT   "v=dnsaid1 proto=mcp endpoint=/api/mcp card=/.well-known/mcp/server-card.json transport=streamable-http"
_a2a._agents.<domain>.     3600 IN TXT   "v=dnsaid1 proto=a2a card=/.well-known/agent-card.json binding=JSON-RPC-2.0"
```

---

## 4. NSD Zone Syntax

```dns
_index._agents.<domain>.   3600 IN HTTPS 1 . alpn="h3,h2" port=443 mandatory=alpn,port well-known="agent-skills/index.json,ai-catalog.json" key65301="/.well-known/agent-skills/index.json"
_mcp._agents.<domain>.     3600 IN HTTPS 1 . alpn="h3,h2" port=443 mandatory=alpn,port well-known="mcp/server-card.json" key65301="/api/mcp"
_a2a._agents.<domain>.     3600 IN HTTPS 1 . alpn="h3,h2" port=443 mandatory=alpn,port well-known="agent-card.json" key65301="/.well-known/agent-card.json"
_catalog._agents.<domain>. 3600 IN TXT   "url=https://<domain>/.well-known/ai-catalog.json"
_index._agents.<domain>.   3600 IN TXT   "v=dnsaid1 services=_mcp,_a2a index=/.well-known/agent-skills/index.json catalog=/.well-known/ai-catalog.json"
_mcp._agents.<domain>.     3600 IN TXT   "v=dnsaid1 proto=mcp endpoint=/api/mcp card=/.well-known/mcp/server-card.json transport=streamable-http"
_a2a._agents.<domain>.     3600 IN TXT   "v=dnsaid1 proto=a2a card=/.well-known/agent-card.json binding=JSON-RPC-2.0"
```

---

## 5. Cloudflare DNS Setup

### 5.1 Cloudflare Dashboard (GUI)
Under **DNS** > **Records**, create the following records:
1. **Type**: `HTTPS` | **Name**: `_index._agents` | **TTL**: `Auto` | **Priority**: `1` | **Target**: `.` | **Value**: `alpn="h3,h2" port=443`
2. **Type**: `HTTPS` | **Name**: `_mcp._agents` | **TTL**: `Auto` | **Priority**: `1` | **Target**: `.` | **Value**: `alpn="h3,h2" port=443`
3. **Type**: `HTTPS` | **Name**: `_a2a._agents` | **TTL**: `Auto` | **Priority**: `1` | **Target**: `.` | **Value**: `alpn="h3,h2" port=443`
4. **Type**: `TXT` | **Name**: `_catalog._agents` | **Content**: `url=https://<domain>/.well-known/ai-catalog.json`

### 5.2 Cloudflare API Integration
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
     -H "Content-Type: application/json" \
     --data '{"type":"HTTPS","name":"_index._agents","ttl":3600,"data":{"priority":1,"target":".","value":"alpn=\"h3,h2\" port=443"}}'
```

---

## 6. DNSSEC Cryptographic Configuration

### 6.1 Algorithm 13 Parameters
- **Algorithm**: `13` (`ECDSAP256SHA256` / ECDSA Curve P-256 with SHA-256).
- **Public Key Size**: 256 bits.
- **Key Signing Key (KSK)**: Flag `257`, 365-day rotation.
- **Zone Signing Key (ZSK)**: Flag `256`, 60-day rotation.
- **DS Record Digest**: Type `2` (SHA-256).

### 6.2 DS Record Format
```dns
<domain>. 3600 IN DS <key_tag> 13 2 <sha256_hex_digest>
```

---

## 7. Verification & Troubleshooting

### 7.1 Verify DNS-AID HTTPS Record
```bash
dig @1.1.1.1 _mcp._agents.<domain> HTTPS +dnssec
```
**Expected Output**:
- Status: `NOERROR`
- Flags: `qr rd ra ad` (Notice the **`ad`** flag indicating Authenticated Data).
- Answer section contains `HTTPS 1 . alpn=h3,h2 port=443 ...` alongside `RRSIG(HTTPS)`.

### 7.2 Verify via DNS-over-HTTPS (DoH) JSON
```bash
curl -s "https://cloudflare-dns.com/dns-query?name=_mcp._agents.<domain>&type=HTTPS&do=1" \
     -H "Accept: application/dns-json"
```
**Expected JSON**: `"AD": true`, `"Status": 0`.
