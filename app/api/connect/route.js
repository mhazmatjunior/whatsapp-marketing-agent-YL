import { connectWhatsApp } from '@/lib/whatsapp';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const apiKey = req.headers.get('x-api-key');
    if (apiKey !== process.env.API_KEY) {
        return NextResponse.json({ error: 'Invalid API Key' }, { status: 403 });
    }

    try {
        await connectWhatsApp(session.user.id);
        return NextResponse.json({ message: 'Connection initiated' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
