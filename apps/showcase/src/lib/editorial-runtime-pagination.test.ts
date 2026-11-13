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

describe('native editorial proposal runtime pagination', () => {
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

  it('paginates storage backed reviewer drafts with a stable cursor and enforces reviewer authorization', async () => {
    directory = await mkdtemp(join(tmpdir(), 'emdash-editorial-pagination-'));
    const sqliteDescriptor = {
      ...((await import('emdash/db')).sqlite({ url: `file:${join(directory, 'runtime.sqlite')}` })),
      entrypoint: `test-sqlite-${directory}`,
    };
    const deps: RuntimeDependencies = {
      config: { database: sqliteDescriptor }, plugins: [createPlugin()], sandboxedPluginEntries: [],
      createDialect, createStorage: null, sandboxEnabled: false, createSandboxRunner: null,
    };
    runtime = await EmDashRuntime.create(deps);

    const dispatch = async (path: string, user: UserInfo | null, input: unknown) => dispatchPluginApiRequest({
      runtime: runtime!, pluginId: 'cmlab-editorial-proposals', path,
      request: new Request(`https://cms.example.test/_emdash/api/plugins/cmlab-editorial-proposals/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-EmDash-Request': '1' },
        body: JSON.stringify(input),
      }), user,
    });

    const contributor = actor('pagination-contributor', 20);
    const reviewer = actor('pagination-editor', 40);
    const submissions = await Promise.all([1, 2, 3, 4, 5].map((index) => dispatch('proposeDraft', contributor, {
      contractVersion: '1.0.0', title: `Pagination draft ${index}`,
      body: `A bounded proposal for pagination test ${index}.`, kind: 'new_draft',
      targetCollection: 'pages', idempotencyKey: `pagination-key-${index}`,
    })));
    expect(submissions.map(({ status }) => status)).toEqual([200, 200, 200, 200, 200]);
    const submissionSchema = z.object({ data: z.object({ draftId: z.string() }) });
    const submittedIds = await Promise.all(submissions.map(async (response) =>
      submissionSchema.parse(await response.json()).data.draftId));

    const denied = await dispatch('listReviewerDrafts', contributor, { limit: 2 });
    expect(denied.status).toBe(403);

    const pageSchema = z.object({ data: z.object({
      items: z.array(z.object({ id: z.string() })), cursor: z.string().optional(), hasMore: z.boolean(),
    }) });
    const firstResponse = await dispatch('listReviewerDrafts', reviewer, { limit: 2 });
    expect(firstResponse.status).toBe(200);
    const first = pageSchema.parse(await firstResponse.json()).data;
    expect(first.items).toHaveLength(2);
    expect(first.cursor).toBeTruthy();
    expect(first.hasMore).toBe(true);

    const secondResponse = await dispatch('listReviewerDrafts', reviewer, { limit: 2, cursor: first.cursor });
    expect(secondResponse.status).toBe(200);
    const second = pageSchema.parse(await secondResponse.json()).data;
    expect(second.items).toHaveLength(2);
    expect(second.cursor).toBeTruthy();
    expect(second.hasMore).toBe(true);

    const thirdResponse = await dispatch('listReviewerDrafts', reviewer, { limit: 2, cursor: second.cursor });
    expect(thirdResponse.status).toBe(200);
    const third = pageSchema.parse(await thirdResponse.json()).data;
    expect(third.items).toHaveLength(1);
    expect(third.hasMore).toBe(false);
    expect(third.cursor).toBeUndefined();

    const pageIds = [...first.items, ...second.items, ...third.items].map(({ id }) => id);
    expect(new Set(pageIds).size).toBe(5);
    expect([...pageIds].sort()).toEqual([...submittedIds].sort());
  });
});
