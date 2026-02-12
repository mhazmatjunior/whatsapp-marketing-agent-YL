import makeWASocket, { DisconnectReason } from '@whiskeysockets/baileys';
import { useDatabaseAuthState, clearDatabaseAuthState } from './whatsapp-logic';
import QRCode from 'qrcode';

// Always use global singleton to persist across reloads and module re-evaluations
let whatsapp = global.whatsapp || {
    sock: null,
    qr: null,
    status: 'disconnected',
    promise: null
};

global.whatsapp = whatsapp;

export const getWhatsAppStatus = () => ({
    status: whatsapp.status,
    qr: whatsapp.qr
});

export const connectWhatsApp = async (sessionId = 'default') => {
    if (whatsapp.promise) return whatsapp.promise;
    if (whatsapp.sock && whatsapp.status === 'connected') return whatsapp.sock;

    whatsapp.promise = (async () => {
        try {
            whatsapp.status = 'connecting';
            whatsapp.qr = null;

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

            whatsapp.sock = sock;

            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    whatsapp.qr = await QRCode.toDataURL(qr);
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

                    console.log(`Connection closed (Status: ${statusCode}). Reconnecting: ${shouldReconnect}`);

                    whatsapp.status = 'disconnected';
                    whatsapp.qr = null;

                    if (statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403) {
                        console.log('Fatal session error. Clearing credentials...');
                        whatsapp.sock = null;
                        await clearDatabaseAuthState(sessionId).catch(e => console.error('Failed to clear DB auth state:', e));
                    } else if (shouldReconnect) {
                        console.log('Attempting auto-reconnect...');
                        setTimeout(() => connectWhatsApp(sessionId), 3000);
                    }
                } else if (connection === 'open') {
                    console.log('Opened connection');
                    whatsapp.status = 'connected';
                    whatsapp.qr = null;
                }
            });

            sock.ev.on('creds.update', saveCreds);

            return sock;
        } finally {
            whatsapp.promise = null;
        }
    })();

    return whatsapp.promise;
};

export const disconnectWhatsApp = async (sessionId = 'default') => {
    if (whatsapp.sock) {
        try {
            await whatsapp.sock.logout();
        } catch (e) {
            console.error('Logout error:', e);
        }
    }
    await clearDatabaseAuthState(sessionId);
    whatsapp.sock = null;
    whatsapp.status = 'disconnected';
    whatsapp.qr = null;
};

export { whatsapp };
