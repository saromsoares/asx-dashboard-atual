import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center" style={{ background: 'var(--color-asx-dark)' }}>
      <Card className="w-full max-w-lg mx-4 shadow-lg border" style={{ background: 'var(--color-asx-surface)', borderColor: 'var(--color-asx-border)' }}>
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: 'oklch(0.48 0.22 25 / 0.2)' }} />
              <AlertCircle className="relative h-16 w-16" style={{ color: 'var(--color-asx-red)' }} />
            </div>
          </div>

          <h1 className="text-4xl font-rajdhani font-bold mb-2" style={{ color: 'var(--color-asx-text)' }}>404</h1>

          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-asx-text-heading)' }}>
            Página Não Encontrada
          </h2>

          <p className="mb-8 leading-relaxed" style={{ color: 'var(--color-asx-text-muted)' }}>
            A página que você está procurando não existe.
            Ela pode ter sido movida ou removida.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleGoHome}
              className="px-6 py-2.5 rounded-lg font-medium transition-colors"
              style={{ background: 'var(--color-asx-red)', color: 'white' }}
            >
              <Home className="w-4 h-4 mr-2" />
              Ir para o Início
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
