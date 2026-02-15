import makeWASocket, { DisconnectReason } from '@whiskeysockets/baileys';
import { useDatabaseAuthState, clearDatabaseAuthState } from './whatsapp-logic';
import QRCode from 'qrcode';

// Registry for all active user sessions
// Keys are userId (from NextAuth)
if (!global.wa_sessions) {
    global.wa_sessions = new Map();
}

const sessions = global.wa_sessions;

export const getWhatsAppStatus = (sessionId) => {
    const session = sessions.get(sessionId);
    if (!session) return { status: 'disconnected', qr: null };
    return {
        status: session.status,
        qr: session.qr
    };
};

export const connectWhatsApp = async (sessionId) => {
    let session = sessions.get(sessionId);

    if (!session) {
        session = {
            sock: null,
            qr: null,
            status: 'disconnected',
            promise: null
        };
        sessions.set(sessionId, session);
    }

    if (session.promise) return session.promise;
    if (session.sock && session.status === 'connected') return session.sock;

    session.promise = (async () => {
        try {
            session.status = 'connecting';
            session.qr = null;

            const { state, saveCreds } = await useDatabaseAuthState(sessionId);

            const sock = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                syncFullHistory: false,
                markOnlineOnConnect: false,
                shouldIgnoreJids: (jid) => jid.endsWith('@broadcast') || jid.endsWith('@newsletter'),
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
            });

            session.sock = sock;

            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    session.qr = await QRCode.toDataURL(qr);
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const isConflict = statusCode === DisconnectReason.connectionReplaced || lastDisconnect?.error?.message?.includes('conflict');
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut && statusCode !== 401;

                    console.log(`[Session ${sessionId}] Connection closed (${statusCode}). Reconnect: ${shouldReconnect}. Conflict: ${isConflict}`);

                    session.status = 'disconnected';
                    session.qr = null;

                    if (statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403) {
                        console.log(`[Session ${sessionId}] Fatal error. Clearing credentials...`);
                        session.sock = null;
                        await clearDatabaseAuthState(sessionId).catch(e => console.error('Failed to clear DB auth state:', e));
                    } else if (shouldReconnect) {
                        const delay = isConflict ? 10000 : 3000; // Wait longer for conflicts (Render de-activation)
                        console.log(`[Session ${sessionId}] Attempting auto-reconnect in ${delay / 1000}s...`);
                        setTimeout(() => connectWhatsApp(sessionId), delay);
                    }
                } else if (connection === 'open') {
                    console.log(`[Session ${sessionId}] Connection opened`);
                    session.status = 'connected';
                    session.qr = null;
                }
            });

            sock.ev.on('creds.update', saveCreds);

            return sock;
        } finally {
            session.promise = null;
        }
    })();

    return session.promise;
};

export const disconnectWhatsApp = async (sessionId) => {
    const session = sessions.get(sessionId);
    if (session?.sock) {
        try {
            await session.sock.logout();
        } catch (e) {
            console.error(`[Session ${sessionId}] Logout error:`, e);
        }
    }
    await clearDatabaseAuthState(sessionId);
    if (session) {
        session.sock = null;
        session.status = 'disconnected';
        session.qr = null;
    }
};

export { sessions as wa_sessions };
