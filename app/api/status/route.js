import { getWhatsAppStatus } from '@/lib/whatsapp';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { db, whatsappSessions } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const waStatus = getWhatsAppStatus(session.user.id);
    
    let hasCreds = false;
    try {
        const fullKey = `${session.user.id}-creds`;
        const results = await db.select()
            .from(whatsappSessions)
            .where(eq(whatsappSessions.id, fullKey))
            .limit(1);
        hasCreds = results.length > 0;
    } catch (e) {
        console.error('[API Status] Error checking session credentials:', e);
    }

    return NextResponse.json({
        ...waStatus,
        hasCreds
    });
}
