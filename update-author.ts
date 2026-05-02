import "dotenv/config";
import { db } from "./db/index";
import { newsArticles } from "./shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  try {
    const result = await db.update(newsArticles)
      .set({ author: "Redação" })
      .where(eq(newsArticles.author, "Redação IA"));
    console.log("Banco de dados atualizado com sucesso.");
    process.exit(0);
  } catch (error) {
    console.error("Erro ao atualizar o banco de dados:", error);
    process.exit(1);
  }
}

main();
