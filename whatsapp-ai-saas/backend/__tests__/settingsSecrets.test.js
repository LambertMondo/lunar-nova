// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import http from 'http';

process.env.WACOPILOTE_MASTER_KEY = 'c'.repeat(64);

let sqlite3Available = true;
try {
    require('sqlite3');
} catch {
    sqlite3Available = false;
}

const db = require('../db');

describe('PUT /api/settings — sémantique des secrets vides', () => {
    let server;
    let baseUrl;

    beforeAll(async () => {
        if (!sqlite3Available) return;
        db.__setDbFileForTests(':memory:');
        await db.initDB();

        const app = express();
        app.use(express.json());
        app.use('/api', require('../routes/settings_and_agents'));

        await new Promise((resolve) => {
            server = http.createServer(app);
            server.listen(0, '127.0.0.1', () => {
                baseUrl = `http://127.0.0.1:${server.address().port}`;
                resolve();
            });
        });
    });

    afterAll(async () => {
        if (server) {
            await new Promise(resolve => server.close(resolve));
        }
    });

    it.runIf(sqlite3Available)('une valeur vide sur *_api_key n\'écrase pas le secret existant', async () => {
        await db.setSetting('gemini_api_key', 'sk-keep-me-alive-123456');

        const put = await fetch(`${baseUrl}/api/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gemini_api_key: '', default_ai_provider: 'gemini' })
        });
        expect(put.status).toBe(200);

        const stored = await db.getSetting('gemini_api_key', '');
        expect(stored).toBe('sk-keep-me-alive-123456');

        const get = await fetch(`${baseUrl}/api/settings`);
        const body = await get.json();
        expect(body.settings.gemini_api_key).toBe('');
        expect(body.secretsSet.gemini_api_key).toBe(true);
        expect(body.settings.default_ai_provider).toBe('gemini');
    });

    it.runIf(sqlite3Available)('DELETE /api/settings/:key efface réellement une clé secrète', async () => {
        await db.setSetting('openrouter_api_key', 'or-to-delete');
        const del = await fetch(`${baseUrl}/api/settings/openrouter_api_key`, { method: 'DELETE' });
        expect(del.status).toBe(200);
        expect(await db.getSetting('openrouter_api_key', '')).toBe('');

        const get = await fetch(`${baseUrl}/api/settings`);
        const body = await get.json();
        expect(body.secretsSet.openrouter_api_key).toBeFalsy();
    });

    it.runIf(sqlite3Available)('DELETE refuse les clés non-secrètes', async () => {
        const del = await fetch(`${baseUrl}/api/settings/default_ai_provider`, { method: 'DELETE' });
        expect(del.status).toBe(400);
    });
});
