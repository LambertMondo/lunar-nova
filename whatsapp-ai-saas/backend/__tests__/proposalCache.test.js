import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('redisClient / proposal cache — mémoire par défaut', () => {
    beforeEach(() => {
        vi.resetModules();
        delete process.env.REDIS_URL;
    });

    afterEach(() => {
        vi.useRealTimers();
        delete process.env.REDIS_URL;
    });

    it('sans REDIS_URL : set/get fonctionne en mémoire et expire', async () => {
        vi.useFakeTimers();
        const {
            getCachedProposals,
            setCachedProposals,
            _clearMemoryCacheForTests,
            redisClient,
            initRedisClient,
        } = await import('../redisClient.js');

        // Re-init explicite sans URL (idempotent) — createClient mocké ne doit pas être appelé.
        const createClient = vi.fn();
        initRedisClient({ url: '', createClient });
        expect(createClient).not.toHaveBeenCalled();
        expect(redisClient).toBeNull();

        _clearMemoryCacheForTests();
        await setCachedProposals('k1', [{ text: 'hi' }], 2);
        expect(await getCachedProposals('k1')).toEqual([{ text: 'hi' }]);

        await vi.advanceTimersByTimeAsync(2100);
        expect(await getCachedProposals('k1')).toBeNull();
    });

    it('le chargement du module sans REDIS_URL n\'appelle pas redis.createClient', async () => {
        const createClient = vi.fn(() => {
            throw new Error('createClient ne doit pas être appelé');
        });
        vi.doMock('redis', () => ({ createClient }));

        const mod = await import('../redisClient.js');
        expect(mod.redisClient).toBeNull();
        // Même si le mock CJS n'est pas intercepté, l'absence d'URL garantit
        // qu'aucun createClient n'est invoqué (branche mémoire).
        const result = mod.initRedisClient({ url: '', createClient });
        expect(result).toEqual({ mode: 'memory' });
        expect(createClient).not.toHaveBeenCalled();
    });

    it('avec REDIS_URL : createClient est appelé avec cette URL (mock)', async () => {
        const fakeClient = {
            on: vi.fn(() => fakeClient),
            connect: vi.fn(() => Promise.resolve()),
            get: vi.fn(),
            setEx: vi.fn(),
        };
        const createClient = vi.fn(() => fakeClient);

        const { initRedisClient } = await import('../redisClient.js');
        const result = initRedisClient({
            url: 'redis://cache.example:6380',
            createClient,
        });

        expect(result).toEqual({ mode: 'redis', url: 'redis://cache.example:6380' });
        expect(createClient).toHaveBeenCalledWith(
            expect.objectContaining({ url: 'redis://cache.example:6380' })
        );
        expect(fakeClient.connect).toHaveBeenCalled();
    });
});
