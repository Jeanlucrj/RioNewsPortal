import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./index";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    console.log("⏳ Running migrations...");

    try {
        await migrate(db, {
            migrationsFolder: path.join(__dirname, "../migrations")
        });
        console.log("✅ Migrations completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:");
        console.error(error);
        process.exit(1);
    }
}

runMigration();
