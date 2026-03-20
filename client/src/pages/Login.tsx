import { LogIn } from 'lucide-react';
import { getLoginUrl } from '@/const';

export default function Login() {
  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

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

        {/* Login Card */}
        <div
          className="rounded-xl p-8 border shadow-2xl"
          style={{ background: 'oklch(0.16 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}
        >
          <p className="text-center mb-6 text-sm" style={{ color: 'oklch(0.70 0.010 285)' }}>
            Faça login com sua conta ASX para acessar o dashboard.
          </p>

          <button
            type="button"
            onClick={handleLogin}
            className="w-full py-3 rounded-lg font-rajdhani font-semibold flex items-center justify-center gap-2 transition-all hover:opacity-90"
            style={{
              background: 'oklch(0.48 0.22 25)',
              color: 'white',
            }}
          >
            <LogIn className="w-5 h-5" />
            Entrar com SSO
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-center mt-8" style={{ color: 'oklch(0.35 0.010 285)' }}>
          ASX Iluminação © 2026 — Dashboard de Gestão
        </p>
      </div>
    </div>
  );
}
