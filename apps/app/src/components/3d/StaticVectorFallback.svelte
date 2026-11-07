<script lang="ts">
  interface Props {
    currentStep?: number;
  }

  let { currentStep = 1 }: Props = $props();
</script>

<div
  class="vector-fallback-wrap"
  role="img"
  aria-label="High-contrast Sovereign Vault tactile badge"
>
  {#if currentStep === 1}
    <!-- Step 1: Sovereign Titanium Guarantee Shield -->
    <svg class="fallback-svg" viewBox="0 0 240 160" fill="none">
      <title>Sovereign Guarantee Shield</title>
      <desc>Brushed titanium card badge displaying BGB legal protections</desc>
      <rect x="20" y="20" width="200" height="120" rx="14" fill="#2F524C" />
      <rect x="24" y="24" width="192" height="112" rx="10" stroke="#CBD5E1" stroke-width="2" fill="#334155" />
      <!-- BGB Chip -->
      <rect x="40" y="40" width="48" height="34" rx="6" fill="#D96B4B" />
      <text x="64" y="62" fill="#FFFFFF" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">BGB</text>
      <!-- Embossed lines -->
      <rect x="100" y="44" width="96" height="8" rx="4" fill="#94A3B8" />
      <rect x="100" y="60" width="64" height="6" rx="3" fill="#64748B" />
      <!-- Hazard Line § 477 cliff -->
      <line x1="40" y1="105" x2="200" y2="105" stroke="#D97706" stroke-width="3" stroke-dasharray="4 3" />
      <text x="40" y="122" fill="#FCD34D" font-size="9" font-weight="600" font-family="sans-serif">§ 477 BEWEISLASTUMKEHR</text>
    </svg>

  {:else if currentStep === 2}
    <!-- Step 2: Encrypted Sovereign Vault Lock -->
    <svg class="fallback-svg" viewBox="0 0 240 160" fill="none">
      <title>Encrypted Vault Lock</title>
      <desc>Padlock glyph representing AES-GCM-256 zero cloud plaintext security</desc>
      <rect x="20" y="20" width="200" height="120" rx="14" fill="#1E3632" stroke="#2F524C" stroke-width="2" />
      <!-- Shackle -->
      <path d="M102 70V54C102 44.0589 110.059 36 120 36C129.941 36 138 44.0589 138 54V70" stroke="#059669" stroke-width="6" stroke-linecap="round" />
      <!-- Lock Body -->
      <rect x="88" y="70" width="64" height="48" rx="8" fill="#059669" />
      <circle cx="120" cy="90" r="5" fill="#FFFFFF" />
      <rect x="118" y="92" width="4" height="12" rx="2" fill="#FFFFFF" />
      <text x="120" y="132" fill="#86EFAC" font-size="10" font-weight="bold" text-anchor="middle" font-family="monospace">
        AES-GCM-256 • DEXIE v4
      </text>
    </svg>

  {:else if currentStep === 3}
    <!-- Step 3: 09:00 Notification Clock & Urgency Beacons -->
    <svg class="fallback-svg" viewBox="0 0 240 160" fill="none">
      <title>09:00 Notification Calibration</title>
      <desc>Wall-clock alerts with urgency beacons</desc>
      <rect x="20" y="20" width="200" height="120" rx="14" fill="#F4F7F6" stroke="#CBD5E1" stroke-width="2" />
      <!-- Clock Face -->
      <circle cx="80" cy="80" r="36" fill="#FFFFFF" stroke="#2F524C" stroke-width="3" />
      <circle cx="80" cy="80" r="3" fill="#2F524C" />
      <!-- Hands at 09:00 -->
      <line x1="80" y1="80" x2="80" y2="56" stroke="#2F524C" stroke-width="3" stroke-linecap="round" />
      <line x1="80" y1="80" x2="62" y2="80" stroke="#D96B4B" stroke-width="3" stroke-linecap="round" />
      <!-- Urgency Beacons -->
      <g transform="translate(136, 48)">
        <circle cx="10" cy="10" r="8" fill="#DC2626" />
        <text x="26" y="14" fill="#991B1B" font-size="10" font-weight="600" font-family="sans-serif">7d Urgent</text>
      </g>
      <g transform="translate(136, 74)">
        <circle cx="10" cy="10" r="8" fill="#D97706" />
        <text x="26" y="14" fill="#92400E" font-size="10" font-weight="600" font-family="sans-serif">30d Warning</text>
      </g>
      <g transform="translate(136, 100)">
        <circle cx="10" cy="10" r="8" fill="#059669" />
        <text x="26" y="14" fill="#065F46" font-size="10" font-weight="600" font-family="sans-serif">Protected</text>
      </g>
    </svg>

  {:else}
    <!-- Step 4: Split Choice Tray -->
    <svg class="fallback-svg" viewBox="0 0 240 160" fill="none">
      <title>Selection Choice Tray</title>
      <desc>Dual action paths for vault initiation</desc>
      <rect x="20" y="20" width="200" height="120" rx="14" fill="#FFFFFF" stroke="#2F524C" stroke-width="2" />
      <rect x="36" y="38" width="76" height="84" rx="8" fill="#F4F7F6" stroke="#2F524C" stroke-width="2" />
      <text x="74" y="74" font-size="24" text-anchor="middle">🎓</text>
      <text x="74" y="98" fill="#2F524C" font-size="9" font-weight="bold" text-anchor="middle" font-family="sans-serif">SAMPLE</text>
      <rect x="128" y="38" width="76" height="84" rx="8" fill="#F4F7F6" stroke="#CBD5E1" stroke-width="1.5" />
      <text x="166" y="74" font-size="24" text-anchor="middle">📷</text>
      <text x="166" y="98" fill="#475569" font-size="9" font-weight="bold" text-anchor="middle" font-family="sans-serif">CAPTURE</text>
    </svg>
  {/if}
</div>

<style>
  .vector-fallback-wrap {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2, 8px);
  }

  .fallback-svg {
    width: 100%;
    max-width: 280px;
    height: auto;
    max-height: 180px;
  }
</style>
