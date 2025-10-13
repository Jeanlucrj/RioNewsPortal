import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import type { NewsArticle } from "@shared/schema";
import { Calendar, ExternalLink, Share2, Facebook, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const categoryLabels: Record<string, string> = {
  cultura: "Cultura",
  esportes: "Esportes",
  shows: "Shows",
  "vida-noturna": "Vida Noturna",
  geral: "Geral",
};

const categoryColors: Record<string, string> = {
  cultura: "bg-cultura text-white",
  esportes: "bg-esportes text-white",
  shows: "bg-shows text-white",
  "vida-noturna": "bg-vida-noturna text-white",
  geral: "bg-primary text-primary-foreground",
};

export default function Article() {
  const [, params] = useRoute("/noticia/:id");
  const articleId = params?.id;

  const { data: article, isLoading } = useQuery<NewsArticle>({
    queryKey: ["/api", "news", articleId],
    enabled: !!articleId,
  });

  const handleShare = (platform: "facebook" | "twitter") => {
    if (!article) return;
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(article.title);

    if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="h-96 bg-muted rounded-md animate-pulse mb-8" />
          <div className="space-y-4">
            <div className="h-12 bg-muted rounded animate-pulse" />
            <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-center text-muted-foreground" data-testid="text-article-not-found">
            Notícia não encontrada
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(article.publishedAt), {
    addSuffix: true,
    locale: ptBR,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <nav className="text-sm text-muted-foreground mb-6" data-testid="breadcrumb">
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
            {" / "}
            <Link href={`/categoria/${article.category}`} className="hover:text-foreground">
              {categoryLabels[article.category]}
            </Link>
          </nav>

          <Badge
            className={`mb-4 uppercase text-xs font-bold tracking-wide ${categoryColors[article.category]}`}
            data-testid="badge-article-category"
          >
            {categoryLabels[article.category]}
          </Badge>

          <h1
            className="text-4xl md:text-5xl font-bold font-serif mb-6 leading-tight"
            data-testid="text-article-title"
          >
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {timeAgo}
            </span>
            {article.source && (
              <span data-testid="text-article-source">Fonte: {article.source}</span>
            )}
            {article.author && (
              <span data-testid="text-article-author">Por {article.author}</span>
            )}
          </div>

          {article.imageUrl && (
            <div className="mb-8 rounded-lg overflow-hidden">
              <img
                src={article.imageUrl}
                alt={article.title}
                className="w-full h-auto max-h-96 object-cover"
                data-testid="img-article-hero"
              />
            </div>
          )}

          <div className="flex items-center gap-2 mb-8 pb-8 border-b">
            <Share2 className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground mr-2">Compartilhar:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare("facebook")}
              data-testid="button-share-facebook"
            >
              <Facebook className="h-4 w-4 mr-2" />
              Facebook
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleShare("twitter")}
              data-testid="button-share-twitter"
            >
              <Twitter className="h-4 w-4 mr-2" />
              Twitter
            </Button>
          </div>

          <div className="prose prose-lg max-w-none mb-8">
            <p
              className="text-lg text-muted-foreground leading-relaxed"
              data-testid="text-article-description"
            >
              {article.description}
            </p>
            {article.content && (
              <div
                className="mt-6 leading-relaxed"
                data-testid="text-article-content"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
            )}
          </div>

          {article.url && article.url.startsWith("http") && (
            <div className="mt-8 p-6 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                Leia a matéria completa na fonte original:
              </p>
              <Button asChild data-testid="button-read-original">
                <a href={article.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver notícia original
                </a>
              </Button>
            </div>
          )}
        </article>
      </main>
      <Footer />
    </div>
  );
}
