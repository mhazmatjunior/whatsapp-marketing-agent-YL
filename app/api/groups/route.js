import { wa_sessions } from '@/lib/whatsapp';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function GET(req) {
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
        const groups = await wa_session.sock.groupFetchAllParticipating();
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
