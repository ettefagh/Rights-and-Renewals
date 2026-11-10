import assert from 'node:assert/strict';

const base = process.argv[2];
assert.ok(base, 'Usage: node tests/mcp-reliability.mjs <showcase URL>');
const endpoint = new URL('/api/mcp', base);
let id = 0;
let protocolVersion;

async function rpc(method, params, notification = false) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(protocolVersion && { 'MCP-Protocol-Version': protocolVersion }),
    },
    body: JSON.stringify({ jsonrpc: '2.0', method, params, id: notification ? undefined : ++id }),
  });
  if (notification) {
    assert.equal(response.status, 202);
    return;
  }
  assert.equal(response.status, 200);
  const message = await response.json();
  assert.equal(message.id, id);
  return message;
}

function call(name, args) {
  return rpc('tools/call', { name, arguments: args });
}

async function toolResult(name, args) {
  const message = await call(name, args);
  assert.ok(!message.error, JSON.stringify(message.error));
  assert.notEqual(message.result.isError, true);
  return JSON.parse(message.result.content[0].text);
}

const hello = await rpc('initialize', {
  protocolVersion: '2025-11-25',
  capabilities: {},
  clientInfo: { name: 'cmlab-mcp-reliability', version: '1.0.0' },
});
protocolVersion = hello.result.protocolVersion;
await rpc('notifications/initialized', undefined, true);
const discovery = await rpc('tools/list', {});
assert.ok(['claim_dossier_generate', 'tax_deductibility_check', 'policy_lookup'].every(
  name => discovery.result.tools.some(tool => tool.name === name)
));

const cancellation = await toolResult('claim_dossier_generate', {
  brand_slug: 'netflix',
  item_name: 'Netflix Premium (synthetic test)',
  purchase_date: '2026-11-01',
  defect_description: 'Synthetic test only: cancellation request',
  issue_type: 'contract_cancellation',
});
assert.equal(cancellation.status, 'draft');
assert.equal(cancellation.issue_type, 'contract_cancellation');
assert.match(cancellation.dossier_text_de, /kündig/i);
assert.ok(cancellation.sources.some(source => source.url === 'https://www.gesetze-im-internet.de/bgb/__312k.html'));
assert.doesNotMatch(cancellation.dossier_text_de, /Mängelrüge|Nacherfüllung|Nachbesserung|Neulieferung/i);
assert.notEqual(cancellation.lexfox_safe_harbor_certified, true);

const minimalCancellation = await toolResult('claim_dossier_generate', {
  service_slug: 'netflix',
  contract_name: 'Synthetic subscription',
  issue_type: 'contract_cancellation',
});
assert.match(minimalCancellation.dossier_text_de, /Synthetic subscription/);

const defectArgs = {
  brand_slug: 'apple',
  item_name: 'Synthetic laptop',
  purchase_date: '2026-10-01',
  defect_description: 'Synthetic test: the screen does not turn on',
};
const defect = await toolResult('claim_dossier_generate', defectArgs);
assert.match(defect.dossier_text_de, /Nacherfüllung/i);
for (const invalid of [
  { ...defectArgs, issue_type: 'unknown' },
  { ...defectArgs, purchase_date: '2026-02-30' },
  { ...defectArgs, brand_slug: 42 },
  { brand_slug: 'netflix', issue_type: 'contract_cancellation' },
]) {
  assert.equal((await call('claim_dossier_generate', invalid)).error?.code, -32602);
}

const subscription = await toolResult('tax_deductibility_check', {
  item_name: 'Netflix subscription',
  item_category: 'subscription',
  gross_price_eur: 13.99,
  professional_use_percent: 50,
  taxpayer_status: 'master_zweitstudium',
  purchase_date: '2026-11-01',
});
assert.equal(subscription.status, 'manual_review');
assert.equal(subscription.is_deductible, false);
assert.equal(subscription.bmf_2022_eligible, false);
assert.equal(subscription.deductible_amount_eur, null);
assert.ok(subscription.sources.some(source => source.url === 'https://www.gesetze-im-internet.de/estg/__9.html'));

const hardware = await toolResult('tax_deductibility_check', {
  asset_name: 'Synthetic laptop',
  asset_category: 'computer_hardware',
  gross_price_eur: 1000,
  academic_usage_percent: 50,
});
assert.equal(hardware.bmf_2022_eligible, true);
assert.doesNotMatch(hardware.write_off_method, /sofortabschreibung/i);

for (const args of [
  { item_name: 'Generic hardware', item_category: 'hardware', professional_use_percent: 80 },
  { asset_name: 'Unverified use', asset_category: 'computer_hardware' },
  { asset_name: 'Recurring software', asset_category: 'software_saas', academic_usage_percent: 100 },
]) {
  const result = await toolResult('tax_deductibility_check', { ...args, gross_price_eur: 1000 });
  assert.equal(result.status, 'manual_review');
  assert.equal(result.bmf_2022_eligible, false);
  assert.equal(result.deductible_amount_eur, null);
}
assert.equal((await call('tax_deductibility_check', {
  item_name: 'Subscription with inconsistent classification',
  item_category: 'subscription',
  asset_category: 'acquired_business_software',
  gross_price_eur: 15,
})).error?.code, -32602);

const serverCard = await fetch(new URL('/.well-known/mcp/server-card.json', base)).then(res => res.json());
for (const name of ['claim_dossier_generate', 'tax_deductibility_check', 'policy_lookup']) {
  assert.deepEqual(
    serverCard.tools.find(tool => tool.name === name),
    discovery.result.tools.find(tool => tool.name === name),
  );
}

const netflix = await toolResult('policy_lookup', { service_slug: 'netflix', category: 'subscription' });
assert.equal(netflix.statutory_warranty_months, null);
assert.equal(netflix.commercial_guarantee_months, null);
assert.equal(netflix.cancellation_button_compliant, null);
assert.ok(netflix.sources.some(source => source.url === 'https://help.netflix.com/de/node/407'));
const apple = await toolResult('policy_lookup', { brand_slug: 'apple' });
assert.equal(apple.statutory_warranty_months, 24);
assert.ok(apple.sources.some(source => source.url === 'https://www.gesetze-im-internet.de/bgb/__438.html'));

console.log('MCP reliability checks passed for', endpoint.href);
