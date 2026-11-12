# Germany subscription research database

Reconstructed from the conversation research dated 6 November 2026; not byte-identical to the earlier binary and not newly web-verified. This is a shortlist, not a verified popularity ranking.

The Base64-encoded gzip SQL export contains 50 providers, 104 plans, 128 offers, 145 pricing phases, 51 cancellation-rule records, 57 source URLs and 43 research gaps. It is encoded because the GitHub connector accepts text uploads.

Restore with Python 3.8+ and SQLite JSON support, running in this folder:

```python
from pathlib import Path
import base64, gzip, hashlib, sqlite3
raw = gzip.decompress(base64.b64decode(Path('germany_subscriptions.sql.gz.b64').read_text(), validate=True))
assert hashlib.sha256(raw).hexdigest() == 'e871ae21821a5bc70d6920c7b8e8b884c1610fbfabcb998358007441795640c1'
target = Path('germany_subscriptions.sqlite')
assert not target.exists(), 'Move existing database aside first'
with sqlite3.connect(target) as con:
    con.executescript(raw.decode('utf-8'))
    assert con.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    assert not con.execute('PRAGMA foreign_key_check').fetchall()
Path('germany_subscriptions.sql').write_bytes(raw)
```

Prices are integer EUR cents. NULL means unknown or quote-based, not free. Billing interval and minimum term are separate; four weeks is not a calendar month. Reported confirmation refers to prior research only. Promotions, future rates and geographic/eligibility limits require their stored notes. Cancellation summaries are not legal advice.

Views: `subscription_catalog`, `provider_research_coverage`. Tables include providers, plans, offers, price_phases, fees, cancellation_rules, sources, provider_sources and research_gaps.
