#!/usr/bin/env node
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_ANALYTICS_READ_TOKEN;
const dataset = process.env.EDITORIAL_ANALYTICS_DATASET ?? 'cmlab_editorial_events';
const report = process.argv[2] ?? 'events-by-name';
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const from = process.argv[3] ?? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
const through = process.argv[4] ?? new Date().toISOString().slice(0, 10);

if (report === 'registrations') {
  process.stdout.write(`${JSON.stringify({ status: 'not_configured', registrations: null, reason: 'no_verified_authoritative_source' }, null, 2)}\n`);
  process.exit(0);
}
if (!['events-by-name', 'events-by-day', 'cta-clicks', 'policy-opens', 'plan-selections'].includes(report)) throw new Error('Allowed reports: events-by-name, events-by-day, cta-clicks, policy-opens, plan-selections, registrations.');

if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId) || !token) {
  throw new Error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_ANALYTICS_READ_TOKEN in the process environment.');
}
if (!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(dataset)) throw new Error('Dataset name must be a SQL identifier.');
if (!datePattern.test(from) || !datePattern.test(through) || from > through) throw new Error('Use an inclusive YYYY-MM-DD date range.');

const start = `${from} 00:00:00`;
const end = `${through} 23:59:59`;
const common = `FROM ${dataset} WHERE timestamp >= toDateTime('${start}') AND timestamp <= toDateTime('${end}')`;
const reports = {
  'policy-opens': `SELECT blob3 AS policy_id, SUM(_sample_interval) AS approximate_opens ${common} AND index1 = 'policy_open' GROUP BY policy_id ORDER BY approximate_opens DESC LIMIT 100`,
  'plan-selections': `SELECT blob3 AS plan_id, SUM(_sample_interval) AS approximate_selections ${common} AND index1 = 'plan_select' GROUP BY plan_id ORDER BY approximate_selections DESC LIMIT 100`,
  'events-by-name': `SELECT index1 AS event_name, SUM(_sample_interval) AS approximate_events ${common} GROUP BY event_name ORDER BY approximate_events DESC LIMIT 20`,
  'events-by-day': `SELECT formatDateTime(timestamp, '%Y-%m-%d') AS day, index1 AS event_name, SUM(_sample_interval) AS approximate_events ${common} GROUP BY day, event_name ORDER BY day ASC, event_name ASC LIMIT 500`,
  'cta-clicks': `SELECT blob5 AS cta_id, SUM(_sample_interval) AS approximate_clicks ${common} AND index1 = 'cta_click' GROUP BY cta_id ORDER BY approximate_clicks DESC LIMIT 100`,
};
if (!Object.hasOwn(reports, report)) throw new Error('Allowed reports: events-by-name, events-by-day, cta-clicks, policy-opens, plan-selections, registrations.');

const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`, {
  method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'text/plain' }, body: reports[report],
});
if (!response.ok) throw new Error(`Analytics query failed with HTTP ${response.status}.`);
process.stdout.write(await response.text());

