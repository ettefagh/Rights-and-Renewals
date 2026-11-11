import { publicEventSchema } from '../lib/telemetry';

const CONSENT_KEY = 'cmlab-public-events-consent-v1';
let emitCurrentPageView: () => void = () => {};
const isRestrictedContext = () => location.pathname.startsWith('/_emdash/')
  || document.documentElement.dataset.cmsContext === 'editor'
  || document.documentElement.dataset.cmsContext === 'preview'
  || ['preview', 'previewToken', 'visual-editor'].some((key) => new URL(location.href).searchParams.has(key));

function consented(): boolean {
  if (isRestrictedContext()) return false;
  try { return localStorage.getItem(CONSENT_KEY) === 'yes'; } catch { return false; }
}

async function emit(event: Record<string, unknown>): Promise<void> {
  if (!consented()) return;
  const parsed = publicEventSchema.safeParse({ ...event, consent: true });
  if (!parsed.success) return;
  try {
    await fetch('/api/events', {
      method: 'POST',
      credentials: 'omit',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data),
      keepalive: true,
    });
  } catch {
    // Measurement is optional; do not surface collection failures to visitors.
  }
}

window.addEventListener('cmlab:telemetry', (event) => {
  if (!(event instanceof CustomEvent) || !event.detail || typeof event.detail !== 'object') return;
  void emit(event.detail as Record<string, unknown>);
});

const page = document.querySelector<HTMLElement>('[data-telemetry-page][data-telemetry-revision]');
if (page && !isRestrictedContext()) {
  const pageId = page.dataset.telemetryPage;
  const revision = page.dataset.telemetryRevision;
  if (pageId && revision) {
    let pageViewRequested = false;
    emitCurrentPageView = () => {
      if (!consented() || pageViewRequested) return;
      pageViewRequested = true;
      void emit({ name: 'page_view', pageId, revision });
    };
    emitCurrentPageView();
    const pageSlug = pageId.replace(/^page:/, '');
    document.querySelectorAll<HTMLElement>('.editorial-section[id]').forEach((block) => {
      const blockId = `block:${pageSlug}:${block.id}`;
      if (!block.id || !('IntersectionObserver' in window)) return;
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void emit({ name: 'block_view', pageId, blockId, revision });
          observer.disconnect();
        }
      }, { threshold: 0.25 });
      observer.observe(block);
    });
    document.querySelectorAll<HTMLElement>('[data-cta-id]').forEach((cta) => {
      cta.addEventListener('click', () => {
        const stableId = cta.dataset.ctaId;
        if (stableId) void emit({ name: 'cta_click', pageId, ctaId: `cta:${pageSlug}:${stableId}`, revision });
      });
    });
    document.querySelectorAll<HTMLElement>('[data-telemetry-policy-id][data-telemetry-entity-revision]').forEach((link) => {
      link.addEventListener('click', () => void emit({
        name: 'policy_open', pageId, entityId: link.dataset.telemetryPolicyId,
        revision: link.dataset.telemetryEntityRevision,
      }));
    });
    document.querySelectorAll<HTMLElement>('[data-telemetry-plan-id][data-telemetry-entity-revision]').forEach((control) => {
      control.addEventListener('change', () => void emit({
        name: 'plan_select', pageId, entityId: control.dataset.telemetryPlanId,
        revision: control.dataset.telemetryEntityRevision,
      }));
    });
  }
}

document.querySelectorAll<HTMLInputElement>('[data-telemetry-consent]').forEach((checkbox) => {
  const status = checkbox.closest('[data-telemetry-preferences]')?.querySelector<HTMLElement>('[data-telemetry-consent-status]');
  checkbox.checked = consented();
  checkbox.addEventListener('change', () => {
    try {
      if (checkbox.checked && !isRestrictedContext()) localStorage.setItem(CONSENT_KEY, 'yes');
      else localStorage.removeItem(CONSENT_KEY);
      if (checkbox.checked) emitCurrentPageView();
      if (status) status.textContent = checkbox.checked ? 'Optional measurement enabled.' : 'Optional measurement disabled.';
    } catch {
      checkbox.checked = false;
      if (status) status.textContent = 'Your preference could not be saved. Measurement remains off.';
    }
  });
});

export function emitPublicEvent(event: Record<string, unknown>): Promise<void> {
  return emit(event);
}
