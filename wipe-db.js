const { db, whatsappSessions } = require('./db');
const { like } = require('drizzle-orm');

async function wipeAllSessions() {
    console.log('--- Wiping ALL WhatsApp Sessions from Database ---');
    try {
        const result = await db.delete(whatsappSessions).where(like(whatsappSessions.id, '%'));
        console.log('Successfully deleted all session keys.');
        process.exit(0);
    } catch (error) {
        console.error('Error wiping sessions:', error);
        process.exit(1);
    }
}

wipeAllSessions();
