import React from 'react';
import { Edit2, Trash2, Link2 } from 'lucide-react';

interface ContainerCardProps {
  id: number;
  numero: string;
  status: 'Vazio' | 'Preenchendo' | 'Cheio' | 'Enviado' | 'Entregue';
  capacidadeMaxima: number;
  pesoMaximo: number;
  pedidosCount?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onManagePedidos?: () => void;
}

export function ContainerCard({
  id,
  numero,
  status,
  capacidadeMaxima,
  pesoMaximo,
  pedidosCount = 0,
  onEdit,
  onDelete,
  onManagePedidos,
}: ContainerCardProps) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Vazio':
        return { bg: 'oklch(0.50 0.010 285)', text: 'white' }; // Cinza
      case 'Preenchendo':
        return { bg: 'var(--color-asx-error)', text: 'white' }; // Amarelo/Laranja
      case 'Cheio':
        return { bg: 'oklch(0.48 0.22 250)', text: 'white' }; // Azul
      case 'Enviado':
        return { bg: 'oklch(0.60 0.22 290)', text: 'white' }; // Roxo
      case 'Entregue':
        return { bg: 'var(--color-asx-success)', text: 'white' }; // Verde
      default:
        return { bg: 'oklch(0.50 0.010 285)', text: 'white' };
    }
  };

  const colors = getStatusColor(status);

  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{
        background: 'var(--color-asx-base)',
        borderColor: 'var(--color-asx-border)',
      }}
    >
      {/* Header: Número + Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-rajdhani font-bold text-sm" style={{ color: 'var(--color-asx-text-heading)' }}>
            {numero}
          </p>
          <p className="text-xs mt-1" style={{ color: 'oklch(0.65 0.010 285)' }}>
            Container #{id}
          </p>
        </div>
        <div
          className="px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 whitespace-nowrap"
          style={{ background: colors.bg, color: colors.text }}
        >
          {status}
        </div>
      </div>

      {/* Capacidade e Peso */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p style={{ color: 'var(--color-asx-text-muted)' }}>Capacidade</p>
          <p className="font-medium" style={{ color: 'var(--color-asx-text-heading)' }}>
            {capacidadeMaxima} unidades
          </p>
        </div>
        <div>
          <p style={{ color: 'var(--color-asx-text-muted)' }}>Peso Máx</p>
          <p className="font-medium" style={{ color: 'var(--color-asx-text-heading)' }}>
            {pesoMaximo} kg
          </p>
        </div>
      </div>

      {/* Pedidos */}
      <div className="text-xs">
        <p style={{ color: 'var(--color-asx-text-muted)' }}>Pedidos Vinculados</p>
        <p className="font-medium" style={{ color: 'var(--color-asx-text-heading)' }}>
          {pedidosCount} pedido{pedidosCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Ações */}
      <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
        {onManagePedidos && (
          <button
            onClick={onManagePedidos}
            className="flex-1 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              background: 'oklch(0.48 0.22 250)',
              color: 'white',
            }}
          >
            <Link2 className="w-3 h-3" />
            Gerenciar
          </button>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex-1 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              background: 'oklch(0.18 0.005 285)',
              color: 'var(--color-asx-text-secondary)',
              border: '1px solid var(--color-asx-border)',
            }}
          >
            <Edit2 className="w-3 h-3" />
            Editar
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            className="flex-1 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              background: 'oklch(0.18 0.005 285)',
              color: 'var(--color-asx-error)',
              border: '1px solid var(--color-asx-border)',
            }}
          >
            <Trash2 className="w-3 h-3" />
            Deletar
          </button>
        )}
      </div>
    </div>
  );
}
