<script lang="ts">
  import { onMount } from 'svelte';
  import { Canvas, T } from '@threlte/core';
  import { OrbitControls, Float } from '@threlte/extras';
  import VaultCardMesh from './VaultCardMesh.svelte';
  import StaticVectorFallback from './StaticVectorFallback.svelte';

  interface Props {
    reducedMotion?: boolean;
  }

  let { reducedMotion = false }: Props = $props();

  let hasContextLost = $state<boolean>(false);
  let isPageHidden = $state<boolean>(false);
  let canvasContainer = $state<HTMLDivElement | null>(null);

  // Clamped DPR to cap GPU load
  let clampedDpr = $derived(
    typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 1.5) : 1
  );

  onMount(() => {
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('[ShowcaseVaultScene] WebGL context lost. Switching to StaticVectorFallback.');
      hasContextLost = true;
    };

    const handleVisibilityChange = () => {
      isPageHidden = document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const canvas = canvasContainer?.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('webglcontextlost', handleContextLost, false);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (canvas) {
        canvas.removeEventListener('webglcontextlost', handleContextLost);
      }
    };
  });
</script>

<div
  bind:this={canvasContainer}
  class="showcase-canvas-wrapper"
  aria-hidden="true"
>
  {#if !reducedMotion && !hasContextLost}
    <Canvas
      dpr={clampedDpr}
      renderMode={isPageHidden ? 'on-demand' : 'always'}
    >
      <T.PerspectiveCamera makeDefault position={[0, 0, 5.0]} fov={38}>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={!isPageHidden}
          autoRotateSpeed={1.0}
          maxPolarAngle={Math.PI / 1.8}
          minPolarAngle={Math.PI / 2.3}
        />
      </T.PerspectiveCamera>

      <!-- Precision Studio Lighting -->
      <T.AmbientLight color="#E2E8F0" intensity={0.7} />
      <T.DirectionalLight
        position={[4, 6, 5]}
        color="#FFF5EB"
        intensity={1.8}
        castShadow
      />
      <T.PointLight
        position={[-4, -2, 2]}
        color="#2F524C"
        intensity={1.2}
      />

      <Float
        floatIntensity={isPageHidden ? 0 : 0.6}
        rotationIntensity={isPageHidden ? 0 : 0.3}
        speed={1.0}
      >
        <VaultCardMesh rotationY={0.2} />
      </Float>
    </Canvas>
  {:else}
    <StaticVectorFallback />
  {/if}
</div>

<style>
  .showcase-canvas-wrapper {
    width: 100%;
    height: 100%;
    min-height: 280px;
    max-height: 380px;
    position: relative;
    overflow: hidden;
    user-select: none;
    border-radius: var(--radius-xl, 16px);
  }
</style>
