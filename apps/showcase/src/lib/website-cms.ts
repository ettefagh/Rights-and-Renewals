import { getEmDashCollection, getEmDashEntry, getRequestContext, isSafeHref, runWithContext } from 'emdash';

export const WEBSITE_COLLECTION = 'pages';
export const WEBSITE_BLOCK_TYPES = ['hero', 'copy_section', 'feature_list', 'faq', 'cta'] as const;

export interface WebsiteBlock {
  _type: string;
  _key?: string;
  [field: string]: unknown;
}

export interface WebsitePage {
  id: string;
  title: string;
  description?: string;
  sections: WebsiteBlock[];
  isPreview: boolean;
  legacyContent?: unknown;
  seo?: Record<string, unknown>;
}

type Entry = { id: string; status?: string; data: Record<string, unknown> };

const cleanText = (value: unknown, max = 2000): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max ? value.trim() : undefined;
const slugOk = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > 2048) return undefined;
  const url = value.trim();
  return url && isSafeHref(url) ? url : undefined;
}

function validateItem(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const item = value as Record<string, unknown>;
  const type = item._type;
  if (typeof type !== 'string' || !WEBSITE_BLOCK_TYPES.includes(type as typeof WEBSITE_BLOCK_TYPES[number])) return undefined;
  const key = cleanText(item._key, 120);
  const heading = cleanText(item.heading, 180);
  const body = cleanText(item.body, 4000);
  const label = cleanText(item.cta_label, 100);
  const href = safeUrl(item.cta_url);
  const id = cleanText(item.cta_id, 120);
  const items = Array.isArray(item.items)
    ? item.items.slice(0, 12).map((raw) => {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
        const row = raw as Record<string, unknown>;
        const title = cleanText(row.title, 180);
        const text = cleanText(row.body, 1000);
        return title && text ? { title, body: text } : undefined;
      }).filter((row): row is { title: string; body: string } => Boolean(row))
    : [];
  const questions = Array.isArray(item.questions)
    ? item.questions.slice(0, 12).map((raw) => {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
        const row = raw as Record<string, unknown>;
        const question = cleanText(row.question, 500);
        const answer = cleanText(row.answer, 2000);
        return question && answer ? { question, answer } : undefined;
      }).filter((row): row is { question: string; answer: string } => Boolean(row))
    : [];

  if (type === 'hero' && !heading) return undefined;
  if (type === 'copy_section' && !heading && !body) return undefined;
  if (type === 'feature_list' && items.length === 0) return undefined;
  if (type === 'faq' && questions.length === 0) return undefined;
  if (type === 'cta' && !(label && href && id)) return undefined;
  return {
    _type: type,
    ...(key ? { _key: key } : {}),
    ...(heading ? { heading } : {}),
    ...(body ? { body } : {}),
    ...(label && href && id ? { cta_label: label, cta_url: href, cta_id: id } : {}),
    ...(items.length ? { items } : {}),
    ...(questions.length ? { questions } : {}),
  };
}

export function validateWebsiteBlocks(value: unknown): WebsiteBlock[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 30).map(validateItem).filter((item): item is WebsiteBlock => Boolean(item));
}

function mapPage(entry: Entry, isPreview = false): WebsitePage | null {
  const slug = entry.id.split('/').at(-1) ?? '';
  if (!slugOk(slug) || entry.status && entry.status !== 'published' && !isPreview) return null;
  const title = cleanText(entry.data.title, 180);
  const description = cleanText(entry.data.description, 320);
  if (!title) return null;
  return {
    id: slug,
    title,
    ...(description ? { description } : {}),
    ...(entry.data.seo && typeof entry.data.seo === 'object' && !Array.isArray(entry.data.seo) ? { seo: entry.data.seo as Record<string, unknown> } : {}),
    sections: validateWebsiteBlocks(entry.data.sections),
    isPreview,
    ...(Array.isArray(entry.data.content) ? { legacyContent: entry.data.content } : {}),
  };
}

async function runWithoutDraftVisibility<T>(read: () => Promise<T>): Promise<T> {
  const context = getRequestContext();
  if (!context || (!context.editMode && !context.preview)) return read();
  const { preview: _preview, ...publicContext } = context;
  return runWithContext({ ...publicContext, editMode: false }, read);
}

export async function getPublishedWebsitePages(): Promise<WebsitePage[]> {
  return runWithoutDraftVisibility(async () => {
    const { entries, error } = await getEmDashCollection<typeof WEBSITE_COLLECTION, Record<string, unknown>>(
      WEBSITE_COLLECTION,
      { status: 'published' },
    );
    if (error) throw error;
    return entries.map((entry) => mapPage(entry as Entry)).filter((entry): entry is WebsitePage => Boolean(entry));
  });
}

export async function getWebsitePageForRender(slug: string): Promise<WebsitePage | null> {
  if (!slugOk(slug)) return null;
  const { entry, error, isPreview } = await getEmDashEntry<typeof WEBSITE_COLLECTION, Record<string, unknown>>(
    WEBSITE_COLLECTION,
    slug,
  );
  if (error) throw error;
  return entry ? mapPage(entry as Entry, isPreview) : null;
}

export function isSafeWebsiteHref(value: unknown): value is string {
  return safeUrl(value) !== undefined;
}
