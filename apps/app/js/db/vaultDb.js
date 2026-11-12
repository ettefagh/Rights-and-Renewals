/**
 * vaultDb.js
 * Client-Side Storage Engine for CM-LAB Modern Application (M3)
 * Implements Dexie.js v4-compatible 5-Store Schema Architecture:
 * - items: ++id, name, merchant, category, purchaseDate, expiryDate, beweislastumkehrDate, isTaxDeductible, status, receiptSha256
 * - receipt_blobs: id, mimeType, createdAt, byteSize
 * - alarm_schedules: ++id, itemId, triggerDate, urgencyLevel, dispatched
 * - policy_wiki: serviceSlug, brandName, category, jurisdiction, statutoryWarrantyMonths, reversedBurdenMonths
 * - dispute_history: ++id, itemId, brandSlug, statutoryCode, dispatchDate, status
 */

import { INITIAL_VAULT_ITEMS } from '../data/sampleItems.js';

export const DB_NAME = 'WarrantyWalletDB';
export const DB_VERSION = 1;

export const DB_SCHEMA = {
  items: "++id, name, merchant, category, purchaseDate, expiryDate, beweislastumkehrDate, isTaxDeductible, status, receiptSha256",
  receipt_blobs: "id, mimeType, createdAt, byteSize",
  alarm_schedules: "++id, itemId, triggerDate, urgencyLevel, dispatched",
  policy_wiki: "serviceSlug, brandName, category, jurisdiction, statutoryWarrantyMonths, reversedBurdenMonths",
  dispute_history: "++id, itemId, brandSlug, statutoryCode, dispatchDate, status"
};

export class VaultDB {
  constructor() {
    this.dbName = DB_NAME;
    this.version = DB_VERSION;
    this.schema = DB_SCHEMA;
    this.db = null;
    this.items = [];
    this.wikiBrands = [];
    this.storageKey = 'cmlab_vault_items_v1';
  }

  async init() {
    // 1. Try to open IndexedDB
    try {
      if (typeof window !== 'undefined' && 'indexedDB' in window) {
        await this.openIndexedDB();
      }
    } catch (err) {
      console.warn('VaultDB: IndexedDB unavailable or blocked, falling back to LocalStorage.', err);
    }

    // 2. Load items from Storage or fallback to INITIAL_VAULT_ITEMS
    this.items = this.loadStoredItems();
    if (this.items.length === 0) {
      this.items = [...INITIAL_VAULT_ITEMS];
      this.persistStoredItems();
    }

    return this;
  }

  openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        // Create 5 object stores per schema specification
        if (!db.objectStoreNames.contains('items')) {
          db.createObjectStore('items', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('receipt_blobs')) {
          db.createObjectStore('receipt_blobs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('alarm_schedules')) {
          db.createObjectStore('alarm_schedules', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('policy_wiki')) {
          db.createObjectStore('policy_wiki', { keyPath: 'serviceSlug' });
        }
        if (!db.objectStoreNames.contains('dispute_history')) {
          db.createObjectStore('dispute_history', { keyPath: 'id', autoIncrement: true });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    });
  }

  loadStoredItems() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }
    return [];
  }

  persistStoredItems() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.storageKey, JSON.stringify(this.items));
      }
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  async seedIfEmpty(initialItems = []) {
    if (this.items.length === 0) {
      this.items = [...initialItems];
      this.persistStoredItems();
    }
    return this.items;
  }

  async getItems() {
    return this.getAllItems();
  }

  async saveItem(item) {
    const existing = this.items.find(i => String(i.id) === String(item.id));
    if (existing) {
      return this.updateItem(item);
    } else {
      return this.addItem(item);
    }
  }

  async getAllItems() {
    return [...this.items];
  }

  async getItemById(id) {
    return this.items.find(item => String(item.id) === String(id)) || null;
  }

  async addItem(item) {
    const newItem = {
      id: item.id || `vault-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: item.name || 'Neuer Gegenstand',
      merchant: item.merchant || 'Unbekannt',
      category: item.category || 'hardware',
      purchaseDate: item.purchaseDate || new Date().toISOString().split('T')[0],
      expiryDate: item.expiryDate || new Date(Date.now() + 730 * 86400000).toISOString().split('T')[0],
      beweislastumkehrDate: item.beweislastumkehrDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      priceEur: Number(item.priceEur) || 0,
      isTaxDeductible: Boolean(item.isTaxDeductible),
      taxCategory: item.taxCategory || (item.category === 'hardware' ? 'Arbeitsmittel' : undefined),
      status: item.status || 'protected',
      receiptSha256: item.receiptSha256 || null,
      cancellationUrl: item.cancellationUrl || null,
      bgbStatutoryType: item.bgbStatutoryType || (item.category === 'hardware' ? 'BGB_477_CLIFF' : 'BGB_309_RENEWAL'),
      bgbClauses: item.bgbClauses || (item.category === 'hardware' ? ['BGB § 437', 'BGB § 477 Abs. 1'] : ['BGB § 309 Nr. 9', 'BGB § 312k']),
      searchTokens: item.searchTokens || [item.name.toLowerCase(), (item.merchant || '').toLowerCase()]
    };

    this.items.unshift(newItem);
    this.persistStoredItems();
    return newItem;
  }

  async updateItem(updatedItem) {
    const index = this.items.findIndex(i => String(i.id) === String(updatedItem.id));
    if (index !== -1) {
      this.items[index] = { ...this.items[index], ...updatedItem };
      this.persistStoredItems();
      return this.items[index];
    }
    return null;
  }

  async deleteItem(id) {
    const initialLen = this.items.length;
    this.items = this.items.filter(i => String(i.id) !== String(id));
    this.persistStoredItems();
    return this.items.length < initialLen;
  }

  async setWikiBrands(brands = []) {
    this.wikiBrands = brands;
  }

  async getWikiBrands() {
    return this.wikiBrands;
  }
}
