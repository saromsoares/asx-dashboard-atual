import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('sarom@asxstore.com');
  const [password, setPassword] = useState('');
  const [, setLocation] = useLocation();
  const { login, loading, error, isAuthenticated } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
  };

  // Redirecionar para home se login bem-sucedido
  React.useEffect(() => {
    if (isAuthenticated) {
      setLocation('/');
    }
  }, [isAuthenticated, setLocation]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'oklch(0.12 0.005 285)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo e Título */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <div
              className="w-24 h-24 rounded-lg flex items-center justify-center"
              style={{ background: 'oklch(0.48 0.22 25)' }}
            >
              <span className="font-rajdhani font-bold text-4xl" style={{ color: 'white' }}>
                ASX
              </span>
            </div>
          </div>
          <h1 className="text-3xl font-rajdhani font-bold mb-2" style={{ color: 'oklch(0.85 0.005 65)' }}>
            Gestão de Importação
          </h1>
          <p className="text-sm" style={{ color: 'oklch(0.60 0.010 285)' }}>
            Dashboard de Produtos e Compras
          </p>
        </div>

        {/* Formulário */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl p-8 border shadow-2xl"
          style={{ background: 'oklch(0.16 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}
        >
          {/* Email */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: 'oklch(0.70 0.010 285)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border font-rajdhani"
              style={{
                background: 'oklch(0.14 0.005 285)',
                borderColor: 'oklch(0.26 0.005 285)',
                color: 'oklch(0.90 0.005 65)',
              }}
              placeholder="seu@email.com"
              required
            />
          </div>

          {/* Senha */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: 'oklch(0.70 0.010 285)' }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border font-rajdhani"
              style={{
                background: 'oklch(0.14 0.005 285)',
                borderColor: 'oklch(0.26 0.005 285)',
                color: 'oklch(0.90 0.005 65)',
              }}
              placeholder="••••••••"
              required
            />
          </div>

          {/* Erro */}
          {error && (
            <div
              className="mb-6 p-4 rounded-lg flex items-center gap-3 border"
              style={{
                background: 'oklch(0.20 0.15 25 / 0.4)',
                borderColor: 'oklch(0.55 0.22 25)',
              }}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: 'oklch(0.90 0.15 65)' }} />
              <p className="text-sm" style={{ color: 'oklch(0.90 0.10 65)' }}>
                {error}
              </p>
            </div>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-rajdhani font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{
              background: 'oklch(0.48 0.22 25)',
              color: 'white',
            }}
          >
            <LogIn className="w-5 h-5" />
            {loading ? 'Autenticando...' : 'Entrar'}
          </button>

          {/* Dica removida por segurança */}
        </form>

        {/* Footer */}
        <p className="text-xs text-center mt-8" style={{ color: 'oklch(0.35 0.010 285)' }}>
          ASX Iluminação © 2026 — Dashboard de Gestão
        </p>
      </div>
    </div>
  );
}
