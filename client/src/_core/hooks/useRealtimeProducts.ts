import { useEffect, useCallback } from 'react';
import { useWebSocket, type RealtimeEvent } from './useWebSocket';
import { trpc } from '@/lib/trpc';

export function useRealtimeProducts() {
  const { emit, on } = useWebSocket();
  const utils = trpc.useUtils();

  // Registrar listeners para eventos de produto
  useEffect(() => {
    const unsubscribeProduto = on('produto_atualizado', (event: RealtimeEvent) => {
      console.log('[Realtime] Produto atualizado por', event.userName, event.data);
      // Invalidar cache para forçar refetch
      utils.invalidate();
    });

    const unsubscribePreco = on('preco_atualizado', (event: RealtimeEvent) => {
      console.log('[Realtime] Preço atualizado por', event.userName, event.data);
      utils.invalidate();
    });

    return () => {
      unsubscribeProduto();
      unsubscribePreco();
    };
  }, [on, utils]);

  // Emitir evento quando produto é atualizado
  const notificarAtualizacaoProduto = useCallback((produtoId: number, dados: any) => {
    emit('produto_atualizado', {
      produtoId,
      ...dados,
    });
  }, [emit]);

  // Emitir evento quando preço é atualizado
  const notificarAtualizacaoPreco = useCallback((produtoId: number, precoVenda: number) => {
    emit('preco_atualizado', {
      produtoId,
      precoVenda,
    });
  }, [emit]);

  return {
    notificarAtualizacaoProduto,
    notificarAtualizacaoPreco,
  };
}
