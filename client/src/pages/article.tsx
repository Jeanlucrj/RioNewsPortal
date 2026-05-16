import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { NewsCard } from "@/components/news-card";
import type { NewsArticle } from "@shared/schema";
import { getDefaultImage } from "@/lib/image-service";
import { Calendar, ExternalLink, Share2, Copy, Check, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const categoryLabels: Record<string, string> = {
  cultura: "Cultura",
  esportes: "Esportes",
  shows: "Shows",
  gastronomia: "Gastronomia",
  internacional: "Internacional",
  "vida-noturna": "Vida Noturna",
  geral: "Geral",
};

const categoryColors: Record<string, string> = {
  cultura: "bg-purple-500 text-white",
  esportes: "bg-green-500 text-white",
  shows: "bg-pink-500 text-white",
  gastronomia: "bg-orange-500 text-white",
  internacional: "bg-blue-500 text-white",
  "vida-noturna": "bg-indigo-500 text-white",
  geral: "bg-primary text-primary-foreground",
};

interface NewsPage {
  news: NewsArticle[];
  total: number;
}

export default function Article() {
  const [, params] = useRoute("/noticia/:id");
  const articleId = params?.id ? decodeURIComponent(params.id) : undefined;
  const [copied, setCopied] = useState(false);

  const { data: article, isLoading } = useQuery<NewsArticle>({
    queryKey: [`/api/news/${encodeURIComponent(articleId || "")}`],
    enabled: !!articleId,
  });

  // Related articles (same category, excluding current)
  const { data: relatedPage } = useQuery<NewsPage>({
    queryKey: ["/api/news/category", article?.category],
    queryFn: () =>
      fetch(`/api/news/category/${article!.category}?page=1&limit=9`).then((r) => r.json()),
    enabled: !!article?.category,
  });

  const relatedArticles = relatedPage?.news
    ?.filter((a) => a.id !== articleId)
    .slice(0, 4) ?? [];

  // Increment view count once on mount
  const viewMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/news/increment-view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      }).then((r) => r.json()),
  });

  useEffect(() => {
    if (articleId) {
      viewMutation.mutate(articleId);
      window.scrollTo(0, 0);
    }
  }, [articleId]);

  const handleShare = (platform: "facebook" | "twitter" | "whatsapp" | "copy") => {
    if (!article) return;
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(article.title);

    if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
    } else if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
    } else if (platform === "whatsapp") {
      window.open(`https://api.whatsapp.com/send?text=${text}%20${url}`, "_blank");
    } else if (platform === "copy") {
      navigator.clipboard.writeText(window.location.href).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
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

  const cleanDesc = article.description?.replace(/<[^>]*>?/gm, '').trim() || "";
  const cleanContent = article.content?.replace(/<[^>]*>?/gm, '').trim() || "";
  const hideDescription = cleanContent.length > 0 && cleanDesc.length > 0 && 
    (cleanContent.includes(cleanDesc) || cleanContent.startsWith(cleanDesc.substring(0, 50)));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": article.title,
    "image": [article.imageUrl || getDefaultImage(article.category, article.title, article.description)],
    "datePublished": new Date(article.publishedAt).toISOString(),
    "author": [{
        "@type": "Person",
        "name": article.author || "Redação"
    }],
    "publisher": {
      "@type": "Organization",
      "name": "Diário do Carioca"
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header />
      <main className="flex-1">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Breadcrumb */}
          <nav className="text-sm text-muted-foreground mb-6" data-testid="breadcrumb">
            <Link href="/" className="hover:text-foreground">Home</Link>
            {" / "}
            <Link href={`/categoria/${article.category}`} className="hover:text-foreground">
              {categoryLabels[article.category]}
            </Link>
          </nav>

          <Badge className={`mb-4 uppercase text-xs font-bold tracking-wide ${categoryColors[article.category]}`} data-testid="badge-article-category">
            {categoryLabels[article.category]}
          </Badge>

          <h1 className="text-4xl md:text-5xl font-bold font-serif mb-6 leading-tight" data-testid="text-article-title">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 mb-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {timeAgo}
            </span>
            {article.source && <span data-testid="text-article-source">Fonte: {article.source}</span>}
            {article.author && <span data-testid="text-article-author">Por {article.author}</span>}
            {article.url && (
              <a href={article.url} target="_blank" rel="noopener noreferrer nofollow"
                className="flex items-center gap-1 text-primary hover:underline" data-testid="link-article-source">
                <ExternalLink className="h-4 w-4" />
                Ver fonte original
              </a>
            )}
          </div>

          <div className="mb-8 rounded-lg overflow-hidden">
            <img
              src={article.imageUrl || getDefaultImage(article.category, article.title, article.description)}
              alt={article.title}
              className="w-full h-auto max-h-96 object-cover"
              data-testid="img-article-hero"
              onError={(e) => {
                const fallback = `https://loremflickr.com/800/450/rio,brazil,city?lock=${article.id?.charCodeAt(0) ?? 1}`;
                if ((e.target as HTMLImageElement).src !== fallback)
                  (e.target as HTMLImageElement).src = fallback;
              }}
            />
          </div>

          {/* Share bar */}
          <div className="flex items-center flex-wrap gap-2 mb-8 pb-8 border-b">
            <Share2 className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground mr-1">Compartilhar:</span>

            <Button variant="outline" size="sm" onClick={() => handleShare("whatsapp")}
              className="gap-2 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950"
              data-testid="button-share-whatsapp">
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.531 5.855L.057 23.995l6.302-1.453A11.944 11.944 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.893a9.866 9.866 0 01-5.03-1.375l-.36-.214-3.733.86.933-3.618-.235-.372A9.862 9.862 0 012.107 12C2.107 6.58 6.58 2.107 12 2.107S21.893 6.58 21.893 12 17.42 21.893 12 21.893z"/></svg>
              WhatsApp
            </Button>

            <Button variant="outline" size="sm" onClick={() => handleShare("facebook")} data-testid="button-share-facebook">
              <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2 fill-[#1877F2]"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
              Facebook
            </Button>

            <Button variant="outline" size="sm" onClick={() => handleShare("twitter")} data-testid="button-share-twitter">
              <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.26 5.632L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              X / Twitter
            </Button>

            <Button variant="outline" size="sm" onClick={() => handleShare("copy")} data-testid="button-share-copy">
              {copied ? <Check className="h-4 w-4 mr-2 text-green-500" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copiado!" : "Copiar link"}
            </Button>
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex items-center flex-wrap gap-2 mb-8">
              <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
              {article.tags.map(tag => (
                <a
                  key={tag}
                  href={`/tag/${encodeURIComponent(tag)}`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-colors capitalize"
                >
                  #{tag}
                </a>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="prose prose-lg dark:prose-invert max-w-none mb-8">
            {!hideDescription && article.description && (
              <p className="text-lg text-foreground leading-relaxed" data-testid="text-article-description">
                {article.description}
              </p>
            )}
            {article.content && (
              <div className="mt-6 leading-relaxed text-foreground [&_p]:text-foreground [&_h2]:text-foreground [&_h3]:text-foreground [&_strong]:text-foreground [&_li]:text-foreground" data-testid="text-article-content"
                dangerouslySetInnerHTML={{ __html: article.content }} />
            )}
          </div>

          {article.url && article.url.startsWith("http") && (
            <div className="mt-8 p-6 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">Leia a matéria completa na fonte original:</p>
              <Button asChild data-testid="button-read-original">
                <a href={article.url} target="_blank" rel="noopener noreferrer nofollow">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver notícia original
                </a>
              </Button>
            </div>
          )}
        </article>

        {/* Related articles */}
        {relatedArticles.length > 0 && (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <div className="border-t pt-10">
              <h2 className="text-2xl font-bold font-serif mb-6">Veja também</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedArticles.map((a) => (
                  <NewsCard key={a.id} article={a} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
