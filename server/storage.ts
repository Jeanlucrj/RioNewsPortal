import { type User, type InsertUser, type NewsArticle, type Event, type NewsCategory, type EventDB, type InsertEvent } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "../db/index.js";
import { events as eventsTable } from "@shared/schema";
import { eq } from "drizzle-orm";

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
  
  saveEvents(events: Event[]): Promise<number>;
  getEvents(category?: NewsCategory): Promise<Event[]>;
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
    const user: User = { ...insertUser, id };
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
    const allEvents = await db.select().from(eventsTable);
    
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
}

export const storage = new MemStorage();
