import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql);

// Define schema locally for the microservice
export const whatsappSessions = pgTable('whatsapp_sessions', {
    id: text('id').primaryKey(),
    data: text('data').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
