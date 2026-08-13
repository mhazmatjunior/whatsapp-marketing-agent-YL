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
        // Contacts are populated by contacts.upsert/contacts.update event listeners
        const rawContacts = wa_session.contacts || {};

        const contacts = Object.values(rawContacts)
            .filter(c => {
                // Only individual contacts (not groups, broadcasts, or yourself)
                if (!c.id) return false;
                if (!c.id.endsWith('@s.whatsapp.net')) return false;
                const myJid = wa_session.sock.user?.id || '';
                const myNum = myJid.split(':')[0];
                if (c.id.startsWith(myNum)) return false;
                return true;
            })
            .map(c => ({
                id: c.id,
                // Prefer saved name > notify (push name) > phone number
                name: c.name || c.notify || c.id.split('@')[0],
                phone: c.id.split('@')[0],
                type: 'contact',
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json(contacts);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
