import { getEmDashCollection, getRequestContext, isSafeHref, runWithContext } from 'emdash';
import type { PolicyWikiEntry } from '@cmlab/core';
import { getPublishedPolicies } from './policy-cms.js';

export const LEARNING_COLLECTIONS = {
  laws: 'law_guides',
  glossary: 'glossary_terms',
  quizzes: 'quizzes',
  questions: 'quiz_questions',
} as const;

export interface LearningSource { label: string; url: string }
export interface LearningLaw { id: string; jurisdiction: string; title: string; summary: string; takeaways: string[]; sources: LearningSource[] }
export interface LearningGlossary { id: string; title: string; label: string; description: string; sources: LearningSource[] }
export interface LearningQuizOption { id: string; label: string }
export interface LearningQuestion { id: string; prompt: string; options: LearningQuizOption[]; correctOptionId: string; explanation: string; source: LearningSource }
export interface LearningQuiz { id: string; contentVersion: string; title: string; description: string; questions: LearningQuestion[] }
export interface PublicWikiContent { schemaVersion: 1; asOf: string; laws: LearningLaw[]; glossary: LearningGlossary[]; quizzes: LearningQuiz[]; policies: PolicyWikiEntry[] }

type Entry = { id: string; status?: string; data: Record<string, unknown> };
const stableId = (value: unknown): string | undefined => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : undefined;
const text = (value: unknown, max = 3000): string | undefined => typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : undefined;
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const reviewed = (value: unknown): boolean => typeof value === 'string' && Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now();

function sources(value: unknown): LearningSource[] {
  return array(value).flatMap((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    const item = raw as Record<string, unknown>;
    const label = text(item.label, 180);
    const url = text(item.url, 2048);
    return label && url && isSafeHref(url) ? [{ label, url }] : [];
  });
}

function mapLaw(entry: Entry): LearningLaw | undefined {
  const id = stableId(entry.data.stable_id);
  const jurisdiction = text(entry.data.jurisdiction, 180);
  const title = text(entry.data.title, 180);
  const summary = text(entry.data.summary, 2400);
  if (!id || !jurisdiction || !title || !summary || !reviewed(entry.data.reviewed_on)) return undefined;
  const takeaways = array(entry.data.takeaways).flatMap((raw) => {
    const takeaway = raw && typeof raw === 'object' && !Array.isArray(raw) ? text((raw as Record<string, unknown>).text, 1000) : undefined;
    return takeaway ? [takeaway] : [];
  });
  return { id, jurisdiction, title, summary, takeaways, sources: sources(entry.data.sources) };
}

function mapGlossary(entry: Entry): LearningGlossary | undefined {
  const id = stableId(entry.data.stable_id);
  const title = text(entry.data.title, 180);
  const label = text(entry.data.label, 180);
  const description = text(entry.data.description, 2400);
  return id && title && label && description && reviewed(entry.data.reviewed_on) ? { id, title, label, description, sources: sources(entry.data.sources) } : undefined;
}

function mapQuestion(entry: Entry): (LearningQuestion & { quizId: string; order: number }) | undefined {
  const id = stableId(entry.data.stable_id);
  const quizId = stableId(entry.data.quiz_id);
  const prompt = text(entry.data.prompt, 1200);
  const explanation = text(entry.data.explanation, 1800);
  const sourceLabel = text(entry.data.source_label, 180);
  const sourceUrl = text(entry.data.source_url, 2048);
  const order = entry.data.order;
  if (!id || !quizId || !prompt || !explanation || !sourceLabel || !sourceUrl || !isSafeHref(sourceUrl) || !Number.isSafeInteger(order) || (order as number) < 0 || !reviewed(entry.data.reviewed_on)) return undefined;
  const options = array(entry.data.options).flatMap((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    const item = raw as Record<string, unknown>;
    const optionId = stableId(item.id);
    const label = text(item.label, 500);
    return optionId && label ? [{ id: optionId, label }] : [];
  });
  const correctOptionId = stableId(entry.data.correct_option_id);
  if (options.length < 2 || new Set(options.map((option) => option.id)).size !== options.length || !correctOptionId || !options.some((option) => option.id === correctOptionId)) return undefined;
  return { id, quizId, order: order as number, prompt, options, correctOptionId, explanation, source: { label: sourceLabel, url: sourceUrl } };
}

function mapQuiz(entry: Entry, questionsById: Map<string, ReturnType<typeof mapQuestion>>): LearningQuiz | undefined {
  const id = stableId(entry.data.stable_id);
  const contentVersion = text(entry.data.content_version, 120);
  const title = text(entry.data.title, 180);
  const description = text(entry.data.description, 1200);
  if (!id || !contentVersion || !title || !description || !reviewed(entry.data.reviewed_on)) return undefined;
  const ids = array(entry.data.question_ids).map((raw) => raw && typeof raw === 'object' && !Array.isArray(raw) ? stableId((raw as Record<string, unknown>).id) : undefined);
  if (ids.length === 0 || ids.some((questionId) => !questionId) || new Set(ids).size !== ids.length) return undefined;
  const questions = ids.map((questionId) => questionsById.get(questionId!));
  if (questions.some((question) => !question || question.quizId !== id)) return undefined;
  return {
    id, contentVersion, title, description,
    questions: questions.map((question) => ({ id: question!.id, prompt: question!.prompt, options: question!.options, correctOptionId: question!.correctOptionId, explanation: question!.explanation, source: question!.source })),
  };
}

async function publicContext<T>(read: () => Promise<T>): Promise<T> {
  const context = getRequestContext();
  if (!context || (!context.editMode && !context.preview)) return read();
  const { preview: _preview, ...withoutPreview } = context;
  return runWithContext({ ...withoutPreview, editMode: false }, read);
}

async function published(collection: string): Promise<Entry[]> {
  const { entries, error } = await getEmDashCollection<string, Record<string, unknown>>(collection, { status: 'published' });
  if (error) throw error;
  return (entries as Entry[]).filter((entry) => entry.status === undefined || entry.status === 'published');
}

export async function loadLearningContent(): Promise<PublicWikiContent> {
  return publicContext(async () => {
    const [lawEntries, glossaryEntries, quizEntries, questionEntries, policies] = await Promise.all([
      published(LEARNING_COLLECTIONS.laws), published(LEARNING_COLLECTIONS.glossary), published(LEARNING_COLLECTIONS.quizzes),
      published(LEARNING_COLLECTIONS.questions), getPublishedPolicies(),
    ]);
    const laws = lawEntries.map((entry) => mapLaw(entry)).filter((value): value is LearningLaw => Boolean(value));
    const glossary = glossaryEntries.map((entry) => mapGlossary(entry)).filter((value): value is LearningGlossary => Boolean(value));
    const mappedQuestions = questionEntries.map((entry) => mapQuestion(entry)).filter((value): value is NonNullable<ReturnType<typeof mapQuestion>> => Boolean(value));
    const questionsById = new Map(mappedQuestions.map((question) => [question.id, question]));
    const quizzes = quizEntries.map((entry) => mapQuiz(entry, questionsById)).filter((value): value is LearningQuiz => Boolean(value));
    const reviewDates = [...lawEntries, ...glossaryEntries, ...quizEntries, ...questionEntries]
      .map((entry) => entry.data.reviewed_on)
      .filter((value): value is string => typeof value === 'string' && Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now())
      .map((value) => new Date(value).toISOString().slice(0, 10))
      .sort();
    return { schemaVersion: 1, asOf: reviewDates.at(-1) ?? '', laws, glossary, quizzes, policies };
  });
}
