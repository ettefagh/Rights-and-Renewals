export interface BrandLogoRecord {
  name: string;
  file?: string;
  source?: 'developer-icons' | 'simple-icons';
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
  mindfactory: { name: 'Mindfactory' },
  notion: { name: 'Notion Plus', file: 'notion.svg', source: 'developer-icons' },
  gymshark: { name: 'Gymshark' },
  mcfit: { name: 'McFIT / RSG Group' },
  'urban-sports-club': { name: 'Urban Sports Club' },
  'disney-plus': { name: 'Disney+' },
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
