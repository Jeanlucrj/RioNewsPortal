import axios from "axios";
import type { NewsArticle, NewsCategory } from "@shared/schema";
import { randomUUID } from "crypto";

const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;
const NEWSDATA_BASE_URL = "https://newsdata.io/api/1/news";

const categoryKeywords: Record<NewsCategory, string[]> = {
  cultura: ["cultura", "arte", "museu", "teatro", "cinema", "exposição"],
  esportes: ["futebol", "flamengo", "fluminense", "vasco", "botafogo", "esporte", "jogo", "campeonato"],
  shows: ["show", "música", "festival", "concerto", "banda", "artista"],
  "vida-noturna": ["noite", "balada", "bar", "festa", "clube"],
  geral: [],
};

export class NewsService {
  async fetchNews(category?: NewsCategory): Promise<NewsArticle[]> {
    if (!NEWSDATA_API_KEY) {
      console.warn("NEWSDATA_API_KEY not found, returning mock data");
      return this.getMockNews(category);
    }

    try {
      const keywords = category && category !== "geral" 
        ? categoryKeywords[category].join(",")
        : undefined;

      const params: any = {
        apikey: NEWSDATA_API_KEY,
        country: "br",
        language: "pt",
        q: keywords || "rio de janeiro",
      };

      const response = await axios.get(NEWSDATA_BASE_URL, { params });

      // API successful - return results even if empty
      if (response.data && response.data.results) {
        // Filter out malformed articles (missing title or link) before mapping
        const validResults = response.data.results.filter((item: any) => 
          item.title && (item.link || item.article_id)
        );
        
        const articles = validResults.map((item: any) => this.mapToNewsArticle(item, category));
        
        // If API returned empty, return empty array (real-time data, just no results)
        // Only use mocks when API fails, not when it succeeds with no results
        if (articles.length === 0) {
          console.log(`API working but returned 0 valid results for category ${category}`);
        }
        
        return articles;
      }

      // API response malformed
      console.log(`Invalid API response for category ${category}, using mock data`);
      return this.getMockNews(category);
    } catch (error: any) {
      // Only use mocks on real errors (network, auth, etc)
      const status = error.response?.status;
      if (status === 401) {
        console.error("NewsData.io API key invalid or expired (401), using mock data");
      } else {
        console.error("Error fetching news from NewsData.io:", error.message || error);
      }
      return this.getMockNews(category);
    }
  }

  private mapToNewsArticle(apiData: any, category?: NewsCategory): NewsArticle {
    const detectedCategory = category || this.detectCategory(apiData.title + " " + apiData.description);
    
    return {
      id: apiData.article_id || randomUUID(),
      title: apiData.title || "Sem título",
      description: apiData.description || apiData.content || "Sem descrição",
      content: apiData.content,
      imageUrl: apiData.image_url,
      category: detectedCategory,
      source: apiData.source_name || apiData.source_id || "Fonte desconhecida",
      publishedAt: apiData.pubDate || new Date().toISOString(),
      url: apiData.link || "",
      author: apiData.creator?.[0],
    };
  }

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

  private getMockNews(category?: NewsCategory): NewsArticle[] {
    const mockData: NewsArticle[] = [
      {
        id: "1",
        title: "Cristo Redentor recebe iluminação especial para celebrar aniversário do Rio",
        description: "Monumento mais famoso da cidade ganha iluminação especial com cores da bandeira do Rio de Janeiro para comemorar os 459 anos da cidade.",
        imageUrl: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=800&q=80",
        category: "cultura",
        source: "G1 Rio",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        url: "",
      },
      {
        id: "2",
        title: "Flamengo vence clássico contra Fluminense no Maracanã",
        description: "Em partida emocionante, o Flamengo venceu o Fluminense por 2 a 1 no estádio lotado. Gols de Gabigol e Pedro garantiram a vitória rubro-negra.",
        imageUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
        category: "esportes",
        source: "ESPN",
        publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        url: "",
      },
      {
        id: "3",
        title: "Rock in Rio anuncia datas para edição de 2024",
        description: "Festival de música mais famoso do Brasil divulga calendário oficial. Evento acontecerá em setembro com atrações internacionais e nacionais.",
        imageUrl: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80",
        category: "shows",
        source: "Veja Rio",
        publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        url: "",
      },
      {
        id: "4",
        title: "Lapa recebe novo complexo gastronômico e cultural",
        description: "Tradicional bairro boêmio do Rio ganha novo espaço que promete revolucionar a vida noturna carioca com gastronomia e música ao vivo.",
        imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800&q=80",
        category: "vida-noturna",
        source: "O Globo Rio",
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        url: "",
      },
      {
        id: "5",
        title: "Museu do Amanhã inaugura exposição sobre sustentabilidade",
        description: "Nova mostra interativa explora o futuro do planeta e as ações necessárias para preservação ambiental.",
        imageUrl: "https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=800&q=80",
        category: "cultura",
        source: "Veja Rio",
        publishedAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
        url: "",
      },
      {
        id: "6",
        title: "Vasco anuncia reforços para próxima temporada",
        description: "Clube cruzmaltino confirma contratação de três jogadores para disputar Campeonato Brasileiro e Copa do Brasil.",
        imageUrl: "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&q=80",
        category: "esportes",
        source: "Lance!",
        publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        url: "",
      },
      {
        id: "7",
        title: "Festival de Jazz de Copacabana acontece neste fim de semana",
        description: "Evento gratuito reúne grandes nomes do jazz brasileiro e internacional na orla de Copacabana.",
        imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
        category: "shows",
        source: "G1 Rio",
        publishedAt: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
        url: "",
      },
      {
        id: "8",
        title: "Ipanema ganha novo rooftop bar com vista para o mar",
        description: "Estabelecimento oferece coquetéis autorais e gastronomia contemporânea com vista privilegiada para a praia de Ipanema.",
        imageUrl: "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=80",
        category: "vida-noturna",
        source: "Veja Rio",
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        url: "",
      },
    ];

    if (category && category !== "geral") {
      return mockData.filter(item => item.category === category);
    }

    return mockData;
  }
}
