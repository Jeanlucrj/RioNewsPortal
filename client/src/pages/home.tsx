import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { NewsCard } from "@/components/news-card";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import type { NewsArticle, Event } from "@shared/schema";
import { Newspaper, Calendar as CalendarIcon, TrendingUp, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { getDefaultImage } from "@/lib/image-service";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const PAGE_SIZE = 9;

interface NewsPage {
  news: NewsArticle[];
  total: number;
  page: number;
  limit: number;
}

export default function Home() {
  const [page, setPage] = useState(1);
  const [heroIndex, setHeroIndex] = useState(0);

  const { data: newsPage, isLoading: newsLoading } = useQuery<NewsPage>({
    queryKey: ["/api/news", page],
    queryFn: () => fetch(`/api/news?page=${page}&limit=${PAGE_SIZE}`).then((r) => r.json()),
  });

  const { data: mostRead } = useQuery<NewsArticle[]>({
    queryKey: ["/api/news/most-read"],
    queryFn: () => fetch("/api/news/most-read?limit=5").then((r) => r.json()),
  });

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const news = newsPage?.news ?? [];
  const total = newsPage?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Hero pool: articles from our newsroom first, then RSS — only on page 1
  const heroPool = page === 1
    ? [
        ...news.filter(a => a.source === "Diário do Carioca" || a.isManual),
        ...news.filter(a => a.source !== "Diário do Carioca" && !a.isManual),
      ].slice(0, 5)
    : [];
  const featuredNews = heroPool[heroIndex % Math.max(heroPool.length, 1)];
  const gridNews = page === 1 ? news.slice(1) : news;

  useEffect(() => {
    if (heroPool.length <= 1) return;
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroPool.length);
    }, 50000);
    return () => clearInterval(timer);
  }, [heroPool.length]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {newsLoading ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="h-96 bg-muted rounded-md animate-pulse mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-muted rounded-md animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Hero — only on first page */}
            {featuredNews && (
              <section className="mb-12 px-4 sm:px-6 lg:px-8">
                <div className="relative h-[520px] max-w-7xl mx-auto rounded-xl overflow-hidden">
                  <img
                    src={featuredNews.imageUrl || getDefaultImage(featuredNews.category, featuredNews.title, featuredNews.description)}
                    alt={featuredNews.title}
                    className="absolute inset-0 w-full h-full object-cover object-center"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="relative h-full flex items-end pb-12 px-10">
                    <div className="max-w-3xl">
                      <span className="inline-block px-3 py-1 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wide rounded mb-4">
                        {(featuredNews.source === "Diário do Carioca" || featuredNews.isManual) ? "Nossa Redação" : "Destaque"}
                      </span>
                      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold font-serif text-white mb-4 leading-tight line-clamp-3">
                        {featuredNews.title}
                      </h2>
                      <p className="text-base md:text-lg text-white/90 mb-6 line-clamp-2">
                        {featuredNews.description}
                      </p>
                      <Link
                        href={`/noticia/${encodeURIComponent(featuredNews.id)}`}
                        className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-md font-semibold hover:bg-primary/90 transition-colors"
                      >
                        Ler Notícia
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Main content + Mais Lidas sidebar */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex flex-col lg:flex-row gap-8">

                {/* News grid */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-6">
                    <Newspaper className="h-6 w-6 text-primary" />
                    <h2 className="text-3xl font-bold font-serif">Notícias Recentes</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gridNews.map((article) => (
                      <NewsCard key={article.id} article={article} />
                    ))}
                  </div>

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

                {/* Sidebar — Mais Lidas */}
                {mostRead && mostRead.length > 0 && (
                  <aside className="lg:w-72 shrink-0">
                    <div className="sticky top-20">
                      <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="h-5 w-5 text-red-500" />
                        <h3 className="text-xl font-bold font-serif">Mais Lidas</h3>
                      </div>
                      <div className="space-y-4">
                        {mostRead.map((article, idx) => (
                          <Link
                            key={article.id}
                            href={`/noticia/${encodeURIComponent(article.id)}`}
                            className="flex gap-3 group"
                          >
                            <span className="text-3xl font-bold text-muted-foreground/30 leading-none w-8 shrink-0 mt-1">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-snug line-clamp-3 group-hover:text-primary transition-colors">
                                {article.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Eye className="h-3 w-3" />
                                <span>{(article.views ?? 0).toLocaleString("pt-BR")} leituras</span>
                                <span>·</span>
                                <span>{formatDistanceToNow(new Date(article.publishedAt), { addSuffix: true, locale: ptBR })}</span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </aside>
                )}
              </div>
            </div>

            {/* Events */}
            {events && events.length > 0 && (
              <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center gap-3 mb-6">
                  <CalendarIcon className="h-6 w-6 text-primary" />
                  <h2 className="text-3xl font-bold font-serif">Agenda de Eventos</h2>
                </div>
                {eventsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-32 bg-muted rounded-md animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {events.slice(0, 6).map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
