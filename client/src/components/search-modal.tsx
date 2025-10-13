import { useState } from "react";
import { Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { NewsCard } from "@/components/news-card";
import type { NewsArticle } from "@shared/schema";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: results, isLoading } = useQuery<NewsArticle[]>({
    queryKey: ["/api", "news", `search?q=${searchTerm}`],
    enabled: searchTerm.length >= 3,
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      data-testid="search-modal-backdrop"
    >
      <div
        className="absolute top-0 left-0 right-0 bg-background border-b shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-6">
            <Search className="h-6 w-6 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar notícias..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 text-lg border-0 focus-visible:ring-0 px-0"
              autoFocus
              data-testid="input-search"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="button-close-search"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {searchTerm.length > 0 && searchTerm.length < 3 && (
            <p className="text-muted-foreground text-sm">
              Digite pelo menos 3 caracteres para buscar
            </p>
          )}

          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="h-64 bg-muted rounded-md animate-pulse"
                />
              ))}
            </div>
          )}

          {results && results.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto">
              {results.map((article) => (
                <NewsCard key={article.id} article={article} onClick={onClose} />
              ))}
            </div>
          )}

          {results && results.length === 0 && searchTerm.length >= 3 && (
            <p className="text-muted-foreground text-center py-12" data-testid="text-no-results">
              Nenhum resultado encontrado
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
