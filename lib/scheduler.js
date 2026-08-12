import { db } from '@/lib/db';
import { whatsappSchedules } from '@/lib/db';
import { wa_sessions } from '@/lib/whatsapp';
import { eq, sql } from 'drizzle-orm';

let schedulerInterval = null;

export function startScheduler() {
    if (schedulerInterval) return;

    console.log('[Scheduler] Background message scheduler started.');
    
    schedulerInterval = setInterval(async () => {
        try {
            await processPendingSchedules();
        } catch (err) {
            console.error('[Scheduler] Error in scheduler loop:', err);
        }
    }, 60000); // Poll every 60 seconds
}

async function processPendingSchedules() {
    const now = new Date();
    
    // Process pending schedules one-by-one using PostgreSQL FOR UPDATE SKIP LOCKED row locking
    let processedAny = false;
    do {
        processedAny = false;
        
        try {
            // Lock and update the next pending item atomically
            const results = await db.execute(sql`
                UPDATE wa_schedule
                SET status = 'processing'
                WHERE id = (
                    SELECT id FROM wa_schedule
                    WHERE status = 'pending' AND scheduled_for <= ${now}
                    LIMIT 1
                    FOR UPDATE SKIP LOCKED
                )
                RETURNING *;
            `);
            
            const lockedItem = results.rows?.[0] || results?.[0];
            
            if (lockedItem) {
                processedAny = true;
                // Parse normalized columns returned by returning clause
                const schedule = {
                    id: lockedItem.id,
                    userId: lockedItem.userId,
                    recipients: lockedItem.recipients,
                    message: lockedItem.message,
                    fileData: lockedItem.fileData,
                    fileName: lockedItem.fileName,
                    fileType: lockedItem.fileType,
                    scheduledFor: lockedItem.scheduled_for,
                    status: lockedItem.status,
                    error: lockedItem.error
                };
                await executeSchedule(schedule);
            }
        } catch (dbErr) {
            console.error('[Scheduler] Concurrency transaction error:', dbErr);
        }
    } while (processedAny);
}

async function executeSchedule(schedule) {
    console.log(`[Scheduler] Processing scheduled broadcast ${schedule.id} for user ${schedule.userId}`);
    const wa_session = wa_sessions.get(schedule.userId);
    
    if (!wa_session?.sock || wa_session.status !== 'connected') {
        console.error(`[Scheduler] WhatsApp not connected for user ${schedule.userId}. Marking schedule as failed.`);
        await db.update(whatsappSchedules)
            .set({ 
                status: 'failed', 
                error: 'WhatsApp not connected when scheduled time arrived' 
            })
            .where(eq(whatsappSchedules.id, schedule.id));
        return;
    }
    
    let recipients = [];
    try {
        recipients = JSON.parse(schedule.recipients);
    } catch (parseErr) {
        console.error(`[Scheduler] Failed to parse recipients list:`, parseErr);
        await db.update(whatsappSchedules)
            .set({ status: 'failed', error: 'Invalid JID recipients JSON payload' })
            .where(eq(whatsappSchedules.id, schedule.id));
        return;
    }
    
    let failedRecipients = [];
    
    for (const jid of recipients) {
        try {
            // Parse mentions for @everyone or @all tags in group broadcasts
            let mentions = undefined;
            if (jid.endsWith('@g.us') && schedule.message && (schedule.message.toLowerCase().includes('@everyone') || schedule.message.toLowerCase().includes('@all'))) {
                try {
                    const metadata = await wa_session.sock.groupMetadata(jid);
                    mentions = (metadata.participants || []).map(p => p.id);
                } catch (mErr) {
                    console.warn(`[Scheduler] Failed to fetch group metadata for mentions:`, mErr);
                }
            }

            if (schedule.fileData) {
                const buffer = Buffer.from(schedule.fileData, 'base64');
                const isImage = schedule.fileType?.startsWith('image/');
                const isVideo = schedule.fileType?.startsWith('video/');
                
                const messageContent = {};
                if (isImage) {
                    messageContent.image = buffer;
                    messageContent.caption = schedule.message;
                } else if (isVideo) {
                    messageContent.video = buffer;
                    messageContent.caption = schedule.message;
                } else {
                    messageContent.document = buffer;
                    messageContent.fileName = schedule.fileName;
                    messageContent.mimetype = schedule.fileType;
                    messageContent.caption = schedule.message;
                }

                if (mentions) {
                    messageContent.mentions = mentions;
                }

                await wa_session.sock.sendMessage(jid, messageContent);
            } else {
                await wa_session.sock.sendMessage(jid, { text: schedule.message, mentions });
            }
        } catch (error) {
            console.error(`[Scheduler] Failed to send to ${jid}:`, error);
            failedRecipients.push({ jid, error: error.message });
        }
        // Delay 1 second to avoid spam limits
        await new Promise(r => setTimeout(r, 1000));
    }
    
    if (failedRecipients.length === recipients.length) {
        await db.update(whatsappSchedules)
            .set({ status: 'failed', error: 'Failed to send to all recipients' })
            .where(eq(whatsappSchedules.id, schedule.id));
    } else {
        await db.update(whatsappSchedules)
            .set({ 
                status: 'sent', 
                error: failedRecipients.length > 0 ? `Failed for: ${JSON.stringify(failedRecipients)}` : null 
            })
            .where(eq(whatsappSchedules.id, schedule.id));
    }
    console.log(`[Scheduler] Finished broadcast ${schedule.id} (Status updated)`);
}
