import { db, whatsappSchedules } from '@/lib/db';
import { auth } from '@/auth';
import { eq, and, desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// GET: Fetch all schedules for user
export async function GET(req) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    try {
        const results = await db.select()
            .from(whatsappSchedules)
            .where(eq(whatsappSchedules.userId, session.user.id))
            .orderBy(desc(whatsappSchedules.scheduledFor));

        // Format to omit heavy fileData from index list for performance
        const formatted = results.map(s => ({
            id: s.id,
            recipients: JSON.parse(s.recipients),
            message: s.message,
            fileName: s.fileName,
            fileType: s.fileType,
            hasAttachment: !!s.fileData,
            scheduledFor: s.scheduledFor,
            status: s.status,
            error: s.error,
            createdAt: s.createdAt
        }));

        return NextResponse.json(formatted);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Create a new schedule
export async function POST(req) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    try {
        const formData = await req.formData();
        const message = formData.get('message') || '';
        const recipientsJson = formData.get('recipients');
        const scheduledForStr = formData.get('scheduledFor');
        const file = formData.get('file');

        if (!recipientsJson || !scheduledForStr) {
            return NextResponse.json({ error: 'Recipients and Scheduled Time are required' }, { status: 400 });
        }

        const recipients = JSON.parse(recipientsJson);
        if (recipients.length === 0) {
            return NextResponse.json({ error: 'At least one recipient must be selected' }, { status: 400 });
        }

        const scheduledFor = new Date(scheduledForStr);
        if (isNaN(scheduledFor.getTime()) || scheduledFor <= new Date()) {
            return NextResponse.json({ error: 'Scheduled time must be a valid future date' }, { status: 400 });
        }

        let fileData = null;
        let fileName = null;
        let fileType = null;

        if (file && file instanceof File) {
            const buffer = Buffer.from(await file.arrayBuffer());
            fileData = buffer.toString('base64');
            fileName = file.name;
            fileType = file.type;
        }

        const [newSchedule] = await db.insert(whatsappSchedules).values({
            userId: session.user.id,
            recipients: JSON.stringify(recipients),
            message,
            fileData,
            fileName,
            fileType,
            scheduledFor,
            status: 'pending'
        }).returning();

        return NextResponse.json({ success: true, id: newSchedule.id });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Cancel/delete a scheduled message
export async function DELETE(req) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Missing schedule ID' }, { status: 400 });

    try {
        // Only allow deleting own pending schedules
        const [deleted] = await db.delete(whatsappSchedules)
            .where(
                and(
                    eq(whatsappSchedules.id, id),
                    eq(whatsappSchedules.userId, session.user.id)
                )
            )
            .returning();

        if (!deleted) {
            return NextResponse.json({ error: 'Schedule not found or unauthorized' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update an existing pending schedule
export async function PUT(req) {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    try {
        const formData = await req.formData();
        const id = formData.get('id');
        const message = formData.get('message');
        const recipientsJson = formData.get('recipients');
        const scheduledForStr = formData.get('scheduledFor');
        const file = formData.get('file');
        const clearFile = formData.get('clearFile') === 'true';

        if (!id) return NextResponse.json({ error: 'Missing schedule ID' }, { status: 400 });

        // Retrieve existing schedule to verify ownership and pending status
        const [existing] = await db.select()
            .from(whatsappSchedules)
            .where(
                and(
                    eq(whatsappSchedules.id, id),
                    eq(whatsappSchedules.userId, session.user.id)
                )
            )
            .limit(1);

        if (!existing) {
            return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
        }

        if (existing.status !== 'pending' && existing.status !== 'failed') {
            return NextResponse.json({ error: 'Only pending or failed schedules can be modified' }, { status: 400 });
        }

        const updateData = {};
        if (message !== null) updateData.message = message;
        
        if (recipientsJson) {
            const recipients = JSON.parse(recipientsJson);
            if (recipients.length === 0) {
                return NextResponse.json({ error: 'At least one recipient must be selected' }, { status: 400 });
            }
            updateData.recipients = JSON.stringify(recipients);
        }

        if (scheduledForStr) {
            const scheduledFor = new Date(scheduledForStr);
            if (isNaN(scheduledFor.getTime()) || scheduledFor <= new Date()) {
                return NextResponse.json({ error: 'Scheduled time must be a valid future date' }, { status: 400 });
            }
            updateData.scheduledFor = scheduledFor;
        }

        if (clearFile) {
            updateData.fileData = null;
            updateData.fileName = null;
            updateData.fileType = null;
        } else if (file && file instanceof File) {
            const buffer = Buffer.from(await file.arrayBuffer());
            updateData.fileData = buffer.toString('base64');
            updateData.fileName = file.name;
            updateData.fileType = file.type;
        }

        // Reset status to pending if it was previously failed, so the worker retries it
        updateData.status = 'pending';
        updateData.error = null;

        await db.update(whatsappSchedules)
            .set(updateData)
            .where(eq(whatsappSchedules.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
