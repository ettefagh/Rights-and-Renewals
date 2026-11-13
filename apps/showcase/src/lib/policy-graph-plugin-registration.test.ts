import { describe, expect, it } from 'vitest';
import { createHookPipeline } from 'emdash';
import { createPlugin } from './policy-graph-plugin.js';

describe('native policy review hook registration', () => {
  it('runs the beforeSave gate through the installed EmDash pipeline and aborts historical version edits', async () => {
    const plugin = createPlugin();
    const records = new Map<string, { item: Record<string, unknown>; _rev: string }>([
      ['draft', { item: { id: 'draft', status: 'draft', publishedAt: null, liveRevisionId: null, data: {} }, _rev: 'draft-r1' }],
      ['published', { item: { id: 'published', status: 'published', publishedAt: '2026-11-10T00:00:00Z', liveRevisionId: 'live-r1', data: {} }, _rev: 'published-r1' }],
      ['unpublished', { item: { id: 'unpublished', status: 'draft', publishedAt: '2026-11-10T00:00:00Z', liveRevisionId: null, data: {} }, _rev: 'unpublished-r2' }],
    ]);
    const pipeline = createHookPipeline([plugin], {
      db: {} as never,
      contentActions: {
        getVersioned: async (_pluginId: string, _collection: string, id: string) => records.get(id) ?? null,
      } as never,
    });

    expect(plugin.capabilities).toContain('content:write');
    expect(plugin.capabilities).toContain('content:publish');
    await expect(pipeline.runContentBeforeSave({ title: 'new draft' }, 'policy_rule_versions', false, 'draft'))
      .resolves.toMatchObject({ content: { title: 'new draft' }, results: [{ success: true }] });
    await expect(pipeline.runContentBeforeSave({ title: 'rewrite' }, 'policy_rule_versions', false, 'published'))
      .rejects.toThrow('immutable');
    await expect(pipeline.runContentBeforeSave({ title: 'rewrite' }, 'policy_rule_versions', false, 'unpublished'))
      .rejects.toThrow('immutable');
  });
});
