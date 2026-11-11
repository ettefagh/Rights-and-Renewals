import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'astro/zod';
import { createDialect } from 'emdash/db/sqlite';
import { EmDashRuntime, dispatchPluginApiRequest, type RuntimeDependencies, type UserInfo } from 'emdash/internal/plugin-test-runtime';
import { createPlugin } from './editorial-proposals-plugin';

const actor = (id: string, role: number): UserInfo => ({
  id, role, email: `${id}@example.test`, name: id, createdAt: '2026-01-01T00:00:00.000Z',
});

const proposal = {
  contractVersion: '1.0.0',
  title: 'Review this draft',
  body: 'A bounded content proposal for the editorial queue.',
  kind: 'new_draft',
  targetCollection: 'pages',
  idempotencyKey: 'stable-review-key-0001',
};

describe('native editorial proposal runtime', () => {
  let runtime: EmDashRuntime | undefined;
  let directory: string | undefined;

  afterEach(async () => {
    if (runtime) {
      await runtime.shutdown();
      await runtime.db.destroy();
      runtime = undefined;
    }
    if (directory) {
      await rm(directory, { recursive: true, force: true });
      directory = undefined;
    }
  });

  it('persists/replays proposals and restricts own/reviewer queue routes by role', async () => {
    directory = await mkdtemp(join(tmpdir(), 'emdash-editorial-runtime-'));
    const sqliteDescriptor = {
      ...((await import('emdash/db')).sqlite({ url: `file:${join(directory, 'runtime.sqlite')}` })),
      // Runtime caches configured databases by descriptor entrypoint.
      entrypoint: `test-sqlite-${directory}`,
    };
    const deps: RuntimeDependencies = {
      config: { database: sqliteDescriptor },
      plugins: [createPlugin()],
      sandboxedPluginEntries: [],
      createDialect,
      createStorage: null,
      sandboxEnabled: false,
      createSandboxRunner: null,
    };
    runtime = await EmDashRuntime.create(deps);

    const dispatch = async (path: string, user: UserInfo | null, input: unknown) => dispatchPluginApiRequest({
      runtime: runtime!,
      pluginId: 'cmlab-editorial-proposals',
      path,
      request: new Request(`https://cms.example.test/_emdash/api/plugins/cmlab-editorial-proposals/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-EmDash-Request': '1' },
        body: JSON.stringify(input),
      }),
      user,
    });
    const contributor = actor('contributor-1', 20);
    const editor = actor('editor-1', 40);
    const otherContributor = actor('contributor-2', 20);

    const submissions = await Promise.all([
      dispatch('proposeDraft', contributor, proposal),
      dispatch('proposeDraft', contributor, proposal),
    ]);
    expect(submissions.map((response) => response.status)).toEqual([200, 200]);
    const submissionSchema = z.object({ data: z.object({ kind: z.string(), draftId: z.string(), status: z.string() }) });
    const results = await Promise.all(submissions.map(async (response) => {
      const json: unknown = await response.json();
      return submissionSchema.parse(json).data;
    }));
    expect(results.map((result) => result.kind).sort()).toEqual(['created', 'replayed']);
    expect(results[0]?.draftId).toBe(results[1]?.draftId);
    expect(results.every((result) => result.status === 'draft')).toBe(true);

    const conflict = await dispatch('proposeDraft', contributor, { ...proposal, title: 'Different payload with reused key' });
    const conflictJson: unknown = await conflict.json();
    expect(z.object({ data: z.object({ ok: z.boolean(), code: z.string() }) }).parse(conflictJson).data).toEqual({ ok: false, code: 'conflict' });

    const own = await dispatch('listOwnDrafts', contributor, { limit: 50 });
    const ownJson: unknown = await own.json();
    expect(z.object({ data: z.object({ items: z.array(z.unknown()) }) }).parse(ownJson).data.items).toHaveLength(1);
    const otherOwn = await dispatch('listOwnDrafts', otherContributor, { limit: 50 });
    const otherOwnJson: unknown = await otherOwn.json();
    expect(z.object({ data: z.object({ items: z.array(z.unknown()) }) }).parse(otherOwnJson).data.items).toEqual([]);
    const contributorQueue = await dispatch('listReviewerDrafts', contributor, { limit: 50 });
    expect(contributorQueue.status).toBe(403);
    const reviewerQueue = await dispatch('listReviewerDrafts', editor, { limit: 50 });
    const reviewerJson: unknown = await reviewerQueue.json();
    expect(z.object({ data: z.object({ items: z.array(z.unknown()) }) }).parse(reviewerJson).data.items).toHaveLength(1);
    const adminQueue = await dispatch('listReviewerDrafts', actor('admin-1', 50), { limit: 50 });
    const adminJson: unknown = await adminQueue.json();
    expect(z.object({ data: z.object({ items: z.array(z.unknown()) }) }).parse(adminJson).data.items).toHaveLength(1);
    const anonymousQueue = await dispatch('listReviewerDrafts', null, { limit: 50 });
    expect(anonymousQueue.status).toBe(401);
  });
});
