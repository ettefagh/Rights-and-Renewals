<script lang="ts">
  interface Props {
    slug: string;
    size?: number;
    class?: string;
  }

  let { slug, size = 28, class: className = '' }: Props = $props();

  let normalized = $derived((slug || '').toLowerCase().trim());
</script>

<div
  class="brand-icon-wrap {className}"
  style="--icon-size: {size}px; width: {size}px; height: {size}px;"
  role="img"
  aria-label="{normalized} icon"
>
  {#if normalized === 'spotify'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 5.524 4.477 10 10 10s10-4.476 10-10c0-5.523-4.477-10-10-10zm4.586 14.424c-.18.295-.563.387-.857.208-2.35-1.436-5.308-1.76-8.792-.963-.334.077-.67-.132-.746-.466-.077-.334.132-.67.466-.746 3.808-.87 7.076-.504 9.721 1.11.294.18.387.563.208.857zm1.225-2.723c-.226.368-.71.485-1.077.26-2.69-1.654-6.79-2.133-9.972-1.168-.413.125-.85-.11-.976-.523-.125-.413.11-.85.523-.976 3.633-1.102 8.147-.568 11.242 1.33.368.226.485.71.26 1.077zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.494.15-1.018-.13-1.168-.624-.15-.493.13-1.018.624-1.168 3.532-1.072 9.404-.866 13.115 1.338.445.264.59.838.327 1.282-.264.444-.838.59-1.282.328z"/>
    </svg>
  {:else if normalized === 'apple'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.94 2.74 1.01.08 2.03-.49 2.65-1.24z"/>
    </svg>
  {:else if normalized === 'amazon'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M13.92 14.52c-1.54 1.15-3.8 1.83-5.75 1.83-2.73 0-5.18-1.08-7.03-2.88-.15-.14-.02-.34.16-.23 2.14 1.25 4.75 2 7.46 2 1.74 0 3.67-.4 5.37-1.25.26-.13.48.19.21.39l-.42.14zm1.18-.8c-.2-.25-.32-.61-.32-1.03 0-.84.45-1.55 1.17-1.83.65-.25 1.5-.27 2.22-.32v-.18c0-.43-.07-.79-.24-1.02-.2-.28-.56-.41-1.04-.41-.7 0-1.42.27-1.92.68-.13.1-.31.02-.27-.14l.32-1.05c.04-.13.17-.18.28-.1 1.04-.76 2.38-.99 3.49-.99 1.12 0 1.96.28 2.47.81.52.54.76 1.35.76 2.4v3.66c0 .54.08 1.03.22 1.43.05.15-.05.29-.18.26l-1.36-.26c-.1-.02-.17-.1-.19-.21-.07-.29-.12-.66-.14-1.06-.6.76-1.53 1.24-2.61 1.24-1.24 0-2.07-.63-2.48-1.51zm4.07-.46v-.88c-.52.05-1.12.08-1.58.24-.4.14-.65.49-.65.9 0 .54.38.86.97.86.54 0 1.03-.4 1.26-1.12z"/>
    </svg>
  {:else if normalized === 'netflix'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M5.398 0v24c1.172-.347 2.378-.654 3.6-.917V0H5.398zm6.545 0v17.524l3.057.653V0h-3.057zm6.546 0v19.467c1.125.215 2.261.378 3.407.489V0h-3.407zM5.398 0l9.602 24h3.602L8.998 0H5.398z"/>
    </svg>
  {:else if normalized === 'adobe'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M13.966 22h10.034v-20h-10.034zm-9.966 0h10.034l-5.017-12zm-4-20v20h10.034z"/>
    </svg>
  {:else if normalized === 'samsung'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M22.95 11.23c-.22-1.78-1.76-3.23-5.11-3.23-3.79 0-6.07 1.94-6.07 4.1 0 2.41 2.28 3.51 5.37 3.97 2.39.36 3.19.86 3.19 1.64 0 .96-1.11 1.58-2.88 1.58-2.31 0-3.52-.77-3.79-1.99l-2.61.42c.49 2.14 2.5 3.57 6.4 3.57 4.22 0 6.03-2.07 6.03-4.14 0-2.37-2.07-3.47-5.23-3.95-2.2-.33-3.33-.77-3.33-1.66 0-.82.99-1.48 2.65-1.48 1.92 0 3.09.68 3.37 1.7l2.52-.53zM1.05 12.77c.22 1.78 1.76 3.23 5.11 3.23 3.79 0 6.07-1.94 6.07-4.1 0-2.41-2.28-3.51-5.37-3.97-2.39-.36-3.19-.86-3.19-1.64 0-.96 1.11-1.58 2.88-1.58 2.31 0 3.52.77 3.79 1.99l2.61-.42c-.49-2.14-2.5-3.57-6.4-3.57-4.22 0-6.03 2.07-6.03 4.14 0 2.37 2.07 3.47 5.23 3.95 2.2.33 3.33.77 3.33 1.66 0 .82-.99 1.48-2.65 1.48-1.92 0-3.09-.68-3.37-1.7l-2.52.53z"/>
    </svg>
  {:else if normalized === 'sony'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M1.5 8.5h3.8v7H1.5zm6.2 0h14.8v2.3H11.5v4.7H7.7zm7.5 4.7h7.3v2.3h-7.3z"/>
    </svg>
  {:else if normalized === 'fitx' || normalized === 'mcfit'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M20.57 14.86L22 13.43 20.57 12 17 15.57 8.43 7 12 3.43 10.57 2 9.14 3.43 7.71 2 5.57 4.14 4.14 2.71 2.71 4.14l1.43 1.43L2 7.71l1.43 1.43L2 10.57 3.43 12 7 8.43 15.57 17 12 20.57 13.43 22l1.43-1.43 1.43 1.43 2.14-2.14 1.43 1.43 1.43-1.43-1.43-1.43 2.14-2.14z"/>
    </svg>
  {:else if normalized === 'bahn'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M12 2c-4 0-8 .5-8 4v10c0 2.5 2 4 4.5 4l-1.5 1.5v.5h14v-.5L19.5 20c2.5 0 4.5-1.5 4.5-4V6c0-3.5-4-4-8-4zm-4 15c-.8 0-1.5-.7-1.5-1.5S7.2 14 8 14s1.5.7 1.5 1.5S8.8 17 8 17zm8 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5-.7 1.5-1.5 1.5zm2-6H6V7h12v4z"/>
    </svg>
  {:else if normalized === 'telekom'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M4 4h5v5H4zm11 0h5v5h-5zM9.5 9.5h5v5h-5zm0 5.5h5v5h-5z"/>
    </svg>
  {:else if normalized === 'vodafone'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12c0 3.23 1.53 6.1 3.9 7.91l.1-.09c2.31-2.07 3.8-5.11 3.8-8.5 0-3.26-1.51-6.19-3.86-8.2C7.8 2.42 9.8 2 12 2zm3 6c-2.21 0-4 1.79-4 4 0 1.25.57 2.37 1.47 3.11-.8.26-1.66.4-2.56.4-1.2 0-2.34-.25-3.37-.7 1.34 2.59 4.04 4.35 7.16 4.35 4.41 0 8-3.59 8-8s-3.59-8-8-8c-.57 0-1.12.06-1.66.17C13.4 4.5 14.63 6.07 15 8z"/>
    </svg>
  {:else if normalized === 'paypal' || normalized === 'klarna'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.27 5.12-6.508 5.12h-.5a.8.8 0 0 0-.792.68l-.8 5.08a.5.5 0 0 1-.494.415H7.747a.5.5 0 0 1-.494-.579l2.766-17.5a.8.8 0 0 1 .792-.68h4.757c2.973 0 5.099.637 5.767 3.137-.468-.992-1.423-1.637-2.867-1.637h-3.95a.8.8 0 0 0-.792.68l-2.04 12.9a.5.5 0 0 0 .494.58h2.3a.8.8 0 0 0 .792-.68l.6-3.8a.8.8 0 0 1 .792-.68h1.2c3.5 0 6.1-1.5 6.9-5.1z"/>
    </svg>
  {:else if normalized === 'mediamarkt' || normalized === 'saturn'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none" />
      <path d="M7 12a5 5 0 0 1 10 0" stroke="currentColor" stroke-width="2" fill="none"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
    </svg>
  {:else if normalized === 'dyson'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/>
      <path d="M12 6v12M6 12h12" stroke="currentColor" stroke-width="2"/>
    </svg>
  {:else if normalized === 'zalando' || normalized === 'otto'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3h-6c0-1.66 1.34-3 3-3zm7 17H5V8h14v12z"/>
    </svg>
  {:else if normalized === 'lenovo'}
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <rect x="2" y="6" width="20" height="12" rx="2" fill="currentColor"/>
      <text x="12" y="15" fill="#FFFFFF" font-size="7" font-weight="900" text-anchor="middle" font-family="sans-serif">LENOVO</text>
    </svg>
  {:else}
    <!-- Generic shield monogram -->
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      <text x="12" y="15" fill="currentColor" stroke="none" font-size="8" font-weight="bold" text-anchor="middle" font-family="sans-serif">
        {normalized.slice(0, 2).toUpperCase()}
      </text>
    </svg>
  {/if}
</div>

<style>
  .brand-icon-wrap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: inherit;
    flex-shrink: 0;
  }
</style>
