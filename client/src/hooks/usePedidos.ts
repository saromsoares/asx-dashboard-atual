import { useState, useCallback, useEffect } from 'react';

export interface ItemPedido {
  produtoId: number;
  codigo: string;
  nome: string;
  precoUSD: number;
  qtdSarom: number;
  qtdAlexandre: number;
}

export interface Pedido {
  id: string;
  nome: string;
  items: ItemPedido[];
  confirmado: boolean;
  dataCriacao: string;
  dataAtualizacao: string;
}

const STORAGE_KEY = 'asx_pedidos';

export function usePedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregado, setCarregado] = useState(false);

  // Carregar do localStorage
  useEffect(() => {
    const salvo = localStorage.getItem(STORAGE_KEY);
    if (salvo) {
      try {
        setPedidos(JSON.parse(salvo));
      } catch (e) {
        console.error('Erro ao carregar pedidos:', e);
      }
    }
    setCarregado(true);
  }, []);

  // Salvar no localStorage
  const salvarPedidos = useCallback((novos: Pedido[]) => {
    setPedidos(novos);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(novos));
  }, []);

  // Criar novo pedido
  const criarPedido = useCallback((nome: string) => {
    const novoPedido: Pedido = {
      id: `pedido_${Date.now()}`,
      nome,
      items: [],
      confirmado: false,
      dataCriacao: new Date().toISOString(),
      dataAtualizacao: new Date().toISOString(),
    };
    salvarPedidos([...pedidos, novoPedido]);
    return novoPedido;
  }, [pedidos, salvarPedidos]);

  // Deletar pedido
  const deletarPedido = useCallback((id: string) => {
    salvarPedidos(pedidos.filter(p => p.id !== id));
  }, [pedidos, salvarPedidos]);

  // Atualizar nome do pedido
  const atualizarNomePedido = useCallback((id: string, novoNome: string) => {
    salvarPedidos(pedidos.map(p =>
      p.id === id
        ? { ...p, nome: novoNome, dataAtualizacao: new Date().toISOString() }
        : p
    ));
  }, [pedidos, salvarPedidos]);

  // Adicionar item ao pedido
  const adicionarItem = useCallback((pedidoId: string, item: ItemPedido) => {
    salvarPedidos(pedidos.map(p => {
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
            dataAtualizacao: new Date().toISOString(),
          };
        }
        return {
          ...p,
          items: [...p.items, item],
          dataAtualizacao: new Date().toISOString(),
        };
      }
      return p;
    }));
  }, [pedidos, salvarPedidos]);

  // Remover item do pedido
  const removerItem = useCallback((pedidoId: string, produtoId: number) => {
    salvarPedidos(pedidos.map(p =>
      p.id === pedidoId
        ? {
            ...p,
            items: p.items.filter(i => i.produtoId !== produtoId),
            dataAtualizacao: new Date().toISOString(),
          }
        : p
    ));
  }, [pedidos, salvarPedidos]);

  // Confirmar/desconfirmar pedido
  const toggleConfirmacao = useCallback((id: string) => {
    salvarPedidos(pedidos.map(p =>
      p.id === id
        ? { ...p, confirmado: !p.confirmado, dataAtualizacao: new Date().toISOString() }
        : p
    ));
  }, [pedidos, salvarPedidos]);

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
    carregado,
    criarPedido,
    deletarPedido,
    atualizarNomePedido,
    adicionarItem,
    removerItem,
    toggleConfirmacao,
    calcularTotais,
  };
}
