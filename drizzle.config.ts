import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

// Drizzle-kit runs locally with secrets in `.env.local` (pulled via `vercel env pull`),
// not the default `.env` file dotenv loads.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
  },
  casing: "snake_case",
  verbose: true,
  strict: true,
});
