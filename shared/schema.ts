import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type NewsCategory = 'cultura' | 'esportes' | 'shows' | 'vida-noturna' | 'geral';

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
  category: z.enum(['cultura', 'esportes', 'shows', 'vida-noturna', 'geral']),
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
  category: z.enum(['cultura', 'esportes', 'shows', 'vida-noturna', 'geral']),
  date: z.string(),
  time: z.string().optional(),
  venue: z.string().optional(),
  ticketUrl: z.string().optional(),
  price: z.string().optional(),
});
