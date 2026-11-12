<script lang="ts">
  import { getBrandLogo, getBrandMonogram } from '../../../../packages/core/src/data/brandLogos.js';

  interface Props {
    slug: string;
    brandName?: string;
    logoUrl?: string | undefined;
    size?: number;
    decorative?: boolean;
    class?: string;
  }

  let { slug, brandName, logoUrl, size = 40, decorative = false, class: className = '' }: Props = $props();
  let logo = $derived(getBrandLogo(slug));
  let label = $derived(brandName?.trim() || logo?.name || slug.replace(/[-_]+/g, ' '));
  let monogram = $derived(getBrandMonogram(slug, brandName));
  let failedCmsLogoUrl = $state('');
  let basePath = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
</script>

<span
  class="brand-logo {className}"
  style="--brand-logo-size: {size}px; width: {size}px; height: {size}px;"
  role={decorative ? 'presentation' : 'img'}
  aria-hidden={decorative ? 'true' : undefined}
  aria-label={decorative ? undefined : `${label} logo`}
>
  {#if logoUrl && failedCmsLogoUrl !== logoUrl}
    <img src={logoUrl} alt="" width={size} height={size} loading="lazy" onerror={() => { failedCmsLogoUrl = logoUrl ?? ''; }} />
  {:else if logo?.file}
    <img src={`${basePath}brand-logos/${logo.file}`} alt="" width={size} height={size} loading="lazy" />
  {:else}
    <span aria-hidden={decorative ? 'true' : undefined}>{monogram}</span>
  {/if}
</span>

<style>
  .brand-logo {
    display: inline-grid;
    place-items: center;
    flex: 0 0 auto;
    overflow: hidden;
    box-sizing: border-box;
    border: 1px solid #d9e7e0;
    border-radius: 13px;
    background: #fff;
    color: #17644f;
    font-size: calc(var(--brand-logo-size) * .34);
    font-weight: 800;
    line-height: 1;
  }

  img { display: block; width: 100%; height: 100%; padding: 5px; box-sizing: border-box; object-fit: contain; }
</style>
