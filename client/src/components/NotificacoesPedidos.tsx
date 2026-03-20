import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface Notificacao {
  id: string;
  tipo: 'sucesso' | 'erro' | 'info';
  mensagem: string;
  pedidoId?: number;
}

interface NotificacoesPedidosProps {
  notificacoes: Notificacao[];
  onRemover?: (id: string) => void;
}

export function NotificacoesPedidos({ notificacoes, onRemover }: NotificacoesPedidosProps) {
  if (notificacoes.length === 0) return null;

  const getCorPorTipo = (tipo: string) => {
    switch (tipo) {
      case 'sucesso':
        return {
          bg: 'oklch(0.20 0.10 145 / 0.9)',
          border: 'oklch(0.50 0.17 145)',
          text: 'oklch(0.90 0.10 145)',
          icon: 'var(--color-asx-success)',
        };
      case 'erro':
        return {
          bg: 'oklch(0.20 0.10 25 / 0.9)',
          border: 'oklch(0.50 0.22 25)',
          text: 'oklch(0.90 0.15 25)',
          icon: 'var(--color-asx-error)',
        };
      case 'info':
      default:
        return {
          bg: 'oklch(0.20 0.10 285 / 0.9)',
          border: 'oklch(0.50 0.15 285)',
          text: 'oklch(0.85 0.10 285)',
          icon: 'oklch(0.70 0.12 285)',
        };
    }
  };

  const getIcone = (tipo: string) => {
    switch (tipo) {
      case 'sucesso':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'erro':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notificacoes.map(notif => {
        const cores = getCorPorTipo(notif.tipo);
        return (
          <div
            key={notif.id}
            className="rounded-lg border px-4 py-3 flex items-start gap-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300"
            style={{
              background: cores.bg,
              borderColor: cores.border,
              color: cores.text,
            }}
          >
            <div style={{ color: cores.icon }} className="flex-shrink-0 mt-0.5">
              {getIcone(notif.tipo)}
            </div>
            <div className="flex-1 text-sm font-medium">
              {notif.mensagem}
            </div>
            {onRemover && (
              <button
                onClick={() => onRemover(notif.id)}
                className="flex-shrink-0 ml-2 opacity-70 hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
