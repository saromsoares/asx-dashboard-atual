import { useEffect, useCallback } from 'react';
import { useWebSocket, type RealtimeEvent } from './useWebSocket';
import { trpc } from '@/lib/trpc';

export function useRealtimeOrders() {
  const { emit, on } = useWebSocket();
  const utils = trpc.useUtils();

  // Registrar listeners para eventos de pedido
  useEffect(() => {
    const unsubscribePedidoCriado = on('pedido_criado', (event: RealtimeEvent) => {
      console.log('[Realtime] Pedido criado por', event.userName, event.data);
      // Invalidar cache para forçar refetch
      utils.invalidate();
    });

    const unsubscribePedidoAtualizado = on('pedido_atualizado', (event: RealtimeEvent) => {
      console.log('[Realtime] Pedido atualizado por', event.userName, event.data);
      utils.invalidate();
    });

    return () => {
      unsubscribePedidoCriado();
      unsubscribePedidoAtualizado();
    };
  }, [on, utils]);

  // Emitir evento quando pedido é criado
  const notificarCriacaoPedido = useCallback((pedidoId: number, dados: any) => {
    emit('pedido_criado', {
      pedidoId,
      ...dados,
    });
  }, [emit]);

  // Emitir evento quando pedido é atualizado
  const notificarAtualizacaoPedido = useCallback((pedidoId: number, dados: any) => {
    emit('pedido_atualizado', {
      pedidoId,
      ...dados,
    });
  }, [emit]);

  return {
    notificarCriacaoPedido,
    notificarAtualizacaoPedido,
  };
}
