import "dotenv/config";
import { db } from "./db/index";
import { newsArticles } from "./shared/schema";
import { detectCategory } from "./shared/categorization";
import { eq } from "drizzle-orm";

async function fixAllCategories() {
    console.log("🔧 Re-evaluating all news categories with improved logic...");

    try {
        const articles = await db.select().from(newsArticles);
        console.log(`Analyzing ${articles.length} articles...`);

        let updatedCount = 0;
        for (const article of articles) {
            const newCategory = detectCategory(
                article.title,
                article.description || "",
                article.source
            );

            if (newCategory !== article.category) {
                console.log(`[Update] "${article.title.substring(0, 40)}..." : ${article.category} -> ${newCategory}`);
                await db.update(newsArticles)
                    .set({ category: newCategory })
                    .where(eq(newsArticles.id, article.id));
                updatedCount++;
            }
        }

        console.log(`✅ Finished. Updated ${updatedCount} articles.`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

fixAllCategories();
