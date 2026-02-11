const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const { pgTable, text, timestamp } = require('drizzle-orm/pg-core');
require('dotenv').config();

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

// Define schema locally for the microservice
const whatsappSessions = pgTable('whatsapp_sessions', {
    id: text('id').primaryKey(),
    data: text('data').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

module.exports = { db, whatsappSessions };
