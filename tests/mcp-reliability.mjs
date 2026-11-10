import assert from 'node:assert/strict';

const base = process.argv[2];
assert.ok(base, 'Usage: node tests/mcp-reliability.mjs <showcase URL>');
const endpoint = new URL('/api/mcp', base);
const expectedTools = ['policy_lookup', 'statutory_law_lookup', 'subscription_category_rules'];
const removedTools = ['claim_dossier_generate', 'tax_deductibility_check'];
let id = 0;

async function post(method, params, requestId, protocolVersion) {
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(protocolVersion && { 'MCP-Protocol-Version': protocolVersion }),
    },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: requestId }),
  });
}

async function rpc(method, params, version = '2025-11-25') {
  const requestId = ++id;
  const response = await post(method, params, requestId, version);
  assert.equal(response.status, 200);
  const message = await response.json();
  assert.equal(message.id, requestId);
  return message;
}

function call(name, args, version) {
  return rpc('tools/call', { name, arguments: args }, version);
}

async function toolResult(name, args) {
  const message = await call(name, args);
  assert.ok(!message.error, JSON.stringify(message.error));
  assert.notEqual(message.result.isError, true);
  const result = message.result.structuredContent;
  assert.ok(result);
  assert.deepEqual(result, JSON.parse(message.result.content[0].text));
  return result;
}

const clientInfo = { name: 'cmlab-mcp-reliability', version: '2.0.0' };
for (const [requested, expected] of [
  ['2025-11-25', '2025-11-25'],
  ['2025-06-18', '2025-06-18'],
  ['2025-03-26', '2025-03-26'],
  ['2024-11-05', '2025-11-25'],
]) {
  const response = await post('initialize', { protocolVersion: requested, capabilities: {}, clientInfo }, ++id);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).result.protocolVersion, expected);
  const notification = await post('notifications/initialized', undefined, undefined, expected);
  assert.equal(notification.status, 202);
  assert.equal(await notification.text(), '');
}
assert.equal((await post('tools/list', {}, ++id, 'invalid')).status, 400);
assert.equal((await fetch(endpoint, { headers: { Accept: 'text/event-stream' } })).status, 405);
assert.equal((await fetch(endpoint, { headers: { Origin: 'https://untrusted.example' } })).status, 403);

const { result: { tools } } = await rpc('tools/list', {});
assert.deepEqual(tools.map(tool => tool.name), expectedTools);
assert.ok(tools.every(tool => tool.outputSchema?.type === 'object' && tool.outputSchema.required.length > 0));
for (const name of removedTools) assert.equal((await call(name, {})).error?.code, -32602);
const serverCard = await fetch(new URL('/.well-known/mcp/server-card.json', base)).then(res => res.json());
assert.deepEqual(serverCard.tools, tools);

const netflix = await toolResult('policy_lookup', { service_slug: 'netflix', category: 'subscription' });
assert.equal(netflix.statutory_warranty_months, null);
assert.equal(netflix.commercial_guarantee_months, null);
assert.equal(netflix.cancellation_button_compliant, null);
assert.ok(netflix.sources.some(source => source.url === 'https://help.netflix.com/de/node/407'));
assert.equal((await call('policy_lookup', { service_slug: 'netflix', category: 'hardware' })).error?.code, -32602);
const apple = await toolResult('policy_lookup', { brand_slug: 'apple' });
assert.equal(apple.statutory_warranty_months, 24);
assert.ok(apple.sources.some(source => source.url === 'https://www.gesetze-im-internet.de/bgb/__438.html'));

const law = await toolResult('statutory_law_lookup', { statute_section: '477', language: 'en' });
assert.equal(law.source, 'https://www.gesetze-im-internet.de/bgb/__477.html');
assert.equal(law.language, 'en');
assert.match(law.legal_summary, /goods|transfer of risk/i);
assert.match(law.legal_summary + law.scope_note, /digital elements/i);

const modern = await toolResult('subscription_category_rules', {
  subscription_type: 'streaming',
  contract_start_date: '2022-03-01',
});
assert.equal(modern.category, 'streaming_media');
assert.equal(modern.cancellation_button_mandatory, null);
assert.equal(modern.max_cancellation_notice_period_days, null);
assert.match(JSON.stringify(modern), /without (observing )?(a )?notice(?: period)?/i);
assert.match(modern.extraordinary_termination, /separate|independent|distinct|unaffected|own legal basis/i);
assert.ok(modern.sources.some(source => source.url === 'https://www.gesetze-im-internet.de/bgb/__312k.html'));
const legacy = await toolResult('subscription_category_rules', {
  subscription_type: 'streaming',
  contract_start_date: '2022-02-28',
});
assert.notEqual(legacy.automatic_renewal_rule, modern.automatic_renewal_rule);
const generic = await toolResult('subscription_category_rules', { subscription_type: 'generic' });
assert.equal(generic.category, 'generic');
assert.equal((await call('subscription_category_rules', {
  subscription_type: 'streaming', contract_start_date: '2026-02-30',
})).error?.code, -32602);

const legacyClient = await call('policy_lookup', { service_slug: 'netflix' }, '2025-03-26');
assert.ok(legacyClient.result.content[0].text);
assert.equal(legacyClient.result.structuredContent, undefined);
console.log('Three-tool MCP, schema discovery, legal scope and protocol checks passed for', endpoint.href);
