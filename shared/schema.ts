import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default('editor'),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const registerUserSchema = insertUserSchema.pick({
  username: true,
  email: true,
  password: true,
  name: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
});

export const loginUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;

export const newsArticles = pgTable("news_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  content: text("content"),
  imageUrl: text("image_url"),
  category: text("category").notNull(),
  source: text("source").notNull(),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  url: text("url").notNull().default(''),
  author: text("author"),
  isManual: boolean("is_manual").notNull().default(false),
  isDraft: boolean("is_draft").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNewsArticleSchema = createInsertSchema(newsArticles).omit({
  id: true,
  createdAt: true,
});

export const createNewsArticleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  content: z.string().optional(),
  imageUrl: z.string().url("Invalid image URL").optional().or(z.literal('')),
  category: z.enum(['cultura', 'esportes', 'shows', 'gastronomia', 'internacional', 'geral', 'vida-noturna']),
  source: z.string().optional(),
  author: z.string().optional(),
  url: z.string().optional(),
  publishedAt: z.string().optional(),
  isDraft: z.boolean().optional(),
});

export const updateNewsArticleSchema = createNewsArticleSchema.partial();

export type InsertNewsArticle = z.infer<typeof insertNewsArticleSchema>;
export type NewsArticleDB = typeof newsArticles.$inferSelect;
export type CreateNewsArticle = z.infer<typeof createNewsArticleSchema>;
export type UpdateNewsArticle = z.infer<typeof updateNewsArticleSchema>;

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  category: text("category").notNull(),
  date: timestamp("date").notNull(),
  time: text("time"),
  venue: text("venue"),
  ticketUrl: text("ticket_url"),
  price: text("price"),
  source: text("source").notNull().default('manual'),
  isManual: boolean("is_manual").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type EventDB = typeof events.$inferSelect;

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").notNull(),
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email").notNull(),
  content: text("content").notNull(),
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
  isApproved: true,
});

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  subscribedAt: timestamp("subscribed_at").notNull().defaultNow(),
});

export const insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers).omit({
  id: true,
  subscribedAt: true,
});

export type InsertNewsletterSubscriber = z.infer<typeof insertNewsletterSubscriberSchema>;
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;

export type NewsCategory = 'cultura' | 'esportes' | 'shows' | 'gastronomia' | 'internacional' | 'geral' | 'vida-noturna';

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  content?: string;
  imageUrl?: string;
  category: NewsCategory;
  source: string;
  publishedAt: string;
  url: string;
  author?: string;
}

export interface SportTeam {
  id: string;
  name: string;
  badge?: string;
  stadium?: string;
  description?: string;
}

export interface SportMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  date: string;
  status: string;
  league?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  category: NewsCategory;
  date: string;
  time?: string;
  venue?: string;
  ticketUrl?: string;
  price?: string;
}

export const newsArticleSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  content: z.string().optional(),
  imageUrl: z.string().optional(),
  category: z.enum(['cultura', 'esportes', 'shows', 'gastronomia', 'internacional', 'geral', 'vida-noturna']),
  source: z.string(),
  publishedAt: z.string(),
  url: z.string(),
  author: z.string().optional(),
});

export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string().optional(),
  category: z.enum(['cultura', 'esportes', 'shows', 'gastronomia', 'internacional', 'geral', 'vida-noturna']),
  date: z.string(),
  time: z.string().optional(),
  venue: z.string().optional(),
  ticketUrl: z.string().optional(),
  price: z.string().optional(),
});
