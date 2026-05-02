import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("⚠️ DATABASE_URL is not set. Database features will be unavailable.");
}

const client = postgres(connectionString || "postgresql://stub:stub@localhost:5432/stub", {
  max: 3,
  ssl: 'require',
  onnotice: () => { },
  connect_timeout: 5,
  idle_timeout: 10,
  max_lifetime: 60,
});

export const db = drizzle(client, { schema });
