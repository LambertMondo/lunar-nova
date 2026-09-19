/**
 * Slice WhatsApp / IOL / catalogue / copilote.
 * @param {import('zustand').StoreApi['setState']} set
 */
export const createWhatsappSlice = (set) => ({
    activeWhatsAppContext: null,
    catalogDraft: null,
    pendingEditImage: null,

    iolInstanceId: null,
    isIolActive: false,
    iolOrders: [],
    iolMessages: [],
    setIolInstanceId: (id) => set({ iolInstanceId: id }),
    setIsIolActive: (active) => set({ isIolActive: active }),
    addIolOrder: (order) => set((state) => ({ iolOrders: [order, ...state.iolOrders].slice(0, 100) })),
    addIolMessage: (msg) => set((state) => ({ iolMessages: [msg, ...state.iolMessages].slice(0, 200) })),
    removeIolOrder: (id) => set((state) => ({ iolOrders: state.iolOrders.filter(o => o.id !== id) })),
    removeIolMessages: (ids) => set((state) => ({
        iolMessages: state.iolMessages.filter(m => !ids.includes(m.id)),
        iolOrders: state.iolOrders.filter(o => !ids.includes(o.id))
    })),
    setIolOrders: (orders) => set({ iolOrders: orders }),
    setIolMessages: (msgs) => set({ iolMessages: msgs }),

    waAnalysis: {
        isRunning: false,
        contactStatuses: {},
        totalContacts: 0,
        totalProcessed: 0,
        totalValid: 0,
        totalInvalid: 0,
    },

    instances: [],
    copilotRepliesGenerated: 0,
    copilotNotification: null,

    setActiveWhatsAppContext: (context) => set({ activeWhatsAppContext: context }),
    setCatalogDraft: (draft) => set({ catalogDraft: draft }),
    clearCatalogDraft: () => set({ catalogDraft: null }),

    setPendingEditImage: (img) => set({ pendingEditImage: img }),
    clearPendingEditImage: () => set({ pendingEditImage: null }),

    setCopilotNotification: (msg) => set({ copilotNotification: msg }),
    clearCopilotNotification: () => set({ copilotNotification: null }),

    setInstances: (newInstances) => set({ instances: newInstances }),

    startWaAnalysis: (total) => set({
        waAnalysis: {
            isRunning: true,
            contactStatuses: {},
            totalContacts: total,
            totalProcessed: 0,
            totalValid: 0,
            totalInvalid: 0,
        }
    }),

    updateWaContactAnalysis: (contactId, status) => set((state) => {
        const isFinal = status !== 'loading';
        const isPositive = status === 'valid';
        const isNegative = status === 'invalid' || status === 'error';
        return {
            waAnalysis: {
                ...state.waAnalysis,
                contactStatuses: { ...state.waAnalysis.contactStatuses, [contactId]: status },
                totalProcessed: state.waAnalysis.totalProcessed + (isFinal ? 1 : 0),
                totalValid: state.waAnalysis.totalValid + (isPositive ? 1 : 0),
                totalInvalid: state.waAnalysis.totalInvalid + (isNegative ? 1 : 0),
            }
        };
    }),

    finishWaAnalysis: () => set((state) => ({
        waAnalysis: { ...state.waAnalysis, isRunning: false }
    })),

    resetWaAnalysis: () => set({
        waAnalysis: {
            isRunning: false,
            contactStatuses: {},
            totalContacts: 0,
            totalProcessed: 0,
            totalValid: 0,
            totalInvalid: 0,
        }
    }),

    incrementCopilotReplies: (count = 1) => set((state) => ({
        copilotRepliesGenerated: state.copilotRepliesGenerated + count
    })),
});
