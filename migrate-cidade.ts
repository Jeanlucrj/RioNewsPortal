import "dotenv/config";
import { db } from "./db/index.ts";
import { newsArticles } from "./shared/schema.js";
import { sql } from "drizzle-orm";

async function migrateCategory() {
  console.log("Migrating Prefeitura do Rio articles to 'cidade' category...");
  try {
    const result = await db.execute(sql`
      UPDATE news_articles
      SET category = 'cidade'
      WHERE source LIKE '%Prefeitura do Rio%' AND category = 'geral';
    `);
    console.log(`✅ Successfully migrated categories.`);
    process.exit(0);
  } catch (err) {
    console.error("Error migrating db:", err);
    process.exit(1);
  }
}

migrateCategory();
