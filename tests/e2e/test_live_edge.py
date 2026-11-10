"""
Live edge verification script for Rights & Renewals + EmDash CMS endpoints.
"""

import sys
import urllib.request
import urllib.error
import json

TARGETS = [
    "https://rightsandrenewals.pages.dev",
    "https://rights-and-renewals.pages.dev",
    "https://cm-lab-showcase.pages.dev"
]

def check_endpoint(url, method="GET", expected_status=(200,), payload=None, headers=None):
    if headers is None:
        headers = {}
    if "User-Agent" not in headers:
        headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) RightsAndRenewalsEdgeVerifier/1.0"
    
    data = payload.encode("utf-8") if payload else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
            body = resp.read().decode("utf-8", errors="replace")
            return status, body, None
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return e.code, body, None
    except Exception as e:
        return 0, "", str(e)

def main():
    print("=" * 80)
    print("  RIGHTS & RENEWALS + EMDASH CMS LIVE EDGE VERIFICATION")
    print("=" * 80)
    
    passed = 0
    total = 0
    
    for base in TARGETS:
        print(f"\nTarget: {base}")
        print("-" * 60)
        
        checks = [
            # EmDash endpoints
            ("EmDash Setup Status", f"{base}/_emdash/api/setup/status", "GET", (200,), None, {}),
            ("EmDash Native MCP (OAuth)", f"{base}/_emdash/api/mcp", "POST", (401,), '{"jsonrpc":"2.0","id":1,"method":"tools/list"}', {"Content-Type": "application/json"}),
            ("EmDash Admin Login Shell", f"{base}/_emdash/admin/login?redirect=%2F_emdash%2Fadmin", "GET", (200,), None, {}),
            ("EmDash Admin Redirect", f"{base}/_emdash/admin", "GET", (302, 200), None, {}),
            ("Public EmDash Telemetry Desk", f"{base}/emdash", "GET", (200,), None, {}),
            
            # Rights & Renewals MCP & Discovery
            ("Rights & Renewals Statutory MCP Server", f"{base}/api/mcp", "POST", (200,), '{"jsonrpc":"2.0","id":1,"method":"tools/list"}', {"Content-Type": "application/json"}),
            ("Agent Setup Guide", f"{base}/agent-setup", "GET", (200,), None, {}),
            ("Agent Setup Shortlink", f"{base}/setup", "GET", (200,), None, {}),
            ("Agent Setup System Prompt Raw", f"{base}/agent-setup/prompt.md", "GET", (200,), None, {}),
            ("MCP Server Card Discovery", f"{base}/.well-known/mcp/server-card.json", "GET", (200,), None, {}),
            ("Agent Skills Discovery Index", f"{base}/.well-known/agent-skills/index.json", "GET", (200,), None, {}),
            ("Unified AI Catalog", f"{base}/.well-known/ai-catalog.json", "GET", (200,), None, {}),
            ("Showcase Landing Page", f"{base}/", "GET", (200,), None, {}),
            ("Public Consumer Wiki Index", f"{base}/wiki", "GET", (200,), None, {}),
            ("Public Consumer Wiki Entry", f"{base}/wiki/spotify", "GET", (200,), None, {}),
        ]
        
        for name, url, method, exp_statuses, payload, hdrs in checks:
            total += 1
            status, body, err = check_endpoint(url, method=method, expected_status=exp_statuses, payload=payload, headers=hdrs)
            if status in exp_statuses:
                print(f"  [PASS] {name:38} -> HTTP {status} (expected {exp_statuses})")
                passed += 1
            else:
                print(f"  [FAIL] {name:38} -> HTTP {status} (expected {exp_statuses}) Err: {err}")
                if body:
                    print(f"         Body excerpt: {body[:150]}")
    
    print("\n" + "=" * 80)
    print(f"  RESULTS: {passed}/{total} endpoints passed ({passed/total*100:.1f}%)")
    print("=" * 80)
    
    if passed < total:
        sys.exit(1)

if __name__ == "__main__":
    main()
