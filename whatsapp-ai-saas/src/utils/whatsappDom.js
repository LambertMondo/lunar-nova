/**
 * Re-export ESM des parseurs DOM WhatsApp Web (source unique CJS).
 * Vite résout le module.exports en default interop.
 */
import parsers from '../../backend/scrapers/parsers/whatsappWeb.js';

export const isMessageDataId = parsers.isMessageDataId;
export const getMsgRoot = parsers.getMsgRoot;
export const collectChatListPreviews = parsers.collectChatListPreviews;
export const extractMessageFromNode = parsers.extractMessageFromNode;
export const extractConversationContext = parsers.extractConversationContext;

export default parsers;
