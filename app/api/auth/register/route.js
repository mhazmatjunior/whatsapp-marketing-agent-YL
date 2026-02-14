import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';

export async function POST(req) {
    try {
        const { name, email, password } = await req.json();

        if (!email || !password || !name) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Check if user already exists
        const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (existingUser) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
        }

        // 2. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Create user
        const [newUser] = await db.insert(users).values({
            name,
            email,
            password: hashedPassword,
        }).returning();

        return NextResponse.json({
            success: true,
            user: { id: newUser.id, name: newUser.name, email: newUser.email }
        });

    } catch (error) {
        console.error('[Registration] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
