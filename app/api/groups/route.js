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
        const result = Object.values(groups).map(g => {
            const isAnnounce = !!g.announce;
            const isCommunityAnnounce = !!g.isCommunityAnnounce;
            const participants = g.participants || [];
            const myJid = wa_session.sock.user?.id || '';
            const myPhoneNum = myJid.split(':')[0].split('@')[0];
            const myLid = wa_session.sock.user?.lid || '';
            const myLidNum = myLid.split(':')[0].split('@')[0];
            
            const myParticipant = participants.find(p => {
                const pNum = p.id.split('@')[0];
                return pNum === myPhoneNum || (myLidNum && pNum === myLidNum);
            });
            const isAdmin = !!(myParticipant && (myParticipant.admin === 'admin' || myParticipant.admin === 'superadmin'));
            const canPost = !isAnnounce || isAdmin;

            return {
                id: g.id,
                name: g.subject,
                participants: participants.length,
                isAnnounce,
                isCommunityAnnounce,
                canPost
            };
        });
        return NextResponse.json(result);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
