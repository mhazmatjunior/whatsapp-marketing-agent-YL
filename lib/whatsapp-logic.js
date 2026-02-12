import { db, whatsappSessions } from './db';
import { eq, like, sql } from 'drizzle-orm';
import {
    BufferJSON,
    initAuthCreds,
} from '@whiskeysockets/baileys';

const whatsapp_cache = new Map();

export const useDatabaseAuthState = async (sessionId) => {
    const writeData = async (data, key) => {
        const fullKey = `${sessionId}-${key}`;
        const stringified = JSON.stringify(data, BufferJSON.replacer);
        whatsapp_cache.set(fullKey, stringified);

        try {
            await db.insert(whatsappSessions)
                .values({ id: fullKey, data: stringified })
                .onConflictDoUpdate({
                    target: [whatsappSessions.id],
                    set: { data: stringified, updatedAt: new Date() }
                });
        } catch (error) {
            console.error(`[WhatsApp Auth] Error writing key ${key}:`, error);
        }
    };

    const readData = async (key) => {
        const fullKey = `${sessionId}-${key}`;
        if (whatsapp_cache.has(fullKey)) {
            return JSON.parse(whatsapp_cache.get(fullKey), BufferJSON.reviver);
        }

        try {
            const results = await db.select()
                .from(whatsappSessions)
                .where(eq(whatsappSessions.id, fullKey))
                .limit(1);

            if (results.length > 0) {
                whatsapp_cache.set(fullKey, results[0].data);
                return JSON.parse(results[0].data, BufferJSON.reviver);
            }
            return null;
        } catch (error) {
            console.error(`[WhatsApp Auth] Error reading key ${key}:`, error);
            return null;
        }
    };

    const removeData = async (key) => {
        const fullKey = `${sessionId}-${key}`;
        whatsapp_cache.delete(fullKey);
        try {
            await db.delete(whatsappSessions).where(eq(whatsappSessions.id, fullKey));
        } catch (error) {
            console.error(`[WhatsApp Auth] Error removing key ${key}:`, error);
        }
    };

    const creds = await readData('creds') || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    const missingIds = [];

                    for (const id of ids) {
                        const fullKey = `${sessionId}-${type}-${id}`;
                        if (whatsapp_cache.has(fullKey)) {
                            data[id] = JSON.parse(whatsapp_cache.get(fullKey), BufferJSON.reviver);
                        } else {
                            missingIds.push(id);
                        }
                    }

                    if (missingIds.length > 0) {
                        try {
                            // Batch read from DB
                            const results = await db.select()
                                .from(whatsappSessions)
                                .where(like(whatsappSessions.id, `${sessionId}-${type}-%`));

                            // Filter in-memory for accuracy
                            for (const row of results) {
                                const id = row.id.split(`${sessionId}-${type}-`)[1];
                                if (missingIds.includes(id)) {
                                    whatsapp_cache.set(row.id, row.data);
                                    data[id] = JSON.parse(row.data, BufferJSON.reviver);
                                }
                            }
                        } catch (error) {
                            console.error(`[WhatsApp Auth] Batch read error for ${type}:`, error);
                        }
                    }
                    return data;
                },
                set: async (data) => {
                    const entries = [];
                    const keysToDelete = [];

                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const fullKey = `${sessionId}-${category}-${id}`;
                            const stringified = value ? JSON.stringify(value, BufferJSON.replacer) : null;

                            if (stringified) {
                                whatsapp_cache.set(fullKey, stringified);
                                entries.push({ id: fullKey, data: stringified });
                            } else {
                                whatsapp_cache.delete(fullKey);
                                keysToDelete.push(fullKey);
                            }
                        }
                    }

                    // Batch inserts
                    if (entries.length > 0) {
                        try {
                            // Break into chunks of 50 to avoid Neon URL length limits or payload limits
                            for (let i = 0; i < entries.length; i += 50) {
                                const chunk = entries.slice(i, i + 50);
                                await db.insert(whatsappSessions)
                                    .values(chunk)
                                    .onConflictDoUpdate({
                                        target: [whatsappSessions.id],
                                        set: {
                                            data: sql`excluded.data`,
                                            updatedAt: new Date()
                                        }
                                    });
                            }
                        } catch (error) {
                            console.error('[WhatsApp Auth] Batch write error:', error);
                        }
                    }

                    // Batch deletes
                    if (keysToDelete.length > 0) {
                        try {
                            for (const key of keysToDelete) {
                                await db.delete(whatsappSessions).where(eq(whatsappSessions.id, key));
                            }
                        } catch (error) {
                            console.error('[WhatsApp Auth] Batch delete error:', error);
                        }
                    }
                }
            }
        },
        saveCreds: () => writeData(creds, 'creds')
    };
};

export const clearDatabaseAuthState = async (sessionId) => {
    for (const key of whatsapp_cache.keys()) {
        if (key.startsWith(`${sessionId}-`)) {
            whatsapp_cache.delete(key);
        }
    }
    await db.delete(whatsappSessions).where(like(whatsappSessions.id, `${sessionId}-%`));
};
