import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import useAppStore from '../store';

describe('useAppStore — slices domain (indépendance + deleteInvoice)', () => {
    beforeEach(() => {
        useAppStore.setState({
            invoices: [{ id: 'inv-1', client: 'A' }, { id: 'inv-2', client: 'B' }],
            iolOrders: [{ id: 'ord-1' }],
            iolMessages: [{ id: 'msg-1' }],
            instances: [{ id: 'wa-1', name: 'Perso' }],
            appSettings: { ...useAppStore.getState().appSettings, theme: 'light', language: 'en' },
        });
        vi.unstubAllGlobals();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('muter les factures n\'altère pas l\'état IOL', () => {
        useAppStore.setState({ invoices: [{ id: 'inv-x' }] });
        const state = useAppStore.getState();
        expect(state.invoices).toHaveLength(1);
        expect(state.iolOrders).toEqual([{ id: 'ord-1' }]);
        expect(state.iolMessages).toEqual([{ id: 'msg-1' }]);
    });

    it('muter l\'IOL n\'altère pas les factures', () => {
        const { addIolOrder } = useAppStore.getState();
        addIolOrder({ id: 'ord-2' });
        const state = useAppStore.getState();
        expect(state.iolOrders.map((o) => o.id)).toEqual(['ord-2', 'ord-1']);
        expect(state.invoices).toHaveLength(2);
    });

    it('deleteInvoice ne retire pas la ligne locale si fetch échoue (non-ok)', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
        await useAppStore.getState().deleteInvoice('inv-1');
        expect(useAppStore.getState().invoices.map((i) => i.id)).toEqual(['inv-1', 'inv-2']);
    });

    it('deleteInvoice retire la ligne locale quand res.ok', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200 })));
        await useAppStore.getState().deleteInvoice('inv-1');
        expect(useAppStore.getState().invoices.map((i) => i.id)).toEqual(['inv-2']);
    });

    it('updateSettings ne vide pas instances', () => {
        useAppStore.getState().updateSettings({ theme: 'dark', language: 'fr' });
        const state = useAppStore.getState();
        expect(state.appSettings.theme).toBe('dark');
        expect(state.appSettings.language).toBe('fr');
        expect(state.instances).toEqual([{ id: 'wa-1', name: 'Perso' }]);
    });
});
