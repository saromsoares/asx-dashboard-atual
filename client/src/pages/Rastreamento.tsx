// Painel de controle para vincular itens de contêiner aos pedidos de compra

import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft, Link as LinkIcon, Unlink, CheckCircle2, Circle } from 'lucide-react';
import { usePedidos } from '@/hooks/usePedidos';

interface VinculoConteiner {
  id: string;
  processoSR: string;
  itemConteinerID: string;
  itemConteinerDesc: string;
  pedidoID: string;
  pedidoNome: string;
  quantidade: number;
  status: 'Pendente' | 'Recebido' | 'Entregue';
  dataCriacao: string;
}

export default function Rastreamento() {
  const [, setLocation] = useLocation();
  const { pedidos } = usePedidos();
  const [vinculos, setVinculos] = useState<VinculoConteiner[]>([]);
  const [showNovoVinculo, setShowNovoVinculo] = useState(false);
  const [processoSRInput, setProcessoSRInput] = useState('');
  const [itemDescInput, setItemDescInput] = useState('');
  const [pedidoSelecionado, setPedidoSelecionado] = useState<string | null>(null);
  const [qtdInput, setQtdInput] = useState(1);
  const [filtroStatus, setFiltroStatus] = useState<'Todos' | 'Pendente' | 'Recebido' | 'Entregue'>('Todos');

  const vinculosFiltrados = useMemo(() => {
    let resultado = vinculos;
    if (filtroStatus !== 'Todos') {
      resultado = resultado.filter(v => v.status === filtroStatus);
    }
    return resultado;
  }, [vinculos, filtroStatus]);

  const handleCriarVinculo = () => {
    if (!processoSRInput.trim() || !itemDescInput.trim() || !pedidoSelecionado || qtdInput <= 0) {
      alert('Preencha todos os campos');
      return;
    }

    const pedido = pedidos.find(p => p.id === pedidoSelecionado);
    if (!pedido) return;

    const novoVinculo: VinculoConteiner = {
      id: `vin-${Date.now()}`,
      processoSR: processoSRInput,
      itemConteinerID: `item-${Date.now()}`,
      itemConteinerDesc: itemDescInput,
      pedidoID: pedidoSelecionado,
      pedidoNome: pedido.nome,
      quantidade: qtdInput,
      status: 'Pendente',
      dataCriacao: new Date().toISOString(),
    };

    setVinculos([...vinculos, novoVinculo]);
    setProcessoSRInput('');
    setItemDescInput('');
    setPedidoSelecionado(null);
    setQtdInput(1);
    setShowNovoVinculo(false);
  };

  const handleAlterarStatus = (id: string, novoStatus: 'Pendente' | 'Recebido' | 'Entregue') => {
    setVinculos(prev => prev.map(v => v.id === id ? { ...v, status: novoStatus } : v));
  };

  const handleRemoverVinculo = (id: string) => {
    setVinculos(prev => prev.filter(v => v.id !== id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendente':
        return { bg: 'oklch(0.48 0.22 25)', text: 'white' };
      case 'Recebido':
        return { bg: 'oklch(0.50 0.15 142)', text: 'white' };
      case 'Entregue':
        return { bg: 'oklch(0.50 0.15 142.5)', text: 'white' };
      default:
        return { bg: 'oklch(0.20 0.005 285)', text: 'oklch(0.80 0.005 65)' };
    }
  };

  const resumoStatus = {
    Pendente: vinculosFiltrados.filter(v => v.status === 'Pendente').length,
    Recebido: vinculosFiltrados.filter(v => v.status === 'Recebido').length,
    Entregue: vinculosFiltrados.filter(v => v.status === 'Entregue').length,
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'oklch(0.12 0.005 285)' }}>
      {/* Header */}
      <header className="border-b p-4 flex items-center justify-between" style={{ borderColor: 'oklch(0.22 0.005 285)', background: 'oklch(0.14 0.005 285)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation('/')}
            className="p-2 rounded-md hover:bg-opacity-80 transition-colors"
            style={{ background: 'oklch(0.20 0.005 285)' }}
            title="Voltar ao menu"
          >
            <ArrowLeft className="w-5 h-5" style={{ color: 'oklch(0.80 0.005 65)' }} />
          </button>
          <h1 className="font-rajdhani font-bold text-xl" style={{ color: 'oklch(0.85 0.005 65)' }}>
            Rastreamento de Contêineres
          </h1>
        </div>
        <button
          onClick={() => setShowNovoVinculo(true)}
          className="px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
          style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
        >
          <LinkIcon className="w-4 h-4" />
          Vincular Item
        </button>
      </header>

      {/* Modal de Novo Vínculo */}
      {showNovoVinculo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black/80 border rounded-lg p-6 max-w-md w-full mx-4" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-rajdhani font-bold text-lg" style={{ color: 'oklch(0.85 0.005 65)' }}>
                Vincular Item ao Pedido
              </h2>
              <button
                onClick={() => setShowNovoVinculo(false)}
                className="p-1 rounded hover:bg-red-600/20 transition-colors"
              >
                <span style={{ color: 'oklch(0.80 0.005 65)' }}>✕</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                  Processo SR
                </label>
                <input
                  type="text"
                  value={processoSRInput}
                  onChange={e => setProcessoSRInput(e.target.value)}
                  placeholder="Ex: SR-2026-001"
                  className="w-full mt-1 px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                  Descrição do Item
                </label>
                <input
                  type="text"
                  value={itemDescInput}
                  onChange={e => setItemDescInput(e.target.value)}
                  placeholder="Ex: LANTERNA LED TRASEIRA"
                  className="w-full mt-1 px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                  Pedido de Compra
                </label>
                <select
                  value={pedidoSelecionado || ''}
                  onChange={e => setPedidoSelecionado(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                >
                  <option value="">Selecione um pedido</option>
                  {pedidos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                  Quantidade
                </label>
                <input
                  type="number"
                  value={qtdInput}
                  onChange={e => setQtdInput(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-full mt-1 px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCriarVinculo}
                  className="flex-1 px-4 py-2 rounded-md font-medium transition-colors"
                  style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
                >
                  Vincular
                </button>
                <button
                  onClick={() => setShowNovoVinculo(false)}
                  className="flex-1 px-4 py-2 rounded-md font-medium transition-colors border"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.80 0.005 65)',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <main className="flex-1 overflow-auto p-4">
        {/* Resumo de Status */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border rounded-lg p-4" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'oklch(0.50 0.010 285)' }}>
              Pendentes
            </p>
            <p className="text-2xl font-bold" style={{ color: 'oklch(0.48 0.22 25)' }}>
              {resumoStatus.Pendente}
            </p>
          </div>
          <div className="border rounded-lg p-4" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'oklch(0.50 0.010 285)' }}>
              Recebidos
            </p>
            <p className="text-2xl font-bold" style={{ color: 'oklch(0.50 0.15 142)' }}>
              {resumoStatus.Recebido}
            </p>
          </div>
          <div className="border rounded-lg p-4" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'oklch(0.50 0.010 285)' }}>
              Entregues
            </p>
            <p className="text-2xl font-bold" style={{ color: 'oklch(0.50 0.15 142.5)' }}>
              {resumoStatus.Entregue}
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-6">
          {(['Todos', 'Pendente', 'Recebido', 'Entregue'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFiltroStatus(status)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                background: filtroStatus === status ? getStatusColor(status === 'Todos' ? 'Pendente' : status).bg : 'oklch(0.20 0.005 285)',
                color: filtroStatus === status ? 'white' : 'oklch(0.60 0.005 65)',
              }}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Tabela de Vínculos */}
        {vinculosFiltrados.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'oklch(0.40 0.010 285)' }}>
            <p className="text-sm">Nenhum vínculo encontrado</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
            <table className="w-full text-sm">
              <thead style={{ background: 'oklch(0.16 0.005 285)', borderBottom: '1px solid oklch(0.22 0.005 285)' }}>
                <tr>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'oklch(0.50 0.010 285)' }}>Processo SR</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'oklch(0.50 0.010 285)' }}>Item</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'oklch(0.50 0.010 285)' }}>Pedido</th>
                  <th className="px-4 py-3 text-center font-semibold" style={{ color: 'oklch(0.50 0.010 285)' }}>Qtd</th>
                  <th className="px-4 py-3 text-left font-semibold" style={{ color: 'oklch(0.50 0.010 285)' }}>Status</th>
                  <th className="px-4 py-3 text-center font-semibold" style={{ color: 'oklch(0.50 0.010 285)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {vinculosFiltrados.map(vinculo => (
                  <tr key={vinculo.id} style={{ borderBottom: '1px solid oklch(0.18 0.005 285)' }}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'oklch(0.80 0.005 65)' }}>
                      {vinculo.processoSR}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'oklch(0.75 0.005 65)' }}>
                      {vinculo.itemConteinerDesc}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'oklch(0.75 0.005 65)' }}>
                      {vinculo.pedidoNome}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                      {vinculo.quantidade}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={vinculo.status}
                        onChange={e => handleAlterarStatus(vinculo.id, e.target.value as any)}
                        className="px-2 py-1 rounded text-xs font-semibold"
                        style={{
                          background: getStatusColor(vinculo.status).bg,
                          color: getStatusColor(vinculo.status).text,
                          border: 'none',
                        }}
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Recebido">Recebido</option>
                        <option value="Entregue">Entregue</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleRemoverVinculo(vinculo.id)}
                        className="p-1 rounded hover:bg-red-600/20 transition-colors"
                        title="Remover vínculo"
                      >
                        <Unlink className="w-4 h-4" style={{ color: 'oklch(0.48 0.22 25)' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
