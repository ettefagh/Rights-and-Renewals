export interface BrandLogoRecord {
  name: string;
  file?: string;
  source?: 'developer-icons' | 'simple-icons' | 'dashboard-icons' | 'official-site';
}

const records: Record<string, BrandLogoRecord> = {
  spotify: { name: 'Spotify', file: 'spotify.svg', source: 'simple-icons' },
  apple: { name: 'Apple', file: 'apple.svg', source: 'developer-icons' },
  mediamarkt: { name: 'MediaMarkt', file: 'mediamarkt.svg', source: 'simple-icons' },
  amazon: { name: 'Amazon Prime', file: 'amazon.svg', source: 'simple-icons' },
  netflix: { name: 'Netflix', file: 'netflix.svg', source: 'simple-icons' },
  adobe: { name: 'Adobe Creative Cloud', file: 'adobe.svg', source: 'simple-icons' },
  microsoft: { name: 'Microsoft 365', file: 'microsoft.svg', source: 'developer-icons' },
  'deutsche-bahn': { name: 'Deutsche Bahn (Deutschlandticket)', file: 'deutsche-bahn.svg', source: 'simple-icons' },
  github: { name: 'GitHub Pro / Copilot', file: 'github.svg', source: 'developer-icons' },
  jetbrains: { name: 'JetBrains', file: 'jetbrains.svg', source: 'simple-icons' },
  youtube: { name: 'YouTube Premium', file: 'youtube.svg', source: 'developer-icons' },
  saturn: { name: 'Saturn', file: 'saturn.svg', source: 'simple-icons' },
  otto: { name: 'Otto', file: 'otto.svg', source: 'simple-icons' },
  mindfactory: { name: 'Mindfactory', file: 'mindfactory.png', source: 'official-site' },
  notion: { name: 'Notion Plus', file: 'notion.svg', source: 'developer-icons' },
  gymshark: { name: 'Gymshark', file: 'gymshark.png', source: 'official-site' },
  mcfit: { name: 'McFIT / RSG Group', file: 'mcfit.png', source: 'official-site' },
  'urban-sports-club': { name: 'Urban Sports Club', file: 'urban-sports-club.ico', source: 'official-site' },
  'disney-plus': { name: 'Disney+', file: 'disney-plus.svg', source: 'dashboard-icons' },
  vodafone: { name: 'Vodafone', file: 'vodafone.svg', source: 'simple-icons' }
};

export function getBrandLogo(slug: string): BrandLogoRecord | undefined {
  const normalized = slug.trim().toLowerCase();
  return records[normalized];
}

export function getBrandMonogram(slug: string, displayName?: string): string {
  const name = displayName?.trim() || getBrandLogo(slug)?.name || slug.replace(/[-_]+/g, ' ').trim();
  const words = name.split(/\s+/).filter(Boolean);
  const first = words[0] ?? '?';
  const second = words[1];
  return (second ? `${first[0] ?? '?'}${second[0] ?? '?'}` : first.slice(0, 2)).toUpperCase();
}

/** Accept absolute HTTPS URLs or the public, published-policy logo route. */
export function isSafeBrandLogoUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048 || /[\u0000-\u0020\u007f]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password;
  } catch {
    const match = /^\/api\/brand-policy-logos\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(value);
    return Boolean(match);
  }
}
