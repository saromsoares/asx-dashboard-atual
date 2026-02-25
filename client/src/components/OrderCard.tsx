import React from 'react';
import { Edit2, Trash2, Eye } from 'lucide-react';

interface OrderCardProps {
  id: number;
  nome: string;
  status: 'Pendente' | 'Confirmado' | 'Recebido';
  dataCreacao: string;
  itemCount?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
}

export function OrderCard({
  id,
  nome,
  status,
  dataCreacao,
  itemCount = 0,
  onEdit,
  onDelete,
  onView,
}: OrderCardProps) {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'Pendente':
        return { bg: 'oklch(0.65 0.22 25)', text: 'white' }; // Amarelo/Laranja
      case 'Confirmado':
        return { bg: 'oklch(0.48 0.22 250)', text: 'white' }; // Azul
      case 'Recebido':
        return { bg: 'oklch(0.72 0.17 145)', text: 'white' }; // Verde
      default:
        return { bg: 'oklch(0.50 0.010 285)', text: 'white' };
    }
  };

  const colors = getStatusColor(status);
  const formattedDate = new Date(dataCreacao).toLocaleDateString('pt-BR');

  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{
        background: 'oklch(0.14 0.005 285)',
        borderColor: 'oklch(0.26 0.005 285)',
      }}
    >
      {/* Header: ID + Status Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-rajdhani font-bold text-sm" style={{ color: 'oklch(0.85 0.005 65)' }}>
            Pedido #{id}
          </p>
          <p className="text-xs mt-1 line-clamp-2" style={{ color: 'oklch(0.65 0.010 285)' }}>
            {nome}
          </p>
        </div>
        <div
          className="px-3 py-1 rounded-full text-xs font-medium flex-shrink-0"
          style={{ background: colors.bg, color: colors.text }}
        >
          {status}
        </div>
      </div>

      {/* Data e Itens */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p style={{ color: 'oklch(0.45 0.010 285)' }}>Data</p>
          <p className="font-medium" style={{ color: 'oklch(0.85 0.005 65)' }}>
            {formattedDate}
          </p>
        </div>
        <div>
          <p style={{ color: 'oklch(0.45 0.010 285)' }}>Itens</p>
          <p className="font-medium" style={{ color: 'oklch(0.85 0.005 65)' }}>
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
        {onView && (
          <button
            onClick={onView}
            className="flex-1 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2"
            style={{
              background: 'oklch(0.48 0.22 250)',
              color: 'white',
            }}
          >
            <Eye className="w-3 h-3" />
            Ver
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
