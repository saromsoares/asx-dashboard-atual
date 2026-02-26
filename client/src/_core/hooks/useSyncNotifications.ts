import { useEffect } from 'react';
import { useWebSocket, type RealtimeEvent } from './useWebSocket';
import { useToast } from '@/components/Toast';

export function useSyncNotifications() {
  const { on } = useWebSocket();
  const { success, info } = useToast();

  useEffect(() => {
    const unsubscribeProduto = on('produto_atualizado', (event: RealtimeEvent) => {
      const produtoNome = event.data.nome || `Produto #${event.data.produtoId}`;
      success(`${event.userName} atualizou ${produtoNome}`, 3000);
    });

    const unsubscribePreco = on('preco_atualizado', (event: RealtimeEvent) => {
      const produtoNome = event.data.nome || `Produto #${event.data.produtoId}`;
      const novoPreco = event.data.precoVenda?.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      success(`${event.userName} atualizou preço de ${produtoNome} para ${novoPreco}`, 3000);
    });

    const unsubscribePedidoCriado = on('pedido_criado', (event: RealtimeEvent) => {
      const total = event.data.total?.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      info(`${event.userName} criou novo pedido de ${total}`, 4000);
    });

    const unsubscribePedidoAtualizado = on('pedido_atualizado', (event: RealtimeEvent) => {
      const status = event.data.status || 'desconhecido';
      success(`${event.userName} atualizou pedido para ${status}`, 3000);
    });

    const unsubscribeUsuarioConectado = on('usuario_conectado', (event: RealtimeEvent) => {
      info(`${event.userName} conectou ao dashboard`, 2000);
    });

    const unsubscribeUsuarioDesconectado = on('usuario_desconectado', (event: RealtimeEvent) => {
      info(`${event.userName} desconectou do dashboard`, 2000);
    });

    return () => {
      unsubscribeProduto();
      unsubscribePreco();
      unsubscribePedidoCriado();
      unsubscribePedidoAtualizado();
      unsubscribeUsuarioConectado();
      unsubscribeUsuarioDesconectado();
    };
  }, [on, success, info]);
}
