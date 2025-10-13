import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { NewsCard } from "@/components/news-card";
import { EventCard } from "@/components/event-card";
import type { NewsArticle, Event } from "@shared/schema";
import { Newspaper, Calendar as CalendarIcon } from "lucide-react";

export default function Home() {
  const { data: news, isLoading: newsLoading } = useQuery<NewsArticle[]>({
    queryKey: ["/api", "news"],
  });

  const { data: events, isLoading: eventsLoading } = useQuery<Event[]>({
    queryKey: ["/api", "events"],
  });

  const featuredNews = news?.[0];
  const recentNews = news?.slice(1, 7) || [];

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
            {featuredNews && (
              <section className="relative h-[500px] mb-12">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: featuredNews.imageUrl
                      ? `url(${featuredNews.imageUrl})`
                      : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--chart-2)) 100%)",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
                </div>
                <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-end pb-12">
                  <div className="max-w-3xl">
                    <span
                      className="inline-block px-3 py-1 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wide rounded mb-4"
                      data-testid="badge-featured-category"
                    >
                      Destaque
                    </span>
                    <h2
                      className="text-4xl md:text-5xl lg:text-6xl font-bold font-serif text-white mb-4 leading-tight"
                      data-testid="text-featured-title"
                    >
                      {featuredNews.title}
                    </h2>
                    <p
                      className="text-lg text-white/90 mb-6 line-clamp-3"
                      data-testid="text-featured-description"
                    >
                      {featuredNews.description}
                    </p>
                    <a
                      href={featuredNews.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-md font-semibold hover-elevate active-elevate-2"
                      data-testid="button-read-featured"
                    >
                      Ler Notícia
                    </a>
                  </div>
                </div>
              </section>
            )}

            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex items-center gap-3 mb-6">
                <Newspaper className="h-6 w-6 text-primary" />
                <h2 className="text-3xl font-bold font-serif">Notícias Recentes</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentNews.map((article) => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>
            </section>

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
