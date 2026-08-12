import { db, whatsappJoins } from '@/lib/db';
import { auth } from '@/auth';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(req) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    try {
        const result = await db.select()
            .from(whatsappJoins)
            .where(eq(whatsappJoins.userId, session.user.id))
            .orderBy(whatsappJoins.createdAt);
        
        // Parse recipients for ease of use in client
        const joins = result.map(row => ({
            ...row,
            recipients: JSON.parse(row.recipients)
        }));

        return NextResponse.json(joins);
    } catch (error) {
        console.error('[API Joins GET] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    try {
        const { name, recipients } = await req.json();

        if (!name || !recipients || !Array.isArray(recipients)) {
            return NextResponse.json({ error: 'Missing required fields or invalid format' }, { status: 400 });
        }

        const [newJoin] = await db.insert(whatsappJoins)
            .values({
                userId: session.user.id,
                name: name.trim(),
                recipients: JSON.stringify(recipients)
            })
            .returning();

        return NextResponse.json({
            ...newJoin,
            recipients: JSON.parse(newJoin.recipients)
        });
    } catch (error) {
        console.error('[API Joins POST] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    try {
        const { id, name, recipients } = await req.json();

        if (!id || !name || !recipients || !Array.isArray(recipients)) {
            return NextResponse.json({ error: 'Missing required fields or invalid format' }, { status: 400 });
        }

        const [updatedJoin] = await db.update(whatsappJoins)
            .set({
                name: name.trim(),
                recipients: JSON.stringify(recipients)
            })
            .where(
                and(
                    eq(whatsappJoins.id, id),
                    eq(whatsappJoins.userId, session.user.id)
                )
            )
            .returning();

        if (!updatedJoin) {
            return NextResponse.json({ error: 'Join not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({
            ...updatedJoin,
            recipients: JSON.parse(updatedJoin.recipients)
        });
    } catch (error) {
        console.error('[API Joins PUT] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Missing join ID' }, { status: 400 });
        }

        const [deletedJoin] = await db.delete(whatsappJoins)
            .where(
                and(
                    eq(whatsappJoins.id, id),
                    eq(whatsappJoins.userId, session.user.id)
                )
            )
            .returning();

        if (!deletedJoin) {
            return NextResponse.json({ error: 'Join not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Join deleted successfully' });
    } catch (error) {
        console.error('[API Joins DELETE] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
