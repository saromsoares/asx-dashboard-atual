import React from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { formatUSD, formatBRL } from '@/lib/formatters';

interface ProductCardProps {
  codigo: string;
  descricao: string;
  precoVenda: number;
  custoUsd: number;
  custoBrl: number;
  lucro: number;
  margem: number;
  markup: number;
  onEdit?: () => void;
  onDelete?: () => void;
  fotoUrl?: string;
}

export function ProductCardMobile({
  codigo,
  descricao,
  precoVenda,
  custoUsd,
  custoBrl,
  lucro,
  margem,
  markup,
  onEdit,
  onDelete,
  fotoUrl,
}: ProductCardProps) {
  const getMarginColor = (m: number) => {
    if (m >= 50) return 'var(--color-asx-success)'; // Verde
    if (m >= 20) return 'var(--color-asx-error)'; // Amarelo/Laranja
    return 'oklch(0.60 0.22 25)'; // Vermelho
  };

  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{
        background: 'var(--color-asx-base)',
        borderColor: 'var(--color-asx-border)',
      }}
    >
      {/* Header: Código + Ações */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-rajdhani font-bold text-sm" style={{ color: 'var(--color-asx-text-heading)' }}>
            {codigo}
          </p>
          <p className="text-xs mt-1 line-clamp-2" style={{ color: 'oklch(0.65 0.010 285)' }}>
            {descricao}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 rounded-md transition-colors"
              style={{
                background: 'oklch(0.18 0.005 285)',
                color: 'var(--color-asx-text-secondary)',
              }}
              title="Editar"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 rounded-md transition-colors"
              style={{
                background: 'oklch(0.18 0.005 285)',
                color: 'var(--color-asx-error)',
              }}
              title="Deletar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Foto */}
      {fotoUrl && (
        <img
          src={fotoUrl}
          alt={codigo}
          className="w-full h-32 object-cover rounded-md"
        />
      )}

      {/* Dados em Grid 2 colunas */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p style={{ color: 'var(--color-asx-text-muted)' }}>Custo USD</p>
          <p className="font-medium" style={{ color: 'var(--color-asx-text-heading)' }}>
            {formatUSD(custoUsd)}
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--color-asx-text-muted)' }}>Custo R$</p>
          <p className="font-medium" style={{ color: 'var(--color-asx-text-heading)' }}>
            {formatBRL(custoBrl)}
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--color-asx-text-muted)' }}>Venda</p>
          <p className="font-medium" style={{ color: 'var(--color-asx-text-heading)' }}>
            {formatBRL(precoVenda)}
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--color-asx-text-muted)' }}>Lucro</p>
          <p className="font-medium" style={{ color: getMarginColor(margem) }}>
            {formatBRL(lucro)}
          </p>
        </div>
      </div>

      {/* Margem + Markup em destaque */}
      <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
        <div className="flex-1">
          <p className="text-xs" style={{ color: 'var(--color-asx-text-muted)' }}>Margem</p>
          <p
            className="font-rajdhani font-bold text-sm"
            style={{ color: getMarginColor(margem) }}
          >
            {margem.toFixed(1)}%
          </p>
        </div>
        <div className="flex-1">
          <p className="text-xs" style={{ color: 'var(--color-asx-text-muted)' }}>Markup</p>
          <p
            className="font-rajdhani font-bold text-sm"
            style={{ color: getMarginColor(markup) }}
          >
            {markup.toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
}
