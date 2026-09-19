/**
 * Slice session : profil, réglages app, notifications, maj.
 * @param {import('zustand').StoreApi['setState']} set
 */
export const createSessionSlice = (set) => ({
    appNotification: null,
    updateAvailable: null,
    setUpdateAvailable: (status) => set({ updateAvailable: status }),

    userProfile: {
        isAuthenticated: false,
        authMethod: null,
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        companyName: '',
        address: '',
        profilePicture: '',
        companyLogo: ''
    },

    appSettings: {
        theme: 'light',
        language: 'en',
        model: 'gemini-2.5-flash',
        allowAiRead: true,
        promptFormat: 'json',
        hasCompletedOnboarding: false,
        // Masquage volontaire du bandeau de quota par l'utilisateur.
        // Persisté (appSettings est conservé par partialize) — remplace
        // l'ancien hack qui réécrivait aiQuota.imageLimit à 99999 dans
        // l'état persisté, contaminant les sessions suivantes.
        dismissQuotaBanner: false,
        mainMenuOrder: [],
        // Identifiants des onglets masqués dans la barre latérale.
        // Le masquage n'est que visuel : les routes restent accessibles
        // par URL, il ne s'agit pas d'un contrôle d'accès.
        hiddenMenuItems: []
    },

    updateSettings: (updates) => set((state) => ({
        appSettings: { ...state.appSettings, ...updates }
    })),

    updateUserProfile: (updates) => set((state) => ({
        userProfile: { ...state.userProfile, ...updates }
    })),

    logoutUser: () => set((state) => ({
        userProfile: { ...state.userProfile, isAuthenticated: false, authMethod: null }
    })),

    showAppNotification: (msg, type = 'success') => {
        set({ appNotification: { msg, type } });
        setTimeout(() => set({ appNotification: null }), 4000);
    },
    clearAppNotification: () => set({ appNotification: null }),
});
