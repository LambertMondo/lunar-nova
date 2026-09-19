/**
 * Copie ESM des parseurs DOM WhatsApp Web (source canonique CJS :
 * backend/scrapers/parsers/whatsappWeb.js). Même algorithme auto-portant —
 * les tests unitaires couvrent la source CJS ; WorkArea importe cette copie
 * pour sérialiser extractConversationContext dans le webview (Vite).
 */

/**
 * Identifiant interne WhatsApp d'une bulle : préfixe true_ (envoyé) / false_ (reçu).
 * @param {string|null|undefined} id
 * @returns {boolean}
 */
function isMessageDataId(id) {
    return !!id && (id.startsWith('true_') || id.startsWith('false_'));
}

/**
 * Remonte au nœud racine d'un message depuis un descendant.
 * Ordre : legacy copyable-text, data-id true_/false_, puis role=row hors #pane-side.
 * @param {Element|null|undefined} el
 * @returns {Element|null}
 */
function getMsgRoot(el) {
    if (!el || !el.closest) return null;
    const isMsgId = (id) => !!id && (id.startsWith('true_') || id.startsWith('false_'));
    const legacy = el.closest('.copyable-text[data-pre-plain-text]');
    if (legacy) return legacy;
    const modern = el.closest('[data-id]');
    if (modern && isMsgId(modern.getAttribute('data-id'))) return modern;
    const ariaRow = el.closest('div[role="row"]');
    if (ariaRow && !ariaRow.closest('#pane-side')) return ariaRow;
    return null;
}

/**
 * Aperçus de la liste de conversations (panneau gauche).
 * Préfère [data-testid=cell-frame-container], sinon #pane-side span[title].
 * @param {Document} [doc]
 * @returns {{ contact: string, text: string }[]}
 */
function collectChatListPreviews(doc) {
    const document = doc || (typeof globalThis !== 'undefined' ? globalThis.document : null);
    if (!document || !document.querySelectorAll) return [];

    let recentChats = Array.from(document.querySelectorAll('[data-testid="cell-frame-container"]')).slice(0, 15);
    if (recentChats.length === 0) {
        const contactNodes = document.querySelectorAll('#pane-side span[title][dir="auto"]');
        recentChats = Array.from(contactNodes).slice(0, 15).map((node) =>
            node.closest('div[role="row"], div[role="listitem"], div[style*="transform"]')
        );
    }

    const out = [];
    const seen = new Set();

    for (const chatItem of recentChats) {
        if (!chatItem) continue;

        let contact = 'Client (Liste)';
        const nameNode =
            chatItem.querySelector('[data-testid="cell-frame-title"] span[title][dir="auto"]') ||
            chatItem.querySelector('span[title][dir="auto"]');
        if (nameNode) contact = nameNode.getAttribute('title') || nameNode.textContent || contact;
        contact = String(contact).trim() || 'Client (Liste)';

        let text = '';
        const previewScope = chatItem.querySelector('[data-testid="cell-frame-secondary"]') || chatItem;
        const spans = previewScope.querySelectorAll('span[dir="ltr"]');
        for (const node of spans) {
            const t = (node.textContent || '').trim();
            if (t && t.length > 2 && t !== contact) text = t;
        }

        if (!text) continue;
        const hash = contact + '|' + text;
        if (seen.has(hash)) continue;
        seen.add(hash);
        out.push({ contact, text });
    }

    return out;
}

/**
 * Extrait contact + texte depuis un nœud message (observer conversation active).
 * @param {Element|null|undefined} msg
 * @returns {{ contact: string, text: string }|null}
 */
function extractMessageFromNode(msg) {
    if (!msg) return null;
    try {
        const preTextNode = msg.hasAttribute && msg.hasAttribute('data-pre-plain-text')
            ? msg
            : (msg.querySelector ? msg.querySelector('[data-pre-plain-text]') : null);
        const preText = preTextNode ? (preTextNode.getAttribute('data-pre-plain-text') || '') : '';
        let contact = 'Client (Actif)';
        const match = preText.match(/\]\s([^:]+):/);
        if (match && match[1]) {
            contact = match[1].trim();
        }

        const textNode = msg.querySelector
            ? msg.querySelector('span.selectable-text, span.copyable-text, span[dir="ltr"]')
            : null;
        let text = textNode
            ? (textNode.textContent || '').trim()
            : (msg.textContent || '').trim();

        if (!text || text.length <= 5) return null;
        return { contact, text };
    } catch {
        return null;
    }
}

/**
 * Contexte de la conversation ouverte (titre + dernières bulles).
 * Stratégie nœuds : data-id true_/false_ → .message-in/.message-out → role=row hors #pane-side.
 * @param {Document} [doc]
 * @returns {{ contactName: string, messages: { id: string|null, direction: 'in'|'out', text: string }[] }}
 */
function extractConversationContext(doc) {
    const document = doc || (typeof globalThis !== 'undefined' ? globalThis.document : null);
    const empty = { contactName: 'Unknown', messages: [] };
    if (!document || !document.querySelectorAll) return empty;

    const result = { contactName: 'Unknown', messages: [] };

    const headerTitle =
        document.querySelector('[data-testid="conversation-info-header-chat-title"]') ||
        document.querySelector('[data-testid="conversation-header"] span[dir="auto"]') ||
        document.querySelector('header span[dir="auto"]') ||
        document.querySelector('[data-testid="conversation-info-header"] span');
    if (headerTitle) {
        result.contactName =
            (headerTitle.getAttribute('title') || headerTitle.textContent || '').trim() || 'Unknown';
    }

    const isMsgId = (id) => !!id && (id.startsWith('true_') || id.startsWith('false_'));

    // Toujours exclure #pane-side : la liste de chats réutilise data-id / role=row.
    const notPaneSide = (el) => !el.closest('#pane-side');

    let messageNodes = Array.from(document.querySelectorAll('[data-id]')).filter((el) => {
        const id = el.getAttribute('data-id');
        return isMsgId(id) && notPaneSide(el);
    });

    if (messageNodes.length === 0) {
        messageNodes = Array.from(document.querySelectorAll('div.message-in, div.message-out')).filter(notPaneSide);
    }

    if (messageNodes.length === 0) {
        const mainPanel = document.querySelector('#main') || document.body;
        messageNodes = Array.from(mainPanel.querySelectorAll('div[role="row"]')).filter(notPaneSide);
    }

    messageNodes = messageNodes.slice(-15);

    const alignContainer = document.querySelector('#main') || document.body;
    let containerCenter = 0;
    try {
        if (alignContainer.getBoundingClientRect) {
            const containerRect = alignContainer.getBoundingClientRect();
            containerCenter = (containerRect.left + containerRect.right) / 2;
        }
    } catch {
        containerCenter = 0;
    }

    const seenIds = new Set();

    for (const node of messageNodes) {
        const textNode = node.querySelector
            ? node.querySelector('.selectable-text, .copyable-text, span[dir="ltr"]')
            : null;
        let text = textNode ? (textNode.textContent || '').trim() : (node.textContent || '').trim();
        if (!text) continue;

        let isOut;
        const ownId = node.getAttribute ? node.getAttribute('data-id') : null;
        if (node.classList && node.classList.contains('message-out')) {
            isOut = true;
        } else if (node.classList && node.classList.contains('message-in')) {
            isOut = false;
        } else if (ownId && isMsgId(ownId)) {
            isOut = ownId.startsWith('true_');
        } else {
            const nestedIdEl = node.querySelector ? node.querySelector('[data-id]') : null;
            const nestedId = nestedIdEl ? nestedIdEl.getAttribute('data-id') : null;
            if (nestedId && isMsgId(nestedId)) {
                isOut = nestedId.startsWith('true_');
            } else {
                const nestedClassEl = node.querySelector
                    ? node.querySelector('.message-out, .message-in')
                    : null;
                if (nestedClassEl) {
                    isOut = nestedClassEl.classList.contains('message-out');
                } else {
                    try {
                        const rect = node.getBoundingClientRect();
                        isOut = ((rect.left + rect.right) / 2) > containerCenter;
                    } catch {
                        isOut = false;
                    }
                }
            }
        }

        const id = (ownId && isMsgId(ownId))
            ? ownId
            : (() => {
                const nested = node.querySelector ? node.querySelector('[data-id]') : null;
                const nid = nested ? nested.getAttribute('data-id') : null;
                return isMsgId(nid) ? nid : null;
            })();

        if (id && seenIds.has(id)) continue;
        if (id) seenIds.add(id);

        result.messages.push({
            id,
            direction: isOut ? 'out' : 'in',
            text
        });
    }

    return result;
}

export {
    isMessageDataId,
    getMsgRoot,
    collectChatListPreviews,
    extractMessageFromNode,
    extractConversationContext
};
export default {
    isMessageDataId,
    getMsgRoot,
    collectChatListPreviews,
    extractMessageFromNode,
    extractConversationContext
};
