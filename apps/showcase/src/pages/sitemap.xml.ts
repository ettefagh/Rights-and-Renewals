import type { APIRoute } from 'astro';
import { getPublishedWebsitePages } from '../lib/website-cms.js';

const xml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

export const GET: APIRoute = async ({ site }) => {
  const pages = await getPublishedWebsitePages();
  const origin = site?.origin ?? 'https://rightsandrenewals.pages.dev';
  const paths = new Set(['/', '/wiki', '/agent-setup', ...pages.map((page) => page.id === 'home' ? '/' : `/${page.id}`)]);
  const urls = [...paths].map((path) => `  <url><loc>${xml(new URL(path, origin).href)}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' },
  });
};
