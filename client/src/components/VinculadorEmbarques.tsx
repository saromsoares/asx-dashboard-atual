import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { usePedidos } from '@/hooks/usePedidos';
import { useEmbarques } from '@/hooks/useEmbarques';
import { produtos } from '@/data/produtos';

interface VinculadorEmbarquesProps {
  processoId: string;
  onClose: () => void;
}

export const VinculadorEmbarques: React.FC<VinculadorEmbarquesProps> = ({
  processoId,
  onClose,
}) => {
  const { pedidos } = usePedidos();
  const {
    obterEmbarquesProcesso,
    obterTotalEmbarque,
    adicionarEmbarque,
    removerEmbarque,
    atualizarEmbarque,
  } = useEmbarques();

  const [pedidoSelecionado, setPedidoSelecionado] = useState<string | null>(null);
  const [produtoSelecionado, setprodutoSelecionado] = useState<number | null>(null);
  const [qtdSaromEmbarque, setQtdSaromEmbarque] = useState(0);
  const [qtdAlexandreEmbarque, setQtdAlexandreEmbarque] = useState(0);

  const embarquesProcesso = useMemo(
    () => obterEmbarquesProcesso(processoId),
    [processoId, obterEmbarquesProcesso]
  );

  const pedidosConfirmados = useMemo(
    () => pedidos.filter(p => p.status === 'Confirmado'),
    [pedidos]
  );

  const itemsPedidoSelecionado = useMemo(() => {
    if (!pedidoSelecionado) return [];
    const pedido = pedidos.find(p => p.id === pedidoSelecionado);
    return pedido?.items || [];
  }, [pedidoSelecionado, pedidos]);

  const handleAdicionarEmbarque = () => {
    if (
      !pedidoSelecionado ||
      !produtoSelecionado ||
      (qtdSaromEmbarque === 0 && qtdAlexandreEmbarque === 0)
    ) {
      return;
    }

    // Validar se não está embarcando mais do que foi comprado
    const item = itemsPedidoSelecionado.find(i => i.produtoId === produtoSelecionado);
    if (!item) return;

    const totalEmbarque = obterTotalEmbarque(pedidoSelecionado, produtoSelecionado);
    const novoTotalSarom = totalEmbarque.totalSarom + qtdSaromEmbarque;
    const novoTotalAlexandre = totalEmbarque.totalAlexandre + qtdAlexandreEmbarque;

    if (novoTotalSarom > item.qtdSarom) {
      alert(`Sarom: Máximo ${item.qtdSarom - totalEmbarque.totalSarom} unidades disponíveis`);
      return;
    }
    if (novoTotalAlexandre > item.qtdAlexandre) {
      alert(`Alexandre: Máximo ${item.qtdAlexandre - totalEmbarque.totalAlexandre} unidades disponíveis`);
      return;
    }

    adicionarEmbarque(
      processoId,
      pedidoSelecionado,
      produtoSelecionado,
      qtdSaromEmbarque,
      qtdAlexandreEmbarque
    );

    setQtdSaromEmbarque(0);
    setQtdAlexandreEmbarque(0);
    setprodutoSelecionado(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Vincular Compras ao Contêiner</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Seleção de Pedido */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Selecione um Pedido Confirmado
          </label>
          <select
            value={pedidoSelecionado || ''}
            onChange={(e) => {
              setPedidoSelecionado(e.target.value || null);
              setprodutoSelecionado(null);
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
          >
            <option value="">-- Selecione um pedido --</option>
            {pedidosConfirmados.map(p => (
              <option key={p.id} value={p.id}>
                {p.nome} ({p.items.length} itens)
              </option>
            ))}
          </select>
        </div>

        {/* Seleção de Produto */}
        {pedidoSelecionado && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Selecione um Produto
            </label>
            <select
              value={produtoSelecionado || ''}
              onChange={(e) => setprodutoSelecionado(Number(e.target.value) || null)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
            >
              <option value="">-- Selecione um produto --</option>
              {itemsPedidoSelecionado.map(item => {
                const totalEmbarque = obterTotalEmbarque(pedidoSelecionado, item.produtoId);
                const disponivelSarom = item.qtdSarom - totalEmbarque.totalSarom;
                const disponivelAlexandre = item.qtdAlexandre - totalEmbarque.totalAlexandre;
                const prod = produtos.find(p => p.id === item.produtoId);

                return (
                  <option key={item.produtoId} value={item.produtoId}>
                    {item.codigo} - {item.nome} (Sarom: {disponivelSarom}/${item.qtdSarom}, Alexandre: {disponivelAlexandre}/${item.qtdAlexandre})
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {/* Quantidades a Embarcar */}
        {produtoSelecionado && pedidoSelecionado && (
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Qtd Sarom a Embarcar
              </label>
              <input
                type="number"
                value={qtdSaromEmbarque}
                onChange={(e) => setQtdSaromEmbarque(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Qtd Alexandre a Embarcar
              </label>
              <input
                type="number"
                value={qtdAlexandreEmbarque}
                onChange={(e) => setQtdAlexandreEmbarque(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                min="0"
              />
            </div>
          </div>
        )}

        {/* Botão Adicionar */}
        {produtoSelecionado && pedidoSelecionado && (
          <button
            onClick={handleAdicionarEmbarque}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mb-6 flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Adicionar Embarque
          </button>
        )}

        {/* Lista de Embarques */}
        <div>
          <h3 className="text-lg font-bold text-white mb-4">Embarques neste Contêiner</h3>
          {embarquesProcesso.length === 0 ? (
            <p className="text-gray-400">Nenhum embarque adicionado ainda</p>
          ) : (
            <div className="space-y-2">
              {embarquesProcesso.map(embarque => {
                const pedido = pedidos.find(p => p.id === embarque.pedidoId);
                const prod = produtos.find(p => p.id === embarque.produtoId);
                const item = pedido?.items.find(i => i.produtoId === embarque.produtoId);

                return (
                  <div
                    key={embarque.id}
                    className="bg-slate-800 border border-slate-700 rounded p-3 flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium">
                        {prod?.codigo} - {item?.nome}
                      </p>
                      <p className="text-sm text-gray-400">
                        Pedido: {pedido?.nome} | Sarom: {embarque.qtdSaromEmbarque} | Alexandre: {embarque.qtdAlexandreEmbarque}
                      </p>
                    </div>
                    <button
                      onClick={() => removerEmbarque(processoId, embarque.id)}
                      className="text-red-400 hover:text-red-600 ml-4"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="w-full mt-6 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
