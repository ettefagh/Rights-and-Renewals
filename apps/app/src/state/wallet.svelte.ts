import { liveQuery } from 'dexie';
import { createSubscriber } from 'svelte/reactivity';
import {
  vaultDb,
  saveWalletItemWithReceiptAndAlarms,
  deleteWalletItemCascade,
  type WalletItem,
  type SaveItemPayload
} from '@cmlab/core';

export type AppView = 'dashboard' | 'capture' | 'detail' | 'claim' | 'tax' | 'calendar' | 'settings';

export class ReactiveWalletStore {
  // Raw items array for maximum reactivity performance (<1.4ms DOM patch)
  #items = $state.raw<WalletItem[]>([]);
  #subscribe: () => void;

  // View Routing & UI State
  currentView = $state<AppView>('dashboard');
  selectedItem = $state<WalletItem | null>(null);
  selectedItemId = $state<string | null>(null);

  // Modal and Dialog Visibility States
  isOmnibarOpen = $state<boolean>(false);
  isEmailGateOpen = $state<boolean>(false);
  isOnboardingOpen = $state<boolean>(false);
  isSettingsOpen = $state<boolean>(false);
  isDrawerOpen = $state<boolean>(false);
  activeReceiptZoomItem = $state<WalletItem | null>(null);
  activeCancellationItem = $state<WalletItem | null>(null);

  // User Auth & Session State
  isAuthenticated = $state<boolean>(false);
  userEmail = $state<string | null>(null);
  icalToken = $state<string | null>(null);
  backupBaseSecret = $state<string | null>(null);

  constructor() {
    this.#subscribe = createSubscriber((update) => {
      const subscription = liveQuery(() =>
        vaultDb.items.orderBy('expiryDate').toArray()
      ).subscribe({
        next: (rows) => {
          this.#items = rows;
          if (this.selectedItemId) {
            this.selectedItem = rows.find((r) => r.id === this.selectedItemId) ?? null;
          }
          update();
        },
        error: (err) => console.error('[ReactiveWalletStore] liveQuery error:', err)
      });

      return () => subscription.unsubscribe();
    });

    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem('cmlab_onboarding_completed') === 'true';
      if (!completed) {
        this.isOnboardingOpen = true;
      }
      this.syncFromUrlHash();
      window.addEventListener('hashchange', () => this.syncFromUrlHash());
    }
  }

  // Reactive Getter: Reads invoke the subscriber
  get items(): WalletItem[] {
    this.#subscribe();
    return this.#items;
  }

  // Derived Slices & Key Metrics
  get urgentItems(): WalletItem[] {
    return this.items.filter((item) => {
      const days = this.computeDaysRemaining(item.expiryDate);
      return days >= 0 && days <= 30;
    });
  }

  get hardwareWarranties(): WalletItem[] {
    return this.items.filter((item) => item.category === 'hardware');
  }

  get digitalSubscriptions(): WalletItem[] {
    return this.items.filter((item) => item.category === 'subscription');
  }

  get taxDeductibleItems(): WalletItem[] {
    return this.items.filter((item) => item.isTaxDeductible);
  }

  get capitalAtRisk(): number {
    return this.urgentItems.reduce((acc, item) => acc + (item.priceGrossEur || 0), 0);
  }

  get protectedCount(): number {
    return this.items.filter((item) => item.status === 'active').length;
  }

  // Navigation & View Actions
  setView(view: AppView, itemId?: string) {
    this.currentView = view;
    if (itemId) {
      this.selectedItemId = itemId;
      this.selectedItem = this.items.find((i) => i.id === itemId) ?? null;
      this.isDrawerOpen = true;
    }
    this.updateUrlHash();
  }

  selectItem(item: WalletItem | null) {
    this.selectedItem = item;
    this.selectedItemId = item ? item.id : null;
    if (item) {
      this.isDrawerOpen = true;
    }
    this.updateUrlHash();
  }

  closeDrawer() {
    this.isDrawerOpen = false;
    this.selectedItem = null;
    this.selectedItemId = null;
    this.updateUrlHash();
  }

  openReceiptZoom(item: WalletItem) {
    this.activeReceiptZoomItem = item;
  }

  closeReceiptZoom() {
    this.activeReceiptZoomItem = null;
  }

  openCancellationModal(item: WalletItem) {
    this.activeCancellationItem = item;
  }

  closeCancellationModal() {
    this.activeCancellationItem = null;
  }

  // Database Mutation Operations
  async saveItem(payload: SaveItemPayload): Promise<void> {
    await saveWalletItemWithReceiptAndAlarms(payload);
  }

  async updateItemStatus(id: string, status: WalletItem['status']): Promise<void> {
    await vaultDb.items.update(id, { status, updatedAt: Date.now() });
  }

  async deleteItem(id: string): Promise<void> {
    await deleteWalletItemCascade(id);
    if (this.selectedItemId === id) {
      this.selectedItem = null;
      this.selectedItemId = null;
      this.isDrawerOpen = false;
      this.currentView = 'dashboard';
    }
  }

  // URL Hash Sync for Zero-Server-Logging Navigation
  private syncFromUrlHash() {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const action = params.get('action');
    const id = params.get('id');

    if (action === 'view' && id) {
      this.setView('detail', id);
    } else if (action === 'claim' && id) {
      this.setView('claim', id);
    } else if (action === 'tax') {
      this.setView('tax');
    } else if (action === 'settings') {
      this.setView('settings');
    } else if (action === 'capture') {
      this.setView('capture');
    } else if (action === 'calendar') {
      this.setView('calendar');
    }
  }

  private updateUrlHash() {
    if (typeof window === 'undefined') return;
    if (this.currentView === 'detail' && this.selectedItemId) {
      window.location.hash = `action=view&id=${encodeURIComponent(this.selectedItemId)}`;
    } else if (this.currentView === 'claim' && this.selectedItemId) {
      window.location.hash = `action=claim&id=${encodeURIComponent(this.selectedItemId)}`;
    } else if (this.currentView === 'tax') {
      window.location.hash = `action=tax`;
    } else if (this.currentView === 'settings') {
      window.location.hash = `action=settings`;
    } else if (this.currentView === 'capture') {
      window.location.hash = `action=capture`;
    } else if (this.currentView === 'calendar') {
      window.location.hash = `action=calendar`;
    } else {
      history.replaceState(null, '', window.location.pathname);
    }
  }

  public computeDaysRemaining(dateStr: string): number {
    if (!dateStr) return 999;
    const target = new Date(dateStr).getTime();
    const now = Date.now();
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  }
}

export const walletStore = new ReactiveWalletStore();
