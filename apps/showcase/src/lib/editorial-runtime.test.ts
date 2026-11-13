import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'astro/zod';
import { createDialect } from 'emdash/db/sqlite';
import { ContentRepository, PluginStorageRepository } from 'emdash';
import { EmDashRuntime, dispatchPluginApiRequest, type RuntimeDependencies, type UserInfo } from 'emdash/internal/plugin-test-runtime';
import { proposalQueueStorage } from '../../scripts/proposal-catalog.mjs';
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

const apiEnvelope = z.object({ data: z.record(z.string(), z.unknown()) });
const lifecycleStorageRecord = z.object({
  proposalState: z.enum(['pending', 'rejected', 'archived', 'applied']),
  audit: z.array(z.object({ actorId: z.string(), action: z.enum(['rejected', 'archived', 'applied']), targetId: z.string().nullable(), targetRevision: z.string().nullable() })),
  draft: z.object({ proposal: z.object({ idempotencyKey: z.string() }) }),
});

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

  it('atomically records reviewer lifecycle outcomes with storage CAS and leaves target content unchanged', async () => {
    directory = await mkdtemp(join(tmpdir(), 'emdash-editorial-lifecycle-'));
    const sqliteDescriptor = {
      ...((await import('emdash/db')).sqlite({ url: `file:${join(directory, 'runtime.sqlite')}` })),
      entrypoint: `test-sqlite-${directory}`,
    };
    runtime = await EmDashRuntime.create({
      config: { database: sqliteDescriptor },
      plugins: [createPlugin()],
      sandboxedPluginEntries: [],
      createDialect,
      createStorage: null,
      sandboxEnabled: false,
      createSandboxRunner: null,
    } satisfies RuntimeDependencies);

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
    const contributor = actor('contributor-lifecycle', 20);
    const editor = actor('editor-lifecycle', 40);
    const admin = actor('admin-lifecycle', 50);

    await runtime.schemaRegistry.createCollection({ slug: 'pages', label: 'Pages', hidden: true });
    await runtime.schemaRegistry.createField('pages', { slug: 'title', label: 'Title', type: 'string', required: true });
    await runtime.schemaRegistry.createField('pages', { slug: 'body', label: 'Body', type: 'text', required: true });
    const content = new ContentRepository(runtime.db);
    const target = await content.create({
      type: 'pages', slug: 'manual-target', status: 'published',
      data: { title: 'Original page title', body: 'Original page body.' },
    });
    const beforeTarget = await content.findById('pages', target.id);
    expect(beforeTarget).not.toBeNull();

    const appliedProposal = { ...proposal, idempotencyKey: 'lifecycle-applied-key-0001' };
    const appliedSubmission = await dispatch('proposeDraft', contributor, appliedProposal);
    const appliedDraftId = apiEnvelope.parse(await appliedSubmission.json()).data.draftId as string;
    const pendingResponse = await dispatch('listReviewerDrafts', editor, { limit: 50 });
    const pendingData = apiEnvelope.parse(await pendingResponse.json()).data;
    const queueItems = z.array(z.object({ id: z.string(), storageRevision: z.string(), proposal: z.object({ idempotencyKey: z.string() }) }))
      .parse(pendingData.items);
    const pending = queueItems.find((item) => item.proposal.idempotencyKey === appliedProposal.idempotencyKey);
    expect(pending).toBeDefined();
    const appliedInput = {
      proposalId: appliedDraftId,
      action: 'applied',
      expectedStorageRevision: pending!.storageRevision,
      appliedTargetId: target.id,
      appliedTargetRevision: 'manual-editor-revision-1',
    };

    const contributorResolution = await dispatch('resolveProposal', contributor, appliedInput);
    expect(contributorResolution.status).toBe(403);
    const anonymousResolution = await dispatch('resolveProposal', null, appliedInput);
    expect(anonymousResolution.status).toBe(401);

    const appliedResponse = await dispatch('resolveProposal', editor, appliedInput);
    const appliedResult = apiEnvelope.parse(await appliedResponse.json()).data;
    expect(appliedResult).toMatchObject({ ok: true, item: { proposalState: 'applied' } });
    expect(appliedResult.item).toMatchObject({ audit: [{
      actorId: editor.id, action: 'applied', targetId: target.id, targetRevision: 'manual-editor-revision-1',
    }] });

    const storage = new PluginStorageRepository(
      runtime.db, 'cmlab-editorial-proposals', 'proposals', proposalQueueStorage.proposals.indexes,
    );
    const appliedStored = await storage.getVersioned(appliedDraftId);
    expect(appliedStored).not.toBeNull();
    const appliedValue = lifecycleStorageRecord.parse(appliedStored!.value);
    expect(appliedValue).toMatchObject({ proposalState: 'applied', audit: [{
      actorId: editor.id, action: 'applied', targetId: target.id, targetRevision: 'manual-editor-revision-1',
    }] });
    expect(appliedValue.draft.proposal).toMatchObject({ idempotencyKey: appliedProposal.idempotencyKey });
    expect(appliedStored!.revision).not.toBe(pending!.storageRevision);
    const afterTarget = await content.findById('pages', target.id);
    expect(afterTarget).toEqual(beforeTarget);

    const staleResponse = await dispatch('resolveProposal', admin, {
      proposalId: appliedDraftId, action: 'rejected', expectedStorageRevision: pending!.storageRevision,
    });
    expect(apiEnvelope.parse(await staleResponse.json()).data).toMatchObject({ ok: false, code: 'conflict' });

    const adminProposal = { ...proposal, idempotencyKey: 'lifecycle-admin-key-0001' };
    const adminSubmission = await dispatch('proposeDraft', contributor, adminProposal);
    const adminDraftId = apiEnvelope.parse(await adminSubmission.json()).data.draftId as string;
    const adminQueueResponse = await dispatch('listReviewerDrafts', admin, { limit: 50 });
    const adminQueue = apiEnvelope.parse(await adminQueueResponse.json()).data;
    const adminItem = z.array(z.object({ id: z.string(), storageRevision: z.string() }))
      .parse(adminQueue.items).find((item) => item.id === adminDraftId);
    expect(adminItem).toBeDefined();
    const adminResolve = await dispatch('resolveProposal', admin, {
      proposalId: adminDraftId, action: 'archived', expectedStorageRevision: adminItem!.storageRevision,
    });
    expect(apiEnvelope.parse(await adminResolve.json()).data).toMatchObject({ ok: true, item: { proposalState: 'archived' } });

    const raceProposal = { ...proposal, idempotencyKey: 'lifecycle-race-key-00001' };
    const raceSubmission = await dispatch('proposeDraft', contributor, raceProposal);
    const raceDraftId = apiEnvelope.parse(await raceSubmission.json()).data.draftId as string;
    const raceQueueResponse = await dispatch('listReviewerDrafts', editor, { limit: 50 });
    const raceQueue = apiEnvelope.parse(await raceQueueResponse.json()).data;
    const raceItem = z.array(z.object({ id: z.string(), storageRevision: z.string() }))
      .parse(raceQueue.items).find((item) => item.id === raceDraftId);
    expect(raceItem).toBeDefined();
    const expectedStorageRevision = raceItem!.storageRevision;
    const raced = await Promise.all([
      dispatch('resolveProposal', editor, { proposalId: raceDraftId, action: 'rejected', expectedStorageRevision }),
      dispatch('resolveProposal', admin, { proposalId: raceDraftId, action: 'archived', expectedStorageRevision }),
    ]);
    const raceResults = await Promise.all(raced.map(async (response) => ({ status: response.status, data: apiEnvelope.parse(await response.json()).data })));
    expect(raceResults.map(({ data }) => data.ok).sort()).toEqual([false, true]);
    expect(raceResults.every(({ status }) => status === 200)).toBe(true);
    expect(raceResults.filter(({ data }) => data.code === 'conflict')).toHaveLength(1);
    const raceStored = await storage.getVersioned(raceDraftId);
    expect(raceStored).not.toBeNull();
    const raceValue = lifecycleStorageRecord.parse(raceStored!.value);
    expect(raceValue.audit).toHaveLength(1);
    expect(['editor-lifecycle', 'admin-lifecycle']).toContain(raceValue.audit[0]?.actorId);
    expect(raceValue.proposalState).toBe(raceValue.audit[0]?.action);
    expect(raceValue.draft.proposal).toMatchObject({ idempotencyKey: raceProposal.idempotencyKey });
  });
});
