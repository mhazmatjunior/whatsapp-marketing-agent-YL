import { connectWhatsApp } from '../../../lib/whatsapp';
import { NextResponse } from 'next/server';

const validateApiKey = (req) => {
    const apiKey = req.headers.get('x-api-key');
    const serverKey = process.env.API_KEY;

    if (!serverKey) {
        console.error('[API Auth] CRITICAL: API_KEY is not set on the server!');
        return false;
    }

    if (!apiKey) {
        console.warn('[API Auth] Rejected: Request missing x-api-key header');
        return false;
    }

    if (apiKey !== serverKey) {
        console.warn('[API Auth] Rejected: API Key mismatch');
        return false;
    }

    return true;
};

export async function POST(req) {
    if (!validateApiKey(req)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await connectWhatsApp();
        return NextResponse.json({ message: 'Connection initiated' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
