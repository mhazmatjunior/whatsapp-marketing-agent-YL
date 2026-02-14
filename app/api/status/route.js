import { getWhatsAppStatus } from '@/lib/whatsapp';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function GET() {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    return NextResponse.json(getWhatsAppStatus(session.user.id));
}
