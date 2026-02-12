import { getWhatsAppStatus } from '../../../lib/whatsapp';
import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json(getWhatsAppStatus());
}
