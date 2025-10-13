import { Link, useLocation } from "wouter";
import { Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";
import { SearchModal } from "@/components/search-modal";
import type { NewsCategory } from "@shared/schema";

const categories: { id: NewsCategory; label: string; color: string }[] = [
  { id: "cultura", label: "Cultura", color: "cultura" },
  { id: "esportes", label: "Esportes", color: "esportes" },
  { id: "shows", label: "Shows", color: "shows" },
  { id: "vida-noturna", label: "Vida Noturna", color: "vida-noturna" },
];

export function Header() {
  const [location] = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location === path;

  return (
    <>
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" data-testid="link-home" className="text-2xl font-bold font-serif text-primary">
              Rio Notícias
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {categories.map((cat) => (
                <Link key={cat.id} href={`/categoria/${cat.id}`}>
                  <Button
                    variant="ghost"
                    className={`relative ${isActive(`/categoria/${cat.id}`) ? "text-foreground" : ""}`}
                    data-testid={`link-category-${cat.id}`}
                  >
                    {cat.label}
                    {isActive(`/categoria/${cat.id}`) && (
                      <span
                        className={`absolute bottom-0 left-0 right-0 h-0.5 bg-${cat.color}`}
                        style={{
                          backgroundColor: `hsl(var(--${cat.color}))`,
                        }}
                      />
                    )}
                  </Button>
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSearchOpen(true)}
                data-testid="button-search"
                aria-label="Buscar"
              >
                <Search className="h-5 w-5" />
              </Button>
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                data-testid="button-menu"
                aria-label="Menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <nav className="md:hidden py-4 space-y-2">
              {categories.map((cat) => (
                <Link key={cat.id} href={`/categoria/${cat.id}`}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${isActive(`/categoria/${cat.id}`) ? "bg-accent" : ""}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    data-testid={`link-mobile-category-${cat.id}`}
                  >
                    {cat.label}
                  </Button>
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
