import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import { createWhatsappSlice } from './store/whatsappSlice';
import { createCrmSlice } from './store/crmSlice';
import { createBillingSlice } from './store/billingSlice';
import { createAiSlice } from './store/aiSlice';
import { createSessionSlice } from './store/sessionSlice';

// IndexedDB storage adapter for Zustand — replaces localStorage (5MB limit → hundreds of MB)
const idbStorage = {
    getItem: async (name) => {
        if (typeof indexedDB === 'undefined') return null;
        try {
            return await get(name);
        } catch {
            return null;
        }
    },
    setItem: async (name, value) => {
        if (typeof indexedDB === 'undefined') return;
        try {
            await set(name, value);
        } catch {
            // Échec d'écriture IndexedDB non bloquant
        }
    },
    removeItem: async (name) => {
        if (typeof indexedDB === 'undefined') return;
        try {
            await del(name);
        } catch {
            // Échec de suppression IndexedDB non bloquant
        }
    },
};

// Facade inchangée : import useAppStore from '../store' continue de marcher.
const useAppStore = create(
    persist(
        (set, get) => ({
            ...createWhatsappSlice(set, get),
            ...createCrmSlice(set, get),
            ...createBillingSlice(set, get),
            ...createAiSlice(set, get),
            ...createSessionSlice(set, get),
        }),
        {
            name: 'whatsapp-saas-storage',
            storage: createJSONStorage(() => idbStorage),
            // Exclude transient session state from persistence
            // updateAvailable must NOT be persisted — it represents a live check result
            // that should be re-evaluated fresh on each app start from GitHub API.
            // Persisting it caused the stale update banner to persist even on the latest version.
            partialize: (state) => {
                const { waAnalysis, updateAvailable, backendSettings, availableModels, ...rest } = state;
                return rest;
            },
        }
    )
);

export default useAppStore;
