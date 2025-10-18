import axios from "axios";
import type { NewsArticle, NewsCategory } from "@shared/schema";
import { randomUUID } from "crypto";

interface RSSFeed {
  name: string;
  url: string;
  category?: NewsCategory;
}

const RSS_FEEDS: RSSFeed[] = [
  {
    name: "G1 Rio de Janeiro",
    url: "https://g1.globo.com/rss/g1/rio-de-janeiro/",
    category: "geral",
  },
  {
    name: "O Globo Rio",
    url: "https://oglobo.globo.com/rio/rss.xml",
    category: "geral",
  },
  {
    name: "Jornal O Dia",
    url: "https://odia.ig.com.br/_conteudo/rio-de-janeiro/rss.xml",
    category: "geral",
  },
  {
    name: "Extra",
    url: "https://extra.globo.com/noticias/rio-de-janeiro/rss.xml",
    category: "geral",
  },
  {
    name: "Diário do Rio",
    url: "https://diariodorio.com/feed/",
    category: "geral",
  },
  {
    name: "Veja Rio",
    url: "https://vejario.abril.com.br/feed/",
    category: "geral",
  },
  {
    name: "Gazeta do Povo - Últimas Notícias",
    url: "https://www.gazetadopovo.com.br/feed/rss/ultimas-noticias.xml",
    category: "geral",
  },
  {
    name: "Gazeta do Povo - Cultura",
    url: "https://www.gazetadopovo.com.br/feed/rss/cultura.xml",
    category: "cultura",
  },
];

const RSS2JSON_API = "https://api.rss2json.com/v1/api.json";

const categoryKeywords: Record<NewsCategory, string[]> = {
  cultura: ["cultura", "arte", "museu", "teatro", "cinema", "exposição", "cultural", "artista", "galeria", "peça", "espetáculo", "livro", "autor"],
  esportes: ["futebol", "flamengo", "fluminense", "vasco", "botafogo", "esporte", "jogo", "campeonato", "copa", "brasileirão", "gol", "técnico", "jogador", "partida", "time", "clube"],
  shows: ["show", "música", "festival", "concerto", "banda", "musical", "rock", "samba", "palco", "turnê", "cantor", "cantora", "apresentação musical"],
  "vida-noturna": ["balada", "boate", "vida noturna", "noitada", "open bar", "happy hour", "pista de dança", "drinks", "bares e restaurantes", "restaurantes e bares", "gastronomia", "culinária", "degustação", "comer & beber", "comer e beber", "guia de restaurantes"],
  geral: [],
};

export class RSSService {
  private detectCategory(text: string): NewsCategory {
    const lowerText = text.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (category === "geral") continue;
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category as NewsCategory;
      }
    }
    
    return "geral";
  }

  private stripHtml(html: string): string {
    // Remove HTML tags
    return html.replace(/<[^>]*>/g, "").trim();
  }

  async fetchRSSFeed(feedUrl: string, feedName: string): Promise<NewsArticle[]> {
    try {
      const response = await axios.get(RSS2JSON_API, {
        params: {
          rss_url: feedUrl,
          api_key: "", // Free tier
          count: 10,
        },
        timeout: 20000, // 20 seconds for slower feeds like Gazeta do Povo
      });

      if (!response.data || !response.data.items) {
        console.log(`No items found in RSS feed: ${feedName}`);
        return [];
      }

      const articles: NewsArticle[] = response.data.items
        .filter((item: any) => item.title && item.link)
        .map((item: any) => {
          const description = this.stripHtml(item.description || item.content || "");
          const category = this.detectCategory(item.title + " " + description);
          
          return {
            id: item.guid || item.link || randomUUID(),
            title: item.title,
            description: description.substring(0, 300),
            content: description,
            imageUrl: item.enclosure?.link || item.thumbnail,
            category,
            source: feedName,
            publishedAt: item.pubDate || new Date().toISOString(),
            url: item.link,
            author: item.author,
          };
        });

      console.log(`Fetched ${articles.length} articles from ${feedName}`);
      return articles;
    } catch (error: any) {
      console.error(`Error fetching RSS feed ${feedName}:`, error.message);
      return [];
    }
  }

  async fetchAllRSSFeeds(): Promise<NewsArticle[]> {
    const allArticles: NewsArticle[] = [];

    for (const feed of RSS_FEEDS) {
      const articles = await this.fetchRSSFeed(feed.url, feed.name);
      allArticles.push(...articles);
    }

    return allArticles;
  }

  async syncRSSFeeds(): Promise<{ total: number; bySource: Record<string, number> }> {
    console.log("Starting RSS feeds sync...");
    
    const articles = await this.fetchAllRSSFeeds();
    
    // Count by source
    const bySource: Record<string, number> = {};
    for (const article of articles) {
      bySource[article.source] = (bySource[article.source] || 0) + 1;
    }

    console.log(`Synced ${articles.length} total articles from RSS feeds`);
    
    return {
      total: articles.length,
      bySource,
    };
  }
}
