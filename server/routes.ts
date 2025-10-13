import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { NewsService } from "./services/news-service";
import { SportsService } from "./services/sports-service";
import { EventsService } from "./services/events-service";
import type { NewsCategory } from "@shared/schema";

const newsService = new NewsService();
const sportsService = new SportsService();
const eventsService = new EventsService();

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all news (with caching)
  app.get("/api/news", async (req, res) => {
    try {
      let news = await storage.getCachedNews();
      
      if (!news) {
        news = await newsService.fetchNews();
        await storage.setCachedNews(news);
      }
      
      res.json(news);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // Get news by category
  app.get("/api/news/category/:category", async (req, res) => {
    try {
      const category = req.params.category as NewsCategory;
      const news = await newsService.fetchNews(category);
      res.json(news);
    } catch (error) {
      console.error("Error fetching news by category:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // Search news
  app.get("/api/news/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.length < 3) {
        return res.json([]);
      }

      let news = await storage.getCachedNews();
      
      if (!news) {
        news = await newsService.fetchNews();
        await storage.setCachedNews(news);
      }

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

  // Get specific news article by ID
  app.get("/api/news/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let news = await storage.getCachedNews();
      
      if (!news) {
        news = await newsService.fetchNews();
        await storage.setCachedNews(news);
      }

      const article = news.find(a => a.id === id);
      
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }

      res.json(article);
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "Failed to fetch article" });
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

  const httpServer = createServer(app);

  return httpServer;
}
