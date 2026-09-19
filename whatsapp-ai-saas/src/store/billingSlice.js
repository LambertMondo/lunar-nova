import { API_BASE_URL } from '../config';

/**
 * Slice facturation / devis.
 * @param {import('zustand').StoreApi['setState']} set
 */
export const createBillingSlice = (set) => ({
    invoiceDraft: null,
    invoices: [],

    setInvoiceDraft: (draft) => set({ invoiceDraft: draft }),
    clearInvoiceDraft: () => set({ invoiceDraft: null }),

    // Migrées vers le backend (table `quotes`) — le store reflète la réponse serveur.
    fetchInvoices: async () => {
        try {
            const res = await fetch(API_BASE_URL + '/api/invoices');
            const json = await res.json();
            if (json.status === 'success') {
                set({ invoices: json.data || [] });
            }
        } catch {
            // Échec réseau non bloquant : le store garde son dernier état connu.
        }
    },

    addInvoice: async (invoice) => {
        const res = await fetch(API_BASE_URL + '/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoice)
        });
        const json = await res.json();
        if (json.status === 'success') {
            set((state) => ({ invoices: [json.data, ...state.invoices] }));
        }
        return json.data;
    },

    updateInvoice: async (invoiceId, updatedData) => {
        const res = await fetch(API_BASE_URL + '/api/invoices/' + invoiceId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });
        const json = await res.json();
        if (json.status === 'success') {
            set((state) => ({
                invoices: state.invoices.map(inv => inv.id === invoiceId ? json.data : inv)
            }));
        }
        return json.data;
    },

    deleteInvoice: async (invoiceId) => {
        const res = await fetch(API_BASE_URL + '/api/invoices/' + invoiceId, { method: 'DELETE' });
        // Ne retirer localement que si le serveur a confirmé (évite la suppression optimiste).
        if (res.ok) {
            set((state) => ({
                invoices: state.invoices.filter(inv => inv.id !== invoiceId)
            }));
        }
        return res.ok;
    },
});
