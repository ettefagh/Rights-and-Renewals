<script lang="ts">
  import { onMount } from 'svelte';
  import { walletStore } from '../../state/wallet.svelte';
  import ActionItem from './ActionItem.svelte';
  import { Plus, Camera, Receipt, Calendar, Settings } from 'lucide-svelte';

  let isOpen = $state(false);
  let isKeyboardVisible = $state(false);

  onMount(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      const handleResize = () => {
        if (!window.visualViewport) return;
        // If visualViewport height is substantially smaller than window.innerHeight, keyboard is active
        const diff = window.innerHeight - window.visualViewport.height;
        isKeyboardVisible = diff > 150;
      };
      window.visualViewport.addEventListener('resize', handleResize);
      return () => {
        window.visualViewport?.removeEventListener('resize', handleResize);
      };
    }
  });

  function toggleMenu() {
    isOpen = !isOpen;
  }

  function handleAction(callback: () => void) {
    isOpen = false;
    callback();
  }
</script>

{#if !isKeyboardVisible}
  {#if isOpen}
    <div
      class="fab-backdrop"
      onclick={() => (isOpen = false)}
      role="presentation"
    ></div>
  {/if}

  <div class="fab-container">
    {#if isOpen}
      <div class="fab-speed-dial" role="menu">
        <ActionItem
          label="Capture Receipt / Warranty"
          icon={Camera}
          color="#2F524C"
          onclick={() => handleAction(() => walletStore.setView('capture'))}
        />
        <ActionItem
          label="§ 9 EStG Tax Summary"
          icon={Receipt}
          color="#D96B4B"
          onclick={() => handleAction(() => walletStore.setView('tax'))}
        />
        <ActionItem
          label="Statutory Calendar & Alarms"
          icon={Calendar}
          color="#059669"
          onclick={() => handleAction(() => walletStore.setView('calendar'))}
        />
        <ActionItem
          label="Settings & Dual iCal"
          icon={Settings}
          color="#475569"
          onclick={() => handleAction(() => walletStore.setView('settings'))}
        />
      </div>
    {/if}

    <button
      type="button"
      class="main-fab"
      class:open={isOpen}
      onclick={toggleMenu}
      aria-label={isOpen ? 'Close speed dial menu' : 'Open quick actions'}
      aria-expanded={isOpen}
    >
      <div class="fab-icon-wrap" class:rotated={isOpen}>
        <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
      </div>
    </button>
  </div>
{/if}

<style>
  .fab-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(2px);
    z-index: var(--z-index-backdrop, 500);
    transition: opacity 150ms ease;
  }

  .fab-container {
    position: fixed;
    right: 20px;
    bottom: calc(20px + var(--padding-safe-bottom, 16px));
    z-index: var(--z-index-popover, 700);
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12px;
  }

  .fab-speed-dial {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 4px;
    animation: slideUp 180ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .main-fab {
    width: 56px;
    height: 56px;
    border-radius: 9999px;
    border: none;
    background: var(--color-pine-teal, #2F524C);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.25);
    transition: transform 150ms ease, background-color 150ms ease;
  }

  .main-fab:hover {
    transform: scale(1.05);
    background: #25423D;
  }

  .main-fab.open {
    background: #0F172A;
  }

  .fab-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .fab-icon-wrap.rotated {
    transform: rotate(45deg);
  }
</style>
