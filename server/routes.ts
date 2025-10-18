import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import passport from "./passport-config";
import { authService } from "./services/auth-service";
import { storage } from "./storage";
import { NewsService } from "./services/news-service";
import { SportsService } from "./services/sports-service";
import { EventsService } from "./services/events-service";
import { RSSService } from "./services/rss-service";
import { registerUserSchema, loginUserSchema, createNewsArticleSchema, updateNewsArticleSchema, type NewsCategory } from "@shared/schema";

const newsService = new NewsService();
const sportsService = new SportsService();
const eventsService = new EventsService();
const rssService = new RSSService();

// Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auto-sync RSS feeds on server start
  (async () => {
    try {
      console.log("🔄 Auto-syncing RSS feeds to database...");
      const articles = await rssService.fetchAllRSSFeeds();
      const savedCount = await storage.saveNews(articles);
      console.log(`✅ Synced ${savedCount} RSS articles to database`);
    } catch (error) {
      console.error("❌ Failed to auto-sync RSS feeds:", error);
    }
  })();

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

  // Get all news from database
  app.get("/api/news", async (req, res) => {
    try {
      const news = await storage.getNews();
      res.json(news);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // Get news by category from database
  app.get("/api/news/category/:category", async (req, res) => {
    try {
      const category = req.params.category as NewsCategory;
      const news = await storage.getNews(category);
      res.json(news);
    } catch (error) {
      console.error("Error fetching news by category:", error);
      res.status(500).json({ error: "Failed to fetch news" });
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

  // Get specific news article by ID from database
  app.get("/api/news/:id", async (req, res) => {
    try {
      const id = decodeURIComponent(req.params.id);
      const article = await storage.getNewsById(id);
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      res.json(article);
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

  // Get sports matches
  app.get("/api/sports/matches", async (req, res) => {
    try {
      const matches = await sportsService.getRecentMatches();
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ error: "Failed to fetch matches" });
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

    res.json(diagnostics);
  });

  const httpServer = createServer(app);

  return httpServer;
}
