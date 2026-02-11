import { db } from '@/db';
import { whatsappSessions } from '@/db/schema';
import { eq, like } from 'drizzle-orm';
import makeWASocket, {
    BufferJSON,
    initAuthCreds,
    DisconnectReason
} from '@whiskeysockets/baileys';

/**
 * Custom Auth State for Baileys using Drizzle PostgreSQL
 */
export const useDatabaseAuthState = async (sessionId) => {
    // In-memory cache to reduce DB load
    if (!global.whatsapp_cache) {
        global.whatsapp_cache = new Map();
    }
    const cache = global.whatsapp_cache;

    const writeData = async (data, key) => {
        const fullKey = `${sessionId}-${key}`;
        const stringified = JSON.stringify(data, BufferJSON.replacer);

        // Update cache
        cache.set(fullKey, stringified);

        await db.insert(whatsappSessions)
            .values({ id: fullKey, data: stringified })
            .onConflictDoUpdate({
                target: [whatsappSessions.id],
                set: { data: stringified, updatedAt: new Date() }
            });
    };

    const readData = async (key) => {
        const fullKey = `${sessionId}-${key}`;

        // Check cache first
        if (cache.has(fullKey)) {
            // console.log(`[WhatsApp Auth] Cache hit: ${key}`);
            return JSON.parse(cache.get(fullKey), BufferJSON.reviver);
        }

        try {
            // console.log(`[WhatsApp Auth] Reading key from DB: ${key}`);
            const results = await db.select()
                .from(whatsappSessions)
                .where(eq(whatsappSessions.id, fullKey))
                .limit(1);

            if (results.length > 0) {
                cache.set(fullKey, results[0].data);
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
        cache.delete(fullKey);
        await db.delete(whatsappSessions).where(eq(whatsappSessions.id, fullKey));
    };

    const creds = await readData('creds') || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                // value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            tasks.push(value ? writeData(value, key) : removeData(key));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => writeData(creds, 'creds')
    };
};

/**
 * Clear session from database
 */
export const clearDatabaseAuthState = async (sessionId) => {
    // Delete all keys starting with sessionId
    // Unfortunately drizzle-orm doesn't have a direct 'startsWith' for deletes without like
    // We can use a raw query or loop, but 'like' is better.
    // However, for safety in this implementation, we'll just delete the specific 'creds'
    // and let others stay or handle it properly.
    // Actually, let's use a raw query if possible or a proper where.
    if (global.whatsapp_cache) {
        // Clear only keys starting with this sessionId from cache
        for (const key of global.whatsapp_cache.keys()) {
            if (key.startsWith(`${sessionId}-`)) {
                global.whatsapp_cache.delete(key);
            }
        }
    }
    // Delete all keys for this session from DB
    await db.delete(whatsappSessions).where(like(whatsappSessions.id, `${sessionId}-%`));
};
