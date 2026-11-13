import { isSafeBrandLogoUrl, type PolicyWikiEntry } from '@cmlab/core';

export interface WikiSource { label: string; url: string }
export interface PublishedLaw { id: string; jurisdiction: string; title: string; summary: string; takeaways: string[]; sources: WikiSource[] }
export interface PublishedGlossary { id: string; title: string; label: string; description: string; sources: WikiSource[] }
export interface PublishedOption { id: string; label: string }
export interface PublishedQuestion { id: string; prompt: string; options: PublishedOption[]; correctOptionId: string; explanation: string; source: WikiSource }
export interface PublishedQuiz { id: string; contentVersion: string; title: string; description: string; questions: PublishedQuestion[] }
export interface PublishedWiki { schemaVersion: 1; asOf: string; laws: PublishedLaw[]; glossary: PublishedGlossary[]; quizzes: PublishedQuiz[]; policies: PolicyWikiEntry[] }

export interface QuizCompletion { score: number; contentVersion: string }
export interface QuizProgress { version: 2; completed: Record<string, QuizCompletion> }

const MAX_RESPONSE_CHARS = 512_000;
const MAX_RESPONSE_BYTES = 512_000;
const MAX_ITEMS = { laws: 80, glossary: 200, quizzes: 40, policies: 100 };
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, required: string[], optional: string[] = []): boolean {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => allowed.has(key));
}

function boundedText(value: unknown, max: number, allowEmpty = false): value is string {
  return typeof value === 'string' && value.length <= max && (allowEmpty || value.trim().length > 0);
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 100 && ID.test(value);
}

export function isSafeWikiUrl(value: unknown): value is string {
  if (!boundedText(value, 2048)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password && !/[\u0000-\u001f\u007f]/.test(value);
  } catch {
    return false;
  }
}

function source(value: unknown): value is WikiSource {
  return record(value) && exactKeys(value, ['label', 'url']) && boundedText(value.label, 180) && isSafeWikiUrl(value.url);
}

function sources(value: unknown): value is WikiSource[] {
  return Array.isArray(value) && value.length <= 12 && value.every(source);
}

function law(value: unknown): value is PublishedLaw {
  return record(value) && exactKeys(value, ['id', 'jurisdiction', 'title', 'summary', 'takeaways', 'sources']) && validId(value.id) && boundedText(value.jurisdiction, 180) &&
    boundedText(value.title, 180) && boundedText(value.summary, 2400) &&
    Array.isArray(value.takeaways) && value.takeaways.length <= 16 && value.takeaways.every((item) => boundedText(item, 1000)) &&
    sources(value.sources);
}

function glossary(value: unknown): value is PublishedGlossary {
  return record(value) && exactKeys(value, ['id', 'title', 'label', 'description', 'sources']) && validId(value.id) && boundedText(value.title, 180) &&
    boundedText(value.label, 180) && boundedText(value.description, 2400) && sources(value.sources);
}

function question(value: unknown): value is PublishedQuestion {
  if (!record(value) || !exactKeys(value, ['id', 'prompt', 'options', 'correctOptionId', 'explanation', 'source']) || !validId(value.id) || !boundedText(value.prompt, 1200) ||
    !boundedText(value.explanation, 1800) || !Array.isArray(value.options) ||
    value.options.length < 2 || value.options.length > 8 || !source(value.source)) return false;
  const ids = value.options.map((item) => record(item) && exactKeys(item, ['id', 'label']) && validId(item.id) && boundedText(item.label, 500) ? item.id : null);
  return ids.every(Boolean) && new Set(ids).size === ids.length && validId(value.correctOptionId) && ids.includes(value.correctOptionId);
}

function quiz(value: unknown): value is PublishedQuiz {
  return record(value) && exactKeys(value, ['id', 'contentVersion', 'title', 'description', 'questions']) && validId(value.id) && boundedText(value.contentVersion, 120) &&
    boundedText(value.title, 180) && boundedText(value.description, 1200) &&
    Array.isArray(value.questions) && value.questions.length > 0 && value.questions.length <= 20 &&
    value.questions.every(question) && new Set(value.questions.map((item) => record(item) ? item.id : null)).size === value.questions.length;
}

function policy(value: unknown): value is PolicyWikiEntry {
  if (!record(value) || !exactKeys(value, ['brandSlug', 'brandName', 'category', 'statutoryWarrantyMonths', 'commercialGuaranteeMonths', 'cancellationNoticeMonths', 'cancellationButtonCompliant', 'legalNotes', 'verifiedDate', 'searchAliases'], ['cancellationUrl', 'logoUrl', 'supportEmail']) || !validId(value.brandSlug) || !boundedText(value.brandName, 180) ||
    !['subscription', 'hardware'].includes(String(value.category)) ||
    !Number.isInteger(value.statutoryWarrantyMonths) || Number(value.statutoryWarrantyMonths) < 0 || Number(value.statutoryWarrantyMonths) > 1200 ||
    !Number.isInteger(value.commercialGuaranteeMonths) || Number(value.commercialGuaranteeMonths) < 0 || Number(value.commercialGuaranteeMonths) > 1200 ||
    !Number.isInteger(value.cancellationNoticeMonths) || Number(value.cancellationNoticeMonths) < 0 || Number(value.cancellationNoticeMonths) > 1200 ||
    typeof value.cancellationButtonCompliant !== 'boolean' || !boundedText(value.legalNotes, 3000, true) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(String(value.verifiedDate)) || !Array.isArray(value.searchAliases) ||
    value.searchAliases.length > 30 || !value.searchAliases.every((item) => boundedText(item, 180))) return false;
  if (value.cancellationUrl !== undefined && !isSafeWikiUrl(value.cancellationUrl)) return false;
  if (value.logoUrl !== undefined && !isSafeBrandLogoUrl(value.logoUrl)) return false;
  if (value.supportEmail !== undefined && (!boundedText(value.supportEmail, 254) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.supportEmail))) return false;
  return true;
}

export function parsePublishedWiki(value: unknown): PublishedWiki {
  if (!record(value) || !exactKeys(value, ['schemaVersion', 'asOf', 'laws', 'glossary', 'quizzes', 'policies']) || value.schemaVersion !== 1 || !boundedText(value.asOf, 80) || !Number.isFinite(Date.parse(value.asOf))) {
    throw new Error('Invalid published Wiki envelope');
  }
  for (const key of ['laws', 'glossary', 'quizzes', 'policies'] as const) {
    const items = value[key];
    if (!Array.isArray(items) || items.length > MAX_ITEMS[key]) throw new Error(`Invalid Wiki ${key} list`);
    const valid = key === 'laws' ? items.every(law) : key === 'glossary' ? items.every(glossary) : key === 'quizzes' ? items.every(quiz) : items.every(policy);
    if (!valid) throw new Error(`Invalid Wiki ${key} entry`);
    const ids = items.map((item) => record(item) ? item.id : null);
    if (new Set(ids).size !== ids.length) throw new Error(`Duplicate Wiki ${key} id`);
  }
  return value as unknown as PublishedWiki;
}

export async function fetchPublishedWiki(
  url: string | null,
  fetcher: typeof fetch = fetch,
  timeoutMs = 5000
): Promise<PublishedWiki> {
  if (!url) throw new Error('Published Wiki endpoint is not configured');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, { method: 'GET', credentials: 'omit', cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`Published Wiki request failed (${response.status})`);
    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_RESPONSE_CHARS) throw new Error('Published Wiki response is too large');
    let body = '';
    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let byteCount = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          byteCount += value.byteLength;
          if (byteCount > MAX_RESPONSE_BYTES) {
            await reader.cancel();
            throw new Error('Published Wiki response is too large');
          }
          body += decoder.decode(value, { stream: true });
          if (body.length > MAX_RESPONSE_CHARS) {
            await reader.cancel();
            throw new Error('Published Wiki response is too large');
          }
        }
        body += decoder.decode();
      } finally {
        reader.releaseLock();
      }
    } else {
      body = await response.text();
    }
    if (body.length > MAX_RESPONSE_CHARS) throw new Error('Published Wiki response is too large');
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { throw new Error('Published Wiki response is not valid JSON'); }
    const wiki = parsePublishedWiki(parsed);
    const mediaBase = response.url || url;
    return {
      ...wiki,
      policies: wiki.policies.map((entry) => entry.logoUrl?.startsWith('/')
        ? { ...entry, logoUrl: new URL(entry.logoUrl, mediaBase).href }
        : entry),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function migrateQuizProgress(value: unknown): QuizProgress {
  if (!record(value)) return { version: 2, completed: {} };
  if (value.version === 2 && record(value.completed)) {
    const completed: Record<string, QuizCompletion> = {};
    for (const [id, raw] of Object.entries(value.completed)) {
      if (!validId(id) || !record(raw) || !Number.isInteger(raw.score) || Number(raw.score) < 0 || Number(raw.score) > 20 || !boundedText(raw.contentVersion, 120)) continue;
      completed[id] = { score: Number(raw.score), contentVersion: raw.contentVersion };
    }
    return { version: 2, completed };
  }
  if (value.version === 1 && record(value.scores)) {
    const completed: Record<string, QuizCompletion> = {};
    for (const id of ['subscriptions', 'warranties']) {
      const score = value.scores[id];
      if (Number.isInteger(score) && Number(score) >= 0 && Number(score) <= 20) completed[id] = { score: Number(score), contentVersion: 'bundled-quiz-v1' };
    }
    return { version: 2, completed };
  }
  return { version: 2, completed: {} };
}

export function completionFor(progress: QuizProgress, quizId: string): QuizCompletion | undefined {
  return progress.completed[quizId];
}

export function completionPoints(progress: QuizProgress): number {
  return Object.keys(progress.completed).length;
}
