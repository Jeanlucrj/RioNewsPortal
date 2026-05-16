import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import passport from "./passport-config.js";
import { authService } from "./services/auth-service.js";
import { storage } from "./storage.js";
import { NewsService } from "./services/news-service.js";
import { SportsService } from "./services/sports-service.js";
import { EventsService } from "./services/events-service.js";
import { RSSService } from "./services/rss-service.js";
import { generateArticle } from "./services/ai-editorial-service.js";
import { sendWelcomeEmail } from "./services/email-service.js";
import { registerUserSchema, loginUserSchema, createNewsArticleSchema, updateNewsArticleSchema, type NewsCategory, type NewsArticle } from "../shared/schema.js";

const newsService = new NewsService();
const sportsService = new SportsService();
const eventsService = new EventsService();
const rssService = new RSSService();

// In-memory RSS cache — used when DB is unavailable
let rssMemCache: NewsArticle[] = [];
let rssMemCacheTime = 0;
const RSS_MEM_TTL = 10 * 60 * 1000; // 10 minutes

async function getNewsFromRSSCache(category?: NewsCategory): Promise<NewsArticle[]> {
  const now = Date.now();
  if (rssMemCache.length === 0 || now - rssMemCacheTime > RSS_MEM_TTL) {
    try {
      console.log("🔄 Refreshing RSS in-memory cache...");
      rssMemCache = await rssService.fetchAllRSSFeeds();
      rssMemCacheTime = now;
      console.log(`✅ RSS cache: ${rssMemCache.length} artigos`);
    } catch (err) {
      console.error("❌ RSS cache refresh failed:", err);
    }
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const filtered = rssMemCache.filter(a => new Date(a.publishedAt) >= sevenDaysAgo);

  if (!category || category === "geral") return filtered;
  return filtered.filter(a => a.category === category);
}

// Categories to rotate through for AI generation
const AI_CATEGORIES = ["geral", "esportes", "cultura", "shows", "gastronomia", "internacional", "vida-noturna", "cidade"];
let aiCategoryIndex = 0;

// Minimum hours between AI articles for the same category
const AI_COOLDOWN_HOURS = 6;

// In-memory guard against concurrent cold-start races on Vercel serverless
let aiGenerationRunning = false;
let lastAiGenerationMs = 0;

/**
 * Automatically generates one AI article per run, rotating through categories.
 * Guards against duplicate runs (Vercel multi-instance cold starts) via:
 *   1. In-process flag (same instance)
 *   2. DB check: skip if a Diário do Carioca article for this category exists
 *      within the last AI_COOLDOWN_HOURS hours
 */
async function runAIGeneration(trigger: "startup" | "scheduled") {
  if (!process.env.GEMINI_API_KEY) return;

  // In-process rate limit: at most once every 30 min per process
  const now = Date.now();
  if (aiGenerationRunning || now - lastAiGenerationMs < 30 * 60 * 1000) {
    console.log(`⏭️  [AI] Geração ignorada — outra já em andamento ou recente`);
    return;
  }
  aiGenerationRunning = true;
  lastAiGenerationMs = now;

  const category = AI_CATEGORIES[aiCategoryIndex % AI_CATEGORIES.length];
  aiCategoryIndex++;

  try {
    // DB cooldown: skip if AI already generated an article for this category recently
    const cooldownCutoff = new Date(now - AI_COOLDOWN_HOURS * 60 * 60 * 1000);
    const recentAll = await storage.getNews(category as any, 10, 0);
    const recentAI = recentAll.filter(
      a => a.source === "Diário do Carioca" && new Date(a.publishedAt) > cooldownCutoff
    );
    if (recentAI.length > 0) {
      console.log(`⏭️  [AI] Artigo recente para "${category}" (${recentAI[0].title.slice(0, 40)}...) — cooldown ativo`);
      return;
    }

    console.log(`🤖 [AI] Gerando artigo — categoria: ${category} (${trigger})`);

    // Get source articles excluding Diário do Carioca (avoid self-referencing)
    let sources = await storage.getNews(category as any, 20, 0);
    sources = sources.filter(a => a.source !== "Diário do Carioca");

    if (sources.length < 2) {
      const fallback = await storage.getNews(undefined, 30, 0);
      sources = fallback
        .filter(a => a.category === category && a.source !== "Diário do Carioca")
        .slice(0, 10);
    }
    if (sources.length === 0) {
      console.log(`⚠️  [AI] Sem artigos fonte para "${category}" — pulando`);
      return;
    }

    // Shuffle sources so each run uses a different subset
    for (let i = sources.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sources[i], sources[j]] = [sources[j], sources[i]];
    }
    const selectedSources = sources.slice(0, 8);

    // Collect images already used by recent AI articles to avoid duplicates
    const recentAIAll = await storage.getNews(undefined, 30, 0);
    const usedImageUrls = recentAIAll
      .filter(a => a.source === "Diário do Carioca" && a.imageUrl)
      .map(a => a.imageUrl as string);

    const generated = await generateArticle({
      category,
      sourceArticles: selectedSources,
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

    await storage.clearCache();
    console.log(`✅ [AI] Artigo publicado: "${generated.title}"`);
  } catch (error: any) {
    console.error(`❌ [AI] Falha na geração (${category}):`, error.message);
  } finally {
    aiGenerationRunning = false;
  }
}

// Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Perform background tasks only in local development or when explicitly triggered
  // Startup background tasks (RSS, events, and cleanup)
  // We use a small delay in development to ensure the localhost link is visible first
  const syncDelay = process.env.NODE_ENV === "production" ? 0 : 2000;
  
  setTimeout(() => {
    // Auto-sync RSS feeds on server start
    (async () => {
      try {
        console.log("🔄 Auto-syncing RSS feeds...");
        const articles = await rssService.fetchAllRSSFeeds();
        // Always populate in-memory cache
        rssMemCache = articles;
        rssMemCacheTime = Date.now();
        console.log(`✅ RSS: ${articles.length} artigos carregados`);
        // Try to persist to DB (optional)
        try {
          await storage.saveNews(articles);
        } catch {
          console.warn("⚠️  DB indisponível — usando cache em memória");
        }
      } catch (error) {
        console.error("❌ Failed to auto-sync RSS feeds:", error);
      }
    })();

    // Auto-sync and cleanup events on server start
    (async () => {
      try {
        console.log("🔄 Starting startup events maintenance...");
        await storage.cleanupOldEvents(1);
        await eventsService.syncExternalEvents();
      } catch (error) {
        console.error("❌ Failed to perform startup events maintenance:", error);
      }
    })();

    // Auto-cleanup old news on server start
    (async () => {
      try {
        console.log("🗑️  Cleaning up old news articles...");
        await storage.cleanupOldNews(15);
      } catch (error) {
        console.error("❌ Error cleaning up old news:", error);
      }
    })();

    // AI auto-generation on startup (after RSS is loaded — wait 15s)
    setTimeout(() => runAIGeneration("startup"), 15_000);
  }, syncDelay);

  // Periodic tasks — skip on Vercel serverless
  if (!process.env.VERCEL) {
    // RSS sync every 30 minutes
    setInterval(async () => {
      try {
        console.log("🔄 [Auto] Sincronizando RSS...");
        const articles = await rssService.fetchAllRSSFeeds();
        rssMemCache = articles;
        rssMemCacheTime = Date.now();
        try { await storage.saveNews(articles); } catch { /* DB opcional */ }
        console.log(`✅ [Auto] RSS: ${articles.length} artigos`);
      } catch (error) {
        console.error("❌ [Auto] Falha no sync RSS:", error);
      }
    }, 30 * 60 * 1000);

    // Cleanup every 12 hours
    setInterval(async () => {
      try {
        await storage.cleanupOldNews(15);
        await storage.cleanupOldEvents(2);
      } catch (error) {
        console.error("❌ Failed to perform periodic cleanup:", error);
      }
    }, 12 * 60 * 60 * 1000);

    // AI auto-generation every 1 hour (was 4 hours)
    setInterval(() => runAIGeneration("scheduled"), 1 * 60 * 60 * 1000);
  }

  // Note: Mock events disabled - Use POST /api/events/sync to fetch real events from Sympla/Eventbrite
  // Or configure valid SYMPLA_API_KEY and EVENTBRITE_API_KEY secrets and call the sync endpoint

  // ========== SITEMAP ROUTES ==========
  // sitemap.xml principal — definido adiante com suporte a categorias e SITE_URL
  // sitemap-news.xml — Google News format, artigos das últimas 48h
  app.get("/sitemap-news.xml", async (req, res) => {
    try {
      const baseUrl = process.env.SITE_URL || "https://odiariocarioca.com.br";
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      let articles = await storage.getNews(undefined, 100, 0);
      articles = articles.filter(a => new Date(a.publishedAt) >= twoDaysAgo);

      const escape = (s: string) =>
        s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${articles.map(article => `  <url>
    <loc>${baseUrl}/noticia/${encodeURIComponent(article.id)}</loc>
    <news:news>
      <news:publication>
        <news:name>O Diário Carioca</news:name>
        <news:language>pt-BR</news:language>
      </news:publication>
      <news:publication_date>${new Date(article.publishedAt).toISOString()}</news:publication_date>
      <news:title>${escape(article.title)}</news:title>
    </news:news>
  </url>`).join("\n")}
</urlset>`;

      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=300");
      res.send(xml);
    } catch (error) {
      console.error("Erro ao gerar sitemap-news:", error);
      res.status(500).send("Erro ao gerar sitemap-news");
    }
  });

  // ========== CRON JOB ROUTE ==========
  // Handler para cron jobs (Supabase ou Vercel Cron)
  // Como todas as rotas /api/* caem aqui (via vercel.json rewrites), expomos o /api/cron/sync
  app.all("/api/cron/sync", async (req, res) => {
    // Vercel / Supabase sends Authorization: Bearer {CRON_SECRET}
    const authHeader = req.headers.authorization ?? "";
    const cronSecret = process.env.CRON_SECRET ?? "";
  
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  
    const log: string[] = [];
    const t0 = Date.now();
  
    try {
      // 1. Sync RSS feeds
      log.push("▶ RSS sync...");
      const articles = await rssService.fetchAllRSSFeeds();
      const saved = await storage.saveNews(articles);
      log.push(`✅ RSS: ${articles.length} artigos buscados, ${saved} salvos no DB`);
  
      // 2. Cleanup old news (keep last 15 days)
      const deleted = await storage.cleanupOldNews(15);
      if (deleted > 0) log.push(`🗑️  Cleanup: ${deleted} artigos antigos removidos`);
  
      // 3. AI article generation (one per cron run)
      if (process.env.GEMINI_API_KEY) {
        let category = AI_CATEGORIES[0];
        let oldestTime = Date.now();
        
        for (const cat of AI_CATEGORIES) {
          // Busca os últimos 50 artigos desta categoria específica para achar o da IA
          const catNews = await storage.getNews(cat as any, 50, 0);
          const aiArticles = catNews.filter(a => a.source === "Diário do Carioca" || a.isManual);
          
          const lastTime = aiArticles.length > 0 ? new Date(aiArticles[0].publishedAt).getTime() : 0;
          if (lastTime < oldestTime) {
            oldestTime = lastTime;
            category = cat;
          }
        }
        
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
      await storage.clearCache();
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      log.push(`⏱️  Total: ${elapsed}s`);
  
      return res.json({ ok: true, log, elapsed });
    } catch (err: any) {
      log.push(`❌ Erro: ${err.message}`);
      console.error("[cron/sync] error:", err);
      return res.status(500).json({ ok: false, log, error: err.message });
    }
  });

  // ========== INTERNAL AI TRIGGER ==========
  // Protected by WEBHOOK_SECRET — triggers generation for all categories bypassing cooldown
  app.post("/api/internal/ai/generate-all", async (req, res) => {
    const secret = process.env.WEBHOOK_SECRET;
    const auth = req.headers.authorization;
    if (!secret || auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const categories = ["geral", "esportes", "cultura", "shows", "gastronomia", "internacional", "vida-noturna", "cidade"];
    const results: Record<string, any> = {};

    res.writeHead(200, { "Content-Type": "application/json", "Transfer-Encoding": "chunked" });

    for (const category of categories) {
      try {
        let sources = await storage.getNews(category as any, 20, 0);
        sources = sources.filter(a => a.source !== "Diário do Carioca");
        if (sources.length < 2) {
          const all = await storage.getNews(undefined, 40, 0);
          sources = all.filter(a => a.category === category && a.source !== "Diário do Carioca").slice(0, 10);
        }
        if (sources.length === 0) {
          // Last resort: use any recent articles regardless of category
          const anyRecent = await storage.getNews(undefined, 20, 0);
          sources = anyRecent.filter(a => a.source !== "Diário do Carioca").slice(0, 8);
        }
        if (sources.length === 0) {
          results[category] = { status: "skipped", reason: "sem fontes" };
          continue;
        }
        // Shuffle sources
        for (let i = sources.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [sources[i], sources[j]] = [sources[j], sources[i]];
        }
        const recentAll = await storage.getNews(undefined, 30, 0);
        const usedImageUrls = recentAll
          .filter(a => a.source === "Diário do Carioca" && a.imageUrl)
          .map(a => a.imageUrl as string);

        const generated = await generateArticle({ category, sourceArticles: sources.slice(0, 8), usedImageUrls });

        await storage.createNewsArticle({
          title: generated.title, description: generated.description, content: generated.content,
          category: generated.category, tags: generated.tags, source: "Diário do Carioca",
          author: "Redação", imageUrl: generated.imageUrl, isManual: true, isDraft: false,
        });
        await storage.clearCache();
        results[category] = { status: "ok", title: generated.title, image: generated.imageUrl?.slice(0, 60) };
        console.log(`✅ [generate-all] ${category}: ${generated.title}`);
      } catch (err: any) {
        results[category] = { status: "error", error: err.message };
        console.error(`❌ [generate-all] ${category}:`, err.message);
      }
    }

    res.end(JSON.stringify(results, null, 2));
  });

  // ========== NEWSLETTER ROUTES ==========
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: "E-mail inválido" });
      }

      await storage.addNewsletterSubscriber(email);

      // Send welcome email via Resend (fire-and-forget — não bloqueia a resposta)
      sendWelcomeEmail(email).catch(err =>
        console.error("⚠️  Falha ao enviar e-mail de boas-vindas:", err.message)
      );

      res.json({ message: "Inscrito com sucesso" });
    } catch (error: any) {
      if (error?.message?.includes("unique") || error?.code === "23505") {
        return res.status(409).json({ error: "E-mail já cadastrado" });
      }
      console.error("Error subscribing to newsletter:", error);
      res.status(500).json({ error: "Erro ao processar inscrição" });
    }
  });

  // ========== DIAGNOSTIC ROUTES ==========
  app.get("/api/ping", (req, res) => {
    res.json({ status: "ok", message: "pong", timestamp: new Date().toISOString() });
  });

  app.get("/api/debug", async (req, res) => {
    const result: any = {
      timestamp: new Date().toISOString(),
      env: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: !!process.env.VERCEL,
        DATABASE_URL: process.env.DATABASE_URL ? "SET" : "NOT SET",
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ? "SET" : "NOT SET",
      },
      db: { status: "unknown", articleCount: 0, error: null as any },
      rssCache: { size: rssMemCache.length },
    };
    try {
      const articles = await storage.getNews();
      result.db.status = "connected";
      result.db.articleCount = articles.length;
    } catch (err: any) {
      result.db.status = "error";
      result.db.error = err.message;
    }
    res.json(result);
  });

  // ========== AUTH ROUTES ==========

  // Register new user (DISABLED - Only admins can create accounts via CMS)
  // For initial setup, create first user directly in database or via admin script
  app.post("/api/auth/register", async (req, res) => {
    res.status(403).json({
      error: "Public registration is disabled. Contact administrator to create an account."
    });
  });

  // Login
  app.post("/api/auth/login", (req, res, next) => {
    try {
      const credentials = loginUserSchema.parse(req.body);

      passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) {
          return res.status(500).json({ error: "Authentication error" });
        }

        if (!user) {
          return res.status(401).json({ error: info?.message || "Invalid credentials" });
        }

        req.login(user, (loginErr) => {
          if (loginErr) {
            return res.status(500).json({ error: "Login failed" });
          }
          res.json(user);
        });
      })(req, res, next);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/auth/me", (req, res) => {
    if (req.isAuthenticated()) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // ========== NEWS ROUTES ==========

  // "Rio Agora" — articles published in the last 24h (fallback to most recent if none within 2h)
  app.get("/api/news/rio-agora", async (req, res) => {
    try {
      const all = await Promise.race([
        storage.getNews(),
        new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), 8000)),
      ]) as NewsArticle[];

      // First try: last 2 hours
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      let fresh = all.filter(a => new Date(a.publishedAt) >= twoHoursAgo);

      // Fallback: last 24 hours
      if (fresh.length === 0) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        fresh = all.filter(a => new Date(a.publishedAt) >= oneDayAgo);
      }

      // Ultimate fallback: just return the 8 most recent
      if (fresh.length === 0) {
        fresh = all.slice(0, 8);
      }

      res.json(fresh.slice(0, 8));
    } catch {
      try {
        let all = rssMemCache.length > 0 ? rssMemCache : await rssService.fetchAllRSSFeeds();
        if (all.length > 0) { rssMemCache = all; rssMemCacheTime = Date.now(); }
        res.json(all.slice(0, 8));
      } catch { res.json([]); }
    }
  });


  // Sync RSS feeds to database
  app.post("/api/news/sync-rss", async (req, res) => {
    try {
      const articles = await rssService.fetchAllRSSFeeds();
      const savedCount = await storage.saveNews(articles);

      // Clear cache after sync
      await storage.clearCache();

      res.json({
        total: articles.length,
        saved: savedCount,
        message: `Synchronized ${savedCount} articles from RSS feeds`,
      });
    } catch (error) {
      console.error("Error syncing RSS feeds:", error);
      res.status(500).json({ error: "Failed to sync RSS feeds" });
    }
  });

  // Get all news (with optional pagination: ?page=1&limit=12)
  app.get("/api/news", async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 12);
    const offset = (page - 1) * limit;
    try {
      const dbTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DB timeout")), 8000)
      );
      const all = await Promise.race([storage.getNews(), dbTimeout]) as NewsArticle[];
      if (all.length === 0) throw new Error("empty");
      const total = all.length;
      const paginated = all.slice(offset, offset + limit);
      res.json({ news: paginated, total, page, limit });
    } catch (err) {
      console.warn("⚠️ DB falhou para /api/news, tentando RSS:", err);
      try {
        // Se cache em memória estiver vazio, busca RSS em tempo real
        let all = rssMemCache.length > 0 ? rssMemCache : await rssService.fetchAllRSSFeeds();
        if (all.length > 0) { rssMemCache = all; rssMemCacheTime = Date.now(); }
        const total = all.length;
        const paginated = all.slice(offset, offset + limit);
        res.json({ news: paginated, total, page, limit });
      } catch (rssErr) {
        console.error("❌ RSS também falhou:", rssErr);
        res.json({ news: [], total: 0, page, limit });
      }
    }
  });

  // Get news by category (with pagination)
  app.get("/api/news/category/:category", async (req, res) => {
    const category = req.params.category as NewsCategory;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 12);
    const offset = (page - 1) * limit;
    const sortBy = (req.query.sort as string) === "popular" ? "popular" : "recentes";
    try {
      const dbTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DB timeout")), 5000)
      );
      let all = await Promise.race([storage.getNews(category), dbTimeout]) as NewsArticle[];
      if (all.length === 0) throw new Error("empty");
      if (sortBy === "popular") all = all.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
      const total = all.length;
      res.json({ news: all.slice(offset, offset + limit), total, page, limit });
    } catch {
      let all = await getNewsFromRSSCache(category);
      const total = all.length;
      res.json({ news: all.slice(offset, offset + limit), total, page, limit });
    }
  });

  // Most read articles
  app.get("/api/news/most-read", async (req, res) => {
    const limit = Math.min(10, parseInt(req.query.limit as string) || 5);
    try {
      const news = await storage.getMostRead(limit);
      res.json(news);
    } catch {
      const all = await getNewsFromRSSCache();
      res.json(all.sort((a, b) => (b.views ?? 0) - (a.views ?? 0)).slice(0, limit));
    }
  });

  // Increment article views — accepts id via POST body to avoid Express path parsing issues
  app.post("/api/news/increment-view", async (req, res) => {
    try {
      const { id } = req.body;
      if (!id || typeof id !== 'string') return res.json({ ok: false, reason: 'missing id' });
      await storage.incrementViews(id);
      res.json({ ok: true });
    } catch (err: any) {
      res.json({ ok: false, reason: err?.message });
    }
  });

  // Legacy: Increment article views via URL param (kept for compatibility)
  app.post("/api/news/:id/view", async (req, res) => {
    try {
      let id = req.params.id;
      try { id = decodeURIComponent(id); } catch { /* use raw */ }
      await storage.incrementViews(id);
      res.json({ ok: true });
    } catch (err: any) {
      res.json({ ok: false, reason: err?.message });
    }
  });

  // Articles by tag
  app.get("/api/news/tag/:tag", async (req, res) => {
    const tag = req.params.tag.toLowerCase();
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 12);
    const offset = (page - 1) * limit;
    try {
      const all = await Promise.race([
        storage.getNews(),
        new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), 5000)),
      ]) as NewsArticle[];
      const filtered = all.filter(a => a.tags?.includes(tag));
      res.json({ news: filtered.slice(offset, offset + limit), total: filtered.length, page, limit, tag });
    } catch {
      const all = await getNewsFromRSSCache();
      const filtered = all.filter(a => a.tags?.includes(tag));
      res.json({ news: filtered.slice(offset, offset + limit), total: filtered.length, page, limit, tag });
    }
  });

  // Search news from database
  app.get("/api/news/search", async (req, res) => {
    try {
      const query = req.query.q as string;

      if (!query || query.length < 3) {
        return res.json([]);
      }

      const news = await storage.getNews();

      const searchTerm = query.toLowerCase();
      const results = news.filter(article =>
        article.title.toLowerCase().includes(searchTerm) ||
        article.description.toLowerCase().includes(searchTerm)
      );

      res.json(results);
    } catch (error) {
      console.error("Error searching news:", error);
      res.status(500).json({ error: "Failed to search news" });
    }
  });

  // Get RSS articles (separate from NewsData.io) - MUST be before /:id route
  app.get("/api/news/rss", async (req, res) => {
    try {
      const articles = await rssService.fetchAllRSSFeeds();
      res.json(articles);
    } catch (error) {
      console.error("Error fetching RSS articles:", error);
      res.status(500).json({ error: "Failed to fetch RSS articles" });
    }
  });

  // Get specific news article by ID from database (with RSS cache fallback)
  app.get("/api/news/:id", async (req, res) => {
    try {
      const id = decodeURIComponent(req.params.id);

      // 1. Try the database first
      const article = await storage.getNewsById(id);
      if (article) return res.json(article);

      // 2. Try in-memory RSS cache
      const fromCache = rssMemCache.find(a => a.id === id || a.url === id);
      if (fromCache) return res.json(fromCache);

      // 3. Try fetching RSS live (covers cold-start on Vercel where cache is empty)
      try {
        const liveArticles = await rssService.fetchAllRSSFeeds();
        rssMemCache = liveArticles;
        rssMemCacheTime = Date.now();
        const fromLive = liveArticles.find(a => a.id === id || a.url === id);
        if (fromLive) return res.json(fromLive);
      } catch { /* continue to 404 */ }

      return res.status(404).json({ error: "Article not found" });
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  // ========== ADMIN NEWS ROUTES (Protected) ==========

  // Get all news including drafts (for admin panel)
  app.get("/api/admin/news", requireAuth, async (req, res) => {
    try {
      const news = await storage.getAllNewsForAdmin();
      res.json(news);
    } catch (error) {
      console.error("Error fetching admin news:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // Create new article
  app.post("/api/admin/news", requireAuth, async (req, res) => {
    try {
      const articleData = createNewsArticleSchema.parse(req.body);
      const article = await storage.createNewsArticle(articleData);

      // Clear cache after creating
      await storage.clearCache();

      res.status(201).json(article);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      console.error("Error creating article:", error);
      res.status(500).json({ error: "Failed to create article" });
    }
  });

  // Update article
  app.put("/api/admin/news/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const articleData = updateNewsArticleSchema.parse(req.body);

      const article = await storage.updateNewsArticle(id, articleData);

      // Clear cache after updating
      await storage.clearCache();

      res.json(article);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validation error", details: error.errors });
      }
      if (error.message === "Article not found after update") {
        return res.status(404).json({ error: "Article not found" });
      }
      console.error("Error updating article:", error);
      res.status(500).json({ error: "Failed to update article" });
    }
  });

  // Delete article
  app.delete("/api/admin/news/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteNewsArticle(id);

      // Clear cache after deleting
      await storage.clearCache();

      res.json({ message: "Article deleted successfully" });
    } catch (error) {
      console.error("Error deleting article:", error);
      res.status(500).json({ error: "Failed to delete article" });
    }
  });

  // AI article generation
  app.post("/api/admin/ai/generate", requireAuth, async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "GEMINI_API_KEY não configurada no servidor" });
      }

      const { category, tone, focus, articleIds } = req.body as {
        category: string;
        tone?: string;
        focus?: string;
        articleIds?: string[];
      };

      if (!category) {
        return res.status(400).json({ error: "Categoria é obrigatória" });
      }

      // Fetch source articles from DB
      let sourceArticles: NewsArticle[];
      if (articleIds && articleIds.length > 0) {
        const fetched = await Promise.all(articleIds.map((id) => storage.getNewsById(id)));
        sourceArticles = fetched.filter(Boolean) as NewsArticle[];
      } else {
        sourceArticles = await storage.getNews(category as NewsCategory, 10, 0);
        if (sourceArticles.length < 2) {
          // Fallback: get from RSS cache
          sourceArticles = await storage.getNews(undefined, 15, 0);
          sourceArticles = sourceArticles.filter((a) => a.category === category).slice(0, 8);
        }
      }

      if (sourceArticles.length === 0) {
        return res.status(400).json({ error: "Nenhum artigo disponível para a categoria selecionada" });
      }

      const generated = await generateArticle({
        category,
        sourceArticles,
        tone: tone as any,
        focus,
      });

      res.json(generated);
    } catch (error: any) {
      console.error("AI generation error:", error);
      res.status(500).json({ error: error.message || "Falha na geração com IA" });
    }
  });

  // Save AI-generated article
  app.post("/api/admin/ai/save", requireAuth, async (req, res) => {
    try {
      const { title, description, content, category, tags, isDraft, imageUrl } = req.body;

      if (!title || !description || !category) {
        return res.status(400).json({ error: "Campos obrigatórios: title, description, category" });
      }

      const article = await storage.createNewsArticle({
        title,
        description,
        content,
        category,
        tags: tags || [],
        source: "Diário do Carioca",
        author: (req.user as any)?.name || "Redação",
        imageUrl,
        isManual: true,
        isDraft: isDraft ?? true,
      });

      await storage.clearCache();
      res.status(201).json(article);
    } catch (error: any) {
      console.error("AI save error:", error);
      res.status(500).json({ error: "Falha ao salvar artigo" });
    }
  });

  // Get all events (with caching)
  app.get("/api/events", async (req, res) => {
    try {
      let events = await storage.getCachedEvents();

      if (!events) {
        events = await eventsService.fetchEvents();
        await storage.setCachedEvents(events);
      }

      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Get events by category
  app.get("/api/events/category/:category", async (req, res) => {
    try {
      const category = req.params.category as NewsCategory;
      const events = await eventsService.fetchEvents(category);
      res.json(events);
    } catch (error) {
      console.error("Error fetching events by category:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Get recent matches
  app.get("/api/sports/matches", async (req, res) => {
    try {
      const matches = await sportsService.getRecentMatches();
      res.set("Cache-Control", "public, max-age=1800"); // 30 min browser cache
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  // Get next matches
  app.get("/api/sports/next", async (req, res) => {
    try {
      const matches = await sportsService.getNextMatches();
      res.set("Cache-Control", "public, max-age=1800");
      res.json(matches);
    } catch (error) {
      console.error("Error fetching next matches:", error);
      res.status(500).json({ error: "Failed to fetch next matches" });
    }
  });

  // Get team info
  app.get("/api/sports/team/:teamName", async (req, res) => {
    try {
      const teamName = req.params.teamName as "flamengo" | "fluminense" | "vasco" | "botafogo";
      const team = await sportsService.getTeamInfo(teamName);

      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }

      res.json(team);
    } catch (error) {
      console.error("Error fetching team info:", error);
      res.status(500).json({ error: "Failed to fetch team info" });
    }
  });

  // Fix Gazeta do Povo in Esportes
  app.post("/api/news/fix-gazeta", async (req, res) => {
    try {
      const { db } = await import("../db/index.js");
      const { newsArticles } = await import("../shared/schema.js");
      const { like, and, eq } = await import("drizzle-orm");

      await db.delete(newsArticles)
        .where(
          and(
            like(newsArticles.source, "%Gazeta do Povo%"),
            eq(newsArticles.category, "esportes")
          )
        );

      await storage.clearCache();
      res.json({ message: "Deleted Gazeta do Povo from Esportes" });
    } catch (error) {
      console.error("Error fixing gazeta:", error);
      res.status(500).json({ error: "Failed to fix" });
    }
  });

  // Clear cache endpoint (for manual refresh)
  app.post("/api/cache/clear", async (req, res) => {
    try {
      await storage.clearCache();
      res.json({ message: "Cache cleared successfully" });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  // Recategorize all articles in DB using improved categorization logic
  app.post("/api/news/recategorize", async (req, res) => {
    try {
      const { db } = await import("../db/index.js");
      const { newsArticles } = await import("../shared/schema.js");
      const { detectCategory } = await import("../shared/categorization.js");
      const { eq } = await import("drizzle-orm");

      const allArticles = await db.select().from(newsArticles);
      let changed = 0;
      const changes: { title: string; from: string; to: string }[] = [];

      for (const article of allArticles) {
        const newCategory = detectCategory(
          article.title,
          article.description,
          article.source
        );

        if (newCategory !== article.category) {
          await db.update(newsArticles)
            .set({ category: newCategory })
            .where(eq(newsArticles.id, article.id));
          changes.push({
            title: article.title.substring(0, 80),
            from: article.category,
            to: newCategory,
          });
          changed++;
        }
      }

      await storage.clearCache();
      res.json({
        message: `Recategorized ${changed} articles out of ${allArticles.length}`,
        total: allArticles.length,
        changed,
        changes: changes.slice(0, 30), // Show first 30 changes
      });
    } catch (error) {
      console.error("Error recategorizing:", error);
      res.status(500).json({ error: "Failed to recategorize" });
    }
  });

  // Sync external events (Sympla + Eventbrite)
  app.post("/api/events/sync", async (req, res) => {
    try {
      const result = await eventsService.syncExternalEvents();
      res.json({
        message: "Events synced successfully",
        ...result,
      });
    } catch (error) {
      console.error("Error syncing external events:", error);
      res.status(500).json({ error: "Failed to sync events" });
    }
  });


  // API Health Check and Diagnostics
  app.get("/api/health", async (req, res) => {
    // Check cache status WITHOUT triggering cache population
    const cacheStatus = {
      news_cached: !!(await storage.getCachedNews()),
      events_cached: !!(await storage.getCachedEvents()),
    };

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      apis: {
        newsdata: {
          name: "NewsData.io",
          configured: !!process.env.NEWSDATA_API_KEY,
          status: "unknown",
          message: "",
        },
        thesportsdb: {
          name: "TheSportsDB",
          configured: true,
          status: "unknown",
          message: "",
        },
        sympla: {
          name: "Sympla",
          configured: !!process.env.SYMPLA_API_KEY,
          status: process.env.SYMPLA_API_KEY ? "configured" : "not_configured",
          message: process.env.SYMPLA_API_KEY ? "API key configured" : "API key not configured",
        },
        eventbrite: {
          name: "Eventbrite",
          configured: !!process.env.EVENTBRITE_API_KEY,
          status: process.env.EVENTBRITE_API_KEY ? "configured" : "not_configured",
          message: process.env.EVENTBRITE_API_KEY ? "API key configured" : "API key not configured",
        },
        rss_feeds: {
          name: "RSS Feeds (6 portais do Rio)",
          configured: true,
          status: "active",
          message: "RSS feeds available - G1 Rio, O Globo, O Dia, Extra, Diário do Rio, Veja Rio",
        },
        gemini: {
          name: "Google Gemini AI",
          configured: !!process.env.GEMINI_API_KEY,
          status: "unknown",
          message: "",
        },
      },
      cache: cacheStatus,
    };

    // Test NewsData.io
    try {
      if (process.env.NEWSDATA_API_KEY) {
        const axios = (await import("axios")).default;
        const response = await axios.get("https://newsdata.io/api/1/news", {
          params: {
            apikey: process.env.NEWSDATA_API_KEY,
            country: "br",
            language: "pt",
            q: "brasil",
          },
          timeout: 5000,
        });

        if (response.status === 200 && response.data?.results) {
          diagnostics.apis.newsdata.status = "active";
          diagnostics.apis.newsdata.message = `API working - ${response.data.results.length} results`;
        }
      } else {
        diagnostics.apis.newsdata.status = "not_configured";
        diagnostics.apis.newsdata.message = "API key not configured - using mock data";
      }
    } catch (error: any) {
      diagnostics.apis.newsdata.status = "error";
      if (error.response?.status === 401) {
        diagnostics.apis.newsdata.message = "API key invalid or expired (401 Unauthorized)";
      } else {
        diagnostics.apis.newsdata.message = `Error: ${error.message}`;
      }
    }

    // Test TheSportsDB
    try {
      const axios = (await import("axios")).default;
      const response = await axios.get("https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=Flamengo", {
        timeout: 5000,
      });

      if (response.status === 200 && response.data?.teams) {
        diagnostics.apis.thesportsdb.status = "active";
        diagnostics.apis.thesportsdb.message = "API working - free tier active";
      }
    } catch (error: any) {
      diagnostics.apis.thesportsdb.status = "error";
      diagnostics.apis.thesportsdb.message = `Error: ${error.message}`;
    }

    // Test Gemini
    try {
      if (process.env.GEMINI_API_KEY) {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent("ping");
        const text = result.response.text();
        
        if (text) {
          diagnostics.apis.gemini.status = "active";
          diagnostics.apis.gemini.message = "API working correctly";
        }
      } else {
        diagnostics.apis.gemini.status = "not_configured";
        diagnostics.apis.gemini.message = "GEMINI_API_KEY missing in environment";
      }
    } catch (error: any) {
      diagnostics.apis.gemini.status = "error";
      diagnostics.apis.gemini.message = `Error: ${error.message}`;
    }

    res.json(diagnostics);
  });

  // ========== RSS FEED ==========
  app.get("/rss.xml", async (req, res) => {
    try {
      const articles = await storage.getNews(undefined, 50, 0);
      const baseUrl = process.env.SITE_URL || `${req.protocol}://${req.get("host")}`;

      const items = articles.map(a => {
        const pubDate = new Date(a.publishedAt).toUTCString();
        const link = `${baseUrl}/noticia/${encodeURIComponent(a.id)}`;
        const desc = (a.description || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const title = a.title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `
    <item>
      <title>${title}</title>
      <link>${link}</link>
      <description>${desc}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${link}</guid>
      <category>${a.category}</category>
      ${a.author ? `<author>${a.author}</author>` : ""}
      ${a.imageUrl ? `<enclosure url="${a.imageUrl}" type="image/jpeg"/>` : ""}
    </item>`;
      }).join("");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Diário do Carioca</title>
    <link>${baseUrl}</link>
    <description>Portal de Notícias do Rio de Janeiro — Cultura, Esportes, Shows e mais.</description>
    <language>pt-BR</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${baseUrl}/favicon.ico</url>
      <title>Diário do Carioca</title>
      <link>${baseUrl}</link>
    </image>${items}
  </channel>
</rss>`;

      res.set("Content-Type", "application/rss+xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=900"); // 15 min
      res.send(xml);
    } catch (error) {
      res.status(500).send("Erro ao gerar RSS");
    }
  });

  // ========== SITEMAP ==========
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const articles = await storage.getNews(undefined, 500, 0);
      const baseUrl = process.env.SITE_URL || "https://odiariocarioca.com.br";

      const categories = ["geral", "esportes", "cultura", "shows", "gastronomia", "internacional", "vida-noturna", "cidade"];

      type SitemapUrl = { loc: string; priority: string; changefreq: string; lastmod?: string };

      const staticUrls: SitemapUrl[] = [
        { loc: baseUrl,              priority: "1.0", changefreq: "hourly" },
        { loc: `${baseUrl}/eventos`, priority: "0.7", changefreq: "hourly" },
        ...categories.map(c => ({
          loc: `${baseUrl}/categoria/${c}`,
          priority: "0.8",
          changefreq: "hourly",
        })),
      ];

      const articleUrls: SitemapUrl[] = articles.map(a => ({
        loc:        `${baseUrl}/noticia/${encodeURIComponent(a.id)}`,
        lastmod:    new Date(a.publishedAt).toISOString().split("T")[0],
        priority:   "0.9",
        changefreq: "weekly",
      }));

      const allUrls = [...staticUrls, ...articleUrls];

      const urlEntries = allUrls.map(u =>
        `  <url>\n    <loc>${u.loc}</loc>\n${u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : ""}    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
      ).join("\n");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (error) {
      res.status(500).send("Erro ao gerar sitemap");
    }
  });

  // Serve article pages with injected canonical + OG tags (Vercel production)
  app.get("/noticia/:slug(*)", async (req: Request, res: Response) => {
    try {
      const { injectArticleOG } = await import("./vite.js");
      const articleId = decodeURIComponent(req.params.slug);
      const candidates = [
        path.resolve(process.cwd(), "dist", "index.html"),
        path.resolve(fileURLToPath(import.meta.url), "..", "..", "dist", "index.html"),
      ];
      let html = "";
      for (const p of candidates) {
        if (fs.existsSync(p)) { html = await fs.promises.readFile(p, "utf-8"); break; }
      }
      if (!html) return res.status(404).send("Not found");
      html = await injectArticleOG(html, articleId, req);
      res.status(200).set({ "Content-Type": "text/html" }).send(html);
    } catch {
      res.status(500).send("Error");
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
