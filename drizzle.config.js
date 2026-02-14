import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./lib/db.js",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
});
