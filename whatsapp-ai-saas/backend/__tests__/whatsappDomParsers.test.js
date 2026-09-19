// Parseurs WhatsApp Web DOM — tests jsdom (même contrat que scrapersParsers.test.js).
import { describe, it, expect, beforeEach } from 'vitest';

const wa = require('../scrapers/parsers/whatsappWeb');

describe('parsers/whatsappWeb — isMessageDataId / getMsgRoot', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('isMessageDataId n\'accepte que les préfixes true_ / false_', () => {
        expect(wa.isMessageDataId('true_ABC')).toBe(true);
        expect(wa.isMessageDataId('false_XYZ')).toBe(true);
        expect(wa.isMessageDataId('maybe_1')).toBe(false);
        expect(wa.isMessageDataId('')).toBe(false);
        expect(wa.isMessageDataId(null)).toBe(false);
    });

    it('getMsgRoot préfère copyable-text, puis data-id, ignore #pane-side', () => {
        document.body.innerHTML = `
            <div id="pane-side">
                <div role="row" data-id="false_side"><span class="inner">side</span></div>
            </div>
            <div id="main">
                <div class="copyable-text" data-pre-plain-text="[12:00, 1/1/2024] Alice: ">
                    <span class="leaf">hello</span>
                </div>
                <div data-id="false_MSG1"><span class="leaf2">hi</span></div>
                <div role="row"><span class="leaf3">row</span></div>
            </div>
        `;
        const leaf = document.querySelector('.leaf');
        expect(wa.getMsgRoot(leaf).classList.contains('copyable-text')).toBe(true);

        const leaf2 = document.querySelector('.leaf2');
        expect(wa.getMsgRoot(leaf2).getAttribute('data-id')).toBe('false_MSG1');

        const leaf3 = document.querySelector('.leaf3');
        expect(wa.getMsgRoot(leaf3).getAttribute('role')).toBe('row');

        const sideInner = document.querySelector('#pane-side .inner');
        // data-id sur le row pane-side : modern match gagne avant le filtre aria
        expect(wa.getMsgRoot(sideInner).getAttribute('data-id')).toBe('false_side');
    });

    it('getMsgRoot ignore les role=row du #pane-side sans data-id message', () => {
        document.body.innerHTML = `
            <div id="pane-side"><div role="row"><span class="x">x</span></div></div>
        `;
        expect(wa.getMsgRoot(document.querySelector('.x'))).toBeNull();
    });
});

describe('parsers/whatsappWeb — collectChatListPreviews', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('préfère data-testid cell-frame-container et ignore texte vide / doublons', () => {
        document.body.innerHTML = `
            <div data-testid="cell-frame-container">
                <div data-testid="cell-frame-title"><span title="Alice" dir="auto">Alice</span></div>
                <div data-testid="cell-frame-secondary"><span dir="ltr">Bonjour</span></div>
            </div>
            <div data-testid="cell-frame-container">
                <div data-testid="cell-frame-title"><span title="Alice" dir="auto">Alice</span></div>
                <div data-testid="cell-frame-secondary"><span dir="ltr">Bonjour</span></div>
            </div>
            <div data-testid="cell-frame-container">
                <div data-testid="cell-frame-title"><span title="Bob" dir="auto">Bob</span></div>
                <div data-testid="cell-frame-secondary"><span dir="ltr">ok demain</span></div>
            </div>
            <div data-testid="cell-frame-container">
                <div data-testid="cell-frame-title"><span title="Empty" dir="auto">Empty</span></div>
                <div data-testid="cell-frame-secondary"></div>
            </div>
        `;
        const previews = wa.collectChatListPreviews(document);
        expect(previews).toEqual([
            { contact: 'Alice', text: 'Bonjour' },
            { contact: 'Bob', text: 'ok demain' }
        ]);
    });

    it('retombe sur #pane-side span[title] si pas de cell-frame', () => {
        document.body.innerHTML = `
            <div id="pane-side">
                <div role="listitem">
                    <span title="Carol" dir="auto">Carol</span>
                    <span dir="ltr">Dispo demain ?</span>
                </div>
            </div>
        `;
        const previews = wa.collectChatListPreviews(document);
        expect(previews).toHaveLength(1);
        expect(previews[0].contact).toBe('Carol');
        expect(previews[0].text).toBe('Dispo demain ?');
    });
});

describe('parsers/whatsappWeb — extractMessageFromNode', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('lit data-pre-plain-text + selectable-text, ignore texte trop court', () => {
        document.body.innerHTML = `
            <div class="copyable-text" data-pre-plain-text="[10:00, 1/1/2024] Jean: ">
                <span class="selectable-text">Je veux commander 2 cartons</span>
            </div>
            <div class="copyable-text" data-pre-plain-text="[10:01, 1/1/2024] Jean: ">
                <span class="selectable-text">ok</span>
            </div>
        `;
        const ok = wa.extractMessageFromNode(document.querySelectorAll('.copyable-text')[0]);
        expect(ok).toEqual({ contact: 'Jean', text: 'Je veux commander 2 cartons' });
        expect(wa.extractMessageFromNode(document.querySelectorAll('.copyable-text')[1])).toBeNull();
        expect(wa.extractMessageFromNode(null)).toBeNull();
    });
});

describe('parsers/whatsappWeb — extractConversationContext', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('préfère data-id true_/false_ et déduit la direction', () => {
        document.body.innerHTML = `
            <header>
                <span data-testid="conversation-info-header-chat-title" title="Marie">Marie</span>
            </header>
            <div id="main">
                <div data-id="false_IN1"><span class="selectable-text">Salut</span></div>
                <div data-id="true_OUT1"><span class="selectable-text">Bonjour Marie</span></div>
                <div data-id="false_IN1"><span class="selectable-text">Salut</span></div>
                <div data-id="maybe_x"><span class="selectable-text">ignore</span></div>
                <div data-id="false_EMPTY"><span class="selectable-text"></span></div>
            </div>
            <div id="pane-side">
                <div data-id="false_SIDE"><span class="selectable-text">preview side</span></div>
            </div>
        `;
        const ctx = wa.extractConversationContext(document);
        expect(ctx.contactName).toBe('Marie');
        expect(ctx.messages).toEqual([
            { id: 'false_IN1', direction: 'in', text: 'Salut' },
            { id: 'true_OUT1', direction: 'out', text: 'Bonjour Marie' }
        ]);
    });

    it('retombe sur .message-in/.message-out puis ignore #pane-side en aria-row', () => {
        document.body.innerHTML = `
            <div data-testid="conversation-header"><span dir="auto" title="Sam">Sam</span></div>
            <div id="main">
                <div class="message-in"><span class="selectable-text">Incoming legacy</span></div>
                <div class="message-out"><span class="selectable-text">Outgoing legacy</span></div>
            </div>
        `;
        const ctx = wa.extractConversationContext(document);
        expect(ctx.contactName).toBe('Sam');
        expect(ctx.messages.map((m) => m.direction)).toEqual(['in', 'out']);
        expect(ctx.messages.map((m) => m.text)).toEqual(['Incoming legacy', 'Outgoing legacy']);

        document.body.innerHTML = `
            <div id="pane-side"><div role="row"><span class="selectable-text">Liste seule</span></div></div>
            <div id="main"><div role="row"><span class="selectable-text">Dans le chat</span></div></div>
        `;
        const aria = wa.extractConversationContext(document);
        expect(aria.messages).toHaveLength(1);
        expect(aria.messages[0].text).toBe('Dans le chat');
    });
});
