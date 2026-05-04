/**
 * Vercel Cron Job — roda a cada 30 minutos automaticamente.
 * Sincroniza RSS, limpa artigos antigos e gera artigo AI por categoria.
 * Não depende de nenhuma máquina local estar ligada.
 */
import "dotenv/config";
import type { Request, Response } from "express";
import { RSSService } from "../../server/services/rss-service.js";
import { storage } from "../../server/storage.js";
import { generateArticle } from "../../server/services/ai-editorial-service.js";

const rssService = new RSSService();

const AI_CATEGORIES = ["geral", "esportes", "cultura", "shows", "gastronomia", "internacional", "vida-noturna"];
// Rotate category index using minute-of-hour so each run picks a different category
function pickCategory(): string {
  const minute = new Date().getMinutes();
  const idx = Math.floor(minute / 30) + Math.floor(Date.now() / 3600000);
  return AI_CATEGORIES[idx % AI_CATEGORIES.length];
}

export default async function handler(req: Request, res: Response) {
  // Vercel automatically sets Authorization: Bearer {CRON_SECRET} on cron requests
  const authHeader = req.headers.authorization ?? "";
  const cronSecret = process.env.CRON_SECRET ?? "";

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const log: string[] = [];
  const t0 = Date.now();

  try {
    // ── 1. Sync RSS feeds ────────────────────────────────────────────────────
    log.push("▶ RSS sync...");
    const articles = await rssService.fetchAllRSSFeeds();
    const saved = await storage.saveNews(articles);
    log.push(`✅ RSS: ${articles.length} artigos buscados, ${saved} salvos no DB`);

    // ── 2. Cleanup old news (keep last 15 days) ──────────────────────────────
    const deleted = await storage.cleanupOldNews(15);
    if (deleted > 0) log.push(`🗑️  Cleanup: ${deleted} artigos antigos removidos`);

    // ── 3. AI article generation (one per cron run, rotating categories) ─────
    if (process.env.GEMINI_API_KEY) {
      const category = pickCategory();
      const cooldownHours = 6;
      const cutoff = new Date(Date.now() - cooldownHours * 3600_000);

      const recent = await storage.getNews(category as any, 10, 0);
      const recentAI = recent.filter(
        a => a.source === "Diário do Carioca" && new Date(a.publishedAt) > cutoff
      );

      if (recentAI.length > 0) {
        log.push(`⏭️  AI "${category}": artigo recente encontrado — cooldown ativo`);
      } else {
        log.push(`🤖 AI gerando artigo — categoria: ${category}`);

        let sources = await storage.getNews(category as any, 20, 0);
        sources = sources.filter(a => a.source !== "Diário do Carioca");
        if (sources.length < 2) {
          const all = await storage.getNews(undefined, 40, 0);
          sources = all.filter(a => a.source !== "Diário do Carioca").slice(0, 10);
        }

        if (sources.length === 0) {
          log.push(`⚠️  AI "${category}": sem fontes disponíveis`);
        } else {
          // Shuffle
          for (let i = sources.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [sources[i], sources[j]] = [sources[j], sources[i]];
          }
          const recentAll = await storage.getNews(undefined, 30, 0);
          const usedImageUrls = recentAll
            .filter(a => a.source === "Diário do Carioca" && a.imageUrl)
            .map(a => a.imageUrl as string);

          const generated = await generateArticle({
            category,
            sourceArticles: sources.slice(0, 8),
            usedImageUrls,
          });

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

          log.push(`✅ AI: "${generated.title.slice(0, 60)}"`);
        }
      }
    }

    await storage.clearCache();

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    log.push(`⏱️  Total: ${elapsed}s`);

    return res.status(200).json({ ok: true, log, elapsed });
  } catch (err: any) {
    log.push(`❌ Erro: ${err.message}`);
    console.error("[cron/sync] error:", err);
    return res.status(500).json({ ok: false, log, error: err.message });
  }
}
