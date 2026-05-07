import "dotenv/config";
import { db } from "./db/index.ts";
import { newsArticles } from "./shared/schema.js";
import { sql } from "drizzle-orm";

async function cleanGarbage() {
  console.log("Cleaning up old 'Initial plugin text' garbage in the database...");
  try {
    const result = await db.execute(sql`
      UPDATE news_articles
      SET description = regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(description, 'Initial plugin text', '', 'gi'),
              '✅\\s*Clique aqui para seguir o novo canal.*?WhatsApp', '', 'gi'
            ),
            '🗞️', '', 'g'
          ),
          '\\s\\+\\s', ' - ', 'g'
      )
      WHERE description ILIKE '%Initial plugin text%' OR description ILIKE '%✅%';
    `);
    console.log(`✅ Successfully cleaned descriptions.`);
    process.exit(0);
  } catch (err) {
    console.error("Error cleaning db:", err);
    process.exit(1);
  }
}

cleanGarbage();
