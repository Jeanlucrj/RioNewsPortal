import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Zap } from "lucide-react";
import type { NewsArticle } from "@shared/schema";

export function BreakingNewsTicker() {
  const { data } = useQuery<{ news: NewsArticle[] }>({
    queryKey: ["/api/news", { page: 1, limit: 10 }],
    queryFn: () => fetch("/api/news?page=1&limit=10").then((r) => r.json()),
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
  });

  const headlines = data?.news?.slice(0, 8) ?? [];

  if (headlines.length === 0) return null;

  // Duplicate for seamless loop
  const items = [...headlines, ...headlines];

  return (
    <div className="bg-primary text-primary-foreground overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-stretch">
        {/* Label */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white shrink-0 z-10 text-xs font-bold uppercase tracking-wide">
          <Zap className="h-3 w-3 fill-current" />
          Últimas
        </div>

        {/* Scrolling track */}
        <div className="relative overflow-hidden flex-1">
          <div className="flex animate-ticker whitespace-nowrap">
            {items.map((article, i) => (
              <Link
                key={`${article.id}-${i}`}
                href={`/noticia/${encodeURIComponent(article.id)}`}
                className="inline-flex items-center gap-2 px-6 py-1.5 text-xs hover:underline shrink-0"
              >
                <span className="w-1 h-1 rounded-full bg-primary-foreground/60 shrink-0" />
                <span className="truncate max-w-xs">{article.title}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
