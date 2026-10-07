import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Neon's HTTP driver: each query is one HTTPS request, which suits
// serverless functions on Vercel (no connection pool to manage).
const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
