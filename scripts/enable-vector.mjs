// Turns on the pgvector extension in your Neon database.
// Runs automatically before `drizzle-kit push` (see "db:push" in package.json).
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local first.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
await sql`CREATE EXTENSION IF NOT EXISTS vector`;
console.log("✓ pgvector extension enabled");
