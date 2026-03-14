import axios from "axios";
import type { NewsArticle, NewsCategory } from "../../shared/schema.js";
import { detectCategory } from "../../shared/categorization.js";
import { randomUUID } from "crypto";

const NEWSDATA_API_KEY = process.env.NEWSDATA_API_KEY;
const NEWSDATA_BASE_URL = "https://newsdata.io/api/1/news";

export class NewsService {
  async fetchNews(category?: NewsCategory): Promise<NewsArticle[]> {
    if (!NEWSDATA_API_KEY) {
      console.warn("NEWSDATA_API_KEY not found, returning mock data");
      return this.getMockNews(category);
    }

    try {
      const params: any = {
        apikey: NEWSDATA_API_KEY,
        country: "br",
        language: "pt",
        q: category && category !== "geral" ? category : "rio de janeiro",
      };

      const response = await axios.get(NEWSDATA_BASE_URL, { params });

      if (response.data && response.data.results) {
        const blacklist = ["rolling stone", "omelete", "revista rolling stone"];
        const validResults = response.data.results.filter((item: any) => {
          const hasTitleAndLink = item.title && (item.link || item.article_id);
          const source = (item.source_name || item.source_id || "").toLowerCase();
          const isBlacklisted = blacklist.some(term => source.includes(term));
          return hasTitleAndLink && !isBlacklisted;
        });

        const articles = validResults.map((item: any) => this.mapToNewsArticle(item, category));
        return articles;
      }

      return this.getMockNews(category);
    } catch (error: any) {
      console.error("Error fetching news from NewsData.io:", error.message || error);
      return this.getMockNews(category);
    }
  }

  private mapToNewsArticle(apiData: any, category?: NewsCategory): NewsArticle {
    // Pass API provided categories to help detection
    const externalCategories = Array.isArray(apiData.category) ? apiData.category :
      (typeof apiData.category === 'string' ? [apiData.category] : []);

    const detectedCategory = category || detectCategory(
      apiData.title || "",
      apiData.description || apiData.content || "",
      apiData.source_name || apiData.source_id,
      externalCategories
    );

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
