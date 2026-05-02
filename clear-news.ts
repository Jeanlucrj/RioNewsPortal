import { db } from "./db/index.js";
import { newsArticles } from "@shared/schema";

async function clearAllNews() {
  console.log("🗑️  Clearing all news articles from database...");

  try {
    await db.delete(newsArticles);
    console.log("✅ Successfully cleared all news articles");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing news:", error);
    process.exit(1);
  }
}

clearAllNews();
