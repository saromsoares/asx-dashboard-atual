import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { produtos as produtosData } from '@/data/produtos';
import { useCustosDB } from '@/hooks/useCustosDB';

interface GarantiaItem {
  id: number;
  processoId: number;
  codigoProduto: string;
  quantidade: number;
  precoUnitarioDolar: string;
  precoTotalDolar: string;
  observacao: string | null;
  status: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

interface GarantiaProcesso {
  id: number;
  usuarioId: string;
  criadoEm: Date;
  atualizadoEm: Date;
}

export default function Garantias() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const { getCusto } = useCustosDB();

  // Queries
  const { data: processos = [] } = trpc.garantias.getAllByUser.useQuery();
  const { data: totalGarantia = { total: 0, quantidade: 0 } } = trpc.garantias.getTotalByUser.useQuery();

  // Mutations
  const criarProcessoMut = trpc.garantias.criarProcesso.useMutation();
  const adicionarItemMut = trpc.garantias.adicionarItem.useMutation();
  const atualizarItemMut = trpc.garantias.atualizarItem.useMutation();
  const removerItemMut = trpc.garantias.removerItem.useMutation();
  const deletarProcessoMut = trpc.garantias.deletarProcesso.useMutation();
  const utilsTrpc = trpc.useUtils();

  // Estado
  const [expandedProcesso, setExpandedProcesso] = useState<number | null>(null);
  const [itensDoProcesso, setItensDoProcesso] = useState<Map<number, GarantiaItem[]>>(new Map());
  const [novoItem, setNovoItem] = useState<Map<number, { codigoProduto: string; quantidade: number; observacao: string }>>(new Map());
  const [sortField, setSortField] = useState<'codigo' | 'descricao' | 'quantidade' | 'precoUnitarioDolar'>('codigo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Carregar itens quando um processo é expandido
  const { data: itensExpandido } = trpc.garantias.getItens.useQuery(
    { processoId: expandedProcesso || 0 },
    { enabled: !!expandedProcesso }
  );

  useEffect(() => {
    if (expandedProcesso && itensExpandido) {
      setItensDoProcesso(prev => new Map(prev).set(expandedProcesso, itensExpandido));
    }
  }, [expandedProcesso, itensExpandido]);

  const handleCriarProcesso = () => {
    criarProcessoMut.mutate(undefined, {
      onSuccess: () => {
        showSuccess('Novo processo de garantia criado!', 3000);
        utilsTrpc.garantias.getAllByUser.invalidate();
      },
      onError: (error: any) => showError(`Erro: ${error.message}`, 4000),
    });
  };

  const handleAdicionarItem = (processoId: number) => {
    const itemData = novoItem.get(processoId);
    if (!itemData || !itemData.codigoProduto || itemData.quantidade <= 0) {
      showError('Preencha código do produto e quantidade', 3000);
      return;
    }

    const produto = produtosData.find(p => p.codigo === itemData.codigoProduto);
    if (!produto) {
      showError('Produto não encontrado', 3000);
      return;
    }

    const precoUnitarioDolar = getCusto(produto.codigo) || 0;
    if (precoUnitarioDolar <= 0) {
      showError('Produto sem custo em USD configurado', 3000);
      return;
    }

    adicionarItemMut.mutate(
      {
        processoId,
        codigoProduto: itemData.codigoProduto,
        quantidade: itemData.quantidade,
        precoUnitarioDolar,
        observacao: itemData.observacao,
        status: 'Em Análise',
      },
      {
        onSuccess: () => {
          showSuccess('Item adicionado!', 3000);
          setNovoItem(prev => {
            const newMap = new Map(prev);
            newMap.delete(processoId);
            return newMap;
          });
          utilsTrpc.garantias.getItens.invalidate();
          utilsTrpc.garantias.getTotalByUser.invalidate();
        },
        onError: (error: any) => showError(`Erro: ${error.message}`, 4000),
      }
    );
  };

  const handleRemoverItem = (itemId: number, processoId: number) => {
    removerItemMut.mutate(
      { itemId },
      {
        onSuccess: () => {
          showSuccess('Item removido!', 3000);
          utilsTrpc.garantias.getItens.invalidate();
          utilsTrpc.garantias.getTotalByUser.invalidate();
        },
        onError: (error: any) => showError(`Erro: ${error.message}`, 4000),
      }
    );
  };

  const handleDeletarProcesso = (processoId: number) => {
    if (confirm('Tem certeza que deseja deletar este processo?')) {
      deletarProcessoMut.mutate(
        { processoId },
        {
          onSuccess: () => {
            showSuccess('Processo deletado!', 3000);
            utilsTrpc.garantias.getAllByUser.invalidate();
            utilsTrpc.garantias.getTotalByUser.invalidate();
          },
          onError: (error: any) => showError(`Erro: ${error.message}`, 4000),
        }
      );
    }
  };

  const toggleSort = (field: 'codigo' | 'descricao' | 'quantidade' | 'precoUnitarioDolar') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-red-400" /> : <ChevronDown className="w-3 h-3 text-red-400" />;
  };

  const sortedItens = useCallback((items: GarantiaItem[]) => {
    return [...items].sort((a, b) => {
      let va: number | string = 0;
      let vb: number | string = 0;

      if (sortField === 'codigo') {
        va = a.codigoProduto;
        vb = b.codigoProduto;
      } else if (sortField === 'quantidade') {
        va = a.quantidade;
        vb = b.quantidade;
      } else if (sortField === 'precoUnitarioDolar') {
        va = parseFloat(a.precoUnitarioDolar);
        vb = parseFloat(b.precoUnitarioDolar);
      }

      if (typeof va === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
      }
      return sortDir === 'asc' ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [sortField, sortDir]);

  // Separar processos por usuário (Sarom vs Alexandre)
  const processosSarom = processos.filter(p => p.usuarioId === 'sarom@asxstore.com');
  const processosAlexandre = processos.filter(p => p.usuarioId === 'alexandre@asx.com.br');

  const renderProcessoSection = (titulo: string, processosList: GarantiaProcesso[], usuarioId: string) => {
    const totalItens = processosList.reduce((sum, p) => {
      const items = itensDoProcesso.get(p.id) || [];
      return sum + items.length;
    }, 0);

    const totalValor = processosList.reduce((sum, p) => {
      const items = itensDoProcesso.get(p.id) || [];
      return sum + items.reduce((s, item) => s + parseFloat(item.precoTotalDolar), 0);
    }, 0);

    return (
      <div key={usuarioId} className="mb-6">
        <div className="px-6 py-4 border-b" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-rajdhani font-bold" style={{ color: 'oklch(0.85 0.005 65)' }}>
                📋 Empresa: {titulo}
              </h2>
              <p className="text-xs mt-1" style={{ color: 'oklch(0.60 0.010 285)' }}>
                Controle de processos vinculados à {titulo}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: 'oklch(0.45 0.010 285)' }}>Itens</p>
              <p className="text-xl font-rajdhani font-bold" style={{ color: 'oklch(0.72 0.17 145)' }}>{totalItens}</p>
            </div>
          </div>
        </div>

        {/* Tabela de Processos */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ background: 'oklch(0.12 0.005 285)' }}>
            <thead>
              <tr style={{ background: 'oklch(0.14 0.005 285)', borderBottom: '1px solid oklch(0.22 0.005 285)' }}>
                <th className="px-4 py-2 text-left" style={{ color: 'oklch(0.45 0.010 285)' }}>Processo</th>
                <th className="px-4 py-2 text-left" style={{ color: 'oklch(0.45 0.010 285)' }}>Itens</th>
                <th className="px-4 py-2 text-right" style={{ color: 'oklch(0.45 0.010 285)' }}>Total USD</th>
                <th className="px-4 py-2 text-center" style={{ color: 'oklch(0.45 0.010 285)' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {processosList.map((processo) => {
                const items = itensDoProcesso.get(processo.id) || [];
                const total = items.reduce((sum, item) => sum + parseFloat(item.precoTotalDolar), 0);
                const isExpanded = expandedProcesso === processo.id;

                return (
                  <React.Fragment key={processo.id}>
                    <tr style={{ borderBottom: '1px solid oklch(0.18 0.005 285)' }}>
                      <td className="px-4 py-3" style={{ color: 'oklch(0.80 0.005 65)' }}>
                        <button
                          onClick={() => setExpandedProcesso(isExpanded ? null : processo.id)}
                          className="flex items-center gap-2 hover:opacity-70"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          <span>Processo #{processo.id}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3" style={{ color: 'oklch(0.70 0.010 285)' }}>
                        {items.length} item{items.length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-3 text-right font-rajdhani font-bold" style={{ color: 'oklch(0.72 0.17 145)' }}>
                        ${total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeletarProcesso(processo.id)}
                          className="p-1 rounded hover:bg-red-900/30 transition-colors"
                          title="Deletar processo"
                        >
                          <Trash2 className="w-4 h-4" style={{ color: 'oklch(0.65 0.22 25)' }} />
                        </button>
                      </td>
                    </tr>

                    {/* Itens do Processo */}
                    {isExpanded && (
                      <>
                        <tr style={{ background: 'oklch(0.14 0.005 285)', borderBottom: '1px solid oklch(0.18 0.005 285)' }}>
                          <td colSpan={4} className="px-4 py-3">
                            <div className="space-y-3">
                              {/* Tabela de Itens */}
                              {items.length > 0 && (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs" style={{ background: 'oklch(0.12 0.005 285)' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid oklch(0.22 0.005 285)' }}>
                                        <th className="px-2 py-1 text-left cursor-pointer hover:opacity-70" onClick={() => toggleSort('codigo')} style={{ color: 'oklch(0.45 0.010 285)' }}>
                                          Código <SortIcon field="codigo" />
                                        </th>
                                        <th className="px-2 py-1 text-left cursor-pointer hover:opacity-70" onClick={() => toggleSort('quantidade')} style={{ color: 'oklch(0.45 0.010 285)' }}>
                                          Qtd <SortIcon field="quantidade" />
                                        </th>
                                        <th className="px-2 py-1 text-right cursor-pointer hover:opacity-70" onClick={() => toggleSort('precoUnitarioDolar')} style={{ color: 'oklch(0.45 0.010 285)' }}>
                                          Valor Un. USD <SortIcon field="precoUnitarioDolar" />
                                        </th>
                                        <th className="px-2 py-1 text-right" style={{ color: 'oklch(0.45 0.010 285)' }}>Valor Total USD</th>
                                        <th className="px-2 py-1 text-left" style={{ color: 'oklch(0.45 0.010 285)' }}>Observação</th>
                                        <th className="px-2 py-1 text-center" style={{ color: 'oklch(0.45 0.010 285)' }}>Status</th>
                                        <th className="px-2 py-1 text-center" style={{ color: 'oklch(0.45 0.010 285)' }}>Ação</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {sortedItens(items).map((item) => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid oklch(0.18 0.005 285)' }}>
                                          <td className="px-2 py-1" style={{ color: 'oklch(0.80 0.005 65)' }}>{item.codigoProduto}</td>
                                          <td className="px-2 py-1" style={{ color: 'oklch(0.70 0.010 285)' }}>{item.quantidade}</td>
                                          <td className="px-2 py-1 text-right" style={{ color: 'oklch(0.70 0.010 285)' }}>${parseFloat(item.precoUnitarioDolar).toFixed(2)}</td>
                                          <td className="px-2 py-1 text-right font-rajdhani font-bold" style={{ color: 'oklch(0.72 0.17 145)' }}>${parseFloat(item.precoTotalDolar).toFixed(2)}</td>
                                          <td className="px-2 py-1 text-xs" style={{ color: 'oklch(0.60 0.010 285)' }}>{item.observacao || '-'}</td>
                                          <td className="px-2 py-1 text-center text-xs">
                                            <span className="px-2 py-0.5 rounded" style={{ background: item.status === 'Ok' ? 'oklch(0.40 0.15 145)' : 'oklch(0.40 0.10 285)', color: 'oklch(0.90 0.005 65)' }}>
                                              {item.status}
                                            </span>
                                          </td>
                                          <td className="px-2 py-1 text-center">
                                            <button
                                              onClick={() => handleRemoverItem(item.id, processo.id)}
                                              className="p-0.5 rounded hover:bg-red-900/30 transition-colors"
                                            >
                                              <Trash2 className="w-3 h-3" style={{ color: 'oklch(0.65 0.22 25)' }} />
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {/* Formulário para Novo Item */}
                              <div className="border-t pt-3" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
                                <p className="text-xs mb-2" style={{ color: 'oklch(0.45 0.010 285)' }}>Adicionar novo item</p>
                                <div className="grid grid-cols-4 gap-2">
                                  <input
                                    type="text"
                                    placeholder="Código"
                                    value={novoItem.get(processo.id)?.codigoProduto || ''}
                                    onChange={(e) => {
                                      const newMap = new Map(novoItem);
                                      newMap.set(processo.id, { ...novoItem.get(processo.id) || { quantidade: 1, observacao: '' }, codigoProduto: e.target.value });
                                      setNovoItem(newMap);
                                    }}
                                    className="px-2 py-1 rounded text-xs"
                                    style={{ background: 'oklch(0.18 0.005 285)', borderColor: 'oklch(0.28 0.005 285)', color: 'oklch(0.90 0.005 65)' }}
                                  />
                                  <input
                                    type="number"
                                    placeholder="Qtd"
                                    value={novoItem.get(processo.id)?.quantidade || 1}
                                    onChange={(e) => {
                                      const newMap = new Map(novoItem);
                                      newMap.set(processo.id, { ...novoItem.get(processo.id) || { codigoProduto: '', observacao: '' }, quantidade: parseInt(e.target.value) || 1 });
                                      setNovoItem(newMap);
                                    }}
                                    className="px-2 py-1 rounded text-xs"
                                    style={{ background: 'oklch(0.18 0.005 285)', borderColor: 'oklch(0.28 0.005 285)', color: 'oklch(0.90 0.005 65)' }}
                                  />
                                  <input
                                    type="text"
                                    placeholder="Observação (defeito/lote)"
                                    value={novoItem.get(processo.id)?.observacao || ''}
                                    onChange={(e) => {
                                      const newMap = new Map(novoItem);
                                      newMap.set(processo.id, { ...novoItem.get(processo.id) || { codigoProduto: '', quantidade: 1 }, observacao: e.target.value });
                                      setNovoItem(newMap);
                                    }}
                                    className="px-2 py-1 rounded text-xs col-span-1"
                                    style={{ background: 'oklch(0.18 0.005 285)', borderColor: 'oklch(0.28 0.005 285)', color: 'oklch(0.90 0.005 65)' }}
                                  />
                                  <button
                                    onClick={() => handleAdicionarItem(processo.id)}
                                    className="px-3 py-1 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                                    style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
                                  >
                                    <Plus className="w-3 h-3" />
                                    Adicionar
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Total da Seção */}
        <div className="px-6 py-3 border-t" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
          <div className="flex justify-between items-center">
            <span style={{ color: 'oklch(0.60 0.010 285)' }}>Total em Garantia ({titulo}):</span>
            <span className="text-lg font-rajdhani font-bold" style={{ color: 'oklch(0.72 0.17 145)' }}>
              ${processosList.reduce((sum, p) => {
                const items = itensDoProcesso.get(p.id) || [];
                return sum + items.reduce((s, item) => s + parseFloat(item.precoTotalDolar), 0);
              }, 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'oklch(0.12 0.005 285)', color: 'oklch(0.95 0.005 65)' }}>
      {/* Botão Voltar */}
      <div className="px-6 py-3 border-b flex items-center" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
          style={{ background: 'oklch(0.16 0.005 285)', color: 'oklch(0.80 0.005 65)' }}
          title="Voltar ao menu principal"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Menu</span>
        </button>
      </div>

      {/* Header */}
      <header className="z-40 border-b px-6 h-14 flex items-center justify-between flex-shrink-0" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
        <span className="font-rajdhani font-bold text-lg tracking-wide" style={{ color: 'oklch(0.80 0.005 65)' }}>
          GARANTIAS
        </span>
        <button
          onClick={handleCriarProcesso}
          className="flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors"
          style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          Novo Processo
        </button>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 overflow-auto">
        {/* Seção Sarom */}
        {renderProcessoSection('SAROM', processosSarom, 'sarom@asxstore.com')}

        {/* Seção Alexandre */}
        {renderProcessoSection('ALEXANDRE', processosAlexandre, 'alexandre@asx.com.br')}

        {/* Resumo Consolidado */}
        <div className="mx-6 my-6 p-6 rounded-lg border" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
          <h3 className="text-lg font-rajdhani font-bold mb-4" style={{ color: 'oklch(0.85 0.005 65)' }}>
            📊 Resumo Consolidado (Total Geral)
          </h3>
          <div className="space-y-2">
            <p style={{ color: 'oklch(0.70 0.010 285)' }}>
              • Total em Garantia (SAROM): <span className="font-rajdhani font-bold" style={{ color: 'oklch(0.72 0.17 145)' }}>
                ${processosSarom.reduce((sum, p) => {
                  const items = itensDoProcesso.get(p.id) || [];
                  return sum + items.reduce((s, item) => s + parseFloat(item.precoTotalDolar), 0);
                }, 0).toFixed(2)}
              </span>
            </p>
            <p style={{ color: 'oklch(0.70 0.010 285)' }}>
              • Total em Garantia (ALEXANDRE): <span className="font-rajdhani font-bold" style={{ color: 'oklch(0.72 0.17 145)' }}>
                ${processosAlexandre.reduce((sum, p) => {
                  const items = itensDoProcesso.get(p.id) || [];
                  return sum + items.reduce((s, item) => s + parseFloat(item.precoTotalDolar), 0);
                }, 0).toFixed(2)}
              </span>
            </p>
            <p style={{ color: 'oklch(0.70 0.010 285)' }}>
              • Soma Geral de Crédito/Reparo: <span className="font-rajdhani font-bold text-lg" style={{ color: 'oklch(0.72 0.17 145)' }}>
                ${(processosSarom.reduce((sum, p) => {
                  const items = itensDoProcesso.get(p.id) || [];
                  return sum + items.reduce((s, item) => s + parseFloat(item.precoTotalDolar), 0);
                }, 0) + processosAlexandre.reduce((sum, p) => {
                  const items = itensDoProcesso.get(p.id) || [];
                  return sum + items.reduce((s, item) => s + parseFloat(item.precoTotalDolar), 0);
                }, 0)).toFixed(2)}
              </span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
