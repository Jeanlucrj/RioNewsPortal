import { type User, type InsertUser, type NewsArticle, type Event, type NewsCategory } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getCachedNews(): Promise<NewsArticle[] | null>;
  setCachedNews(news: NewsArticle[]): Promise<void>;
  getCachedEvents(): Promise<Event[] | null>;
  setCachedEvents(events: Event[]): Promise<void>;
  clearCache(): Promise<void>;
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
}

export const storage = new MemStorage();
