import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { NewsCard } from "@/components/news-card";
import { Button } from "@/components/ui/button";
import type { NewsArticle } from "@shared/schema";
import { Tag, ChevronLeft, ChevronRight } from "lucide-react";

interface TagPage {
  news: NewsArticle[];
  total: number;
  page: number;
  limit: number;
  tag: string;
}

const PAGE_SIZE = 12;

export default function TagPage() {
  const [, params] = useRoute("/tag/:tag");
  const tag = params?.tag ?? "";
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery<TagPage>({
    queryKey: ["/api/news/tag", tag, page],
    queryFn: () => fetch(`/api/news/tag/${encodeURIComponent(tag)}?page=${page}&limit=${PAGE_SIZE}`).then(r => r.json()),
    enabled: !!tag,
  });

  const news = data?.news ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="bg-gradient-to-r from-slate-700 to-slate-500 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 text-white">
              <Tag className="h-6 w-6" />
              <h1 className="text-3xl md:text-4xl font-bold font-serif capitalize">#{tag}</h1>
            </div>
            <p className="text-white/80 mt-2">{total} {total === 1 ? "notícia encontrada" : "notícias encontradas"}</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => <div key={i} className="h-80 bg-muted rounded-md animate-pulse" />)}
            </div>
          ) : news.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map(a => <NewsCard key={a.id} article={a} />)}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-12">
              Nenhuma notícia encontrada para <strong>#{tag}</strong>
            </p>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button variant="outline" size="sm" disabled={page === 1}
                onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
              <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages}
                onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                Próxima <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
