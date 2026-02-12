import { disconnectWhatsApp } from '../../../lib/whatsapp';
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

    try {
        await disconnectWhatsApp();
        return NextResponse.json({ message: 'Logged out successfully' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
