const { pool } = require('../db');

async function listDocuments() {
    const result = await pool.query('SELECT * FROM ai_documents ORDER BY updated_at DESC, id DESC');
    return result.rows;
}

async function getDocument(id) {
    const result = await pool.query('SELECT * FROM ai_documents WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        const err = new Error('Document introuvable.');
        err.statusCode = 404;
        throw err;
    }
    return result.rows[0];
}

async function createDocument({ title, content } = {}) {
    const result = await pool.query(
        'INSERT INTO ai_documents (title, content) VALUES ($1, $2) RETURNING *',
        [title || 'Untitled Document', content || '']
    );
    return result.rows[0];
}

async function updateDocument(id, { title, content } = {}) {
    // Partial updates (CLI/MCP often send only content or only title): omitted
    // fields must keep their existing value. Passing `undefined` into SQLite
    // previously stored NULL and wiped the title/content.
    const existing = await getDocument(id);
    const nextTitle = title !== undefined ? (title || 'Untitled Document') : existing.title;
    const nextContent = content !== undefined ? (content ?? '') : existing.content;

    const result = await pool.query(
        'UPDATE ai_documents SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
        [nextTitle, nextContent, id]
    );
    if (result.rows.length === 0) {
        const err = new Error('Document introuvable.');
        err.statusCode = 404;
        throw err;
    }
    return result.rows[0];
}

async function deleteDocument(id) {
    const result = await pool.query('DELETE FROM ai_documents WHERE id = $1', [id]);
    if (!result.rowCount) {
        const err = new Error('Document introuvable.');
        err.statusCode = 404;
        throw err;
    }
    return { success: true };
}

module.exports = { listDocuments, getDocument, createDocument, updateDocument, deleteDocument };
