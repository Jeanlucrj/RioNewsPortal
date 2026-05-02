import { Link } from "wouter";
import { Facebook, Instagram, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BreakingNewsTicker } from "@/components/breaking-news-ticker";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function Footer() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, insira um e-mail válido.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await apiRequest("POST", "/api/newsletter/subscribe", { email });
      toast({
        title: "Sucesso!",
        description: "Você foi inscrito na nossa newsletter.",
      });
      setEmail("");
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível realizar a inscrição. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <BreakingNewsTicker category="esportes" label="Esportes" />
      <footer className="bg-card border-t mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-serif text-2xl font-bold mb-4 text-primary">
                Diário do Carioca
              </h3>
              <p className="text-sm text-muted-foreground">
                Seu portal de notícias sobre cultura, esportes, shows e vida noturna no Rio de Janeiro.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Categorias</h4>
              <nav className="space-y-2">
                <Link href="/categoria/cultura" className="block text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-cultura">
                  Cultura
                </Link>
                <Link href="/categoria/esportes" className="block text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-esportes">
                  Esportes
                </Link>
                <Link href="/categoria/shows" className="block text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-shows">
                  Shows
                </Link>
                <Link href="/categoria/vida-noturna" className="block text-sm text-muted-foreground hover:text-foreground" data-testid="link-footer-vida-noturna">
                  Vida Noturna
                </Link>
              </nav>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Redes Sociais</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" asChild data-testid="button-social-instagram">
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <Instagram className="h-5 w-5" />
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild data-testid="button-social-twitter">
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                    <Twitter className="h-5 w-5" />
                  </a>
                </Button>
                <Button variant="outline" size="icon" asChild data-testid="button-social-facebook">
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <Facebook className="h-5 w-5" />
                  </a>
                </Button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Newsletter</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Receba as últimas notícias do Rio
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Seu email"
                  className="text-sm"
                  data-testid="input-newsletter"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
                <Button size="sm" data-testid="button-subscribe" onClick={handleSubscribe} disabled={loading}>
                  {loading ? "..." : "Assinar"}
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Diário do Carioca. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
