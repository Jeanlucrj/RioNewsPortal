import { db } from "./db/index.js";
import { newsArticles } from "@shared/schema";
import { like, and, eq, sql } from "drizzle-orm";

async function fixSupabase() {
  console.log("🔧 Deleting Gazeta do Povo from Esportes in Supabase...");

  try {
    // Count before delete
    const before = await db.select({ count: sql`count(*)` })
      .from(newsArticles)
      .where(
        and(
          sql`${newsArticles.source} LIKE '%Gazeta do Povo%'`,
          eq(newsArticles.category, "esportes")
        )
      );

    console.log(`Found ${before[0].count} Gazeta do Povo articles in Esportes`);

    // Delete
    const result = await db.delete(newsArticles)
      .where(
        and(
          sql`${newsArticles.source} LIKE '%Gazeta do Povo%'`,
          eq(newsArticles.category, "esportes")
        )
      );

    console.log("✅ Deleted Gazeta do Povo articles from Esportes");

    // Count after
    const after = await db.select({ count: sql`count(*)` })
      .from(newsArticles)
      .where(
        and(
          sql`${newsArticles.source} LIKE '%Gazeta do Povo%'`,
          eq(newsArticles.category, "esportes")
        )
      );

    console.log(`Remaining: ${after[0].count} (should be 0)`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixSupabase();
