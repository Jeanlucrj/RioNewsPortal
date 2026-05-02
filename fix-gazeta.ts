import "dotenv/config";
import { db } from "./db/index";
import { newsArticles } from "./shared/schema";
import { detectCategory } from "./shared/categorization";
import { like, and, eq } from "drizzle-orm";

async function fixGazetaNews() {
  console.log("🔧 Fixing Gazeta do Povo news in Esportes category...");

  try {
    // 1. Get all articles from Gazeta do Povo that are in 'esportes'
    const articles = await db.select()
      .from(newsArticles)
      .where(
        and(
          like(newsArticles.source, "%Gazeta do Povo%"),
          eq(newsArticles.category, "esportes")
        )
      );

    console.log(`Found ${articles.length} miscategorized articles.`);

    if (articles.length === 0) {
      console.log("✅ No articles to fix.");
      process.exit(0);
    }

    let fixedCount = 0;
    for (const article of articles) {
      // Re-detect category using the new robust logic
      const newCategory = detectCategory(article.title + " " + (article.description || ""), article.source);

      console.log(`Processing: ${article.title.substring(0, 50)}... -> ${newCategory}`);

      if (newCategory !== "esportes") {
        await db.update(newsArticles)
          .set({ category: newCategory })
          .where(eq(newsArticles.id, article.id));
        fixedCount++;
      } else {
        // If it still detects as esportes (should not happen for Gazeta now), 
        // force it to 'geral' as per user request
        await db.update(newsArticles)
          .set({ category: "geral" })
          .where(eq(newsArticles.id, article.id));
        fixedCount++;
      }
    }

    console.log(`✅ Fixed ${fixedCount} Gazeta do Povo articles.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixGazetaNews();
