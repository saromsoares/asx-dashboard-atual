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
        return { bg: 'oklch(0.65 0.22 25)', text: 'white' }; // Amarelo/Laranja
      case 'Cheio':
        return { bg: 'oklch(0.48 0.22 250)', text: 'white' }; // Azul
      case 'Enviado':
        return { bg: 'oklch(0.60 0.22 290)', text: 'white' }; // Roxo
      case 'Entregue':
        return { bg: 'oklch(0.72 0.17 145)', text: 'white' }; // Verde
      default:
        return { bg: 'oklch(0.50 0.010 285)', text: 'white' };
    }
  };

  const colors = getStatusColor(status);

  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{
        background: 'oklch(0.14 0.005 285)',
        borderColor: 'oklch(0.26 0.005 285)',
      }}
    >
      {/* Header: Número + Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-rajdhani font-bold text-sm" style={{ color: 'oklch(0.85 0.005 65)' }}>
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
          <p style={{ color: 'oklch(0.45 0.010 285)' }}>Capacidade</p>
          <p className="font-medium" style={{ color: 'oklch(0.85 0.005 65)' }}>
            {capacidadeMaxima} unidades
          </p>
        </div>
        <div>
          <p style={{ color: 'oklch(0.45 0.010 285)' }}>Peso Máx</p>
          <p className="font-medium" style={{ color: 'oklch(0.85 0.005 65)' }}>
            {pesoMaximo} kg
          </p>
        </div>
      </div>

      {/* Pedidos */}
      <div className="text-xs">
        <p style={{ color: 'oklch(0.45 0.010 285)' }}>Pedidos Vinculados</p>
        <p className="font-medium" style={{ color: 'oklch(0.85 0.005 65)' }}>
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
              color: 'oklch(0.70 0.010 285)',
              border: '1px solid oklch(0.26 0.005 285)',
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
              color: 'oklch(0.65 0.22 25)',
              border: '1px solid oklch(0.26 0.005 285)',
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
