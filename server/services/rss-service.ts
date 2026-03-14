import Parser from "rss-parser";
import type { NewsArticle, NewsCategory } from "../../shared/schema.js";
import { detectCategory } from "../../shared/categorization.js";
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
  {
    name: "GloboEsporte",
    url: "https://ge.globo.com/rss/ge/futebol/",
    category: "esportes",
  },
  {
    name: "O Globo - Cultura",
    url: "https://oglobo.globo.com/cultura/rss.xml",
    category: "cultura",
  },
  {
    name: "Agenda Cultural Rio de Janeiro",
    url: "https://agendaculturalriodejaneiro.blogspot.com/feeds/posts/default",
    category: "shows",
  },
  {
    name: "Veja Rio - Comer & Beber",
    url: "https://vejario.abril.com.br/comer-e-beber/feed/",
    category: "gastronomia",
  },
  {
    name: "G1 - Pop & Arte",
    url: "https://g1.globo.com/dynamo/pop-arte/rss2.xml",
    category: "gastronomia",
  },
  {
    name: "G1 - Turismo e Viagem",
    url: "https://g1.globo.com/dynamo/turismo-e-viagem/rss2.xml",
    category: "gastronomia",
  },
  {
    name: "BBC Brasil",
    url: "https://feeds.bbci.co.uk/portuguese/rss.xml",
    category: "internacional",
  },
  {
    name: "DW Brasil",
    url: "https://rss.dw.com/xml/rss-br-all",
    category: "internacional",
  },
  {
    name: "G1 - Mundo",
    url: "https://g1.globo.com/dynamo/mundo/rss2.xml",
    category: "internacional",
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

  async fetchRSSFeed(feedUrl: string, feedName: string, _feedCategory?: NewsCategory): Promise<NewsArticle[]> {
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
          const description = this.stripHtml(item.contentSnippet || htmlContent);

          // Detect category using new hybrid logic
          // Pass categories array if available
          const externalCategories = Array.isArray(item.categories) ? item.categories : [];
          let category: NewsCategory = detectCategory(
            item.title,
            description,
            feedName,
            externalCategories
          );

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
            description: description.substring(0, 300),
            content: description,
            imageUrl,
            category,
            source: feedName,
            publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
            url: item.link,
            author: item.creator || item.author,
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
