/**
 * Cache des propositions copilote.
 *
 * Par défaut (desktop) : Map en mémoire avec TTL — Redis n'est PAS requis.
 * Redis n'est connecté que si process.env.REDIS_URL est une URL non vide explicite.
 */
// quiet: true — voir la note équivalente dans geminiService.js.
require('dotenv').config({ quiet: true });

const memoryCache = new Map();

function memoryGet(cacheKey) {
    const entry = memoryCache.get(cacheKey);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
        memoryCache.delete(cacheKey);
        return null;
    }
    return entry.value;
}

function memorySet(cacheKey, proposals, expirationSeconds) {
    memoryCache.set(cacheKey, {
        value: proposals,
        expiresAt: Date.now() + Math.max(1, expirationSeconds) * 1000,
    });
}

/** @type {import('redis').RedisClientType | null} */
let redisClient = null;
let isRedisConnected = false;
let hasLoggedError = false;
let useRedis = false;

/**
 * Initialise le client Redis optionnel.
 * @param {{ url?: string, createClient?: Function }} [options]
 *   - url : surcharge de process.env.REDIS_URL
 *   - createClient : usine injectable (tests) ; défaut = require('redis').createClient
 */
function initRedisClient(options = {}) {
    const redisUrl = (options.url ?? process.env.REDIS_URL ?? '').trim();
    useRedis = redisUrl.length > 0;
    redisClient = null;
    isRedisConnected = false;
    hasLoggedError = false;

    if (!useRedis) {
        return { mode: 'memory' };
    }

    const createClient = options.createClient
        || require('redis').createClient.bind(require('redis'));

    redisClient = createClient({
        url: redisUrl,
        socket: {
            reconnectStrategy: (retries) => {
                if (retries >= 3) return false;
                return Math.min(retries * 500, 2000);
            }
        }
    });

    redisClient.on('error', (err) => {
        isRedisConnected = false;
        if (!hasLoggedError) {
            hasLoggedError = true;
            console.error('[Redis] Optional cache unavailable:', err.message);
        }
    });

    redisClient.on('connect', () => {
        isRedisConnected = true;
        hasLoggedError = false;
        console.error('[Redis] Connected for proposal cache.');
    });

    redisClient.on('reconnecting', () => {});

    redisClient.connect().catch((err) => {
        if (!hasLoggedError) {
            hasLoggedError = true;
            console.error('[Redis] Optional connect failed:', err?.message || err);
        }
    });

    return { mode: 'redis', url: redisUrl };
}

// Connexion automatique au chargement uniquement si REDIS_URL est défini.
initRedisClient();

async function getCachedProposals(cacheKey) {
    if (useRedis && isRedisConnected && redisClient) {
        try {
            const cached = await redisClient.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
            return null;
        } catch (err) {
            console.error('[Redis] Get error, falling back to memory:', err.message);
        }
    }
    return memoryGet(cacheKey);
}

async function setCachedProposals(cacheKey, proposals, expirationSeconds = 60) {
    if (useRedis && isRedisConnected && redisClient) {
        try {
            await redisClient.setEx(cacheKey, expirationSeconds, JSON.stringify(proposals));
            return;
        } catch (err) {
            console.error('[Redis] Set error, falling back to memory:', err.message);
        }
    }
    memorySet(cacheKey, proposals, expirationSeconds);
}

/** Test helper: clear in-memory entries (no-op for Redis). */
function _clearMemoryCacheForTests() {
    memoryCache.clear();
}

module.exports = {
    get redisClient() { return redisClient; },
    getCachedProposals,
    setCachedProposals,
    initRedisClient,
    _clearMemoryCacheForTests,
};
