import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema.js";

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL is not set. Database features will be unavailable.");
}

const connectionString = process.env.DATABASE_URL || "postgresql://stub:stub@localhost:5432/stub";
const client = postgres(connectionString, {
  max: 1,
  ssl: 'require',
  onnotice: () => { },
});
export const db = drizzle(client, { schema });
