import { API_BASE_URL } from '../config';

/**
 * Slice IA : quota, modèles, settings backend, chats agents.
 * @param {import('zustand').StoreApi['setState']} set
 * @param {import('zustand').StoreApi['getState']} get
 */
export const createAiSlice = (set, get) => ({
    aiQuota: {
        hasCustomKey: false,
        imageUsed: 0,
        imageLimit: 40,
        resetDate: ''
    },

    agentChats: {},
    aiChatConversations: {},
    aiChatSessions: {},
    agentHistory: [],

    availableModels: { chat: [], image: [] },
    setAvailableModels: (models) => set({ availableModels: models }),

    backendSettings: {
        default_ai_provider: 'gemini',
        default_image_provider: 'openai',
        default_image_model: '',
        openai_base_url: 'https://integrate.api.nvidia.com/v1',
    },

    fetchAiQuota: async () => {
        try {
            const res = await fetch(API_BASE_URL + '/api/settings/quota');
            if (!res.ok) return;
            const data = await res.json();
            if (data.status === 'success') {
                set({ aiQuota: data.data });
            }
        } catch (e) {
            if (e?.name !== 'AbortError') {
                console.warn('[Store] Failed to fetch AI Quota (backend offline):', e?.message || e);
            }
        }
    },

    setBackendSettings: (settings) => set((state) => ({
        backendSettings: { ...state.backendSettings, ...settings }
    })),

    fetchAndSyncBackendSettings: async () => {
        try {
            const res = await fetch(API_BASE_URL + '/api/settings');
            if (!res.ok) return;
            const data = await res.json();
            if (data.status === 'success' && data.settings) {
                set((state) => ({
                    backendSettings: { ...state.backendSettings, ...data.settings }
                }));
            }
        } catch (e) {
            if (e?.name !== 'AbortError') {
                console.warn('[Store] Failed to sync backend settings (backend offline):', e?.message || e);
            }
        }
    },

    fetchGlobalModels: async () => {
        const state = get();
        const chatProvider = state.backendSettings.default_ai_provider || 'gemini';
        const imageProvider = state.backendSettings.default_image_provider || chatProvider;

        let apiKey = undefined;
        let baseURL = undefined;
        if (chatProvider === 'openrouter' && state.backendSettings.openrouter_api_key) {
            apiKey = state.backendSettings.openrouter_api_key;
        } else if (chatProvider === 'openai' && state.backendSettings.openai_api_key) {
            apiKey = state.backendSettings.openai_api_key;
            baseURL = state.backendSettings.openai_base_url;
        }

        try {
            const chatRes = await fetch(`${API_BASE_URL}/api/ai/models`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider: chatProvider, apiKey, baseURL })
            });
            if (!chatRes.ok) return;
            const chatData = await chatRes.json();

            let newChat = [];
            let newImage = [];

            if (chatData.status === 'success' && chatData.models) {
                if (chatData.models.chat) {
                    newChat = chatData.models.chat;
                    newImage = chatData.models.image || [];
                } else if (Array.isArray(chatData.models)) {
                    newChat = chatData.models;
                }
            }

            if (imageProvider && imageProvider !== chatProvider) {
                try {
                    const imgRes = await fetch(`${API_BASE_URL}/api/ai/models`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ provider: imageProvider })
                    });
                    if (imgRes.ok) {
                        const imgData = await imgRes.json();
                        if (imgData.status === 'success' && imgData.models?.image) {
                            newImage = imgData.models.image;
                        }
                    }
                } catch (e) {
                    console.warn('[Store] Failed to fetch image models:', e);
                }
            }

            const cleanName = (str) => (str || '').replace(/^[\u2700-\u27BF\u1F000-\u1F9FF\u2600-\u26FF]\s*/, '');
            newChat = newChat.map(m => ({ ...m, name: cleanName(m.name) }));
            newImage = newImage.map(m => ({ ...m, name: cleanName(m.name) }));

            set({ availableModels: { chat: newChat, image: newImage } });
        } catch (e) {
            if (e?.name !== 'AbortError') {
                console.warn('[Store] Failed to fetch global models (backend offline):', e?.message || e);
            }
            set({ availableModels: { chat: [], image: [] } });
        }
    },

    updateAgentChat: (agentId, updatedChat) => set((state) => ({
        agentChats: {
            ...state.agentChats,
            [agentId]: updatedChat
        }
    })),

    updateAiChatConversations: (agentId, messages) => set((state) => ({
        aiChatConversations: {
            ...state.aiChatConversations,
            [agentId]: messages
        }
    })),

    updateAiChatSessions: (agentId, sessions) => set((state) => ({
        aiChatSessions: {
            ...state.aiChatSessions,
            [agentId]: sessions
        }
    })),

    addAgentHistory: (historyItem) => set((state) => {
        const MAX_HISTORY = 20;
        const updated = [historyItem, ...state.agentHistory];
        return { agentHistory: updated.slice(0, MAX_HISTORY) };
    }),

    removeAgentHistory: (historyId) => set((state) => ({
        agentHistory: state.agentHistory.filter(h => h.id !== historyId)
    })),
});
