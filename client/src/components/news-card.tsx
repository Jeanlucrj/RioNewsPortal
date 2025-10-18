import { Link } from "wouter";
import { Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
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
  cultura: "CULTURA",
  esportes: "ESPORTES",
  shows: "SHOWS",
  "vida-noturna": "VIDA NOTURNA",
  geral: "GERAL",
};

const categoryColors: Record<string, string> = {
  cultura: "bg-purple-500 hover:bg-purple-600 text-white border-0",
  esportes: "bg-green-500 hover:bg-green-600 text-white border-0",
  shows: "bg-pink-500 hover:bg-pink-600 text-white border-0",
  "vida-noturna": "bg-blue-500 hover:bg-blue-600 text-white border-0",
  geral: "bg-cyan-500 hover:bg-cyan-600 text-white border-0",
};

export function NewsCard({ article, featured = false, onClick }: NewsCardProps) {
  const timeAgo = formatDistanceToNow(new Date(article.publishedAt), {
    addSuffix: true,
    locale: ptBR,
  });

  const content = (
    <Card
      className={`overflow-hidden hover-elevate active-elevate-2 transition-all duration-200 ${featured ? "md:col-span-2 md:row-span-2" : ""}`}
      data-testid={`card-article-${article.id}`}
    >
      {article.imageUrl && (
        <div className={`relative overflow-hidden ${featured ? "h-96" : "h-48"}`}>
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full h-full object-cover"
            data-testid={`img-article-${article.id}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        </div>
      )}
      <div className="p-6">
        <Badge
          className={`mb-3 uppercase text-xs font-bold tracking-wider px-3 py-1 rounded-md ${categoryColors[article.category]}`}
          data-testid={`badge-category-${article.id}`}
        >
          {categoryLabels[article.category]}
        </Badge>
        <h3
          className={`font-semibold mb-2 line-clamp-2 ${featured ? "text-3xl font-serif" : "text-xl"}`}
          data-testid={`text-title-${article.id}`}
        >
          {article.title}
        </h3>
        <p
          className={`text-muted-foreground mb-4 ${featured ? "text-base line-clamp-3" : "text-sm line-clamp-2"}`}
          data-testid={`text-description-${article.id}`}
        >
          {article.description}
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {timeAgo}
          </span>
          {article.source && (
            <span className="truncate" data-testid={`text-source-${article.id}`}>
              {article.source}
            </span>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <Link href={`/noticia/${article.id}`} onClick={onClick} data-testid={`link-article-${article.id}`}>
      {content}
    </Link>
  );
}
