// Painel de Rastreamento — Visão geral de containers e pedidos vinculados
// Usa tRPC para dados persistentes do banco de dados

import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { NotificacoesPedidos, type Notificacao } from '@/components/NotificacoesPedidos';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Send,
  ChevronDown,
  ChevronUp,
  MapPin,
  Anchor,
} from 'lucide-react';

const statusColors: Record<string, { bg: string; text: string; icon: any }> = {
  'Vazio': { bg: 'oklch(0.20 0.10 285 / 0.3)', text: 'oklch(0.70 0.010 285)', icon: Package },
  'Preenchendo': { bg: 'oklch(0.20 0.10 25 / 0.3)', text: 'oklch(0.75 0.15 25)', icon: Clock },
  'Cheio': { bg: 'oklch(0.20 0.10 145 / 0.3)', text: 'oklch(0.72 0.17 145)', icon: CheckCircle2 },
  'Enviado': { bg: 'oklch(0.20 0.10 270 / 0.3)', text: 'oklch(0.70 0.12 270)', icon: Truck },
  'Entregue': { bg: 'oklch(0.20 0.10 145 / 0.3)', text: 'oklch(0.72 0.17 145)', icon: Anchor },
};

export default function Rastreamento() {
  const [, setLocation] = useLocation();
  const [filtroStatus, setFiltroStatus] = useState<string>('Todos');
  const [containerExpandido, setContainerExpandido] = useState<number | null>(null);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);

  // Queries tRPC
  const { data: containers = [], isLoading } = trpc.container.getAllComPedidos.useQuery();
  const { data: pedidosDoContainer = [] } = trpc.containerPedido.getPedidos.useQuery(
    { containerId: containerExpandido || 0 },
    { enabled: containerExpandido !== null && containerExpandido > 0 }
  );

  // Filtrar containers
  const containersFiltrados = useMemo(() => {
    if (filtroStatus === 'Todos') return containers;
    return containers.filter((c: any) => c.status === filtroStatus);
  }, [containers, filtroStatus]);

  // Resumo por status
  const resumo = useMemo(() => {
    const r: Record<string, number> = { Vazio: 0, Preenchendo: 0, Cheio: 0, Enviado: 0, Entregue: 0 };
    containers.forEach((c: any) => { r[c.status] = (r[c.status] || 0) + 1; });
    return r;
  }, [containers]);

  const totalPedidos = useMemo(() => {
    return containers.reduce((sum: number, c: any) => sum + (c.pedidosCount || 0), 0);
  }, [containers]);

  return (
    <div className="h-full flex flex-col" style={{ background: 'oklch(0.12 0.005 285)', color: 'oklch(0.95 0.005 65)' }}>
      {/* Header */}
      <div className="px-4 md:px-6 py-3 border-b flex items-center" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
          style={{ background: 'oklch(0.16 0.005 285)', color: 'oklch(0.80 0.005 65)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Menu</span>
        </button>
        <span className="ml-3 font-rajdhani font-bold text-lg tracking-wide" style={{ color: 'oklch(0.80 0.005 65)' }}>
          RASTREAMENTO DE CONTAINERS
        </span>
      </div>

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <div className="p-3 rounded-lg border" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Total Containers</p>
            <p className="font-rajdhani font-bold text-2xl" style={{ color: 'oklch(0.85 0.005 65)' }}>{containers.length}</p>
          </div>
          {Object.entries(resumo).map(([status, count]) => {
            const cores = statusColors[status] || statusColors['Vazio'];
            const Icon = cores.icon;
            return (
              <div key={status} className="p-3 rounded-lg border" style={{ background: cores.bg, borderColor: 'oklch(0.26 0.005 285)' }}>
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3" style={{ color: cores.text }} />
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: cores.text }}>{status}</p>
                </div>
                <p className="font-rajdhani font-bold text-2xl" style={{ color: cores.text }}>{count}</p>
              </div>
            );
          })}
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['Todos', 'Vazio', 'Preenchendo', 'Cheio', 'Enviado', 'Entregue'].map(status => {
            const isActive = filtroStatus === status;
            const cores = status !== 'Todos' ? statusColors[status] : null;
            return (
              <button
                key={status}
                onClick={() => setFiltroStatus(status)}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors flex-shrink-0"
                style={{
                  background: isActive ? (cores ? cores.text : 'oklch(0.48 0.22 25)') : 'oklch(0.18 0.005 285)',
                  color: isActive ? 'white' : 'oklch(0.70 0.010 285)',
                  border: `1px solid ${isActive ? 'transparent' : 'oklch(0.26 0.005 285)'}`,
                }}
              >
                {status}
                {status !== 'Todos' && ` (${resumo[status] || 0})`}
                {status === 'Todos' && ` (${containers.length})`}
              </button>
            );
          })}
        </div>

        {/* Timeline de Containers */}
        {isLoading ? (
          <div className="text-center py-12" style={{ color: 'oklch(0.50 0.010 285)' }}>
            Carregando containers...
          </div>
        ) : containersFiltrados.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center gap-3" style={{ color: 'oklch(0.50 0.010 285)' }}>
            <Package className="w-12 h-12" />
            <p>Nenhum container encontrado</p>
            <button
              onClick={() => setLocation('/containers')}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
            >
              Ir para Gerenciamento de Containers
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {containersFiltrados.map((container: any) => {
              const cores = statusColors[container.status] || statusColors['Vazio'];
              const Icon = cores.icon;
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
                    style={{ background: cores.bg }}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-2 rounded-lg" style={{ background: 'oklch(0.12 0.005 285 / 0.5)' }}>
                        <Icon className="w-5 h-5" style={{ color: cores.text }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <p className="font-rajdhani font-bold text-lg" style={{ color: cores.text }}>
                            {container.numero}
                          </p>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-semibold"
                            style={{ background: cores.text, color: 'white' }}
                          >
                            {container.status}
                          </span>
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'oklch(0.60 0.010 285)' }}>
                          {container.pedidosCount || 0} pedido(s) vinculado(s) • Criado em {new Date(container.dataCreacao).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Barra de progresso visual */}
                      <div className="hidden md:flex items-center gap-1">
                        {['Vazio', 'Preenchendo', 'Cheio', 'Enviado', 'Entregue'].map((s, i) => {
                          const statusIndex = ['Vazio', 'Preenchendo', 'Cheio', 'Enviado', 'Entregue'].indexOf(container.status);
                          const isCompleted = i <= statusIndex;
                          return (
                            <div
                              key={s}
                              className="w-6 h-1.5 rounded-full"
                              style={{ background: isCompleted ? cores.text : 'oklch(0.25 0.005 285)' }}
                              title={s}
                            />
                          );
                        })}
                      </div>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Conteúdo Expandido */}
                  {isExpanded && (
                    <div className="p-4 border-t" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
                      {pedidosDoContainer.length === 0 ? (
                        <p className="text-xs text-center py-4" style={{ color: 'oklch(0.50 0.010 285)' }}>
                          Nenhum pedido vinculado a este container.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'oklch(0.45 0.010 285)' }}>
                            Pedidos Vinculados ({pedidosDoContainer.length})
                          </h4>
                          {pedidosDoContainer.map((pc: any) => {
                            const pedidoStatusColor = pc.pedidoStatus === 'Pendente' ? 'oklch(0.65 0.22 25)' :
                              pc.pedidoStatus === 'Confirmado' ? 'oklch(0.48 0.22 250)' : 'oklch(0.72 0.17 145)';

                            return (
                              <div
                                key={pc.id}
                                className="flex items-center gap-3 p-3 rounded-md"
                                style={{ background: 'oklch(0.16 0.005 285)', border: '1px solid oklch(0.24 0.005 285)' }}
                              >
                                <div
                                  className="px-2 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
                                  style={{ background: pedidoStatusColor, color: 'white' }}
                                >
                                  {pc.pedidoStatus}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate" style={{ color: 'oklch(0.85 0.005 65)' }}>
                                    #{pc.pedidoId} - {pc.pedidoNome}
                                  </p>
                                  <p className="text-[10px]" style={{ color: 'oklch(0.50 0.010 285)' }}>
                                    Vinculado em {new Date(pc.dataVinculacao).toLocaleDateString('pt-BR')}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Link para gerenciar */}
                      <div className="mt-4 pt-3 border-t flex justify-end" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
                        <button
                          onClick={() => setLocation('/containers')}
                          className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                          style={{ background: 'oklch(0.18 0.005 285)', color: 'oklch(0.70 0.010 285)', border: '1px solid oklch(0.28 0.005 285)' }}
                        >
                          Gerenciar Containers
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Resumo geral */}
        {containers.length > 0 && (
          <div className="mt-6 p-4 rounded-lg border" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'oklch(0.45 0.010 285)' }}>
              Resumo Geral
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p style={{ color: 'oklch(0.50 0.010 285)' }}>Total de Containers</p>
                <p className="font-rajdhani font-bold text-lg" style={{ color: 'oklch(0.85 0.005 65)' }}>{containers.length}</p>
              </div>
              <div>
                <p style={{ color: 'oklch(0.50 0.010 285)' }}>Total de Pedidos</p>
                <p className="font-rajdhani font-bold text-lg" style={{ color: 'oklch(0.85 0.005 65)' }}>{totalPedidos}</p>
              </div>
              <div>
                <p style={{ color: 'oklch(0.50 0.010 285)' }}>Em Trânsito</p>
                <p className="font-rajdhani font-bold text-lg" style={{ color: 'oklch(0.70 0.12 270)' }}>{resumo.Enviado || 0}</p>
              </div>
              <div>
                <p style={{ color: 'oklch(0.50 0.010 285)' }}>Entregues</p>
                <p className="font-rajdhani font-bold text-lg" style={{ color: 'oklch(0.72 0.17 145)' }}>{resumo.Entregue || 0}</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Notificações */}
      <NotificacoesPedidos notificacoes={notificacoes} />
    </div>
  );
}
