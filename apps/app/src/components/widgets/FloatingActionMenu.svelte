<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { walletStore } from '../../state/wallet.svelte';
  import ActionItem from './ActionItem.svelte';
  import { Plus, Camera, Receipt, Calendar, Settings } from 'lucide-svelte';

  let isOpen = $state(false);
  let isKeyboardVisible = $state(false);
  let mainButton = $state<HTMLButtonElement | null>(null);

  onMount(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      const handleResize = () => {
        if (!window.visualViewport) return;
        // If visualViewport height is substantially smaller than window.innerHeight, keyboard is active
        const diff = window.innerHeight - window.visualViewport.height;
        isKeyboardVisible = diff > 150;
      };
      window.visualViewport.addEventListener('resize', handleResize);
      handleResize();
      return () => {
        window.visualViewport?.removeEventListener('resize', handleResize);
      };
    }
  });

  function toggleMenu() {
    isOpen = !isOpen;
    if (isOpen) {
      void tick().then(() => {
        if (isOpen) document.querySelector<HTMLButtonElement>('#wallet-quick-actions button')?.focus();
      });
    } else mainButton?.focus();
  }

  function closeMenu() {
    isOpen = false;
    mainButton?.focus();
  }

  function handleAction(callback: () => void) {
    isOpen = false;
    callback();
  }
</script>

<svelte:window onkeydown={(event) => {
  if (event.key === 'Escape' && isOpen) {
    closeMenu();
  }
}} />

{#if !isKeyboardVisible}
  {#if isOpen}
    <div
      class="fab-backdrop"
      onclick={closeMenu}
      role="presentation"
    ></div>
  {/if}

  <div class="fab-container">
    {#if isOpen}
      <div id="wallet-quick-actions" class="fab-speed-dial" role="group" aria-label="Quick actions">
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
      bind:this={mainButton}
      class="main-fab"
      class:open={isOpen}
      onclick={toggleMenu}
      aria-label={isOpen ? 'Close speed dial menu' : 'Open quick actions'}
      aria-expanded={isOpen}
      aria-controls="wallet-quick-actions"
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
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(2px);
    z-index: var(--z-index-backdrop, 210);
    transition: opacity 150ms ease;
  }

  .fab-container {
    position: fixed;
    right: var(--wallet-dock-right, 14px);
    bottom: calc(var(--wallet-dock-bottom, 12px) + (var(--wallet-dock-height, 70px) - var(--wallet-fab-size, 56px)) / 2);
    z-index: var(--z-index-popover, 220);
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
    box-sizing: border-box;
    width: var(--wallet-fab-size, 56px);
    height: var(--wallet-fab-size, 56px);
    padding: 0;
    border-radius: 9999px;
    border: none;
    background: var(--color-pine-teal, #2f524c);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: var(--elevation-lg, 0 6px 18px rgba(22, 51, 44, .18));
    transition: box-shadow 150ms ease, background-color 150ms ease;
  }

  @media (hover: hover) and (pointer: fine) {
    .main-fab:hover {
      background: #24433d;
      box-shadow: 0 8px 22px rgba(22, 51, 44, .24);
    }
  }

  .main-fab:active {
    box-shadow: 0 2px 7px rgba(22, 51, 44, .18);
  }

  .main-fab.open {
    background: var(--color-ink-primary, #10201d);
  }
  .main-fab:focus-visible { outline: 3px solid var(--color-pine-teal, #2f524c); outline-offset: 4px; }

  .fab-icon-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 220ms cubic-bezier(0.16, 1, 0.3, 1);
  }

  .fab-icon-wrap.rotated {
    transform: rotate(45deg);
  }
  @media (prefers-reduced-motion: reduce) {
    .main-fab, .fab-icon-wrap { transition: none; }
    .fab-speed-dial { animation: none; }
  }
</style>
