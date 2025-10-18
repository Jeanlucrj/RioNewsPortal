import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { NewsCard } from "@/components/news-card";
import type { NewsArticle, NewsCategory } from "@shared/schema";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const categoryConfig: Record<NewsCategory, { label: string; color: string; gradient: string }> = {
  cultura: {
    label: "Cultura",
    color: "bg-cultura",
    gradient: "from-purple-600 to-purple-400",
  },
  esportes: {
    label: "Esportes",
    color: "bg-esportes",
    gradient: "from-green-600 to-green-400",
  },
  shows: {
    label: "Shows",
    color: "bg-shows",
    gradient: "from-pink-600 to-pink-400",
  },
  gastronomia: {
    label: "Gastronomia",
    color: "bg-gastronomia",
    gradient: "from-orange-600 to-orange-400",
  },
  internacional: {
    label: "Internacional",
    color: "bg-internacional",
    gradient: "from-blue-600 to-blue-400",
  },
  geral: {
    label: "Geral",
    color: "bg-primary",
    gradient: "from-primary to-chart-2",
  },
};

export default function Category() {
  const [, params] = useRoute("/categoria/:category");
  const category = params?.category as NewsCategory;
  const [filter, setFilter] = useState<"recentes" | "populares">("recentes");

  const { data: news, isLoading } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news/category", category],
    enabled: !!category,
  });

  const config = category ? categoryConfig[category] : categoryConfig.geral;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className={`bg-gradient-to-r ${config.gradient} py-16`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1
              className="text-4xl md:text-5xl font-bold font-serif text-white mb-2"
              data-testid="text-category-title"
            >
              {config.label}
            </h1>
            <p className="text-white/90 text-lg">
              As últimas notícias sobre {config.label.toLowerCase()} no Rio de Janeiro
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <div className="flex gap-2">
              <Button
                variant={filter === "recentes" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("recentes")}
                data-testid="button-filter-recentes"
              >
                Mais Recentes
              </Button>
              <Button
                variant={filter === "populares" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("populares")}
                data-testid="button-filter-populares"
              >
                Mais Lidas
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-80 bg-muted rounded-md animate-pulse" />
              ))}
            </div>
          ) : news && news.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground" data-testid="text-no-news">
                Nenhuma notícia encontrada nesta categoria
              </p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
