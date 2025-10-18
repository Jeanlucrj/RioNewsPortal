import Parser from "rss-parser";
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
    name: "Rolling Stone Brasil",
    url: "https://rollingstone.uol.com.br/feed/",
    category: "shows",
  },
  {
    name: "Omelete",
    url: "https://www.omelete.com.br/feed",
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
];

const categoryKeywords: Record<NewsCategory, string[]> = {
  esportes: ["brasileirão", "série a do", "série b do", "campeonato brasileiro", "libertadores", "copa do brasil", "futebol", "escalação do", "palpite para o jogo", "dicas e palpites", "onde assistir ao vivo", "gol do", "atacante do", "zagueiro", "meia do", "volante do", "técnico do time", "jogador do time", "vitória do", "derrota do", "empate entre", "maracanã terá", "estádio do", "flamengo x", "fluminense x", "vasco x", "botafogo x", "palmeiras x", "corinthians x", "time terá desfalque", "suspenso para"],
  shows: ["show de", "festival de música", "concerto", "banda", "musical", "rock", "samba", "palco", "turnê", "cantor", "cantora", "apresentação musical", "álbum", "single", "música nova", "setlist", "ingressos para o show"],
  cultura: ["cinema", "filme", "série de tv", "série da", "teatro", "peça teatral", "exposição", "museu", "galeria de arte", "literatura", "livro", "autor", "escritor", "artista plástico", "ator", "atriz", "documentário", "estreia nos cinemas", "streaming"],
  gastronomia: ["restaurante", "restaurantes", "comer e beber", "comer & beber", "gastronomia", "culinária", "chef", "cardápio", "pratos do", "crítica gastronômica", "melhores restaurantes", "degustação", "vinhos", "bar inaugura", "bares do rio", "receita de"],
  geral: [],
};

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

  private detectCategory(text: string): NewsCategory {
    const lowerText = text.toLowerCase();
    
    // Blacklist: Se contém estes termos, NÃO é esporte
    const sportsBlacklist = [
      "federal fluminense",
      "universidade fluminense",
      "uff",
      "federal do rio",
      "ufrj",
      "uerj",
    ];
    
    const hasBlacklistedTerm = sportsBlacklist.some(term => lowerText.includes(term));
    
    // Ordem de prioridade: esportes primeiro para evitar conflitos
    const priorityOrder: NewsCategory[] = ["esportes", "shows", "cultura", "gastronomia"];
    
    for (const category of priorityOrder) {
      // Pula esportes se tem termo blacklisted
      if (category === "esportes" && hasBlacklistedTerm) {
        continue;
      }
      
      const keywords = categoryKeywords[category];
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return category;
      }
    }
    
    return "geral";
  }

  private stripHtml(html: string): string {
    // Remove HTML tags
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
        .slice(0, 10) // Limit to 10 articles per feed
        .filter((item: any) => item.title && item.link)
        .map((item: any) => {
          const description = this.stripHtml(item.contentSnippet || item.content || item.summary || "");
          const detectedCategory = this.detectCategory(item.title + " " + description);
          
          // Use feed category as fallback when no keywords match (detected = "geral")
          const category = (detectedCategory === "geral" && feedCategory) ? feedCategory : detectedCategory;
          
          // Extract image URL from various sources
          let imageUrl = undefined;
          if (item.enclosure?.url) {
            imageUrl = item.enclosure.url;
          } else if (item['media:content']?.$ && item['media:content'].$.url) {
            imageUrl = item['media:content'].$.url;
          } else if (item['media:thumbnail']?.$ && item['media:thumbnail'].$.url) {
            imageUrl = item['media:thumbnail'].$.url;
          }
          
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
      const articles = await this.fetchRSSFeed(feed.url, feed.name, feed.category);
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
