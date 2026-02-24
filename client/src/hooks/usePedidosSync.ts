import { useState, useCallback, useEffect } from 'react';
import { trpc } from '@/lib/trpc';

export interface ItemPedido {
  produtoId: number;
  codigo: string;
  nome: string;
  precoUSD: number;
  qtdSarom: number;
  qtdAlexandre: number;
}

export interface Pedido {
  id: number;
  nome: string;
  items: ItemPedido[];
  status: 'Pendente' | 'Confirmado' | 'Recebido';
  dataCriacao: Date;
  dataAtualizacao: Date;
}

export interface NotificacaoPedido {
  id: string;
  tipo: 'sucesso' | 'erro' | 'info';
  mensagem: string;
  pedidoId?: number;
}

const STORAGE_KEY_SYNC = 'asx_pedidos_sync_status';

export function usePedidosSync() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [notificacoes, setNotificacoes] = useState<NotificacaoPedido[]>([]);

  // Queries e mutations tRPC
  const { data: pedidosDb, isLoading: carregandoPedidos, refetch: recarregarPedidos } = trpc.pedido.getAll.useQuery();
  const criarPedidoMutation = trpc.pedido.criar.useMutation();
  const atualizarStatusMutation = trpc.pedido.atualizarStatus.useMutation();
  const deletarPedidoMutation = trpc.pedido.deletar.useMutation();

  // Carregar pedidos do banco de dados
  useEffect(() => {
    if (pedidosDb) {
      const pedidosFormatados: Pedido[] = pedidosDb.map((p: any) => ({
        id: p.id,
        nome: p.nome,
        status: p.status,
        dataCriacao: new Date(p.dataCreacao),
        dataAtualizacao: new Date(p.dataAtualizacao),
        items: [], // Items serão carregados separadamente se necessário
      }));
      setPedidos(pedidosFormatados);
      setCarregando(false);
    }
  }, [pedidosDb]);

  // Adicionar notificação
  const adicionarNotificacao = useCallback((tipo: 'sucesso' | 'erro' | 'info', mensagem: string, pedidoId?: number) => {
    const id = `notif_${Date.now()}`;
    const notif: NotificacaoPedido = { id, tipo, mensagem, pedidoId };
    setNotificacoes(prev => [...prev, notif]);

    // Remover notificação após 5 segundos
    setTimeout(() => {
      setNotificacoes(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // Criar novo pedido
  const criarPedido = useCallback(async (nome: string) => {
    try {
      const result = await criarPedidoMutation.mutateAsync({ nome });
      adicionarNotificacao('sucesso', `Pedido "${nome}" criado com sucesso!`, result?.id);
      recarregarPedidos();
      return result;
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao criar pedido. Tente novamente.');
      console.error('Erro ao criar pedido:', error);
      return null;
    }
  }, [criarPedidoMutation, adicionarNotificacao, recarregarPedidos]);

  // Deletar pedido
  const deletarPedido = useCallback(async (pedidoId: number) => {
    try {
      await deletarPedidoMutation.mutateAsync({ pedidoId });
      adicionarNotificacao('sucesso', 'Pedido deletado com sucesso!');
      recarregarPedidos();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao deletar pedido. Tente novamente.');
      console.error('Erro ao deletar pedido:', error);
    }
  }, [deletarPedidoMutation, adicionarNotificacao, recarregarPedidos]);

  // Atualizar status do pedido
  const atualizarStatusPedido = useCallback(async (pedidoId: number, novoStatus: 'Pendente' | 'Confirmado' | 'Recebido') => {
    try {
      await atualizarStatusMutation.mutateAsync({ pedidoId, novoStatus });
      
      // Notificação especial para "Confirmado"
      if (novoStatus === 'Confirmado') {
        adicionarNotificacao('sucesso', `✅ Pedido confirmado! Agora disponível para vincular ao Container.`, pedidoId);
      } else if (novoStatus === 'Recebido') {
        adicionarNotificacao('sucesso', `✅ Pedido marcado como recebido!`, pedidoId);
      } else {
        adicionarNotificacao('info', `Status do pedido atualizado para ${novoStatus}`, pedidoId);
      }
      
      recarregarPedidos();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao atualizar status do pedido. Tente novamente.');
      console.error('Erro ao atualizar status:', error);
    }
  }, [atualizarStatusMutation, adicionarNotificacao, recarregarPedidos]);

  // Atualizar nome do pedido (local por enquanto, pode ser expandido)
  const atualizarNomePedido = useCallback((pedidoId: number, novoNome: string) => {
    setPedidos(prev =>
      prev.map(p =>
        p.id === pedidoId
          ? { ...p, nome: novoNome, dataAtualizacao: new Date() }
          : p
      )
    );
  }, []);

  // Adicionar item ao pedido (local por enquanto)
  const adicionarItem = useCallback((pedidoId: number, item: ItemPedido) => {
    setPedidos(prev =>
      prev.map(p => {
        if (p.id === pedidoId) {
          const existente = p.items.find(i => i.produtoId === item.produtoId);
          if (existente) {
            return {
              ...p,
              items: p.items.map(i =>
                i.produtoId === item.produtoId
                  ? { ...i, qtdSarom: item.qtdSarom, qtdAlexandre: item.qtdAlexandre }
                  : i
              ),
              dataAtualizacao: new Date(),
            };
          }
          return {
            ...p,
            items: [...p.items, item],
            dataAtualizacao: new Date(),
          };
        }
        return p;
      })
    );
  }, []);

  // Remover item do pedido (local por enquanto)
  const removerItem = useCallback((pedidoId: number, produtoId: number) => {
    setPedidos(prev =>
      prev.map(p =>
        p.id === pedidoId
          ? {
              ...p,
              items: p.items.filter(i => i.produtoId !== produtoId),
              dataAtualizacao: new Date(),
            }
          : p
      )
    );
  }, []);

  // Calcular totais
  const calcularTotais = (pedido: Pedido) => {
    let totalSarom = 0;
    let totalAlexandre = 0;
    let totalGeral = 0;

    pedido.items.forEach(item => {
      const subtotalSarom = item.precoUSD * item.qtdSarom;
      const subtotalAlexandre = item.precoUSD * item.qtdAlexandre;
      totalSarom += subtotalSarom;
      totalAlexandre += subtotalAlexandre;
      totalGeral += subtotalSarom + subtotalAlexandre;
    });

    return { totalSarom, totalAlexandre, totalGeral };
  };

  return {
    pedidos,
    carregando: carregando || carregandoPedidos,
    notificacoes,
    criarPedido,
    deletarPedido,
    atualizarStatusPedido,
    atualizarNomePedido,
    adicionarItem,
    removerItem,
    calcularTotais,
    recarregarPedidos,
  };
}
