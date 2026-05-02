import "dotenv/config";
import { db } from "./db/index";
import { newsArticles } from "./shared/schema";

async function fullDatabaseWipe() {
    console.log("🧨 LIMPANDO TODO O BANCO DE DADOS DE NOTÍCIAS...");

    try {
        await db.delete(newsArticles);
        console.log("✅ Banco de dados limpo com sucesso! Pronto para sincronização do zero.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Erro ao limpar o banco:", error);
        process.exit(1);
    }
}

fullDatabaseWipe();
