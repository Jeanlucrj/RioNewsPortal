import { Link } from "wouter";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { NewsArticle } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NewsCardProps {
  article: NewsArticle;
  featured?: boolean;
  onClick?: () => void;
}

const categoryLabels: Record<string, string> = {
  cultura: "Cultura",
  esportes: "Esportes",
  shows: "Shows",
  "vida-noturna": "Vida Noturna",
  geral: "Geral",
};

const categoryColors: Record<string, string> = {
  cultura: "bg-purple-600 text-white",
  esportes: "bg-green-600 text-white",
  shows: "bg-pink-600 text-white",
  "vida-noturna": "bg-blue-600 text-white",
  geral: "bg-gray-600 text-white",
};

export function NewsCard({ article, featured = false, onClick }: NewsCardProps) {
  const timeAgo = formatDistanceToNow(new Date(article.publishedAt), {
    addSuffix: true,
    locale: ptBR,
  });

  const content = (
    <div
      className="bg-[#1a1f2e] rounded-lg overflow-hidden hover-elevate active-elevate-2 transition-all duration-200 flex flex-col h-full"
      data-testid={`card-article-${article.id}`}
    >
      <div className="p-5 flex flex-col flex-1">
        <Badge
          className={`mb-3 uppercase text-xs font-bold tracking-wide self-start ${categoryColors[article.category]}`}
          data-testid={`badge-category-${article.id}`}
        >
          {categoryLabels[article.category]}
        </Badge>
        
        <h3
          className="text-white font-semibold mb-3 line-clamp-2 text-lg leading-snug"
          data-testid={`text-title-${article.id}`}
        >
          {article.title}
        </h3>
        
        <p
          className="text-gray-400 text-sm mb-4 line-clamp-3 flex-1"
          data-testid={`text-description-${article.id}`}
        >
          {article.description}
        </p>
        
        <div className="flex items-center gap-3 text-xs text-gray-500 pt-2 border-t border-gray-700/50">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {timeAgo}
          </span>
          {article.source && (
            <span className="truncate" data-testid={`text-source-${article.id}`}>
              {article.source}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Link href={`/noticia/${article.id}`} onClick={onClick} data-testid={`link-article-${article.id}`}>
      {content}
    </Link>
  );
}
