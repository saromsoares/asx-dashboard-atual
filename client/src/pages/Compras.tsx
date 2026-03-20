import { useState, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { produtos, categorias } from '@/data/produtos';
import { trpc } from '@/lib/trpc';
import { formatUSD } from '@/lib/formatters';
import { NotificacoesPedidos, type Notificacao } from '@/components/NotificacoesPedidos';
import { OrderCard } from '@/components/OrderCard';
import {
  Plus,
  Trash2,
  X,
  ArrowLeft,
  Search,
  Package,
  ChevronLeft,
  Send,
  CheckCheck,
  Clock,
  FolderOpen,
  Save,
  Filter,
} from 'lucide-react';

export default function Compras() {
  const [, setLocation] = useLocation();

  // Estado local
  const [pedidoAtivo, setPedidoAtivo] = useState<number | null>(null);
  const [novoNomePedido, setNovoNomePedido] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const [buscaProduto, setBuscaProduto] = useState('');
  const [qtdPorProduto, setQtdPorProduto] = useState<Record<number, { sarom: number; alexandre: number }>>({});
  const [statusFiltro, setStatusFiltro] = useState<'Todos' | 'Pendente' | 'Confirmado' | 'Recebido'>('Todos');
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [salvandoBatch, setSalvandoBatch] = useState(false);

  // Queries tRPC
  const { data: pedidosDb = [], isLoading: carregandoPedidos, refetch: recarregarPedidos } = trpc.pedido.getAll.useQuery();
  const { data: itensDoPedido = [], refetch: recarregarItens } = trpc.itemPedido.getByPedido.useQuery(
    { pedidoId: pedidoAtivo || 0 },
    { enabled: pedidoAtivo !== null && pedidoAtivo > 0 }
  );

  // Mutations tRPC
  const criarPedidoMutation = trpc.pedido.criar.useMutation();
  const deletarPedidoMutation = trpc.pedido.deletar.useMutation();
  const atualizarStatusMutation = trpc.pedido.atualizarStatus.useMutation();
  const adicionarItemMutation = trpc.itemPedido.adicionar.useMutation();
  const adicionarBatchMutation = trpc.itemPedido.adicionarBatch.useMutation();
  const removerItemMutation = trpc.itemPedido.remover.useMutation();

  // Notificações
  const adicionarNotificacao = useCallback((tipo: 'sucesso' | 'erro' | 'info', mensagem: string) => {
    const id = `notif_${Date.now()}`;
    setNotificacoes(prev => [...prev, { id, tipo, mensagem }]);
    setTimeout(() => {
      setNotificacoes(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // Pedidos filtrados
  const pedidosFiltrados = useMemo(() => {
    return pedidosDb.filter((p: any) => {
      return statusFiltro === 'Todos' || p.status === statusFiltro;
    });
  }, [pedidosDb, statusFiltro]);

  // Pedido ativo
  const pedidoAtivoObj = useMemo(() => {
    return pedidosDb.find((p: any) => p.id === pedidoAtivo) || null;
  }, [pedidosDb, pedidoAtivo]);

  // Produtos da categoria ativa (ou busca)
  const produtosDaCategoria = useMemo(() => {
    let list = produtos;

    // Se há busca, filtrar por busca (ignora categoria)
    if (buscaProduto.trim()) {
      const q = buscaProduto.toLowerCase();
      list = list.filter(p =>
        p.codigo.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q) ||
        p.cod_barras.toLowerCase().includes(q)
      );
    } else if (categoriaAtiva) {
      // Filtrar por categoria
      list = list.filter(p => p.categoria === categoriaAtiva);
    } else {
      return [];
    }

    return list;
  }, [categoriaAtiva, buscaProduto]);

  // Itens já no pedido (Set para lookup rápido)
  const itensNoPedido = useMemo(() => {
    return new Set(itensDoPedido.map((i: any) => i.produtoId));
  }, [itensDoPedido]);

  // Contagem de produtos com quantidade preenchida
  const produtosComQtd = useMemo(() => {
    return Object.entries(qtdPorProduto).filter(([_, v]) => v.sarom > 0 || v.alexandre > 0).length;
  }, [qtdPorProduto]);

  // Handlers
  const handleCriarPedido = async () => {
    if (!novoNomePedido.trim()) {
      adicionarNotificacao('erro', 'Digite um nome para o pedido');
      return;
    }
    try {
      const result = await criarPedidoMutation.mutateAsync({ nome: novoNomePedido });
      if (result) {
        adicionarNotificacao('sucesso', `Pedido "${novoNomePedido}" criado com sucesso!`);
        setPedidoAtivo(result.id);
        setNovoNomePedido('');
        setCategoriaAtiva(null);
        setQtdPorProduto({});
        recarregarPedidos();
      }
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao criar pedido');
    }
  };

  const handleDeletarPedido = async (pedidoId: number) => {
    if (!confirm('Tem certeza que deseja deletar este pedido?')) return;
    try {
      await deletarPedidoMutation.mutateAsync({ pedidoId });
      adicionarNotificacao('sucesso', 'Pedido deletado com sucesso!');
      if (pedidoAtivo === pedidoId) setPedidoAtivo(null);
      recarregarPedidos();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao deletar pedido');
    }
  };

  const handleAtualizarStatus = async (pedidoId: number, novoStatus: 'Pendente' | 'Confirmado' | 'Recebido') => {
    try {
      await atualizarStatusMutation.mutateAsync({ pedidoId, novoStatus });
      if (novoStatus === 'Confirmado') {
        adicionarNotificacao('sucesso', '✅ Pedido confirmado! Agora disponível para vincular ao Container.');
      } else if (novoStatus === 'Recebido') {
        adicionarNotificacao('sucesso', '✅ Pedido marcado como recebido!');
      } else {
        adicionarNotificacao('info', `Status atualizado para ${novoStatus}`);
      }
      recarregarPedidos();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao atualizar status');
    }
  };

  // Helpers para quantidades individuais por produto
  const getQtd = useCallback((produtoId: number) => qtdPorProduto[produtoId] || { sarom: 0, alexandre: 0 }, [qtdPorProduto]);
  const setQtdSarom = useCallback((produtoId: number, val: number) => {
    setQtdPorProduto(prev => ({ ...prev, [produtoId]: { sarom: val, alexandre: prev[produtoId]?.alexandre || 0 } }));
  }, []);
  const setQtdAlexandre = useCallback((produtoId: number, val: number) => {
    setQtdPorProduto(prev => ({ ...prev, [produtoId]: { sarom: prev[produtoId]?.sarom || 0, alexandre: val } }));
  }, []);

  // Adicionar item individual
  const handleAdicionarItem = async (produtoId: number) => {
    if (!pedidoAtivo) return;
    const qtd = getQtd(produtoId);
    if (qtd.sarom <= 0 && qtd.alexandre <= 0) {
      adicionarNotificacao('erro', 'Informe pelo menos uma quantidade');
      return;
    }
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return;

    try {
      await adicionarItemMutation.mutateAsync({
        pedidoId: pedidoAtivo,
        produtoId: produto.codigo,
        quantidadeSarom: qtd.sarom,
        quantidadeAlexandre: qtd.alexandre,
        precoUnitario: produto.custo_usd,
      });
      adicionarNotificacao('sucesso', `${produto.codigo} adicionado ao pedido!`);
      setQtdPorProduto(prev => {
        const copy = { ...prev };
        delete copy[produtoId];
        return copy;
      });
      recarregarItens();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao adicionar item');
    }
  };

  // Salvar todos os produtos com quantidade preenchida de uma vez
  const handleSalvarTodos = async () => {
    if (!pedidoAtivo) return;
    const itensParaSalvar = Object.entries(qtdPorProduto)
      .filter(([_, v]) => v.sarom > 0 || v.alexandre > 0)
      .map(([produtoId, qtd]) => {
        const produto = produtos.find(p => p.id === Number(produtoId));
        if (!produto) return null;
        return {
          produtoId: produto.codigo,
          quantidadeSarom: qtd.sarom,
          quantidadeAlexandre: qtd.alexandre,
          precoUnitario: produto.custo_usd,
        };
      })
      .filter(Boolean) as { produtoId: string; quantidadeSarom: number; quantidadeAlexandre: number; precoUnitario: number }[];

    if (itensParaSalvar.length === 0) {
      adicionarNotificacao('erro', 'Preencha a quantidade de pelo menos um produto');
      return;
    }

    setSalvandoBatch(true);
    try {
      await adicionarBatchMutation.mutateAsync({
        pedidoId: pedidoAtivo,
        itens: itensParaSalvar,
      });
      adicionarNotificacao('sucesso', `${itensParaSalvar.length} produto(s) adicionado(s) ao pedido!`);
      setQtdPorProduto({});
      recarregarItens();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao salvar itens');
    } finally {
      setSalvandoBatch(false);
    }
  };

  const handleRemoverItem = async (itemId: number) => {
    try {
      await removerItemMutation.mutateAsync({ itemId });
      adicionarNotificacao('sucesso', 'Item removido do pedido');
      recarregarItens();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao remover item');
    }
  };

  // Calcular totais do pedido ativo
  const totais = useMemo(() => {
    let totalSarom = 0;
    let totalAlexandre = 0;
    let totalItens = 0;
    itensDoPedido.forEach((item: any) => {
      const preco = parseFloat(item.precoUnitario) || 0;
      totalSarom += preco * (item.quantidadeSarom || 0);
      totalAlexandre += preco * (item.quantidadeAlexandre || 0);
      totalItens += (item.quantidadeSarom || 0) + (item.quantidadeAlexandre || 0);
    });
    return { totalSarom, totalAlexandre, totalGeral: totalSarom + totalAlexandre, totalItens };
  }, [itensDoPedido]);

  // Obter contagem de itens por pedido
  const { data: todosItens = [] } = trpc.itemPedido.getAll.useQuery();
  const getItemCount = (pedidoId: number) => {
    return todosItens.filter((i: any) => i.pedidoId === pedidoId).length;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pendente': return <Clock className="w-4 h-4" />;
      case 'Confirmado': return <Send className="w-4 h-4" />;
      case 'Recebido': return <CheckCheck className="w-4 h-4" />;
      default: return null;
    }
  };

  // Contagem de produtos por categoria
  const categoriaCount = useMemo(() => {
    const counts: Record<string, number> = {};
    categorias.forEach(cat => {
      counts[cat] = produtos.filter(p => p.categoria === cat).length;
    });
    return counts;
  }, []);

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-asx-dark)', color: 'var(--color-asx-text)' }}>
      {/* Header */}
      <div className="px-4 md:px-6 py-3 border-b flex items-center gap-3" style={{ borderColor: 'var(--color-asx-surface-3)' }}>
        {pedidoAtivo ? (
          <button
            onClick={() => { setPedidoAtivo(null); setCategoriaAtiva(null); setQtdPorProduto({}); setBuscaProduto(''); }}
            className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
            style={{ background: 'var(--color-asx-surface)', color: 'var(--color-asx-text-heading)' }}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Voltar aos Pedidos</span>
          </button>
        ) : (
          <button
            onClick={() => setLocation('/')}
            className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
            style={{ background: 'var(--color-asx-surface)', color: 'var(--color-asx-text-heading)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Menu</span>
          </button>
        )}
        <span className="font-rajdhani font-bold text-lg tracking-wide" style={{ color: 'var(--color-asx-text-heading)' }}>
          {pedidoAtivo ? `PEDIDO #${pedidoAtivo}` : 'GERENCIADOR DE PEDIDOS'}
        </span>
      </div>

      {/* ===== LISTA DE PEDIDOS ===== */}
      {!pedidoAtivo && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Criar novo pedido */}
          <div className="border-b px-4 md:px-6 py-4" style={{ background: 'var(--color-asx-base)', borderColor: 'var(--color-asx-surface-3)' }}>
            <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'var(--color-asx-text-muted)' }}>GERAR NOVO PEDIDO</p>
            <div className="flex gap-2 md:flex-row flex-col">
              <input
                type="text"
                placeholder="Nome do pedido..."
                value={novoNomePedido}
                onChange={e => setNovoNomePedido(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCriarPedido()}
                className="flex-1 px-4 py-3 rounded-md border text-sm h-11"
                style={{
                  background: 'var(--color-asx-surface-2)',
                  borderColor: 'var(--color-asx-border)',
                  color: 'var(--color-asx-text)',
                }}
              />
              <button
                onClick={handleCriarPedido}
                disabled={criarPedidoMutation.isPending}
                className="px-4 py-3 rounded-md font-medium transition-colors flex items-center gap-2 h-11 md:w-auto w-full justify-center"
                style={{
                  background: 'var(--color-asx-red)',
                  color: 'white',
                  opacity: criarPedidoMutation.isPending ? 0.6 : 1,
                }}
              >
                <Plus className="w-4 h-4" />
                Novo Pedido
              </button>
            </div>
          </div>

          {/* Filtros de status */}
          <div className="border-b px-4 md:px-6 py-3 flex gap-2 flex-wrap" style={{ borderColor: 'var(--color-asx-surface-3)' }}>
            {(['Todos', 'Pendente', 'Confirmado', 'Recebido'] as const).map(s => {
              const count = s === 'Todos' ? pedidosDb.length : pedidosDb.filter((p: any) => p.status === s).length;
              const isActive = statusFiltro === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFiltro(s)}
                  className="px-4 py-2 rounded-md text-xs font-semibold transition-colors"
                  style={{
                    background: isActive ? 'var(--color-asx-red)' : 'var(--color-asx-surface-2)',
                    color: isActive ? 'white' : 'var(--color-asx-text-muted)',
                  }}
                >
                  {s} ({count})
                </button>
              );
            })}
          </div>

          {/* Lista de pedidos */}
          <div className="flex-1 overflow-auto p-4 md:p-6">
            {carregandoPedidos ? (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: 'var(--color-asx-text-muted)' }}>Carregando pedidos...</p>
              </div>
            ) : pedidosFiltrados.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-asx-border)' }} />
                <p className="text-sm" style={{ color: 'var(--color-asx-text-muted)' }}>
                  {statusFiltro === 'Todos' ? 'Nenhum pedido criado ainda.' : `Nenhum pedido com status "${statusFiltro}".`}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pedidosFiltrados.map((pedido: any) => {
                  const itemCount = getItemCount(pedido.id);
                  const statusColor = pedido.status === 'Pendente' ? 'var(--color-asx-error)' :
                    pedido.status === 'Confirmado' ? 'var(--color-asx-info)' : 'var(--color-asx-success)';
                  return (
                    <div key={pedido.id}>
                      {/* Desktop */}
                      <div
                        className="hidden md:flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors hover:border-red-800"
                        style={{ background: 'var(--color-asx-surface)', borderColor: 'var(--color-asx-surface-3)' }}
                        onClick={() => { setPedidoAtivo(pedido.id); setCategoriaAtiva(null); setQtdPorProduto({}); }}
                      >
                        <div className="flex items-center gap-4">
                          <span className="font-rajdhani font-bold text-sm" style={{ color: 'var(--color-asx-text-muted)' }}>
                            #{pedido.id}
                          </span>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: 'var(--color-asx-text)' }}>{pedido.nome}</p>
                            <p className="text-xs" style={{ color: 'var(--color-asx-text-muted)' }}>
                              {itemCount} {itemCount === 1 ? 'item' : 'itens'} • {new Date(pedido.dataCreacao).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className="px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1"
                            style={{ background: statusColor, color: 'white' }}
                          >
                            {getStatusIcon(pedido.status)}
                            {pedido.status}
                          </span>
                          <button
                            onClick={e => { e.stopPropagation(); handleDeletarPedido(pedido.id); }}
                            className="p-2 rounded transition-colors hover:opacity-75"
                            style={{ color: 'var(--color-asx-text-muted)' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Mobile */}
                      <div className="md:hidden">
                        <OrderCard
                          id={pedido.id}
                          nome={pedido.nome}
                          status={pedido.status}
                          dataCreacao={pedido.dataCreacao}
                          itemCount={itemCount}
                          onView={() => { setPedidoAtivo(pedido.id); setCategoriaAtiva(null); setQtdPorProduto({}); }}
                          onDelete={() => handleDeletarPedido(pedido.id)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== DETALHES DO PEDIDO ===== */}
      {pedidoAtivo && pedidoAtivoObj && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Info do Pedido */}
          <div className="border-b px-4 md:px-6 py-4" style={{ background: 'var(--color-asx-base)', borderColor: 'var(--color-asx-surface-3)' }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="font-rajdhani font-bold text-xl" style={{ color: 'var(--color-asx-text)' }}>
                  {pedidoAtivoObj.nome}
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--color-asx-text-muted)' }}>
                  Criado em {new Date(pedidoAtivoObj.dataCreacao).toLocaleDateString('pt-BR')} • {itensDoPedido.length} {itensDoPedido.length === 1 ? 'item' : 'itens'}
                </p>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 flex-wrap">
                {(['Pendente', 'Confirmado', 'Recebido'] as const).map(s => {
                  const isActive = pedidoAtivoObj.status === s;
                  const color = s === 'Pendente' ? 'var(--color-asx-error)' : s === 'Confirmado' ? 'var(--color-asx-info)' : 'var(--color-asx-success)';
                  return (
                    <button
                      key={s}
                      onClick={() => !isActive && handleAtualizarStatus(pedidoAtivo, s)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1"
                      style={{
                        background: isActive ? color : 'var(--color-asx-surface-2)',
                        color: isActive ? 'white' : 'var(--color-asx-text-muted)',
                        border: `1px solid ${isActive ? color : 'var(--color-asx-border)'}`,
                      }}
                    >
                      {getStatusIcon(s)}
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Totais */}
            {itensDoPedido.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="p-3 rounded-lg" style={{ background: 'var(--color-asx-surface-2)' }}>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>Qtd Total</p>
                  <p className="font-rajdhani font-bold text-lg" style={{ color: 'var(--color-asx-text-heading)' }}>{totais.totalItens}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'var(--color-asx-surface-2)' }}>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>Total Sarom</p>
                  <p className="font-rajdhani font-bold text-lg" style={{ color: 'var(--color-asx-info)' }}>{formatUSD(totais.totalSarom)}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'var(--color-asx-surface-2)' }}>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>Total Alexandre</p>
                  <p className="font-rajdhani font-bold text-lg" style={{ color: 'var(--color-asx-success)' }}>{formatUSD(totais.totalAlexandre)}</p>
                </div>
                <div className="p-3 rounded-lg" style={{ background: 'var(--color-asx-surface-2)' }}>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-asx-text-muted)' }}>Total Geral</p>
                  <p className="font-rajdhani font-bold text-lg" style={{ color: 'var(--color-asx-red)' }}>{formatUSD(totais.totalGeral)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Conteúdo do Pedido */}
          <div className="flex-1 overflow-auto p-4 md:p-6 space-y-6">

            {/* ===== SELETOR DE CATEGORIA + BUSCA ===== */}
            <div className="p-4 rounded-lg border" style={{ background: 'var(--color-asx-base)', borderColor: 'var(--color-asx-border)' }}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-asx-text-heading)' }}>
                <Plus className="w-4 h-4" style={{ color: 'var(--color-asx-red)' }} />
                Adicionar Produtos ao Pedido
              </h3>

              {/* Busca rápida por código */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-asx-text-muted)' }} />
                <input
                  type="text"
                  placeholder="Busca rápida por código, nome ou cód. barras..."
                  value={buscaProduto}
                  onChange={e => { setBuscaProduto(e.target.value); if (e.target.value.trim()) setCategoriaAtiva(null); }}
                  className="w-full pl-9 pr-10 py-3 rounded-md border text-sm h-11"
                  style={{
                    background: 'var(--color-asx-surface-2)',
                    borderColor: 'var(--color-asx-border)',
                    color: 'var(--color-asx-text)',
                  }}
                />
                {buscaProduto && (
                  <button onClick={() => setBuscaProduto('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-3.5 h-3.5" style={{ color: 'var(--color-asx-text-muted)' }} />
                  </button>
                )}
              </div>

              {/* Separador */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px" style={{ background: 'var(--color-asx-surface-3)' }} />
                <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'var(--color-asx-text-muted)' }}>ou selecione uma categoria</span>
                <div className="flex-1 h-px" style={{ background: 'var(--color-asx-surface-3)' }} />
              </div>

              {/* Grid de Categorias */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-4">
                {categorias.map(cat => {
                  const isActive = categoriaAtiva === cat && !buscaProduto.trim();
                  const count = categoriaCount[cat] || 0;
                  return (
                    <button
                      key={cat}
                      onClick={() => { setCategoriaAtiva(cat); setBuscaProduto(''); }}
                      className="p-3 rounded-lg border text-left transition-all"
                      style={{
                        background: isActive ? 'var(--color-asx-red)' : 'var(--color-asx-surface)',
                        borderColor: isActive ? 'var(--color-asx-red)' : 'var(--color-asx-surface-3)',
                        color: isActive ? 'white' : 'var(--color-asx-text-secondary)',
                      }}
                    >
                      <FolderOpen className="w-4 h-4 mb-1" style={{ opacity: 0.7 }} />
                      <p className="text-xs font-semibold truncate">{cat.replace('Linha ', '')}</p>
                      <p className="text-[10px] mt-0.5" style={{ opacity: 0.6 }}>{count} produtos</p>
                    </button>
                  );
                })}
              </div>

              {/* ===== LISTA DE PRODUTOS DA CATEGORIA ===== */}
              {produtosDaCategoria.length > 0 && (
                <>
                  {/* Header com botão Salvar Todos */}
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold" style={{ color: 'var(--color-asx-text-muted)' }}>
                      {buscaProduto.trim() ? (
                        <>Resultados para "{buscaProduto}" — {produtosDaCategoria.length} produto(s)</>
                      ) : (
                        <>{categoriaAtiva} — {produtosDaCategoria.length} produtos</>
                      )}
                    </p>
                    {produtosComQtd > 0 && (
                      <button
                        onClick={handleSalvarTodos}
                        disabled={salvandoBatch}
                        className="px-4 py-2 rounded-md text-xs font-semibold transition-colors flex items-center gap-2"
                        style={{
                          background: 'var(--color-asx-success)',
                          color: 'white',
                          opacity: salvandoBatch ? 0.6 : 1,
                        }}
                      >
                        <Save className="w-3.5 h-3.5" />
                        {salvandoBatch ? 'Salvando...' : `Salvar ${produtosComQtd} produto(s)`}
                      </button>
                    )}
                  </div>

                  {/* Tabela de produtos */}
                  <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-asx-surface-3)' }}>
                    {/* Header Desktop */}
                    <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 text-[10px] uppercase tracking-wider font-semibold"
                      style={{ background: 'var(--color-asx-surface)', color: 'var(--color-asx-text-muted)' }}>
                      <div className="col-span-2">Código</div>
                      <div className="col-span-4">Produto</div>
                      <div className="col-span-1 text-center">Custo USD</div>
                      <div className="col-span-1 text-center">Venda R$</div>
                      <div className="col-span-1 text-center">Sarom</div>
                      <div className="col-span-1 text-center">Alexandre</div>
                      <div className="col-span-2 text-center">Ação</div>
                    </div>

                    <div className="max-h-[400px] overflow-auto divide-y" style={{ borderColor: 'var(--color-asx-surface-2)' }}>
                      {produtosDaCategoria.map(produto => {
                        const qtd = getQtd(produto.id);
                        const jaAdicionado = itensNoPedido.has(produto.codigo);
                        const temQtd = qtd.sarom > 0 || qtd.alexandre > 0;

                        return (
                          <div key={produto.id}>
                            {/* Desktop */}
                            <div
                              className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 items-center transition-colors"
                              style={{
                                background: jaAdicionado ? 'color-mix(in oklch, var(--color-asx-success) 15%, transparent)' : temQtd ? 'color-mix(in oklch, var(--color-asx-info) 15%, transparent)' : 'var(--color-asx-dark)',
                              }}
                            >
                              <div className="col-span-2">
                                <span className="font-rajdhani font-bold text-sm" style={{ color: jaAdicionado ? 'var(--color-asx-success)' : 'var(--color-asx-red)' }}>
                                  {produto.codigo}
                                </span>
                                {jaAdicionado && (
                                  <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-asx-success)', color: 'white' }}>
                                    ✓ no pedido
                                  </span>
                                )}
                              </div>
                              <div className="col-span-4 text-xs truncate" style={{ color: 'var(--color-asx-text-secondary)' }}>
                                {produto.descricao}
                              </div>
                              <div className="col-span-1 text-center text-xs" style={{ color: 'var(--color-asx-text-heading)' }}>
                                {formatUSD(produto.custo_usd)}
                              </div>
                              <div className="col-span-1 text-center text-xs" style={{ color: 'var(--color-asx-text-muted)' }}>
                                R$ {produto.preco_venda.toFixed(2)}
                              </div>
                              <div className="col-span-1 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={qtd.sarom || ''}
                                  placeholder="0"
                                  onChange={e => setQtdSarom(produto.id, parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1.5 rounded border text-center text-sm"
                                  style={{
                                    background: 'var(--color-asx-surface-2)',
                                    borderColor: qtd.sarom > 0 ? 'var(--color-asx-info)' : 'var(--color-asx-border)',
                                    color: 'var(--color-asx-text)',
                                  }}
                                />
                              </div>
                              <div className="col-span-1 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={qtd.alexandre || ''}
                                  placeholder="0"
                                  onChange={e => setQtdAlexandre(produto.id, parseInt(e.target.value) || 0)}
                                  className="w-full px-2 py-1.5 rounded border text-center text-sm"
                                  style={{
                                    background: 'var(--color-asx-surface-2)',
                                    borderColor: qtd.alexandre > 0 ? 'var(--color-asx-success)' : 'var(--color-asx-border)',
                                    color: 'var(--color-asx-text)',
                                  }}
                                />
                              </div>
                              <div className="col-span-2 text-center">
                                <button
                                  onClick={() => handleAdicionarItem(produto.id)}
                                  disabled={adicionarItemMutation.isPending || (!qtd.sarom && !qtd.alexandre)}
                                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                  style={{
                                    background: (qtd.sarom > 0 || qtd.alexandre > 0) ? 'var(--color-asx-red)' : 'var(--color-asx-surface-2)',
                                    color: (qtd.sarom > 0 || qtd.alexandre > 0) ? 'white' : 'var(--color-asx-text-muted)',
                                    opacity: adicionarItemMutation.isPending ? 0.6 : 1,
                                  }}
                                >
                                  <Plus className="w-3 h-3 inline mr-1" />
                                  Adicionar
                                </button>
                              </div>
                            </div>

                            {/* Mobile */}
                            <div
                              className="md:hidden p-3 space-y-2"
                              style={{
                                background: jaAdicionado ? 'color-mix(in oklch, var(--color-asx-success) 15%, transparent)' : temQtd ? 'color-mix(in oklch, var(--color-asx-info) 15%, transparent)' : 'var(--color-asx-dark)',
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-rajdhani font-bold text-sm" style={{ color: jaAdicionado ? 'var(--color-asx-success)' : 'var(--color-asx-red)' }}>
                                      {produto.codigo}
                                    </span>
                                    {jaAdicionado && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--color-asx-success)', color: 'white' }}>
                                        ✓
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs truncate" style={{ color: 'var(--color-asx-text-secondary)' }}>{produto.descricao}</p>
                                  <p className="text-xs mt-1" style={{ color: 'var(--color-asx-text-muted)' }}>
                                    Custo: {formatUSD(produto.custo_usd)} • Venda: R$ {produto.preco_venda.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <label className="text-[10px] uppercase block mb-1" style={{ color: 'var(--color-asx-text-muted)' }}>Sarom</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={qtd.sarom || ''}
                                    placeholder="0"
                                    onChange={e => setQtdSarom(produto.id, parseInt(e.target.value) || 0)}
                                    className="w-full px-2 py-2 rounded border text-center text-sm"
                                    style={{
                                      background: 'var(--color-asx-surface-2)',
                                      borderColor: qtd.sarom > 0 ? 'var(--color-asx-info)' : 'var(--color-asx-border)',
                                      color: 'var(--color-asx-text)',
                                    }}
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-[10px] uppercase block mb-1" style={{ color: 'var(--color-asx-text-muted)' }}>Alexandre</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={qtd.alexandre || ''}
                                    placeholder="0"
                                    onChange={e => setQtdAlexandre(produto.id, parseInt(e.target.value) || 0)}
                                    className="w-full px-2 py-2 rounded border text-center text-sm"
                                    style={{
                                      background: 'var(--color-asx-surface-2)',
                                      borderColor: qtd.alexandre > 0 ? 'var(--color-asx-success)' : 'var(--color-asx-border)',
                                      color: 'var(--color-asx-text)',
                                    }}
                                  />
                                </div>
                                <button
                                  onClick={() => handleAdicionarItem(produto.id)}
                                  disabled={adicionarItemMutation.isPending || (!qtd.sarom && !qtd.alexandre)}
                                  className="px-3 py-2 rounded-md text-xs font-medium transition-colors mt-4"
                                  style={{
                                    background: (qtd.sarom > 0 || qtd.alexandre > 0) ? 'var(--color-asx-red)' : 'var(--color-asx-surface-2)',
                                    color: (qtd.sarom > 0 || qtd.alexandre > 0) ? 'white' : 'var(--color-asx-text-muted)',
                                  }}
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Botão Salvar Todos (fixo no final) */}
                  {produtosComQtd > 0 && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={handleSalvarTodos}
                        disabled={salvandoBatch}
                        className="px-6 py-3 rounded-md text-sm font-semibold transition-colors flex items-center gap-2"
                        style={{
                          background: 'var(--color-asx-success)',
                          color: 'white',
                          opacity: salvandoBatch ? 0.6 : 1,
                        }}
                      >
                        <Save className="w-4 h-4" />
                        {salvandoBatch ? 'Salvando...' : `Salvar ${produtosComQtd} produto(s) ao pedido`}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Mensagem quando nenhuma categoria selecionada */}
              {!categoriaAtiva && !buscaProduto.trim() && (
                <div className="text-center py-6">
                  <Filter className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--color-asx-border)' }} />
                  <p className="text-xs" style={{ color: 'var(--color-asx-text-muted)' }}>
                    Selecione uma categoria acima ou use a busca rápida para encontrar produtos
                  </p>
                </div>
              )}

              {buscaProduto.trim() && produtosDaCategoria.length === 0 && (
                <p className="text-xs text-center py-4" style={{ color: 'var(--color-asx-text-muted)' }}>
                  Nenhum produto encontrado para "{buscaProduto}"
                </p>
              )}
            </div>

            {/* ===== ITENS JÁ NO PEDIDO ===== */}
            <div className="p-4 rounded-lg border" style={{ background: 'var(--color-asx-base)', borderColor: 'var(--color-asx-border)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-asx-text-heading)' }}>
                Itens do Pedido ({itensDoPedido.length})
              </h3>

              {itensDoPedido.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--color-asx-border)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-asx-text-muted)' }}>
                    Nenhum item adicionado ainda. Selecione uma categoria e preencha as quantidades.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Header Desktop */}
                  <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-2 text-[10px] uppercase tracking-wider font-semibold"
                    style={{ color: 'var(--color-asx-text-muted)' }}>
                    <div className="col-span-2">Código</div>
                    <div className="col-span-3">Produto</div>
                    <div className="col-span-1 text-center">Custo USD</div>
                    <div className="col-span-1 text-center">Qtd Sarom</div>
                    <div className="col-span-1 text-center">Qtd Alexandre</div>
                    <div className="col-span-1 text-center">Subtotal Sarom</div>
                    <div className="col-span-1 text-center">Subtotal Alex</div>
                    <div className="col-span-1 text-center">Total</div>
                    <div className="col-span-1 text-center">Ação</div>
                  </div>

                  {itensDoPedido.map((item: any) => {
                    const produto = produtos.find(p => p.codigo === item.produtoId);
                    const preco = parseFloat(item.precoUnitario) || 0;
                    const subtotalSarom = preco * (item.quantidadeSarom || 0);
                    const subtotalAlexandre = preco * (item.quantidadeAlexandre || 0);
                    const total = subtotalSarom + subtotalAlexandre;

                    return (
                      <div key={item.id}>
                        {/* Desktop */}
                        <div className="hidden md:grid grid-cols-12 gap-2 px-3 py-3 rounded-md items-center"
                          style={{ background: 'var(--color-asx-surface)' }}>
                          <div className="col-span-2 font-rajdhani font-bold text-sm" style={{ color: 'var(--color-asx-red)' }}>
                            {item.produtoId}
                          </div>
                          <div className="col-span-3 text-xs truncate" style={{ color: 'var(--color-asx-text-secondary)' }}>
                            {produto?.descricao || 'Produto não encontrado'}
                          </div>
                          <div className="col-span-1 text-center text-xs" style={{ color: 'var(--color-asx-text-heading)' }}>
                            {formatUSD(preco)}
                          </div>
                          <div className="col-span-1 text-center text-sm font-medium" style={{ color: 'var(--color-asx-info)' }}>
                            {item.quantidadeSarom}
                          </div>
                          <div className="col-span-1 text-center text-sm font-medium" style={{ color: 'var(--color-asx-success)' }}>
                            {item.quantidadeAlexandre}
                          </div>
                          <div className="col-span-1 text-center text-xs" style={{ color: 'var(--color-asx-info)' }}>
                            {formatUSD(subtotalSarom)}
                          </div>
                          <div className="col-span-1 text-center text-xs" style={{ color: 'var(--color-asx-success)' }}>
                            {formatUSD(subtotalAlexandre)}
                          </div>
                          <div className="col-span-1 text-center text-xs font-bold" style={{ color: 'var(--color-asx-red)' }}>
                            {formatUSD(total)}
                          </div>
                          <div className="col-span-1 text-center">
                            <button
                              onClick={() => handleRemoverItem(item.id)}
                              className="p-1.5 rounded transition-colors hover:opacity-75"
                              style={{ color: 'var(--color-asx-error)' }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Mobile */}
                        <div className="md:hidden p-3 rounded-md space-y-2"
                          style={{ background: 'var(--color-asx-surface)' }}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-rajdhani font-bold text-sm" style={{ color: 'var(--color-asx-red)' }}>
                                {item.produtoId}
                              </p>
                              <p className="text-xs truncate" style={{ color: 'var(--color-asx-text-secondary)' }}>
                                {produto?.descricao || 'Produto não encontrado'}
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemoverItem(item.id)}
                              className="p-1.5 rounded transition-colors"
                              style={{ color: 'var(--color-asx-error)' }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <p style={{ color: 'var(--color-asx-text-muted)' }}>Custo</p>
                              <p style={{ color: 'var(--color-asx-text-heading)' }}>{formatUSD(preco)}</p>
                            </div>
                            <div>
                              <p style={{ color: 'var(--color-asx-text-muted)' }}>Sarom</p>
                              <p style={{ color: 'var(--color-asx-info)' }}>{item.quantidadeSarom}</p>
                            </div>
                            <div>
                              <p style={{ color: 'var(--color-asx-text-muted)' }}>Alexandre</p>
                              <p style={{ color: 'var(--color-asx-success)' }}>{item.quantidadeAlexandre}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold" style={{ color: 'var(--color-asx-red)' }}>
                              Total: {formatUSD(total)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notificações */}
      <NotificacoesPedidos notificacoes={notificacoes} />
    </div>
  );
}
