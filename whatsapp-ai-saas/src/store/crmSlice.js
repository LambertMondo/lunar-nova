/**
 * Slice CRM : prospection B2B + tâches.
 * @param {import('zustand').StoreApi['setState']} set
 */
export const createCrmSlice = (set) => ({
    prospectLeads: [],
    prospectSearchQuery: '',
    setProspectSearchQuery: (query) => set((state) => ({
        prospectSearchQuery: typeof query === 'function' ? (query(state.prospectSearchQuery) || '') : (query ?? '')
    })),
    setProspectLeads: (leads) => set((state) => ({
        prospectLeads: typeof leads === 'function' ? leads(state.prospectLeads || []) : (leads || [])
    })),

    tasks: [],

    addTask: (task) => set((state) => ({
        tasks: [...state.tasks, {
            description: '',
            attachments: [],
            annotations: '',
            ...task,
            id: Date.now().toString()
        }]
    })),

    updateTaskStatus: (taskId, newStatus) => set((state) => ({
        tasks: state.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
    })),

    editTask: (taskId, updatedData) => set((state) => ({
        tasks: state.tasks.map(t => t.id === taskId ? { ...t, ...updatedData } : t)
    })),

    deleteTask: (taskId) => set((state) => ({
        tasks: state.tasks.filter(t => t.id !== taskId)
    })),
});
