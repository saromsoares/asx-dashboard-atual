import { useState, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { NotificacoesPedidos } from '@/components/NotificacoesPedidos';
import { ContainerCard } from '@/components/ContainerCard';
import {
  Plus,
  Trash2,
  Package,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Link2,
  Unlink2,
  AlertCircle,
  LayoutGrid,
  List,
} from 'lucide-react';

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  'Vazio': { bg: 'oklch(0.20 0.10 285 / 0.3)', text: 'oklch(0.70 0.010 285)', border: 'oklch(0.50 0.015 285)' },
  'Preenchendo': { bg: 'oklch(0.20 0.10 25 / 0.3)', text: 'oklch(0.75 0.15 25)', border: 'oklch(0.55 0.22 25)' },
  'Cheio': { bg: 'oklch(0.20 0.10 145 / 0.3)', text: 'oklch(0.72 0.17 145)', border: 'oklch(0.50 0.17 145)' },
  'Enviado': { bg: 'oklch(0.20 0.10 270 / 0.3)', text: 'oklch(0.70 0.12 270)', border: 'oklch(0.55 0.15 270)' },
  'Entregue': { bg: 'oklch(0.20 0.10 145 / 0.3)', text: 'oklch(0.72 0.17 145)', border: 'oklch(0.50 0.17 145)' },
};

interface Notificacao {
  id: string;
  tipo: 'sucesso' | 'erro' | 'info';
  mensagem: string;
}

export default function Containers() {
  const [, setLocation] = useLocation();
  const [novoNumeroContainer, setNovoNumeroContainer] = useState<string>('');
  const [containerExpandido, setContainerExpandido] = useState<number | null>(null);
  const [containerSelecionado, setContainerSelecionado] = useState<number | null>(null);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  // Queries e mutations
  const { data: containers = [], isLoading: carregandoContainers, refetch: recarregarContainers } = trpc.container.getAllComPedidos.useQuery();
  const { data: pedidosConfirmados = [] } = trpc.pedido.getAll.useQuery();
  const { data: pedidosDoContainer = [] } = trpc.containerPedido.getPedidos.useQuery(
    { containerId: containerSelecionado || 0 },
    { enabled: containerSelecionado !== null }
  );
  const criarContainerMutation = trpc.container.criar.useMutation();
  const vincularPedidoMutation = trpc.containerPedido.vincular.useMutation();
  const desvincularPedidoMutation = trpc.containerPedido.desvincular.useMutation();
  const atualizarStatusContainerMutation = trpc.container.atualizarStatus.useMutation();
  const deletarContainerMutation = trpc.container.deletar.useMutation();

  // Adicionar notificação
  const adicionarNotificacao = useCallback((tipo: 'sucesso' | 'erro' | 'info', mensagem: string) => {
    const id = `notif_${Date.now()}`;
    setNotificacoes(prev => [...prev, { id, tipo, mensagem }]);
    setTimeout(() => {
      setNotificacoes(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // Criar novo container
  const handleCriarContainer = useCallback(async () => {
    if (!novoNumeroContainer.trim()) {
      adicionarNotificacao('erro', 'Digite um número para o container');
      return;
    }

    try {
      await criarContainerMutation.mutateAsync({ numero: novoNumeroContainer });
      adicionarNotificacao('sucesso', `Container ${novoNumeroContainer} criado com sucesso!`);
      setNovoNumeroContainer('');
      recarregarContainers();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao criar container');
    }
  }, [novoNumeroContainer, criarContainerMutation, adicionarNotificacao, recarregarContainers]);

  // Vincular pedido ao container
  const handleVincularPedido = useCallback(async (containerId: number, pedidoId: number) => {
    try {
      await vincularPedidoMutation.mutateAsync({ containerId, pedidoId });
      adicionarNotificacao('sucesso', 'Pedido vinculado ao container!');
      recarregarContainers();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao vincular pedido');
    }
  }, [vincularPedidoMutation, adicionarNotificacao, recarregarContainers]);

  // Desvincular pedido
  const handleDesvincularPedido = useCallback(async (containerPedidoId: number) => {
    try {
      await desvincularPedidoMutation.mutateAsync({ containerPedidoId });
      adicionarNotificacao('sucesso', 'Pedido desvinculado do container');
      recarregarContainers();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao desvincular pedido');
    }
  }, [desvincularPedidoMutation, adicionarNotificacao, recarregarContainers]);

  // Atualizar status do container
  const handleAtualizarStatus = useCallback(async (containerId: number, novoStatus: string) => {
    try {
      await atualizarStatusContainerMutation.mutateAsync({
        containerId,
        novoStatus: novoStatus as "Vazio" | "Preenchendo" | "Cheio" | "Enviado" | "Entregue",
      });
      adicionarNotificacao('sucesso', `Status atualizado para ${novoStatus}`);
      recarregarContainers();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao atualizar status');
    }
  }, [atualizarStatusContainerMutation, adicionarNotificacao, recarregarContainers]);

  // Deletar container
  const handleDeletarContainer = useCallback(async (containerId: number) => {
    if (!confirm('Tem certeza que deseja deletar este container?')) return;

    try {
      await deletarContainerMutation.mutateAsync({ containerId });
      adicionarNotificacao('sucesso', 'Container deletado com sucesso');
      recarregarContainers();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao deletar container');
    }
  }, [deletarContainerMutation, adicionarNotificacao, recarregarContainers]);

  // Filtrar pedidos confirmados que não estão vinculados
  const pedidosDisponiveis = useMemo(() => {
    return pedidosConfirmados.filter((p: any) => p.status === 'Confirmado');
  }, [pedidosConfirmados]);

  return (
    <div className="h-full flex flex-col" style={{ background: 'oklch(0.12 0.005 285)', color: 'oklch(0.95 0.005 65)' }}>
      {/* Botão Voltar */}
      <div className="px-6 py-3 border-b flex items-center" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
          style={{ background: 'oklch(0.16 0.005 285)', color: 'oklch(0.80 0.005 65)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Menu</span>
        </button>
      </div>

      {/* Header */}
      <header className="z-40 border-b px-6 h-14 flex items-center gap-4 flex-shrink-0" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
        <span className="font-rajdhani font-bold text-lg tracking-wide" style={{ color: 'oklch(0.80 0.005 65)' }}>
          GERENCIAMENTO DE CONTAINERS
        </span>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-auto p-6">
        {/* Seção de Criar Container */}
        <div className="mb-8 p-6 rounded-lg border" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: 'oklch(0.85 0.005 65)' }}>Criar Novo Container</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Ex: CONT-001, CONT-002..."
              value={novoNumeroContainer}
              onChange={e => setNovoNumeroContainer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCriarContainer()}
              className="flex-1 px-4 py-2 rounded-md border"
              style={{
                background: 'oklch(0.18 0.005 285)',
                borderColor: 'oklch(0.28 0.005 285)',
                color: 'oklch(0.90 0.005 65)',
              }}
            />
            <button
              onClick={handleCriarContainer}
              disabled={criarContainerMutation.isPending}
              className="px-6 py-2 rounded-md font-semibold flex items-center gap-2 transition-colors"
              style={{
                background: 'oklch(0.48 0.22 25)',
                color: 'white',
                opacity: criarContainerMutation.isPending ? 0.6 : 1,
              }}
            >
              <Plus className="w-4 h-4" />
              Criar
            </button>
          </div>
        </div>

        {/* Containers - Mobile Cards */}
        <div className="md:hidden space-y-3">
          {carregandoContainers ? (
            <div className="text-center py-12" style={{ color: 'oklch(0.50 0.010 285)' }}>
              Carregando containers...
            </div>
          ) : containers.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-3" style={{ color: 'oklch(0.50 0.010 285)' }}>
              <Package className="w-12 h-12" />
              <p>Nenhum container criado ainda</p>
            </div>
          ) : (
            containers.map((container: any) => (
              <ContainerCard
                key={container.id}
                id={container.id}
                numero={container.numero}
                status={container.status}
                capacidadeMaxima={container.capacidade_maxima}
                pesoMaximo={container.peso_maximo}
                pedidosCount={container.pedidosCount || 0}
                onEdit={() => setContainerSelecionado(container.id)}
                onDelete={() => handleDeletarContainer(container.id)}
                onManagePedidos={() => setContainerSelecionado(container.id)}
              />
            ))
          )}
        </div>

        {/* Containers - Desktop */}
        <div className="hidden md:block space-y-4">
          {carregandoContainers ? (
            <div className="text-center py-12" style={{ color: 'oklch(0.50 0.010 285)' }}>
              Carregando containers...
            </div>
          ) : containers.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-3" style={{ color: 'oklch(0.50 0.010 285)' }}>
              <Package className="w-12 h-12" />
              <p>Nenhum container criado ainda</p>
            </div>
          ) : (
            containers.map((container: any) => {
              const cores = statusColors[container.status] || statusColors['Vazio'];
              const isExpanded = containerExpandido === container.id;

              return (
                <div
                  key={container.id}
                  className="rounded-lg border overflow-hidden"
                  style={{ borderColor: 'oklch(0.26 0.005 285)', background: 'oklch(0.14 0.005 285)' }}
                >
                  {/* Header do Container */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:brightness-110 transition-all"
                    onClick={() => setContainerExpandido(isExpanded ? null : container.id)}
                    style={{ background: cores.bg, borderBottom: `1px solid ${cores.border}` }}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Package className="w-5 h-5" style={{ color: cores.text }} />
                      <div>
                        <p className="font-semibold" style={{ color: cores.text }}>
                          {container.numero}
                        </p>
                        <p className="text-xs" style={{ color: cores.text, opacity: 0.7 }}>
                          {container.pedidosCount || 0} pedido(s) vinculado(s)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={container.status}
                        onChange={e => {
                          e.stopPropagation();
                          handleAtualizarStatus(container.id, e.target.value);
                        }}
                        className="px-3 py-1 rounded text-xs font-semibold"
                        style={{
                          background: cores.bg,
                          color: cores.text,
                          border: `1px solid ${cores.border}`,
                        }}
                      >
                        <option value="Vazio">Vazio</option>
                        <option value="Preenchendo">Preenchendo</option>
                        <option value="Cheio">Cheio</option>
                        <option value="Enviado">Enviado</option>
                        <option value="Entregue">Entregue</option>
                      </select>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleDeletarContainer(container.id);
                        }}
                        className="p-2 rounded hover:opacity-75 transition-opacity"
                        style={{ color: 'oklch(0.65 0.22 25)' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Conteúdo Expandido */}
                  {isExpanded && (
                    <div className="p-4 border-t" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
                      {/* Pedidos Vinculados */}
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold mb-3" style={{ color: 'oklch(0.80 0.005 65)' }}>
                          Pedidos Vinculados ({container.pedidosCount || 0})
                        </h3>
                        {container.pedidosCount === 0 ? (
                          <p className="text-xs" style={{ color: 'oklch(0.50 0.010 285)' }}>
                            Nenhum pedido vinculado ainda
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {/* Aqui você pode adicionar a lista de pedidos vinculados */}
                          </div>
                        )}
                      </div>

                      {/* Vincular Novo Pedido */}
                      {pedidosDisponiveis.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'oklch(0.80 0.005 65)' }}>
                            <Link2 className="w-4 h-4" />
                            Vincular Pedido
                          </h3>
                          <div className="space-y-2">
                            {pedidosDisponiveis.map((pedido: any) => (
                              <button
                                key={pedido.id}
                                onClick={() => handleVincularPedido(container.id, pedido.id)}
                                className="w-full p-3 rounded text-left text-sm transition-colors flex items-center justify-between"
                                style={{
                                  background: 'oklch(0.18 0.005 285)',
                                  color: 'oklch(0.80 0.005 65)',
                                  border: '1px solid oklch(0.28 0.005 285)',
                                }}
                              >
                                <span>{pedido.nome}</span>
                                <Plus className="w-4 h-4" style={{ color: 'oklch(0.48 0.22 25)' }} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Notificações */}
      <NotificacoesPedidos notificacoes={notificacoes} />
    </div>
  );
}
