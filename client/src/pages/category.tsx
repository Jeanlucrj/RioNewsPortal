import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { NewsCard } from "@/components/news-card";
import { Button } from "@/components/ui/button";
import type { NewsArticle, NewsCategory } from "@shared/schema";
import { Filter, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 12;

interface NewsPage {
  news: NewsArticle[];
  total: number;
  page: number;
  limit: number;
}

const categoryConfig: Record<NewsCategory, { label: string; gradient: string }> = {
  cultura: { label: "Cultura", gradient: "from-purple-600 to-purple-400" },
  esportes: { label: "Esportes", gradient: "from-green-600 to-green-400" },
  shows: { label: "Shows", gradient: "from-pink-600 to-pink-400" },
  gastronomia: { label: "Gastronomia", gradient: "from-orange-600 to-orange-400" },
  internacional: { label: "Internacional", gradient: "from-blue-600 to-blue-400" },
  "vida-noturna": { label: "Vida Noturna", gradient: "from-purple-600 to-indigo-400" },
  cidade: { label: "Cidade", gradient: "from-cyan-600 to-cyan-400" },
  geral: { label: "Geral", gradient: "from-primary to-chart-2" },
};

export default function Category() {
  const [, params] = useRoute("/categoria/:category");
  const category = params?.category as NewsCategory;
  const [filter, setFilter] = useState<"recentes" | "populares">("recentes");
  const [page, setPage] = useState(1);

  const { data: newsPage, isLoading } = useQuery<NewsPage>({
    queryKey: ["/api/news/category", category, filter, page],
    queryFn: () =>
      fetch(`/api/news/category/${category}?page=${page}&limit=${PAGE_SIZE}&sort=${filter === "populares" ? "popular" : "recentes"}`).then((r) => r.json()),
    enabled: !!category,
  });

  const news = newsPage?.news ?? [];
  const total = newsPage?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const config = category ? categoryConfig[category] : categoryConfig.geral;

  const handleFilter = (f: "recentes" | "populares") => {
    setFilter(f);
    setPage(1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className={`bg-gradient-to-r ${config.gradient} py-10`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl md:text-5xl font-bold font-serif text-white mb-2" data-testid="text-category-title">
              {config.label}
            </h1>
            <p className="text-white/90 text-lg">
              As últimas notícias sobre {config.label.toLowerCase()} no Rio de Janeiro
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filter bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <div className="flex gap-2">
                <Button
                  variant={filter === "recentes" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilter("recentes")}
                  data-testid="button-filter-recentes"
                >
                  Mais Recentes
                </Button>
                <Button
                  variant={filter === "populares" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleFilter("populares")}
                  data-testid="button-filter-populares"
                >
                  Mais Lidas
                </Button>
              </div>
            </div>
            {total > 0 && (
              <span className="text-sm text-muted-foreground">
                {total} {total === 1 ? "notícia" : "notícias"}
              </span>
            )}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-80 bg-muted rounded-md animate-pulse" />
              ))}
            </div>
          ) : news.length > 0 ? (
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                  return (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className="w-9"
                      onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    >
                      {p}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                disabled={page === totalPages}
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
