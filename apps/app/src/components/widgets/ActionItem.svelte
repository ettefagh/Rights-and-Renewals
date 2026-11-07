<script lang="ts">
  import type { Component } from 'svelte';

  interface Props {
    label: string;
    icon: any;
    onclick: () => void;
    color?: string;
  }

  let { label, icon: Icon, onclick, color = '#2F524C' }: Props = $props();
</script>

<div class="action-item-wrap">
  <span class="action-label">{label}</span>
  <button
    type="button"
    class="action-fab-btn"
    style:background-color={color}
    {onclick}
    aria-label={label}
  >
    <Icon size={18} color="#FFFFFF" />
  </button>
</div>

<style>
  .action-item-wrap {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-2, 8px);
  }

  .action-label {
    background: rgba(15, 23, 42, 0.85);
    color: #FFFFFF;
    font-size: var(--font-size-xs, 12px);
    font-weight: var(--font-weight-medium, 500);
    padding: 4px 10px;
    border-radius: var(--radius-sm, 6px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    white-space: nowrap;
    pointer-events: none;
  }

  .action-fab-btn {
    width: 44px;
    height: 44px;
    border-radius: 9999px;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transition: transform 150ms ease, box-shadow 150ms ease;
  }

  .action-fab-btn:hover {
    transform: scale(1.08);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
  }
</style>
