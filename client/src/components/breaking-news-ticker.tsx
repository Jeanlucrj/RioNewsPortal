import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Zap } from "lucide-react";
import type { NewsArticle } from "@shared/schema";

interface BreakingNewsTickerProps {
  category?: string;        // if set, fetch ONLY this category
  excludeCategory?: string; // if set, exclude this category from general feed
  label?: string;
}

export function BreakingNewsTicker({ category, excludeCategory, label = "Últimas" }: BreakingNewsTickerProps) {
  const [headlines, setHeadlines] = useState<NewsArticle[]>([]);

  useEffect(() => {
    const url = category
      ? `/api/news/category/${category}?page=1&limit=15`
      : `/api/news?page=1&limit=30`; // fetch more to have enough after filtering

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        let articles: NewsArticle[] = data?.news ?? data ?? [];
        if (!Array.isArray(articles)) articles = [];

        // Exclude specific category if requested (e.g. exclude sports from header)
        if (excludeCategory) {
          articles = articles.filter(a => a.category !== excludeCategory);
        }

        if (articles.length > 0) {
          setHeadlines(articles.slice(0, 8));
        }
      })
      .catch(() => {/* fail silently */});
  }, [category, excludeCategory]);

  if (headlines.length === 0) return null;

  // Duplicate for seamless loop
  const items = [...headlines, ...headlines];

  return (
    <div className="bg-primary text-primary-foreground overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-stretch">
        {/* Label */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white shrink-0 z-10 text-xs font-bold uppercase tracking-wide">
          <Zap className="h-3 w-3 fill-current" />
          {label}
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
