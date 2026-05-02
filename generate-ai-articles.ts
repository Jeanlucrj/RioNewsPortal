/**
 * Script to generate AI articles for all categories directly.
 * Run: npx tsx generate-ai-articles.ts
 */
import "dotenv/config";
// Uses GEMINI_API_KEY from .env
import { storage } from "./server/storage.js";
import { generateArticle } from "./server/services/ai-editorial-service.js";
import type { NewsCategory } from "./shared/schema.js";

const CATEGORIES: NewsCategory[] = ["geral", "esportes", "cultura", "shows", "gastronomia", "internacional"];

async function main() {
  console.log("🤖 Iniciando geração de artigos com IA...\n");

  for (const category of CATEGORIES) {
    console.log(`📝 Gerando artigo para categoria: ${category}`);

    // Get source articles
    let sources = await storage.getNews(category, 8, 0);
    if (sources.length < 2) {
      const all = await storage.getNews(undefined, 30, 0);
      sources = all.filter(a => a.category === category).slice(0, 8);
    }

    if (sources.length === 0) {
      console.log(`   ⚠️  Sem artigos fonte para "${category}" — pulando\n`);
      continue;
    }

    console.log(`   📰 ${sources.length} artigos fonte encontrados`);

    try {
      const generated = await generateArticle({ category, sourceArticles: sources });

      await storage.createNewsArticle({
        title: generated.title,
        description: generated.description,
        content: generated.content,
        category: generated.category,
        tags: generated.tags,
        source: "Diário do Carioca",
        author: "Redação",
        imageUrl: generated.imageUrl,
        isManual: true,
        isDraft: false,
      });

      await storage.clearCache();
      console.log(`   ✅ Publicado: "${generated.title}"\n`);
    } catch (err: any) {
      console.error(`   ❌ Erro em ${category}: ${err.message}\n`);
    }

    // Small delay between requests
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log("🎉 Geração concluída!");
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
