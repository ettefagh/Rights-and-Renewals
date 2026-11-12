<script lang="ts">
  interface Props {
    title?: string;
  }

  let { title = 'CM-LAB Sovereign Vault' }: Props = $props();
</script>

<div
  class="showcase-vector-fallback"
  role="img"
  aria-label="High-contrast Sovereign Vault tactile 3D card fallback"
>
  <svg class="fallback-svg" viewBox="0 0 340 220" fill="none">
    <title>{title}</title>
    <desc>Tactile brushed titanium sovereign guarantee card with BGB statutory rules</desc>
    <!-- Background Card -->
    <rect x="10" y="10" width="320" height="200" rx="16" fill="#1E322E" stroke="#2F524C" stroke-width="2" />
    <rect x="16" y="16" width="308" height="188" rx="12" fill="#243C37" />

    <!-- Laser-etched metallic circuit pattern -->
    <path d="M20 70h60l20-20h80" stroke="#3D6A62" stroke-width="1.5" stroke-dasharray="3 3" />
    <path d="M240 160h-60l-20 20h-80" stroke="#3D6A62" stroke-width="1.5" stroke-dasharray="3 3" />

    <!-- BGB Gold Seal Chip -->
    <rect x="40" y="40" width="56" height="42" rx="8" fill="#D96B4B" />
    <rect x="44" y="44" width="48" height="34" rx="6" stroke="#FCE7E2" stroke-width="1.5" fill="none" />
    <text x="68" y="66" fill="#FFFFFF" font-size="13" font-weight="900" text-anchor="middle" font-family="-apple-system, sans-serif">
      BGB
    </text>

    <!-- Card Brand Text -->
    <text x="116" y="58" fill="#FFFFFF" font-size="18" font-weight="800" font-family="-apple-system, sans-serif" letter-spacing="-0.02em">
      CM-LAB VAULT
    </text>
    <text x="116" y="76" fill="#A7C7C1" font-size="11" font-weight="600" font-family="-apple-system, sans-serif">
      Sovereign Consumer Rights
    </text>

    <!-- BGB § 477 Cliff Hazard Bar -->
    <rect x="40" y="112" width="260" height="8" rx="4" fill="#0F1C19" />
    <rect x="40" y="112" width="130" height="8" rx="4" fill="#059669" />
    <rect x="170" y="112" width="60" height="8" rx="0" fill="#D97706" />
    <rect x="230" y="112" width="70" height="8" rx="4" fill="#475569" />

    <text x="40" y="136" fill="#86EFAC" font-size="10" font-weight="700" font-family="monospace">
      0m · KAUF
    </text>
    <text x="170" y="136" fill="#FCD34D" font-size="10" font-weight="700" font-family="monospace">
      12m · § 477
    </text>
    <text x="250" y="136" fill="#94A3B8" font-size="10" font-weight="700" font-family="monospace">
      24m · § 438
    </text>

    <!-- AES-GCM-256 Lock Indicator -->
    <g transform="translate(40, 160)">
      <circle cx="10" cy="10" r="10" fill="#059669" />
      <path d="M7 10h6v5H7z M8 10V8a2 2 0 0 1 4 0v2" stroke="#FFFFFF" stroke-width="1.5" fill="none" />
      <text x="28" y="14" fill="#E2E8F0" font-size="11" font-weight="600" font-family="monospace">
        AES-GCM-256 · ZERO CLOUD PLAINTEXT
      </text>
    </g>
  </svg>
</div>

<style>
  .showcase-vector-fallback {
    width: 100%;
    height: 100%;
    min-height: 260px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4, 16px);
  }
  .fallback-svg {
    width: 100%;
    max-width: 420px;
    height: auto;
    filter: drop-shadow(0 12px 24px rgba(15, 28, 25, 0.2));
  }
</style>
