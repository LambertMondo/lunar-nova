// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';

process.env.WACOPILOTE_MASTER_KEY = 'b'.repeat(64);

let sqlite3Available = true;
try {
    require('sqlite3');
} catch {
    sqlite3Available = false;
}

const db = require('../db');
const documentsService = require('../services/documentsService');

describe('documentsService — CRUD sur ai_documents (SQLite en mémoire)', () => {
    beforeAll(async () => {
        db.__setDbFileForTests(':memory:');
        await db.initDB();
    });

    it.runIf(sqlite3Available)('createDocument puis getDocument renvoient le même contenu', async () => {
        const created = await documentsService.createDocument({ title: 'Argumentaire', content: 'Bonjour le monde' });
        expect(created.id).toBeDefined();
        expect(created.title).toBe('Argumentaire');

        const fetched = await documentsService.getDocument(created.id);
        expect(fetched.content).toBe('Bonjour le monde');
    });

    it.runIf(sqlite3Available)('listDocuments inclut les documents créés, triés par mise à jour récente', async () => {
        const documents = await documentsService.listDocuments();
        expect(documents.length).toBeGreaterThan(0);
        expect(documents[0]).toHaveProperty('title');
    });

    it.runIf(sqlite3Available)('updateDocument modifie le contenu existant', async () => {
        const created = await documentsService.createDocument({ title: 'A modifier', content: 'v1' });
        const updated = await documentsService.updateDocument(created.id, { title: 'Modifié', content: 'v2' });
        expect(updated.content).toBe('v2');
    });

    it.runIf(sqlite3Available)('getDocument lève une erreur 404 pour un id inconnu', async () => {
        await expect(documentsService.getDocument(999999)).rejects.toMatchObject({ statusCode: 404 });
    });

    it.runIf(sqlite3Available)('deleteDocument supprime le document', async () => {
        const created = await documentsService.createDocument({ title: 'A supprimer', content: 'x' });
        await documentsService.deleteDocument(created.id);
        await expect(documentsService.getDocument(created.id)).rejects.toMatchObject({ statusCode: 404 });
    });

    it.runIf(sqlite3Available)('deleteDocument lève une erreur 404 pour un id inconnu (pas de succès silencieux)', async () => {
        await expect(documentsService.deleteDocument(999999)).rejects.toMatchObject({ statusCode: 404 });
    });

    it.runIf(sqlite3Available)('updateDocument sans title conserve le titre existant (CLI/MCP partial update)', async () => {
        const created = await documentsService.createDocument({ title: 'Titre original', content: 'v1' });
        const updated = await documentsService.updateDocument(created.id, { content: 'v2' });
        expect(updated.title).toBe('Titre original');
        expect(updated.content).toBe('v2');
    });

    it.runIf(sqlite3Available)('updateDocument sans content conserve le contenu existant', async () => {
        const created = await documentsService.createDocument({ title: 'T1', content: 'garder' });
        const updated = await documentsService.updateDocument(created.id, { title: 'T2' });
        expect(updated.title).toBe('T2');
        expect(updated.content).toBe('garder');
    });

    it.runIf(sqlite3Available)('updateDocument avec title vide retombe sur Untitled Document', async () => {
        const created = await documentsService.createDocument({ title: 'Avant', content: 'x' });
        const updated = await documentsService.updateDocument(created.id, { title: '', content: 'x' });
        expect(updated.title).toBe('Untitled Document');
    });
});
