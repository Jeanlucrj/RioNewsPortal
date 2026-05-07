import Parser from "rss-parser";
import type { NewsArticle, NewsCategory } from "../../shared/schema.js";
import { detectCategory } from "../../shared/categorization.js";
import { extractTags } from "../../shared/tags.js";
import { randomUUID } from "crypto";

interface RSSFeed {
  name: string;
  url: string;
  category?: NewsCategory;
}

const RSS_FEEDS: RSSFeed[] = [
  // === GERAL ===
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
    name: "Veja Rio",
    url: "https://vejario.abril.com.br/feed/",
    category: "geral",
  },
  {
    name: "Gazeta do Povo",
    url: "https://www.gazetadopovo.com.br/feed/rss/ultimas-noticias.xml",
    category: "geral",
  },
  // === ESPORTES ===
  {
    name: "GloboEsporte",
    url: "https://ge.globo.com/rss/ge/futebol/",
    category: "esportes",
  },
  // === CULTURA ===
  {
    name: "O Globo - Cultura",
    url: "https://oglobo.globo.com/cultura/rss.xml",
    category: "cultura",
  },
  {
    name: "Gazeta do Povo - Cultura",
    url: "https://www.gazetadopovo.com.br/feed/rss/cultura.xml",
    category: "cultura",
  },
  // === SHOWS ===
  {
    name: "Agenda Cultural Rio de Janeiro",
    url: "https://agendaculturalriodejaneiro.blogspot.com/feeds/posts/default",
    category: "shows",
  },
  // === GASTRONOMIA ===
  {
    name: "Veja Rio - Comer & Beber",
    url: "https://vejario.abril.com.br/comer-e-beber/feed/",
    category: "gastronomia",
  },
  // === INTERNACIONAL ===
  {
    name: "BBC Brasil",
    url: "https://feeds.bbci.co.uk/portuguese/rss.xml",
    category: "internacional",
  },
  // === PREFEITURA DO RIO ===
  {
    name: "Prefeitura do Rio - Infraestrutura",
    url: "https://prefeitura.rio/categoria/infraestrutura/feed/",
    category: "geral",
  },
  {
    name: "Prefeitura do Rio - Saúde",
    url: "https://prefeitura.rio/categoria/noticias/saude/feed/",
    category: "geral",
  },
  {
    name: "Prefeitura do Rio - CET-Rio",
    url: "https://prefeitura.rio/categoria/noticias/cet-rio/feed",
    category: "geral",
  },
];

export class RSSService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      timeout: 20000, // 20 seconds
      customFields: {
        item: [
          ['media:content', 'media:content'],
          ['media:thumbnail', 'media:thumbnail'],
          ['enclosure', 'enclosure'],
        ],
      },
    });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "").trim();
  }

  async fetchRSSFeed(feedUrl: string, feedName: string, feedCategory?: NewsCategory): Promise<NewsArticle[]> {
    try {
      const feed = await this.parser.parseURL(feedUrl);

      if (!feed.items || feed.items.length === 0) {
        console.log(`No items found in RSS feed: ${feedName}`);
        return [];
      }

      const articles: NewsArticle[] = feed.items
        .filter((item: any) => item.title && item.link)
        .map((item: any) => {
          let htmlContent = item['content:encoded'] || item.content || item.summary || "";
          let description = this.stripHtml(item.contentSnippet || htmlContent);

          // Clean up RSS garbage text (e.g., Globo feeds)
          description = description
            .replace(/Initial plugin text/gi, "")
            .replace(/✅\s*Clique aqui para seguir o novo canal.*?WhatsApp/gi, "")
            .replace(/🗞️/g, "")
            .replace(/\s\+\s/g, " - ")
            .replace(/\s{2,}/g, " ")
            .replace(/^-\s*/, "")
            .trim();

          // If the feed has a specific category (not "geral"), use it directly
          // This avoids misclassification (e.g., GloboEsporte articles are always sports)
          let category: NewsCategory;
          if (feedCategory && feedCategory !== "geral") {
            category = feedCategory;
          } else {
            // Detect category using hybrid logic for general feeds
            const externalCategories = Array.isArray(item.categories) ? item.categories : [];
            category = detectCategory(
              item.title,
              description,
              feedName,
              externalCategories
            );
          }

          // Extract image URL from various sources
          let imageUrl = undefined;
          if (item.enclosure?.url && (item.enclosure.type?.startsWith('image/') || item.enclosure.url.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
            imageUrl = item.enclosure.url;
          } else if (item['media:content']?.$ && item['media:content'].$.url) {
            imageUrl = item['media:content'].$.url;
          } else if (item['media:thumbnail']?.$ && item['media:thumbnail'].$.url) {
            imageUrl = item['media:thumbnail'].$.url;
          } else {
            const imgMatch = /<img[^>]+src=(?:'|")([^'">]+)(?:'|")/i.exec(htmlContent);
            if (imgMatch && imgMatch[1]) {
              imageUrl = imgMatch[1];
            }
          }

          if (!imageUrl) return null;

          return {
            id: item.guid || item.link || randomUUID(),
            title: item.title,
            description: description.substring(0, 300) + (description.length > 300 ? "..." : ""),
            content: undefined,
            imageUrl,
            category,
            source: feedName,
            isManual: false,
            publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
            url: item.link,
            author: item.creator || item.author,
            tags: extractTags(item.title, description),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .slice(0, 10) as NewsArticle[];

      return articles;
    } catch (error: any) {
      console.error(`Error fetching RSS feed ${feedName}:`, error.message);
      return [];
    }
  }

  async fetchAllRSSFeeds(): Promise<NewsArticle[]> {
    const allArticles: NewsArticle[] = [];
    for (const feed of RSS_FEEDS) {
      const articles = await this.fetchRSSFeed(feed.url, feed.name, feed.category);
      allArticles.push(...articles);
    }
    return allArticles;
  }

  async syncRSSFeeds(): Promise<{ total: number; bySource: Record<string, number> }> {
    const articles = await this.fetchAllRSSFeeds();
    const bySource: Record<string, number> = {};
    for (const article of articles) {
      bySource[article.source] = (bySource[article.source] || 0) + 1;
    }
    return {
      total: articles.length,
      bySource,
    };
  }
}
