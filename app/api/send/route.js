import { whatsapp } from '../../../lib/whatsapp';
import { NextResponse } from 'next/server';

const validateApiKey = (req) => {
    const apiKey = req.headers.get('x-api-key');
    if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
        return false;
    }
    return true;
};

export async function POST(req) {
    if (!validateApiKey(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!whatsapp.sock || whatsapp.status !== 'connected') {
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
                if (file && file instanceof File) {
                    const buffer = Buffer.from(await file.arrayBuffer());
                    await whatsapp.sock.sendMessage(jid, {
                        [file.type.startsWith('video/') ? 'video' : 'image']: buffer,
                        caption: message,
                        mimetype: file.type
                    });
                } else {
                    await whatsapp.sock.sendMessage(jid, { text: message });
                }
                results.push({ jid, status: 'sent' });
            } catch (error) {
                console.error(`Failed to send to ${jid}:`, error);
                results.push({ jid, status: 'failed', error: error.message });
            }
            // Small delay to prevent spam detection
            await new Promise(r => setTimeout(r, 1000));
        }

        return NextResponse.json({ results });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
