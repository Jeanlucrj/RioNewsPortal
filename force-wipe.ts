import "dotenv/config";
import { db } from "./db/index";
import { newsArticles } from "./shared/schema";
import { like } from "drizzle-orm";

async function forceWipeRollingStone() {
    console.log("🚀 Executando limpeza FORÇADA da Rolling Stone...");

    try {
        const result = await db.delete(newsArticles)
            .where(like(newsArticles.source, "%Rolling Stone%"));

        console.log(`✅ Sucesso! Artigos removidos da base.`);

        // Let's also check for Omelete just in case "shows" needs to be even cleaner
        // const result2 = await db.delete(newsArticles).where(like(newsArticles.source, "%Omelete%"));

        process.exit(0);
    } catch (error) {
        console.error("❌ Erro fatal na limpeza:", error);
        process.exit(1);
    }
}

forceWipeRollingStone();
