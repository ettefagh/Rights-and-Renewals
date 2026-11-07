<script lang="ts">
  import { onMount } from 'svelte';
  import { Canvas, T } from '@threlte/core';
  import { OrbitControls, Float } from '@threlte/extras';
  import VaultCardMesh from './VaultCardMesh.svelte';
  import StaticVectorFallback from './StaticVectorFallback.svelte';

  interface Props {
    currentStep?: number;
    reducedMotion?: boolean;
  }

  let { currentStep = 1, reducedMotion = false }: Props = $props();

  let hasContextLost = $state<boolean>(false);
  let isPageHidden = $state<boolean>(false);
  let canvasContainer = $state<HTMLDivElement | null>(null);

  // Clamped Device Pixel Ratio to cap thermal budget
  let clampedDpr = $derived(
    typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 1.5) : 1
  );

  // Synchronized step rotations
  let targetRotationY = $derived.by(() => {
    switch (currentStep) {
      case 1:
        return 0; // Front view
      case 2:
        return Math.PI; // Flip 180 deg to show cryptographic seal
      case 3:
        return 0.45; // Spotlight urgency beacons
      case 4:
        return -0.25; // Presentation angle
      default:
        return 0;
    }
  });

  onMount(() => {
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      console.warn('[VaultScene] WebGL context lost. Switching to StaticVectorFallback.');
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
  class="vault-canvas-container"
  aria-hidden="true"
>
  {#if !reducedMotion && !hasContextLost}
    <Canvas
      dpr={clampedDpr}
      renderMode={isPageHidden ? 'on-demand' : 'always'}
    >
      <!-- Perspective Camera (38 deg FOV) -->
      <T.PerspectiveCamera makeDefault position={[0, 0, 5.2]} fov={38}>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          maxPolarAngle={Math.PI / 1.8}
          minPolarAngle={Math.PI / 2.3}
        />
      </T.PerspectiveCamera>

      <!-- Precision Studio European Lighting -->
      <T.AmbientLight color="#E2E8F0" intensity={0.65} />
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

      <!-- Floating Sovereign Card Mesh -->
      <Float
        floatIntensity={isPageHidden ? 0 : 0.8}
        rotationIntensity={isPageHidden ? 0 : 0.4}
        speed={1.2}
      >
        <VaultCardMesh
          step={currentStep}
          rotationY={targetRotationY}
        />
      </Float>
    </Canvas>
  {:else}
    <StaticVectorFallback {currentStep} />
  {/if}
</div>

<style>
  .vault-canvas-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
    user-select: none;
  }
</style>
