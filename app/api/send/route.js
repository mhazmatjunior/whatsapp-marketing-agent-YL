import { wa_sessions } from '@/lib/whatsapp';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const apiKey = req.headers.get('x-api-key');
    if (apiKey !== process.env.API_KEY) {
        return NextResponse.json({ error: 'Invalid API Key' }, { status: 403 });
    }

    const wa_session = wa_sessions.get(session.user.id);
    if (!wa_session?.sock || wa_session.status !== 'connected') {
        return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 400 });
    }

    try {
        const formData = await req.formData();
        const message = formData.get('message');
        const recipientsJson = formData.get('recipients');
        const recipients = JSON.parse(recipientsJson);
        const file = formData.get('file');

        const results = [];
        for (const jid of recipients) {
            try {
                // Parse mentions for @everyone or @all tags in group broadcasts
                let mentions = undefined;
                if (jid.endsWith('@g.us') && message && (message.toLowerCase().includes('@everyone') || message.toLowerCase().includes('@all'))) {
                    try {
                        const metadata = await wa_session.sock.groupMetadata(jid);
                        mentions = (metadata.participants || []).map(p => p.id);
                    } catch (mErr) {
                        console.warn(`[API Send] Failed to fetch group metadata for mentions:`, mErr);
                    }
                }

                if (file && file instanceof File) {
                    const buffer = Buffer.from(await file.arrayBuffer());
                    const isImage = file.type.startsWith('image/');
                    const isVideo = file.type.startsWith('video/');

                    const messageContent = {};
                    if (isImage) {
                        messageContent.image = buffer;
                        messageContent.caption = message;
                    } else if (isVideo) {
                        messageContent.video = buffer;
                        messageContent.caption = message;
                    } else {
                        // Handle as Document (PDF, ZIP, DOCX, etc.)
                        messageContent.document = buffer;
                        messageContent.fileName = file.name;
                        messageContent.mimetype = file.type;
                        messageContent.caption = message;
                    }
                    
                    if (mentions) {
                        messageContent.mentions = mentions;
                    }

                    await wa_session.sock.sendMessage(jid, messageContent);
                } else {
                    await wa_session.sock.sendMessage(jid, { text: message, mentions });
                }
                results.push({ jid, status: 'sent' });
            } catch (error) {
                console.error(`Failed to send to ${jid}:`, error);
                results.push({ jid, status: 'failed', error: error.message });
            }
            await new Promise(r => setTimeout(r, 1000));
        }

        return NextResponse.json({ results });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
