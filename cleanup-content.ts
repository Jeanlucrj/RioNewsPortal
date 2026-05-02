import "dotenv/config";
import { db } from "./db/index";
import { newsArticles } from "./shared/schema";
import { eq, like, or } from "drizzle-orm";

async function cleanupBrokenImages() {
    console.log("🧹 Iniciar limpeza de imagens incompatíveis e fontes removidas...");

    try {
        // 1. Clear LoremFlickr images (Reset to null so reliable fallback kicks in)
        const brokenImages = await db.update(newsArticles)
            .set({ imageUrl: null })
            .where(like(newsArticles.imageUrl, "https://loremflickr.com/%"));

        console.log("✅ Imagens do LoremFlickr removidas.");

        // 2. Remove Rolling Stone articles as requested
        const rollingStone = await db.delete(newsArticles)
            .where(like(newsArticles.source, "Rolling Stone%"));

        console.log("✅ Artigos da Rolling Stone removidos.");

        // 3. Clear any generic Rio sunset images from specific categories that should have better ones
        // (Optional: but might help clean up the visual repetition user complained about earlier)

        process.exit(0);
    } catch (error) {
        console.error("❌ Erro na limpeza:", error);
        process.exit(1);
    }
}

cleanupBrokenImages();
