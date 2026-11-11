import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

async function browserFixture(preview = false) {
  const preferences = new Map<string, string>();
  const listeners = new Map<string, (event: Event) => void>();
  let onChange: () => void = () => {};
  const checkbox = {
    checked: false,
    closest: () => null,
    addEventListener: (_name: string, callback: () => void) => { onChange = callback; },
  };
  const request = vi.fn(async (_url: string, _init?: RequestInit) => new Response(null, { status: 202 }));
  vi.stubGlobal('fetch', request);
  vi.stubGlobal('location', { pathname: '/wiki', href: 'https://example.test/wiki' });
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => preferences.get(key) ?? null,
    setItem: (key: string, value: string) => { preferences.set(key, value); },
    removeItem: (key: string) => { preferences.delete(key); },
  });
  vi.stubGlobal('window', { addEventListener: (name: string, callback: (event: Event) => void) => listeners.set(name, callback) });
  vi.stubGlobal('document', {
    documentElement: { dataset: { cmsContext: preview ? 'preview' : 'public' } },
    querySelector: () => ({ dataset: { telemetryPage: 'page:wiki', telemetryRevision: 'sha256-test' } }),
    querySelectorAll: (selector: string) => selector === '[data-telemetry-consent]' ? [checkbox] : [],
  });
  const module = await import('./telemetry');
  return { request, module, consent(value: boolean) { checkbox.checked = value; onChange(); } };
}

describe('browser telemetry consent boundary', () => {
  it('sends no pre-consent events, emits a late page view once, and stops after revocation', async () => {
    const browser = await browserFixture();
    await browser.module.emitPublicEvent({ name: 'page_view', pageId: 'page:wiki' });
    expect(browser.request).not.toHaveBeenCalled();
    browser.consent(true);
    expect(browser.request).toHaveBeenCalledTimes(1);
    browser.consent(true);
    expect(browser.request).toHaveBeenCalledTimes(1);
    browser.consent(false);
    await browser.module.emitPublicEvent({ name: 'page_view', pageId: 'page:wiki' });
    expect(browser.request).toHaveBeenCalledTimes(1);
    expect(browser.request.mock.calls[0]?.[1]).toMatchObject({ credentials: 'omit' });
  });

  it('rejects personal/unknown properties before network transmission', async () => {
    const browser = await browserFixture();
    browser.consent(true);
    const before = browser.request.mock.calls.length;
    await browser.module.emitPublicEvent({ name: 'page_view', pageId: 'page:wiki', email: 'private@example.test' });
    expect(browser.request).toHaveBeenCalledTimes(before);
  });

  it('never transmits from CMS preview even after a consent interaction', async () => {
    const browser = await browserFixture(true);
    browser.consent(true);
    await browser.module.emitPublicEvent({ name: 'page_view', pageId: 'page:wiki' });
    expect(browser.request).not.toHaveBeenCalled();
  });
});
