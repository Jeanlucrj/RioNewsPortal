import { Link } from "wouter";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-9xl font-bold font-serif text-primary mb-4" data-testid="text-404">
            404
          </h1>
          <h2 className="text-3xl font-bold mb-4">Página não encontrada</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            A página que você está procurando não existe ou foi movida.
          </p>
          <Button size="lg" asChild data-testid="button-home">
            <Link href="/">
              <Home className="h-5 w-5 mr-2" />
              Voltar para Home
            </Link>
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
