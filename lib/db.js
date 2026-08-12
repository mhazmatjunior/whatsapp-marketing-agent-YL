import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, timestamp, integer, primaryKey, boolean } from 'drizzle-orm/pg-core';

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql);

// --- NextAuth Tables (Prefixed for SaaS isolation) ---

export const users = pgTable("wa_user", {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email").notNull().unique(),
    password: text("password"),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),
});

export const accounts = pgTable("wa_account", {
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
}, (account) => [
    {
        compoundKey: primaryKey({ columns: [account.provider, account.providerAccountId] }),
    },
]);

export const sessions = pgTable("wa_session", {
    sessionToken: text("sessionToken").primaryKey(),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("wa_verificationToken", {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
}, (vt) => [
    {
        compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
    },
]);

// --- WhatsApp SaaS Tables ---

export const whatsappSessions = pgTable('whatsapp_sessions', {
    id: text('id').primaryKey(), // Keyed by userId (from NextAuth)
    data: text('data').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const whatsappJoins = pgTable('wa_join', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('userId')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    recipients: text('recipients').notNull(), // JSON string array of group JIDs
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const whatsappSchedules = pgTable('wa_schedule', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('userId')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    recipients: text('recipients').notNull(), // JSON string array of JIDs
    message: text('message').notNull(),
    fileData: text('fileData'), // base64 string
    fileName: text('fileName'),
    fileType: text('fileType'),
    scheduledFor: timestamp('scheduled_for', { mode: 'date' }).notNull(),
    status: text('status').default('pending').notNull(), // 'pending' | 'processing' | 'sent' | 'failed'
    error: text('error'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});




