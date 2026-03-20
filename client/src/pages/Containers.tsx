import { useState, useMemo, useCallback } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { NotificacoesPedidos, type Notificacao } from '@/components/NotificacoesPedidos';
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
} from 'lucide-react';

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  'Vazio': { bg: 'oklch(0.20 0.10 285 / 0.3)', text: 'oklch(0.70 0.010 285)', border: 'oklch(0.50 0.015 285)' },
  'Preenchendo': { bg: 'oklch(0.20 0.10 25 / 0.3)', text: 'oklch(0.75 0.15 25)', border: 'oklch(0.55 0.22 25)' },
  'Cheio': { bg: 'oklch(0.20 0.10 145 / 0.3)', text: 'oklch(0.72 0.17 145)', border: 'oklch(0.50 0.17 145)' },
  'Enviado': { bg: 'oklch(0.20 0.10 270 / 0.3)', text: 'oklch(0.70 0.12 270)', border: 'oklch(0.55 0.15 270)' },
  'Entregue': { bg: 'oklch(0.20 0.10 145 / 0.3)', text: 'oklch(0.72 0.17 145)', border: 'oklch(0.50 0.17 145)' },
};

export default function Containers() {
  const [, setLocation] = useLocation();
  const [novoNumeroContainer, setNovoNumeroContainer] = useState('');
  const [containerExpandido, setContainerExpandido] = useState<number | null>(null);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);

  // Queries e mutations
  const { data: containers = [], isLoading: carregandoContainers, refetch: recarregarContainers } = trpc.container.getAllComPedidos.useQuery();
  const { data: pedidosDb = [] } = trpc.pedido.getAll.useQuery();
  const { data: pedidosDoContainer = [], refetch: recarregarPedidosContainer } = trpc.containerPedido.getPedidos.useQuery(
    { containerId: containerExpandido || 0 },
    { enabled: containerExpandido !== null && containerExpandido > 0 }
  );
  const criarContainerMutation = trpc.container.criar.useMutation();
  const vincularPedidoMutation = trpc.containerPedido.vincular.useMutation();
  const desvincularPedidoMutation = trpc.containerPedido.desvincular.useMutation();
  const atualizarStatusContainerMutation = trpc.container.atualizarStatus.useMutation();
  const deletarContainerMutation = trpc.container.deletar.useMutation();

  // Notificações
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
      recarregarPedidosContainer();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao vincular pedido');
    }
  }, [vincularPedidoMutation, adicionarNotificacao, recarregarContainers, recarregarPedidosContainer]);

  // Desvincular pedido
  const handleDesvincularPedido = useCallback(async (containerPedidoId: number) => {
    try {
      await desvincularPedidoMutation.mutateAsync({ containerPedidoId });
      adicionarNotificacao('sucesso', 'Pedido desvinculado do container');
      recarregarContainers();
      recarregarPedidosContainer();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao desvincular pedido');
    }
  }, [desvincularPedidoMutation, adicionarNotificacao, recarregarContainers, recarregarPedidosContainer]);

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
      if (containerExpandido === containerId) setContainerExpandido(null);
      recarregarContainers();
    } catch (error) {
      adicionarNotificacao('erro', 'Erro ao deletar container');
    }
  }, [deletarContainerMutation, adicionarNotificacao, recarregarContainers, containerExpandido]);

  // Pedidos confirmados disponíveis para vincular (excluindo os já vinculados ao container expandido)
  const pedidosDisponiveis = useMemo(() => {
    const pedidosConfirmados = pedidosDb.filter((p: any) => p.status === 'Confirmado');
    if (!containerExpandido) return pedidosConfirmados;
    const idsVinculados = new Set(pedidosDoContainer.map((pc: any) => pc.pedidoId));
    return pedidosConfirmados.filter((p: any) => !idsVinculados.has(p.id));
  }, [pedidosDb, pedidosDoContainer, containerExpandido]);

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-asx-dark)', color: 'var(--color-asx-text)' }}>
      {/* Botão Voltar */}
      <div className="px-4 md:px-6 py-3 border-b flex items-center" style={{ borderColor: 'var(--color-asx-border-subtle)' }}>
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
          style={{ background: 'var(--color-asx-surface)', color: 'var(--color-asx-text-heading)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Menu</span>
        </button>
        <span className="ml-3 font-rajdhani font-bold text-lg tracking-wide" style={{ color: 'var(--color-asx-text-heading)' }}>
          GERENCIAMENTO DE CONTAINERS
        </span>
      </div>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        {/* Seção de Criar Container */}
        <div className="mb-6 p-4 md:p-6 rounded-lg border" style={{ background: 'var(--color-asx-base)', borderColor: 'var(--color-asx-border)' }}>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-asx-text-heading)' }}>Criar Novo Container</h2>
          <div className="flex gap-3 md:flex-row flex-col">
            <input
              type="text"
              placeholder="Ex: CONT-001, CONT-002..."
              value={novoNumeroContainer}
              onChange={e => setNovoNumeroContainer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCriarContainer()}
              className="flex-1 px-4 py-3 rounded-md border h-11 text-sm"
              style={{
                background: 'oklch(0.18 0.005 285)',
                borderColor: 'oklch(0.28 0.005 285)',
                color: 'var(--color-asx-text)',
              }}
            />
            <button
              onClick={handleCriarContainer}
              disabled={criarContainerMutation.isPending}
              className="px-6 py-3 rounded-md font-semibold flex items-center gap-2 transition-colors h-11 md:w-auto w-full justify-center"
              style={{
                background: 'var(--color-asx-red)',
                color: 'white',
                opacity: criarContainerMutation.isPending ? 0.6 : 1,
              }}
            >
              <Plus className="w-4 h-4" />
              Criar
            </button>
          </div>
        </div>

        {/* Lista de Containers */}
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
          <div className="space-y-4">
            {containers.map((container: any) => {
              const cores = statusColors[container.status] || statusColors['Vazio'];
              const isExpanded = containerExpandido === container.id;

              return (
                <div
                  key={container.id}
                  className="rounded-lg border overflow-hidden"
                  style={{ borderColor: 'var(--color-asx-border)', background: 'var(--color-asx-base)' }}
                >
                  {/* Header do Container */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:brightness-110 transition-all"
                    onClick={() => {
                      setContainerExpandido(isExpanded ? null : container.id);
                    }}
                    style={{ background: cores.bg, borderBottom: `1px solid ${cores.border}` }}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Package className="w-5 h-5" style={{ color: cores.text }} />
                      <div>
                        <p className="font-semibold" style={{ color: cores.text }}>
                          {container.numero}
                        </p>
                        <p className="text-xs" style={{ color: cores.text, opacity: 0.7 }}>
                          {container.pedidosCount || 0} pedido(s) vinculado(s) • Criado em {new Date(container.dataCreacao).toLocaleDateString('pt-BR')}
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
                        onClick={e => e.stopPropagation()}
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
                        style={{ color: 'var(--color-asx-error)' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Conteúdo Expandido */}
                  {isExpanded && (
                    <div className="p-4 border-t" style={{ borderColor: 'var(--color-asx-border-subtle)' }}>
                      {/* Pedidos Vinculados */}
                      <div className="mb-6">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-asx-text-heading)' }}>
                          <Link2 className="w-4 h-4" style={{ color: 'oklch(0.48 0.22 250)' }} />
                          Pedidos Vinculados ({pedidosDoContainer.length})
                        </h3>

                        {pedidosDoContainer.length === 0 ? (
                          <p className="text-xs py-4 text-center" style={{ color: 'oklch(0.50 0.010 285)' }}>
                            Nenhum pedido vinculado. Vincule pedidos confirmados abaixo.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {pedidosDoContainer.map((pc: any) => {
                              const statusColor = pc.pedidoStatus === 'Pendente' ? 'var(--color-asx-error)' :
                                pc.pedidoStatus === 'Confirmado' ? 'oklch(0.48 0.22 250)' : 'var(--color-asx-success)';

                              return (
                                <div
                                  key={pc.id}
                                  className="flex items-center justify-between p-3 rounded-md"
                                  style={{ background: 'var(--color-asx-surface)', border: '1px solid var(--color-asx-surface-3)' }}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div
                                      className="px-2 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
                                      style={{ background: statusColor, color: 'white' }}
                                    >
                                      {pc.pedidoStatus}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-asx-text-heading)' }}>
                                        #{pc.pedidoId} - {pc.pedidoNome}
                                      </p>
                                      <p className="text-[10px]" style={{ color: 'oklch(0.50 0.010 285)' }}>
                                        Vinculado em {new Date(pc.dataVinculacao).toLocaleDateString('pt-BR')}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDesvincularPedido(pc.id)}
                                    className="p-2 rounded-md transition-colors hover:opacity-75 flex items-center gap-1 text-xs flex-shrink-0"
                                    style={{ color: 'var(--color-asx-error)' }}
                                    title="Desvincular pedido"
                                  >
                                    <Unlink2 className="w-3.5 h-3.5" />
                                    <span className="hidden md:inline">Desvincular</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Vincular Novo Pedido */}
                      <div>
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-asx-text-heading)' }}>
                          <Plus className="w-4 h-4" style={{ color: 'var(--color-asx-success)' }} />
                          Vincular Pedido Confirmado
                        </h3>

                        {pedidosDisponiveis.length === 0 ? (
                          <p className="text-xs py-4 text-center" style={{ color: 'oklch(0.50 0.010 285)' }}>
                            Nenhum pedido confirmado disponível para vincular.
                            {pedidosDb.filter((p: any) => p.status === 'Pendente').length > 0 && (
                              <span> Confirme pedidos pendentes na página de Compras.</span>
                            )}
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {pedidosDisponiveis.map((pedido: any) => (
                              <button
                                key={pedido.id}
                                onClick={() => handleVincularPedido(container.id, pedido.id)}
                                disabled={vincularPedidoMutation.isPending}
                                className="w-full p-3 rounded-md text-left text-sm transition-colors flex items-center justify-between hover:brightness-110"
                                style={{
                                  background: 'oklch(0.18 0.005 285)',
                                  color: 'var(--color-asx-text-heading)',
                                  border: '1px solid oklch(0.28 0.005 285)',
                                  opacity: vincularPedidoMutation.isPending ? 0.6 : 1,
                                }}
                              >
                                <div>
                                  <span className="font-medium">#{pedido.id} - {pedido.nome}</span>
                                  <p className="text-[10px] mt-0.5" style={{ color: 'oklch(0.50 0.010 285)' }}>
                                    {new Date(pedido.dataCreacao).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                                <Plus className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-asx-red)' }} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Notificações */}
      <NotificacoesPedidos notificacoes={notificacoes} />
    </div>
  );
}
