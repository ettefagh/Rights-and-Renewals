/**
 * themeEngine.ts - Runtime Light/Dark Mode & Custom W3C DTCG Design Token Engine
 * Allows switching between Light, Dark, and System modes, and injecting custom
 * design tokens (CSS variables or W3C DTCG JSON objects) at runtime.
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export interface CustomDesignTokens {
  '--custom-brand-primary'?: string;
  '--custom-brand-primary-dark'?: string;
  '--custom-brand-primary-light'?: string;
  '--custom-brand-primary-darkmode'?: string;
  '--custom-brand-accent'?: string;
  '--custom-brand-accent-dark'?: string;
  '--custom-brand-accent-light'?: string;
  '--custom-brand-accent-darkmode'?: string;
  '--custom-canvas-bg'?: string;
  '--custom-canvas-bg-dark'?: string;
  '--custom-surface-bg'?: string;
  '--custom-surface-bg-dark'?: string;
  '--custom-radius-md'?: string;
  '--custom-radius-lg'?: string;
  '--custom-font-sans'?: string;
  [cssVariable: `--${string}`]: string | undefined;
}

export interface W3CDtcgTokenNode {
  $value?: string;
  $type?: string;
  [key: string]: unknown;
}

const STORAGE_KEY_MODE = 'cmlab_theme_mode';
const STORAGE_KEY_TOKENS = 'cmlab_custom_design_tokens';

export const BUILTIN_THEME_PRESETS: Record<string, { label: string; tokens: CustomDesignTokens }> = {
  'pine-coral': {
    label: 'Pine Teal & Terracotta (Default)',
    tokens: {},
  },
  'srh-copper': {
    label: 'SRH Copper & Warm Stone',
    tokens: {
      '--custom-brand-primary': '#C12D00',
      '--custom-brand-primary-dark': '#8F2100',
      '--custom-brand-primary-light': '#E04819',
      '--custom-brand-primary-darkmode': '#F26438',
      '--custom-brand-accent': '#1E3A5F',
      '--custom-brand-accent-darkmode': '#5B8FD9',
      '--custom-canvas-bg': '#FAF7F5',
      '--custom-canvas-bg-dark': '#141110',
    },
  },
  'nordic-fjord': {
    label: 'Nordic Fjord & Amber',
    tokens: {
      '--custom-brand-primary': '#1D4E68',
      '--custom-brand-primary-dark': '#123447',
      '--custom-brand-primary-light': '#2E6F91',
      '--custom-brand-primary-darkmode': '#5DA4C9',
      '--custom-brand-accent': '#D97706',
      '--custom-brand-accent-darkmode': '#FBBF24',
      '--custom-canvas-bg': '#F3F6F9',
      '--custom-canvas-bg-dark': '#0D141C',
    },
  },
};

/**
 * Flattens a W3C DTCG JSON object (e.g. `{ color: { brand: { primary: { $value: "#2F524C" } } } }`)
 * or a flat `--token` map into safe CSS custom property key-value pairs.
 */
export function parseCustomDesignTokens(
  input: Record<string, unknown> | string
): CustomDesignTokens {
  const parsed: Record<string, unknown> =
    typeof input === 'string' ? (JSON.parse(input) as Record<string, unknown>) : input;

  const result: CustomDesignTokens = {};

  function walk(node: Record<string, unknown>, pathParts: string[]) {
    for (const [key, val] of Object.entries(node)) {
      if (key.startsWith('--') && typeof val === 'string') {
        result[key as `--${string}`] = val.trim();
      } else if (
        val &&
        typeof val === 'object' &&
        '$value' in (val as Record<string, unknown>) &&
        typeof (val as W3CDtcgTokenNode).$value === 'string'
      ) {
        const cssVarName = `--${[...pathParts, key].join('-').replace(/[^a-zA-Z0-9-_]/g, '-')}` as `--${string}`;
        result[cssVarName] = ((val as W3CDtcgTokenNode).$value as string).trim();
      } else if (val && typeof val === 'object' && !Array.isArray(val)) {
        walk(val as Record<string, unknown>, [...pathParts, key]);
      }
    }
  }

  walk(parsed, []);
  return result;
}

/**
 * Sets the active theme mode ('light' | 'dark' | 'system') on `document.documentElement`.
 */
export function setThemeMode(mode: ThemeMode, rootEl?: HTMLElement): void {
  const target = rootEl ?? (typeof document !== 'undefined' ? document.documentElement : undefined);
  if (!target) return;

  if (mode === 'system') {
    target.removeAttribute('data-theme');
  } else {
    target.setAttribute('data-theme', mode);
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_MODE, mode);
  }
}

/**
 * Applies custom design tokens to the root element and persists them locally.
 */
export function applyCustomDesignTokens(
  tokens: CustomDesignTokens | Record<string, unknown> | string,
  rootEl?: HTMLElement
): CustomDesignTokens {
  const normalized = parseCustomDesignTokens(
    typeof tokens === 'string' ? tokens : (tokens as Record<string, unknown>)
  );
  const target = rootEl ?? (typeof document !== 'undefined' ? document.documentElement : undefined);

  if (target) {
    for (const [prop, value] of Object.entries(normalized)) {
      if (prop.startsWith('--') && typeof value === 'string' && value.length > 0) {
        target.style.setProperty(prop, value);
      }
    }
  }

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify(normalized));
  }

  return normalized;
}

/**
 * Resets all custom design tokens back to the baseline W3C DTCG stylesheet.
 */
export function resetCustomDesignTokens(rootEl?: HTMLElement): void {
  const target = rootEl ?? (typeof document !== 'undefined' ? document.documentElement : undefined);
  if (target && typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_KEY_TOKENS);
    if (raw) {
      try {
        const prev = JSON.parse(raw) as Record<string, string>;
        for (const prop of Object.keys(prev)) {
          if (prop.startsWith('--')) {
            target.style.removeProperty(prop);
          }
        }
      } catch {
        // Ignore malformed local state
      }
    }
    localStorage.removeItem(STORAGE_KEY_TOKENS);
  }
}
