import { type User, type InsertUser, type NewsArticle, type Event, type NewsCategory, type EventDB, type InsertEvent } from "../shared/schema.js";
import { randomUUID } from "crypto";
import { db } from "../db/index.js";
import { events as eventsTable, newsArticles as newsArticlesTable } from "../shared/schema.js";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getCachedNews(): Promise<NewsArticle[] | null>;
  setCachedNews(news: NewsArticle[]): Promise<void>;
  getCachedEvents(): Promise<Event[] | null>;
  setCachedEvents(events: Event[]): Promise<void>;
  clearCache(): Promise<void>;
  clearEventsCache(): Promise<void>;
  clearAllEvents(): Promise<number>;

  saveEvents(events: Event[]): Promise<number>;
  getEvents(category?: NewsCategory): Promise<Event[]>;

  saveNews(articles: NewsArticle[]): Promise<number>;
  getNews(category?: NewsCategory): Promise<NewsArticle[]>;
  getNewsById(id: string, includeDrafts?: boolean): Promise<NewsArticle | undefined>;
  getAllNewsForAdmin(category?: NewsCategory): Promise<NewsArticle[]>;
  createNewsArticle(article: any): Promise<NewsArticle>;
  updateNewsArticle(id: string, article: any): Promise<NewsArticle>;
  deleteNewsArticle(id: string): Promise<boolean>;
  cleanupOldNews(daysOld?: number): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private newsCache: NewsArticle[] | null = null;
  private eventsCache: Event[] | null = null;
  private newsCacheTime: number = 0;
  private eventsCacheTime: number = 0;
  private readonly CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  constructor() {
    this.users = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
      role: insertUser.role || 'editor',
      isActive: insertUser.isActive ?? true,
    };
    this.users.set(id, user);
    return user;
  }

  async getCachedNews(): Promise<NewsArticle[] | null> {
    const now = Date.now();
    if (this.newsCache && (now - this.newsCacheTime) < this.CACHE_DURATION) {
      return this.newsCache;
    }
    return null;
  }

  async setCachedNews(news: NewsArticle[]): Promise<void> {
    this.newsCache = news;
    this.newsCacheTime = Date.now();
  }

  async getCachedEvents(): Promise<Event[] | null> {
    const now = Date.now();
    if (this.eventsCache && (now - this.eventsCacheTime) < this.CACHE_DURATION) {
      return this.eventsCache;
    }
    return null;
  }

  async setCachedEvents(events: Event[]): Promise<void> {
    this.eventsCache = events;
    this.eventsCacheTime = Date.now();
  }

  async clearCache(): Promise<void> {
    this.newsCache = null;
    this.eventsCache = null;
    this.newsCacheTime = 0;
    this.eventsCacheTime = 0;
  }

  async clearEventsCache(): Promise<void> {
    this.eventsCache = null;
    this.eventsCacheTime = 0;
  }

  async saveEvents(events: Event[]): Promise<number> {
    let savedCount = 0;

    // Upsert events to database (update if exists, insert if not)
    for (const event of events) {
      const eventData = {
        id: event.id,
        title: event.title,
        description: event.description,
        imageUrl: event.imageUrl,
        category: event.category,
        date: new Date(event.date),
        time: event.time,
        venue: event.venue,
        ticketUrl: event.ticketUrl,
        price: event.price,
        source: event.id.startsWith('sympla-') ? 'sympla' :
          event.id.startsWith('eventbrite-') ? 'eventbrite' : 'manual',
        isManual: false,
      };

      try {
        // Use upsert to insert or update
        await db.insert(eventsTable)
          .values(eventData)
          .onConflictDoUpdate({
            target: eventsTable.id,
            set: {
              title: eventData.title,
              description: eventData.description,
              imageUrl: eventData.imageUrl,
              category: eventData.category,
              date: eventData.date,
              time: eventData.time,
              venue: eventData.venue,
              ticketUrl: eventData.ticketUrl,
              price: eventData.price,
              source: eventData.source,
            },
          });
        savedCount++;
      } catch (error) {
        console.error(`Error saving event ${event.id}:`, error);
      }
    }

    return savedCount;
  }

  async getEvents(category?: NewsCategory): Promise<Event[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allEvents = await db.select().from(eventsTable)
      .where(sql`${eventsTable.date} >= ${today.toISOString()}`)
      .orderBy(eventsTable.date);

    const mappedEvents: Event[] = allEvents.map((event: EventDB) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      imageUrl: event.imageUrl || undefined,
      category: event.category as NewsCategory,
      date: event.date.toISOString(),
      time: event.time || undefined,
      venue: event.venue || undefined,
      ticketUrl: event.ticketUrl || undefined,
      price: event.price || undefined,
    }));

    if (category && category !== 'geral') {
      return mappedEvents.filter(e => e.category === category);
    }

    return mappedEvents;
  }

  async cleanupOldEvents(daysOld: number = 2): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await db.execute(
      sql`DELETE FROM ${eventsTable} 
          WHERE "date" < ${cutoffDate.toISOString()} 
          RETURNING id`
    );

    const deletedCount = Array.isArray(result) ? result.length : 0;

    if (deletedCount > 0) {
      console.log(`🗑️  Deleted ${deletedCount} events older than ${daysOld} days`);
      await this.clearEventsCache();
    }

    return deletedCount;
  }

  async clearAllEvents(): Promise<number> {
    const result = await db.delete(eventsTable);
    await this.clearEventsCache();
    console.log("🗑️  Cleared all events from database");
    return 0;
  }

  async saveNews(articles: NewsArticle[]): Promise<number> {
    let savedCount = 0;

    for (const article of articles) {
      const newsData = {
        id: article.id,
        title: article.title,
        description: article.description,
        content: article.content || null,
        imageUrl: article.imageUrl,
        category: article.category,
        source: article.source,
        publishedAt: new Date(article.publishedAt),
        url: article.url,
        author: article.author || null,
        isManual: false,
        isDraft: false,
      };

      try {
        await db.insert(newsArticlesTable)
          .values(newsData)
          .onConflictDoUpdate({
            target: newsArticlesTable.id,
            set: {
              title: newsData.title,
              description: newsData.description,
              content: newsData.content,
              imageUrl: newsData.imageUrl,
              category: newsData.category,
              source: newsData.source,
              publishedAt: newsData.publishedAt,
              url: newsData.url,
              author: newsData.author,
            },
          });
        savedCount++;
      } catch (error) {
        console.error(`Error saving news article ${article.id}:`, error);
      }
    }

    return savedCount;
  }

  async getNews(category?: NewsCategory): Promise<NewsArticle[]> {
    let query = db.select().from(newsArticlesTable)
      .where(eq(newsArticlesTable.isDraft, false))
      .orderBy(desc(newsArticlesTable.publishedAt));
    const allNews = await query;

    // Sort to prioritize news with images (for homepage)
    // Articles with imageUrl come first, then sorted by publishedAt
    const sortedNews = allNews.sort((a: any, b: any) => {
      if (a.imageUrl && !b.imageUrl) return -1;
      if (!a.imageUrl && b.imageUrl) return 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    const mappedNews: NewsArticle[] = sortedNews.map((article: any) => ({
      id: article.id,
      title: article.title,
      description: article.description,
      content: article.content || undefined,
      imageUrl: article.imageUrl || undefined,
      category: article.category as NewsCategory,
      source: article.source,
      publishedAt: article.publishedAt.toISOString(),
      url: article.url,
      author: article.author || undefined,
    }));

    if (category) {
      return mappedNews.filter(n => n.category === category);
    }

    return mappedNews;
  }

  async getNewsById(id: string, includeDrafts: boolean = false): Promise<NewsArticle | undefined> {
    let query = db.select().from(newsArticlesTable).where(eq(newsArticlesTable.id, id));

    const result = await query;
    if (result.length === 0) return undefined;

    const article = result[0];

    if (!includeDrafts && article.isDraft) {
      return undefined;
    }

    return {
      id: article.id,
      title: article.title,
      description: article.description,
      content: article.content || undefined,
      imageUrl: article.imageUrl || undefined,
      category: article.category as NewsCategory,
      source: article.source,
      publishedAt: article.publishedAt.toISOString(),
      url: article.url,
      author: article.author || undefined,
    };
  }

  async createNewsArticle(articleData: any): Promise<NewsArticle> {
    const id = randomUUID();
    const newsData = {
      id,
      title: articleData.title,
      description: articleData.description,
      content: articleData.content || null,
      imageUrl: articleData.imageUrl || null,
      category: articleData.category,
      source: articleData.source || 'Rio Notícias',
      publishedAt: articleData.publishedAt ? new Date(articleData.publishedAt) : new Date(),
      url: articleData.url || '',
      author: articleData.author || null,
      isManual: true,
      isDraft: articleData.isDraft || false,
    };

    await db.insert(newsArticlesTable).values(newsData);

    return {
      id: newsData.id,
      title: newsData.title,
      description: newsData.description,
      content: newsData.content || undefined,
      imageUrl: newsData.imageUrl || undefined,
      category: newsData.category as NewsCategory,
      source: newsData.source,
      publishedAt: newsData.publishedAt.toISOString(),
      url: newsData.url,
      author: newsData.author || undefined,
    };
  }

  async getAllNewsForAdmin(category?: NewsCategory): Promise<any[]> {
    let query = db.select().from(newsArticlesTable).orderBy(desc(newsArticlesTable.publishedAt));
    const allNews = await query;

    const mappedNews = allNews.map((article: any) => ({
      id: article.id,
      title: article.title,
      description: article.description,
      content: article.content || undefined,
      imageUrl: article.imageUrl || undefined,
      category: article.category as NewsCategory,
      source: article.source,
      publishedAt: article.publishedAt.toISOString(),
      url: article.url,
      author: article.author || undefined,
      isDraft: article.isDraft,
      isManual: article.isManual,
    }));

    if (category) {
      return mappedNews.filter((n: any) => n.category === category);
    }

    return mappedNews;
  }

  async updateNewsArticle(id: string, articleData: any): Promise<NewsArticle> {
    const existing = await db.select().from(newsArticlesTable).where(eq(newsArticlesTable.id, id));
    if (existing.length === 0) {
      throw new Error('Article not found');
    }

    const current = existing[0];
    const updateData: any = {};

    if (articleData.title !== undefined) updateData.title = articleData.title;
    if (articleData.description !== undefined) updateData.description = articleData.description;
    if (articleData.content !== undefined) updateData.content = articleData.content || null;
    if (articleData.imageUrl !== undefined) updateData.imageUrl = articleData.imageUrl || null;
    if (articleData.category !== undefined) updateData.category = articleData.category;
    if (articleData.source !== undefined) updateData.source = articleData.source;
    if (articleData.url !== undefined) updateData.url = articleData.url;
    if (articleData.author !== undefined) updateData.author = articleData.author || null;
    if (articleData.isDraft !== undefined) updateData.isDraft = articleData.isDraft;
    if (articleData.publishedAt !== undefined) updateData.publishedAt = new Date(articleData.publishedAt);

    if (Object.keys(updateData).length === 0) {
      return this.getNewsById(id, true) as Promise<NewsArticle>;
    }

    await db.update(newsArticlesTable)
      .set(updateData)
      .where(eq(newsArticlesTable.id, id));

    const updated = await this.getNewsById(id, true);
    if (!updated) {
      throw new Error('Article not found after update');
    }
    return updated;
  }

  async deleteNewsArticle(id: string): Promise<boolean> {
    const result = await db.delete(newsArticlesTable).where(eq(newsArticlesTable.id, id));
    return true;
  }

  async cleanupOldNews(daysOld: number = 15): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Delete only non-manual articles older than cutoff date
    const result = await db.execute(
      sql`DELETE FROM ${newsArticlesTable} 
          WHERE "published_at" < ${cutoffDate.toISOString()} 
          AND "is_manual" = false
          RETURNING id`
    );

    const deletedCount = Array.isArray(result) ? result.length : 0;

    if (deletedCount > 0) {
      console.log(`🗑️  Deleted ${deletedCount} news articles older than ${daysOld} days`);
      await this.clearCache();
    }

    return deletedCount;
  }
}

export const storage = new MemStorage();
