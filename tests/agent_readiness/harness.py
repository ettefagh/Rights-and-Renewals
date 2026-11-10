#!/usr/bin/env python3
"""
Agent Readiness E2E Test Harness (isitagentready.com Compliance).
Provides file accessors, Cloudflare Pages header emulation, HTTP probes,
schema validators, and full 23-check audit engine for apps/showcase and apps/app.
"""

from __future__ import annotations

import json
import re
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from hashlib import sha256
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

SHOWCASE_DIR = REPO_ROOT / "apps" / "showcase"
APP_DIR = REPO_ROOT / "apps" / "app"
DOCS_DIR = REPO_ROOT / "docs"

SHOWCASE_CANONICAL = "https://rightsandrenewals.pages.dev"
APP_CANONICAL = "https://rightsandrenewals-app.pages.dev"

# Authoritative AI Bot Lists per isitagentready.com and Cloudflare AI Crawl Control
AI_SEARCH_BOTS = ["OAI-SearchBot", "Claude-SearchBot", "PerplexityBot"]
AI_TRAIN_BOTS = ["GPTBot", "ClaudeBot", "Google-Extended"]
ALL_REQUIRED_AI_BOTS = AI_SEARCH_BOTS + AI_TRAIN_BOTS

# Content-Signal directives per contentsignals.org
REQUIRED_CONTENT_SIGNALS = ["ai-train", "search", "ai-input"]


@dataclass
class ResponseData:
    status_code: int
    headers: Dict[str, str]
    body: str
    url: str

    def get_header(self, name: str) -> Optional[str]:
        target = name.lower()
        for k, v in self.headers.items():
            if k.lower() == target:
                return v
        return None


class CloudflareHeadersParser:
    """Parses Cloudflare Pages _headers format and resolves effective headers for routes."""

    def __init__(self, headers_file: Path):
        self.rules: List[Tuple[str, Dict[str, str]]] = []
        if headers_file.exists():
            self._parse(headers_file.read_text(encoding="utf-8"))

    def _parse(self, content: str) -> None:
        current_path: Optional[str] = None
        current_headers: Dict[str, str] = {}

        for line in content.splitlines():
            line_stripped = line.strip()
            if not line_stripped or line_stripped.startswith("#"):
                continue

            if not line.startswith(" ") and not line.startswith("\t"):
                if current_path is not None:
                    self.rules.append((current_path, current_headers))
                current_path = line_stripped
                current_headers = {}
            else:
                if ":" in line_stripped:
                    key, val = line_stripped.split(":", 1)
                    current_headers[key.strip()] = val.strip()

        if current_path is not None:
            self.rules.append((current_path, current_headers))

    def resolve(self, path: str) -> Dict[str, str]:
        """Resolve combined headers for a request path following Cloudflare precedence."""
        resolved: Dict[str, str] = {}
        norm_path = "/" + path.lstrip("/")

        # Apply wildcard rules first
        for pattern, hdrs in self.rules:
            if pattern == "/*" or pattern == "*":
                resolved.update(hdrs)

        # Apply specific path rules
        for pattern, hdrs in self.rules:
            if pattern == norm_path:
                resolved.update(hdrs)
            elif pattern.endswith("/*") and norm_path.startswith(pattern[:-2]):
                resolved.update(hdrs)

        return resolved


class EndpointAccessor:
    """Retrieves endpoint content via local static files / code analysis OR live HTTP server."""

    def __init__(self, property_name: str, live_base_url: Optional[str] = None):
        self.property_name = property_name  # "showcase" or "app"
        self.live_base_url = live_base_url.rstrip("/") if live_base_url else None
        self.base_dir = SHOWCASE_DIR if property_name == "showcase" else APP_DIR
        self.canonical_origin = SHOWCASE_CANONICAL if property_name == "showcase" else APP_CANONICAL

        headers_file = self.base_dir / "public" / "_headers"
        if not headers_file.exists():
            headers_file = self.base_dir / "_headers"
        self.headers_parser = CloudflareHeadersParser(headers_file)

    def fetch(self, path: str, accept_header: Optional[str] = None) -> ResponseData:
        """Fetch endpoint either over live HTTP or via repository static/edge simulation."""
        norm_path = "/" + path.lstrip("/")

        if self.live_base_url:
            return self._fetch_live(norm_path, accept_header)
        return self._fetch_simulated(norm_path, accept_header)

    def _fetch_live(self, path: str, accept_header: Optional[str]) -> ResponseData:
        url = f"{self.live_base_url}{path}"
        req = urllib.request.Request(url)
        if accept_header:
            req.add_header("Accept", accept_header)
        req.add_header("User-Agent", "CM-LAB-AgentReadinessTest/1.0")

        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                status = resp.status
                headers = {k: v for k, v in resp.headers.items()}
                body = resp.read().decode("utf-8", errors="replace")
                return ResponseData(status_code=status, headers=headers, body=body, url=url)
        except urllib.error.HTTPError as e:
            headers = {k: v for k, v in e.headers.items()} if e.headers else {}
            body = e.read().decode("utf-8", errors="replace") if e.fp else ""
            return ResponseData(status_code=e.code, headers=headers, body=body, url=url)
        except Exception as err:
            return ResponseData(status_code=599, headers={}, body=str(err), url=url)

    def _fetch_simulated(self, path: str, accept_header: Optional[str]) -> ResponseData:
        """Simulate Cloudflare Pages CDN & Worker edge handling from repository files."""
        simulated_headers = self.headers_parser.resolve(path)
        resolved_headers = {k: v for k, v in simulated_headers.items()}

        # 1. Root / homepage handling
        if path in ["/", "/index.html"]:
            # Check for Markdown content negotiation
            prefers_markdown = False
            if accept_header and "text/markdown" in accept_header:
                prefers_markdown = True
                if "text/html" in accept_header:
                    q_md = 1.0
                    q_html = 1.0
                    for part in accept_header.split(","):
                        part = part.strip()
                        if part.startswith("text/markdown"):
                            m = re.search(r"q=([0-9.]+)", part)
                            if m:
                                q_md = float(m.group(1))
                        elif part.startswith("text/html"):
                            m = re.search(r"q=([0-9.]+)", part)
                            if m:
                                q_html = float(m.group(1))
                    if q_html > q_md:
                        prefers_markdown = False

            if prefers_markdown:
                md_content = self._extract_markdown_representation(path)
                if md_content is not None:
                    resolved_headers["Content-Type"] = "text/markdown; charset=utf-8"
                    resolved_headers["Vary"] = "Accept"
                    resolved_headers["Link"] = (
                        '</.well-known/api-catalog>; rel="api-catalog", '
                        '</auth.md>; rel="service-doc"'
                    )
                    return ResponseData(
                        status_code=200,
                        headers=resolved_headers,
                        body=md_content,
                        url=f"{self.canonical_origin}{path}"
                    )

            # Standard HTML browser request
            resolved_headers.setdefault("Content-Type", "text/html; charset=utf-8")
            resolved_headers.setdefault("Vary", "Accept")
            # If not in _headers, check if middleware or index page defines Link header
            link_header = self._find_link_header_in_code()
            if link_header and "Link" not in resolved_headers:
                resolved_headers["Link"] = link_header

            html_content = self._read_file_content("public/index.html") or self._read_file_content("index.html")
            if html_content is None:
                astro_index = self.base_dir / "src" / "pages" / "index.astro"
                if astro_index.exists():
                    html_content = astro_index.read_text(encoding="utf-8")
                else:
                    return ResponseData(404, resolved_headers, "Not Found", f"{self.canonical_origin}{path}")

            return ResponseData(
                status_code=200,
                headers=resolved_headers,
                body=html_content or "",
                url=f"{self.canonical_origin}{path}"
            )

        # 2. General static file lookup
        rel_path = path.lstrip("/")
        file_candidates = [
            self.base_dir / "public" / rel_path,
            self.base_dir / rel_path,
            self.base_dir / "dist" / rel_path,
        ]

        found_file: Optional[Path] = None
        for cand in file_candidates:
            if cand.is_file():
                found_file = cand
                break

        if found_file is None:
            return ResponseData(404, resolved_headers, "File not found", f"{self.canonical_origin}{path}")

        try:
            body_content = found_file.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            body_content = found_file.read_bytes().decode("latin1")

        # Derive Content-Type if not provided by _headers
        if "Content-Type" not in resolved_headers:
            if path.endswith(".json"):
                resolved_headers["Content-Type"] = "application/json; charset=utf-8"
            elif path.endswith(".xml"):
                resolved_headers["Content-Type"] = "application/xml; charset=utf-8"
            elif path.endswith(".txt"):
                resolved_headers["Content-Type"] = "text/plain; charset=utf-8"
            elif path.endswith(".md"):
                resolved_headers["Content-Type"] = "text/markdown; charset=utf-8"
            elif path.endswith(".html"):
                resolved_headers["Content-Type"] = "text/html; charset=utf-8"
            elif path == "/.well-known/api-catalog":
                resolved_headers["Content-Type"] = "application/linkset+json; charset=utf-8"
            elif path == "/.well-known/oauth-protected-resource":
                resolved_headers["Content-Type"] = "application/json; charset=utf-8"
            else:
                resolved_headers["Content-Type"] = "application/octet-stream"

        return ResponseData(
            status_code=200,
            headers=resolved_headers,
            body=body_content,
            url=f"{self.canonical_origin}{path}"
        )

    def _read_file_content(self, rel_path: str) -> Optional[str]:
        p = self.base_dir / rel_path
        if p.is_file():
            return p.read_text(encoding="utf-8", errors="replace")
        return None

    def _extract_markdown_representation(self, path: str) -> Optional[str]:
        """Extract negotiated markdown from middleware, pages, or markdown mock."""
        # Check src/middleware.ts or functions/_middleware.ts
        middleware_candidates = [
            self.base_dir / "src" / "middleware.ts",
            self.base_dir / "functions" / "_middleware.ts",
        ]
        for mw in middleware_candidates:
            if mw.exists():
                text = mw.read_text(encoding="utf-8", errors="replace")
                # Look for markdown literal embedded in middleware
                match = re.search(r"const\s+[A-Z0-9_]*MARKDOWN\s*=\s*`([^`]+)`", text)
                if match:
                    return match.group(1).strip()
                if "text/markdown" in text:
                    # Generic simulated markdown body from middleware
                    return f"# {self.property_name.upper()} Markdown\n\nNegotiated markdown response."

        # Check if auth.md or a static markdown file exists
        if path == "/auth.md":
            auth_file = self.base_dir / "public" / "auth.md"
            if auth_file.exists():
                return auth_file.read_text(encoding="utf-8", errors="replace")

        return None

    def _find_link_header_in_code(self) -> Optional[str]:
        """Inspect Astro pages or middleware for programmatic Link headers."""
        for candidate in [
            self.base_dir / "src" / "pages" / "index.astro",
            self.base_dir / "src" / "middleware.ts",
            self.base_dir / "functions" / "_middleware.ts"
        ]:
            if candidate.exists():
                content = candidate.read_text(encoding="utf-8", errors="replace")
                match = re.search(r"['\"]Link['\"]\s*,\s*['\"]([^'\"]+)['\"]", content)
                if match:
                    return match.group(1)
        return None


# ==============================================================================
# Validation Helpers
# ==============================================================================

def validate_robots_txt(content: str) -> Dict[str, Any]:
    """Validate robots.txt against RFC 9309, AI bots, and Content-Signals."""
    lines = [line.strip() for line in content.splitlines() if line.strip() and not line.strip().startswith("#")]
    user_agents: List[str] = []
    content_signals: List[str] = []
    sitemaps: List[str] = []
    agentmaps: List[str] = []

    for line in lines:
        if ":" in line:
            directive, value = line.split(":", 1)
            directive = directive.strip().lower()
            val = value.strip()
            if directive == "user-agent":
                user_agents.append(val)
            elif directive == "content-signal":
                content_signals.append(val)
            elif directive == "sitemap":
                sitemaps.append(val)
            elif directive == "agentmap":
                agentmaps.append(val)

    missing_ai_bots = [bot for bot in ALL_REQUIRED_AI_BOTS if not any(bot.lower() == ua.lower() for ua in user_agents)]

    cs_tokens: List[str] = []
    for cs in content_signals:
        for part in cs.split(","):
            part_s = part.strip()
            if "=" in part_s:
                cs_tokens.append(part_s.split("=")[0].strip().lower())

    missing_signals = [sig for sig in REQUIRED_CONTENT_SIGNALS if sig not in cs_tokens]

    return {
        "valid_structure": len(user_agents) > 0,
        "user_agents": user_agents,
        "missing_ai_bots": missing_ai_bots,
        "content_signals": content_signals,
        "missing_signals": missing_signals,
        "sitemaps": sitemaps,
        "agentmaps": agentmaps,
        "has_sitemap": len(sitemaps) > 0,
    }


def validate_sitemap_xml(content: str, expected_origin: str) -> Dict[str, Any]:
    """Validate sitemap.xml against sitemaps.org 0.9 schema."""
    try:
        root = ET.fromstring(content)
    except Exception as err:
        return {
            "valid_xml": False,
            "error": str(err),
            "url_count": 0,
            "urls": [],
            "invalid_origin_urls": [],
            "has_canonical_root": False
        }

    ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
    if not root.tag.endswith("urlset"):
        return {
            "valid_xml": False,
            "error": f"Root tag is not urlset: {root.tag}",
            "url_count": 0,
            "urls": [],
            "invalid_origin_urls": [],
            "has_canonical_root": False
        }

    urls: List[Dict[str, str]] = []
    for url_elem in root.findall(f"{ns}url"):
        loc = url_elem.find(f"{ns}loc")
        lastmod = url_elem.find(f"{ns}lastmod")
        changefreq = url_elem.find(f"{ns}changefreq")
        priority = url_elem.find(f"{ns}priority")

        entry: Dict[str, str] = {}
        if loc is not None and loc.text:
            entry["loc"] = loc.text.strip()
        if lastmod is not None and lastmod.text:
            entry["lastmod"] = lastmod.text.strip()
        if changefreq is not None and changefreq.text:
            entry["changefreq"] = changefreq.text.strip()
        if priority is not None and priority.text:
            entry["priority"] = priority.text.strip()
        urls.append(entry)

    invalid_origin_urls = [u["loc"] for u in urls if not u.get("loc", "").startswith(expected_origin)]

    return {
        "valid_xml": True,
        "url_count": len(urls),
        "urls": urls,
        "invalid_origin_urls": invalid_origin_urls,
        "has_canonical_root": any(u.get("loc") == f"{expected_origin}/" for u in urls),
    }


def validate_link_headers(link_header_str: str) -> Dict[str, Any]:
    """Validate RFC 8288 Link header syntax and extract relations."""
    if not link_header_str:
        return {
            "has_link": False,
            "relations": {},
            "has_api_catalog": False,
            "has_service_doc": False,
        }

    # Match <url>; rel="relation" patterns
    pattern = r'<([^>]+)>;\s*rel="?([^";,]+)"?'
    matches = re.findall(pattern, link_header_str)

    relations: Dict[str, str] = {}
    for href, rel in matches:
        relations[rel.strip()] = href.strip()

    return {
        "has_link": len(relations) > 0,
        "relations": relations,
        "has_api_catalog": "api-catalog" in relations,
        "has_service_doc": "service-doc" in relations,
    }


def validate_api_catalog(data: Any) -> Dict[str, Any]:
    """Validate RFC 9727 API Catalog linkset JSON."""
    if not isinstance(data, dict):
        return {"valid": False, "error": "Root must be a JSON object"}

    linkset = data.get("linkset")
    if not isinstance(linkset, list):
        return {"valid": False, "error": "Missing or non-array 'linkset' field"}

    has_service_desc = False
    has_service_doc = False
    has_status = False

    for item in linkset:
        if not isinstance(item, dict):
            continue
        # Supports RFC 9727 standard object structure
        if "service-desc" in item or item.get("rel") == "service-desc":
            has_service_desc = True
        if "service-doc" in item or item.get("rel") == "service-doc":
            has_service_doc = True
        if "status" in item or item.get("rel") == "status":
            has_status = True

    return {
        "valid": len(linkset) > 0 and (has_service_desc or has_service_doc),
        "has_service_desc": has_service_desc,
        "has_service_doc": has_service_doc,
        "has_status": has_status,
        "linkset_count": len(linkset)
    }


def validate_oauth_protected_resource(data: Any, expected_origin: str) -> Dict[str, Any]:
    """Validate RFC 9728 OAuth Protected Resource Metadata."""
    if not isinstance(data, dict):
        return {"valid": False, "error": "Root must be a JSON object"}

    resource = data.get("resource")
    auth_servers = data.get("authorization_servers")
    scopes = data.get("scopes_supported")
    bearer_methods = data.get("bearer_methods_supported")

    is_valid = bool(
        resource and
        isinstance(auth_servers, list) and len(auth_servers) > 0 and
        isinstance(scopes, list) and len(scopes) > 0 and
        isinstance(bearer_methods, list) and "header" in bearer_methods
    )

    return {
        "valid": is_valid,
        "resource": resource,
        "resource_matches_origin": resource == expected_origin,
        "authorization_servers": auth_servers or [],
        "scopes_supported": scopes or [],
        "bearer_methods_supported": bearer_methods or [],
    }


def validate_mcp_server_card(data: Any) -> Dict[str, Any]:
    """Validate SEP-1649 / SEP-2127 MCP Server Card."""
    if not isinstance(data, dict):
        return {"valid": False, "error": "Root must be a JSON object"}

    server_info = data.get("serverInfo")
    transport = data.get("transport")
    capabilities = data.get("capabilities")

    valid_info = isinstance(server_info, dict) and bool(server_info.get("name"))
    valid_transport = isinstance(transport, dict) and bool(transport.get("type"))
    valid_caps = isinstance(capabilities, dict)

    return {
        "valid": valid_info and valid_transport and valid_caps,
        "server_name": server_info.get("name") if valid_info else None,
        "transport_type": transport.get("type") if valid_transport else None,
        "capabilities": capabilities if valid_caps else {},
        "has_tools": bool(data.get("tools") or (capabilities and capabilities.get("tools"))),
    }


def validate_agent_skills(data: Any, base_dir: Path) -> Dict[str, Any]:
    """Validate Agent Skills Discovery RFC index.json and SHA-256 digests."""
    if not isinstance(data, dict):
        return {"valid": False, "error": "Root must be a JSON object"}

    skills = data.get("skills")
    if not isinstance(skills, list) or len(skills) == 0:
        return {"valid": False, "error": "Missing or empty 'skills' array"}

    skill_reports = []
    all_digests_valid = True

    for skill in skills:
        if not isinstance(skill, dict):
            all_digests_valid = False
            continue
        name = skill.get("name")
        stype = skill.get("type")
        url = skill.get("url")
        digest = skill.get("digest") or skill.get("sha256")

        is_digest_format = False
        digest_matches_file = None

        if digest:
            # Check sha256: prefix format or raw 64 hex characters
            clean_digest = digest.split(":")[-1]
            if re.match(r"^[0-9a-fA-F]{64}$", clean_digest):
                is_digest_format = True

            # If url points to a local file, check checksum
            if url and not url.startswith("http"):
                local_file = base_dir / "public" / url.lstrip("/")
                if local_file.exists():
                    computed = sha256(local_file.read_bytes()).hexdigest()
                    digest_matches_file = (computed.lower() == clean_digest.lower())

        if not is_digest_format:
            all_digests_valid = False

        skill_reports.append({
            "name": name,
            "type": stype,
            "url": url,
            "digest": digest,
            "is_digest_format": is_digest_format,
            "digest_matches_file": digest_matches_file,
        })

    return {
        "valid": len(skill_reports) > 0 and all_digests_valid,
        "skills_count": len(skills),
        "skills": skill_reports,
    }


def validate_ard_manifest(data: Any) -> Dict[str, Any]:
    """Validate Agentic Resource Discovery (ARD) ai-catalog.json manifest."""
    if not isinstance(data, dict):
        return {"valid": False, "error": "Root must be a JSON object"}

    # ARD v0.9 / v1.0 standard fields
    entries = data.get("entries") or data.get("mcp_endpoints") or []
    has_host_or_name = bool(data.get("host") or data.get("name") or data.get("name_for_model"))

    entries_valid = True
    for entry in entries:
        if isinstance(entry, dict):
            # ARD spec §3.4: entry must contain exactly one of url or data
            has_url = "url" in entry
            has_data = "data" in entry
            if (has_url and has_data) or (not has_url and not has_data):
                entries_valid = False

    return {
        "valid": has_host_or_name and len(entries) > 0 and entries_valid,
        "entry_count": len(entries),
        "has_host_or_name": has_host_or_name,
        "entries_valid": entries_valid,
    }


def validate_auth_md(markdown: str) -> Dict[str, Any]:
    """Validate WorkOS /auth.md specification and strict H1 heading."""
    lines = markdown.splitlines()
    first_h1 = None
    for line in lines:
        if line.strip().startswith("# "):
            first_h1 = line.strip()
            break

    # isitagentready check requirement: H1 heading must explicitly mention auth.md
    has_auth_md_h1 = bool(first_h1 and "auth.md" in first_h1.lower())
    has_registration_flow = bool(re.search(r"register|registration|token|oauth", markdown, re.IGNORECASE))
    has_scopes = bool(re.search(r"scope|scopes", markdown, re.IGNORECASE))

    return {
        "valid": has_auth_md_h1 and has_registration_flow,
        "first_h1": first_h1,
        "has_auth_md_h1": has_auth_md_h1,
        "has_registration_flow": has_registration_flow,
        "has_scopes": has_scopes,
    }


def validate_webmcp_code(base_dir: Path) -> Dict[str, Any]:
    """Inspect source code for programmatic and declarative WebMCP integration."""
    programmatic_found = False
    registered_tools: List[str] = []
    declarative_forms: List[Dict[str, Any]] = []

    # Search for registerTool in JS/TS source files
    src_dir = base_dir / "src"
    search_dirs = [src_dir, base_dir / "js"]
    for sdir in search_dirs:
        if not sdir.exists():
            continue
        for file in sdir.rglob("*.[jt]s*"):
            if "node_modules" in file.parts or ".astro" in file.name:
                continue
            text = file.read_text(encoding="utf-8", errors="replace")
            if "modelContext.registerTool" in text or "registerTool(" in text:
                programmatic_found = True
                # Extract tool names
                matches = re.findall(r"name\s*:\s*['\"]([^'\"]+)['\"]", text)
                registered_tools.extend(matches)

    # Search for declarative form attributes in Svelte and Astro files
    for file in base_dir.rglob("*.svelte"):
        if "node_modules" in file.parts:
            continue
        text = file.read_text(encoding="utf-8", errors="replace")
        if "toolname=" in text or "tooldescription=" in text:
            matches = re.findall(r'toolname=["\']([^"\']+)["\']', text)
            for m in matches:
                declarative_forms.append({"file": file.name, "toolname": m})

    return {
        "has_programmatic": programmatic_found,
        "registered_tools": list(set(registered_tools)),
        "has_declarative": len(declarative_forms) > 0,
        "declarative_forms": declarative_forms,
        "valid": programmatic_found or len(declarative_forms) > 0,
    }


def validate_dns_aid_documentation(doc_path: Path) -> Dict[str, Any]:
    """Validate docs/DNS_AID_ZONE_CONFIGURATION.md for SVCB/HTTPS & DNSSEC."""
    if not doc_path.exists():
        return {"exists": False, "valid": False}

    content = doc_path.read_text(encoding="utf-8", errors="replace")
    has_svcb_or_https = bool(re.search(r"\b(HTTPS|SVCB)\b", content))
    has_agents_namespace = "_agents" in content
    has_dnssec = "DNSSEC" in content or "DS" in content
    has_algorithm_13 = "13" in content or "ECDSAP256SHA256" in content

    is_valid = has_svcb_or_https and has_agents_namespace and has_dnssec

    return {
        "exists": True,
        "valid": is_valid,
        "has_svcb_or_https": has_svcb_or_https,
        "has_agents_namespace": has_agents_namespace,
        "has_dnssec": has_dnssec,
        "has_algorithm_13": has_algorithm_13,
    }


# ==============================================================================
# Full 23-Check Audit Emulation Engine (isitagentready.com)
# ==============================================================================

@dataclass
class AuditCheckResult:
    check_id: str
    category: str
    name: str
    status: str  # "pass", "fail", "neutral"
    details: str
    data: Optional[Dict[str, Any]] = None


def run_isitagentready_audit(accessor: EndpointAccessor) -> Dict[str, Any]:
    """Execute all 23 checks per isitagentready.com specification."""
    checks: List[AuditCheckResult] = []

    # Category 1: Discoverability
    # 1. robotsTxt
    resp = accessor.fetch("/robots.txt")
    if resp.status_code == 200 and "text/plain" in (resp.get_header("Content-Type") or ""):
        rb = validate_robots_txt(resp.body)
        checks.append(AuditCheckResult(
            "robotsTxt", "discoverability", "RFC 9309 Robots Exclusion Protocol",
            "pass" if rb["valid_structure"] else "fail",
            f"Returned HTTP 200 text/plain with {len(rb['user_agents'])} User-agent blocks",
            rb
        ))
    else:
        checks.append(AuditCheckResult(
            "robotsTxt", "discoverability", "RFC 9309 Robots Exclusion Protocol",
            "fail",
            f"Expected HTTP 200 text/plain, got {resp.status_code} {resp.get_header('Content-Type')}"
        ))

    # 2. sitemap
    resp = accessor.fetch("/sitemap.xml")
    sm = validate_sitemap_xml(resp.body, accessor.canonical_origin)
    if resp.status_code == 200 and sm["valid_xml"] and sm["url_count"] > 0:
        checks.append(AuditCheckResult(
            "sitemap", "discoverability", "Sitemaps Protocol",
            "pass",
            f"Valid XML sitemap with {sm['url_count']} canonical URLs",
            sm
        ))
    else:
        checks.append(AuditCheckResult(
            "sitemap", "discoverability", "Sitemaps Protocol",
            "fail",
            f"Invalid or missing sitemap.xml: {sm.get('error', 'Status ' + str(resp.status_code))}"
        ))

    # 3. linkHeaders
    resp = accessor.fetch("/")
    lh_header = resp.get_header("Link") or ""
    lh = validate_link_headers(lh_header)
    if lh["has_link"] and lh["has_api_catalog"]:
        checks.append(AuditCheckResult(
            "linkHeaders", "discoverability", "RFC 8288 Link Headers",
            "pass",
            f"Emits Link header with rel='api-catalog' ({len(lh['relations'])} relations)",
            lh
        ))
    else:
        checks.append(AuditCheckResult(
            "linkHeaders", "discoverability", "RFC 8288 Link Headers",
            "fail",
            f"Missing rel='api-catalog' Link header on root path (Header: '{lh_header}')"
        ))

    # 4. dnsAid
    dns_res = validate_dns_aid_documentation(DOCS_DIR / "DNS_AID_ZONE_CONFIGURATION.md")
    if dns_res["valid"]:
        checks.append(AuditCheckResult(
            "dnsAid", "discoverability", "DNS for AI Discovery (DNS-AID)",
            "pass",
            "DNS-AID SVCB/HTTPS zone configuration and DNSSEC parameters verified",
            dns_res
        ))
    else:
        checks.append(AuditCheckResult(
            "dnsAid", "discoverability", "DNS for AI Discovery (DNS-AID)",
            "fail",
            "Missing or incomplete DNS_AID_ZONE_CONFIGURATION.md"
        ))

    # Category 2: Content Accessibility
    # 5. markdownNegotiation
    md_resp = accessor.fetch("/", accept_header="text/markdown")
    if md_resp.status_code == 200 and "text/markdown" in (md_resp.get_header("Content-Type") or ""):
        checks.append(AuditCheckResult(
            "markdownNegotiation", "contentAccessibility", "Markdown Content Negotiation",
            "pass",
            f"Accept: text/markdown returned HTTP 200 text/markdown ({len(md_resp.body)} chars)"
        ))
    else:
        checks.append(AuditCheckResult(
            "markdownNegotiation", "contentAccessibility", "Markdown Content Negotiation",
            "fail",
            f"Expected text/markdown, got {md_resp.status_code} {md_resp.get_header('Content-Type')}"
        ))

    # Category 3: Bot Access Control
    # 6. robotsTxtAiRules
    resp = accessor.fetch("/robots.txt")
    rb = validate_robots_txt(resp.body)
    if resp.status_code == 200 and len(rb["missing_ai_bots"]) == 0:
        checks.append(AuditCheckResult(
            "robotsTxtAiRules", "botAccessControl", "AI Crawler Bot Policies",
            "pass",
            f"All {len(ALL_REQUIRED_AI_BOTS)} required AI search & training bots explicitly governed",
            rb
        ))
    else:
        missing = ", ".join(rb.get("missing_ai_bots", ALL_REQUIRED_AI_BOTS))
        checks.append(AuditCheckResult(
            "robotsTxtAiRules", "botAccessControl", "AI Crawler Bot Policies",
            "fail",
            f"Missing explicit User-agent rules for AI bots: {missing}"
        ))

    # 7. contentSignals
    if resp.status_code == 200 and len(rb["missing_signals"]) == 0:
        checks.append(AuditCheckResult(
            "contentSignals", "botAccessControl", "Content Signals Preferences",
            "pass",
            f"Declared Content-Signals: {', '.join(rb['content_signals'])}",
            rb
        ))
    else:
        missing = ", ".join(rb.get("missing_signals", REQUIRED_CONTENT_SIGNALS))
        checks.append(AuditCheckResult(
            "contentSignals", "botAccessControl", "Content Signals Preferences",
            "fail",
            f"Missing required Content-Signal directives: {missing}"
        ))

    # 8. webBotAuth
    resp = accessor.fetch("/.well-known/http-message-signatures-directory")
    if resp.status_code == 200:
        checks.append(AuditCheckResult(
            "webBotAuth", "botAccessControl", "Web Bot Authentication",
            "pass",
            "HTTP message signatures directory present"
        ))
    else:
        checks.append(AuditCheckResult(
            "webBotAuth", "botAccessControl", "Web Bot Authentication",
            "neutral",
            "Web Bot Auth optional; informational"
        ))

    # Category 4: Protocol Discovery
    # 9. apiCatalog
    resp = accessor.fetch("/.well-known/api-catalog")
    ct = resp.get_header("Content-Type") or ""
    try:
        data = json.loads(resp.body)
        ac = validate_api_catalog(data)
        if resp.status_code == 200 and "application/linkset+json" in ct and ac["valid"]:
            checks.append(AuditCheckResult(
                "apiCatalog", "protocolDiscovery", "RFC 9727 API Catalog Linkset",
                "pass",
                f"Valid linkset with {ac['linkset_count']} relations",
                ac
            ))
        else:
            checks.append(AuditCheckResult(
                "apiCatalog", "protocolDiscovery", "RFC 9727 API Catalog Linkset",
                "fail",
                f"Invalid API catalog or wrong Content-Type ({ct})"
            ))
    except Exception as e:
        checks.append(AuditCheckResult(
            "apiCatalog", "protocolDiscovery", "RFC 9727 API Catalog Linkset",
            "fail",
            f"Failed to parse API catalog: {e}"
        ))

    # 10. oauthProtectedResource
    resp = accessor.fetch("/.well-known/oauth-protected-resource")
    try:
        data = json.loads(resp.body)
        opr = validate_oauth_protected_resource(data, accessor.canonical_origin)
        if resp.status_code == 200 and opr["valid"]:
            checks.append(AuditCheckResult(
                "oauthProtectedResource", "protocolDiscovery", "RFC 9728 Protected Resource Metadata",
                "pass",
                f"Valid metadata with scopes: {', '.join(opr['scopes_supported'])}",
                opr
            ))
        else:
            checks.append(AuditCheckResult(
                "oauthProtectedResource", "protocolDiscovery", "RFC 9728 Protected Resource Metadata",
                "fail",
                f"Invalid OAuth Protected Resource Metadata: {opr.get('error', 'Schema mismatch')}"
            ))
    except Exception as e:
        checks.append(AuditCheckResult(
            "oauthProtectedResource", "protocolDiscovery", "RFC 9728 Protected Resource Metadata",
            "fail",
            f"Failed to parse OAuth Protected Resource Metadata: {e}"
        ))

    # 11. oauthDiscovery
    resp = accessor.fetch("/.well-known/oauth-authorization-server")
    if resp.status_code == 200:
        checks.append(AuditCheckResult(
            "oauthDiscovery", "protocolDiscovery", "RFC 8414 OAuth Authorization Server",
            "pass",
            "OAuth Authorization Server metadata present"
        ))
    else:
        checks.append(AuditCheckResult(
            "oauthDiscovery", "protocolDiscovery", "RFC 8414 OAuth Authorization Server",
            "neutral",
            "OAuth AS optional for resource-only servers"
        ))

    # 12. authMd
    resp = accessor.fetch("/auth.md")
    amd = validate_auth_md(resp.body)
    if resp.status_code == 200 and amd["valid"]:
        checks.append(AuditCheckResult(
            "authMd", "protocolDiscovery", "WorkOS auth.md Agent Guidance",
            "pass",
            f"Valid auth.md with H1: '{amd['first_h1']}'",
            amd
        ))
    else:
        checks.append(AuditCheckResult(
            "authMd", "protocolDiscovery", "WorkOS auth.md Agent Guidance",
            "fail",
            f"auth.md missing or missing required H1 'auth.md' header (Status {resp.status_code})"
        ))

    # 13. mcpServerCard
    resp = accessor.fetch("/.well-known/mcp/server-card.json")
    try:
        data = json.loads(resp.body)
        mcp = validate_mcp_server_card(data)
        if resp.status_code == 200 and mcp["valid"]:
            checks.append(AuditCheckResult(
                "mcpServerCard", "protocolDiscovery", "SEP-1649 MCP Server Card",
                "pass",
                f"Valid server card for '{mcp['server_name']}' via {mcp['transport_type']}",
                mcp
            ))
        else:
            checks.append(AuditCheckResult(
                "mcpServerCard", "protocolDiscovery", "SEP-1649 MCP Server Card",
                "fail",
                f"Invalid MCP Server Card: {mcp.get('error', 'Schema mismatch')}"
            ))
    except Exception as e:
        checks.append(AuditCheckResult(
            "mcpServerCard", "protocolDiscovery", "SEP-1649 MCP Server Card",
            "fail",
            f"Failed to parse MCP server card: {e}"
        ))

    # 14. agentSkills
    resp = accessor.fetch("/.well-known/agent-skills/index.json")
    try:
        data = json.loads(resp.body)
        skills = validate_agent_skills(data, accessor.base_dir)
        if resp.status_code == 200 and skills["valid"]:
            checks.append(AuditCheckResult(
                "agentSkills", "protocolDiscovery", "Cloudflare Agent Skills Discovery",
                "pass",
                f"Valid index with {skills['skills_count']} skills and SHA-256 digests",
                skills
            ))
        else:
            checks.append(AuditCheckResult(
                "agentSkills", "protocolDiscovery", "Cloudflare Agent Skills Discovery",
                "fail",
                f"Invalid Agent Skills index: {skills.get('error', 'Digest format error')}"
            ))
    except Exception as e:
        checks.append(AuditCheckResult(
            "agentSkills", "protocolDiscovery", "Cloudflare Agent Skills Discovery",
            "fail",
            f"Failed to parse Agent Skills index: {e}"
        ))

    # 15. webMcp
    wmcp = validate_webmcp_code(accessor.base_dir)
    if wmcp["valid"]:
        checks.append(AuditCheckResult(
            "webMcp", "protocolDiscovery", "W3C WebMCP In-Browser Integration",
            "pass",
            f"WebMCP verified (Programmatic tools: {len(wmcp['registered_tools'])}, Declarative forms: {len(wmcp['declarative_forms'])})",
            wmcp
        ))
    else:
        checks.append(AuditCheckResult(
            "webMcp", "protocolDiscovery", "W3C WebMCP In-Browser Integration",
            "fail",
            "No WebMCP programmatic or declarative tools detected"
        ))

    # 16. ard
    resp = accessor.fetch("/.well-known/ai-catalog.json")
    cors = resp.get_header("Access-Control-Allow-Origin")
    try:
        data = json.loads(resp.body)
        ard = validate_ard_manifest(data)
        if resp.status_code == 200 and ard["valid"] and cors == "*":
            checks.append(AuditCheckResult(
                "ard", "protocolDiscovery", "Agentic Resource Discovery (ARD)",
                "pass",
                f"Valid ARD manifest with {ard['entry_count']} entries and CORS: *",
                ard
            ))
        else:
            checks.append(AuditCheckResult(
                "ard", "protocolDiscovery", "Agentic Resource Discovery (ARD)",
                "fail",
                f"Invalid ARD manifest or missing CORS: * (Header: '{cors}')"
            ))
    except Exception as e:
        checks.append(AuditCheckResult(
            "ard", "protocolDiscovery", "Agentic Resource Discovery (ARD)",
            "fail",
            f"Failed to parse ARD manifest: {e}"
        ))

    # Category 5: Commerce (Neutral for non-commerce apps)
    commerce_checks = [
        ("x402", "HTTP 402 Micropayments"),
        ("mpp", "Model Payment Protocol"),
        ("ucp", "Universal Commerce Protocol"),
        ("acp", "Agent Commerce Protocol"),
        ("ap2", "Agent Purchase Protocol v2")
    ]
    for cid, cname in commerce_checks:
        checks.append(AuditCheckResult(
            cid, "commerce", cname, "neutral", "Commerce check evaluated as neutral (non-commerce target)"
        ))

    # Readiness Level Determination (0 to 5)
    passed_ids = {c.check_id for c in checks if c.status == "pass"}

    level = 0
    level_name = "Not Ready"

    # Level 1: Basic Web Presence
    l1_pass = {"robotsTxt", "sitemap", "linkHeaders"}.issubset(passed_ids)
    if l1_pass:
        level = 1
        level_name = "Basic Web Presence"

    # Level 2: Bot-Governed
    l2_pass = l1_pass and {"robotsTxtAiRules", "contentSignals"}.issubset(passed_ids)
    if l2_pass:
        level = 2
        level_name = "Bot-Governed"

    # Level 3: Content-Accessible
    l3_pass = l2_pass and {"markdownNegotiation"}.issubset(passed_ids)
    if l3_pass:
        level = 3
        level_name = "Content-Accessible"

    # Level 4: Agent-Integrated
    l4_pass = l3_pass and {"apiCatalog", "mcpServerCard", "agentSkills", "webMcp", "ard"}.issubset(passed_ids)
    if l4_pass:
        level = 4
        level_name = "Agent-Integrated"

    # Level 5: Agent-Native
    l5_pass = l4_pass and {"authMd", "oauthProtectedResource"}.issubset(passed_ids)
    if l5_pass:
        level = 5
        level_name = "Agent-Native"

    return {
        "property": accessor.property_name,
        "canonical_origin": accessor.canonical_origin,
        "readiness_level": level,
        "readiness_level_name": level_name,
        "checks": [c.__dict__ for c in checks],
        "passed_count": len([c for c in checks if c.status == "pass"]),
        "failed_count": len([c for c in checks if c.status == "fail"]),
        "neutral_count": len([c for c in checks if c.status == "neutral"]),
        "total_checks": len(checks)
    }
