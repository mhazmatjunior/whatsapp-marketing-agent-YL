import { whatsapp } from '../../../lib/whatsapp';
import { NextResponse } from 'next/server';

const validateApiKey = (req) => {
    const apiKey = req.headers.get('x-api-key');
    if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
        return false;
    }
    return true;
};

export async function GET(req) {
    if (!validateApiKey(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!whatsapp.sock || whatsapp.status !== 'connected') {
        return NextResponse.json({ error: 'WhatsApp not connected' }, { status: 400 });
    }

    try {
        const groups = await whatsapp.sock.groupFetchAllParticipating();
        const result = Object.values(groups).map(g => ({
            id: g.id,
            name: g.subject,
            participants: g.participants.length
        }));
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
