// Design: Dark Command Center — Contêiner SR
// Gerenciamento de processos de importação com invoice, NCM e itens

import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { X, Plus, Trash2, Copy, ArrowLeft, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ItemConteiner {
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  precoUnitarioDolar: number;
  precoTotalDolar: number;
  pedidoSarom: number;
  pedidoAlexandre: number;
}

interface ProcessoSR {
  id: string;
  numeroProcesso: string;
  nomeInvoice: string;
  dataProcesso: string;
  observacoes: string;
  ncm: string;
  itens: ItemConteiner[];
  dataCriacao: string;
}

export default function Conteiner() {
  const [, setLocation] = useLocation();
  const [processos, setProcessos] = useState<ProcessoSR[]>([]);
  const [showNovoProcesso, setShowNovoProcesso] = useState(false);
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoSR | null>(null);

  // Form para novo processo
  const [formProcesso, setFormProcesso] = useState({
    numeroProcesso: '',
    nomeInvoice: '',
    dataProcesso: new Date().toISOString().slice(0, 10),
    observacoes: '',
    ncm: '',
  });

  // Form para novo item
  const [formItem, setFormItem] = useState({
    descricao: '',
    unidade: '',
    quantidade: 1,
    precoUnitarioDolar: 0,
    pedidoSarom: 0,
    pedidoAlexandre: 0,
  });

  const handleAdicionarProcesso = () => {
    if (!formProcesso.numeroProcesso.trim()) {
      alert('Preencha o número do processo');
      return;
    }

    const novoProcesso: ProcessoSR = {
      id: `sr-${Date.now()}`,
      numeroProcesso: formProcesso.numeroProcesso,
      nomeInvoice: formProcesso.nomeInvoice,
      dataProcesso: formProcesso.dataProcesso,
      observacoes: formProcesso.observacoes,
      ncm: formProcesso.ncm,
      itens: [],
      dataCriacao: new Date().toISOString(),
    };

    setProcessos([...processos, novoProcesso]);
    setProcessoSelecionado(novoProcesso);
    setFormProcesso({
      numeroProcesso: '',
      nomeInvoice: '',
      dataProcesso: new Date().toISOString().slice(0, 10),
      observacoes: '',
      ncm: '',
    });
    setShowNovoProcesso(false);
  };

  const handleAdicionarItem = () => {
    if (!processoSelecionado) return;
    if (!formItem.descricao.trim()) {
      alert('Preencha a descrição do item');
      return;
    }

    const novoItem: ItemConteiner = {
      id: `item-${Date.now()}`,
      descricao: formItem.descricao,
      unidade: formItem.unidade,
      quantidade: formItem.quantidade,
      precoUnitarioDolar: formItem.precoUnitarioDolar,
      precoTotalDolar: formItem.quantidade * formItem.precoUnitarioDolar,
      pedidoSarom: formItem.pedidoSarom,
      pedidoAlexandre: formItem.pedidoAlexandre,
    };

    const processoAtualizado = {
      ...processoSelecionado,
      itens: [...processoSelecionado.itens, novoItem],
    };

    setProcessos(
      processos.map(p => (p.id === processoSelecionado.id ? processoAtualizado : p))
    );
    setProcessoSelecionado(processoAtualizado);
    setFormItem({
      descricao: '',
      unidade: '',
      quantidade: 1,
      precoUnitarioDolar: 0,
      pedidoSarom: 0,
      pedidoAlexandre: 0,
    });
  };

  const handleRemoverItem = (itemId: string) => {
    if (!processoSelecionado) return;
    const processoAtualizado = {
      ...processoSelecionado,
      itens: processoSelecionado.itens.filter(i => i.id !== itemId),
    };
    setProcessos(
      processos.map(p => (p.id === processoSelecionado.id ? processoAtualizado : p))
    );
    setProcessoSelecionado(processoAtualizado);
  };

  const handleRemoverProcesso = (processoId: string) => {
    setProcessos(processos.filter(p => p.id !== processoId));
    if (processoSelecionado?.id === processoId) {
      setProcessoSelecionado(null);
    }
  };

  const handleAtualizarProcesso = (campo: string, valor: any) => {
    if (!processoSelecionado) return;
    const processoAtualizado = { ...processoSelecionado, [campo]: valor };
    setProcessos(
      processos.map(p => (p.id === processoSelecionado.id ? processoAtualizado : p))
    );
    setProcessoSelecionado(processoAtualizado);
  };

  const handleAtualizarItem = (itemId: string, campo: string, valor: any) => {
    if (!processoSelecionado) return;

    const itemAtualizado = processoSelecionado.itens.map(i => {
      if (i.id === itemId) {
        const item = { ...i, [campo]: valor };
        // Recalcular preço total se quantidade ou preço unitário mudar
        if (campo === 'quantidade' || campo === 'precoUnitarioDolar') {
          item.precoTotalDolar = item.quantidade * item.precoUnitarioDolar;
        }
        return item;
      }
      return i;
    });

    const processoAtualizado = {
      ...processoSelecionado,
      itens: itemAtualizado,
    };

    setProcessos(
      processos.map(p => (p.id === processoSelecionado.id ? processoAtualizado : p))
    );
    setProcessoSelecionado(processoAtualizado);
  };

  const stats = useMemo(() => {
    if (!processoSelecionado) return { totalItens: 0, totalDolar: 0, totalSarom: 0, totalAlexandre: 0 };
    const totalItens = processoSelecionado.itens.length;
    const totalDolar = processoSelecionado.itens.reduce((s, i) => s + i.precoTotalDolar, 0);
    const totalSarom = processoSelecionado.itens.reduce((s, i) => s + i.pedidoSarom, 0);
    const totalAlexandre = processoSelecionado.itens.reduce((s, i) => s + i.pedidoAlexandre, 0);
    return { totalItens, totalDolar, totalSarom, totalAlexandre };
  }, [processoSelecionado]);
  const handleExportarExcel = () => {
    if (!processoSelecionado) return;
    const wb = XLSX.utils.book_new();
    const processoDados = [
      ['PROCESSO SR', processoSelecionado.numeroProcesso],
      ['INVOICE', processoSelecionado.nomeInvoice],
      ['DATA', processoSelecionado.dataProcesso],
      ['NCM', processoSelecionado.ncm],
      ['OBSERVACOES', processoSelecionado.observacoes],
      [],
    ];
    const headers = ['DESCRICAO', 'UNIDADE', 'QUANTIDADE', 'PRECO UNITARIO USD', 'PRECO TOTAL USD', 'PEDIDO SAROM', 'PEDIDO ALEXANDRE'];
    const itensDados = processoSelecionado.itens.map(item => [
      item.descricao,
      item.unidade,
      item.quantidade,
      item.precoUnitarioDolar.toFixed(2),
      item.precoTotalDolar.toFixed(2),
      item.pedidoSarom,
      item.pedidoAlexandre,
    ]);
    const totais = [[], ['TOTAIS', '', stats.totalItens, '', `$${stats.totalDolar.toFixed(2)}`, stats.totalSarom, stats.totalAlexandre]];
    const wsData = [...processoDados, headers, ...itensDados, ...totais];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Processo SR');
    const fileName = `ASX_Processo_${processoSelecionado.numeroProcesso}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'oklch(0.12 0.005 285)', color: 'oklch(0.95 0.005 65)' }}>
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
      <header className="sticky top-12 z-40 border-b px-6 h-14 flex items-center gap-4" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
        <span className="font-rajdhani font-bold text-lg tracking-wide" style={{ color: 'oklch(0.80 0.005 65)' }}>
          GERENCIADOR DE CONTÊINERES
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setShowNovoProcesso(true)}
          className="px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
          style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          Novo Processo SR
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden gap-4 p-4">
        {/* Lista de Processos */}
        <aside className="w-72 flex-shrink-0 border rounded-lg overflow-y-auto"
          style={{ background: 'oklch(0.13 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
          <div className="p-4 border-b sticky top-0" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.45 0.010 285)' }}>
              Processos SR ({processos.length})
            </p>
          </div>

          <div className="space-y-1 p-3">
            {processos.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: 'oklch(0.40 0.010 285)' }}>
                Nenhum processo criado
              </p>
            ) : (
              processos.map(p => (
                <div
                  key={p.id}
                  onClick={() => setProcessoSelecionado(p)}
                  className="p-3 rounded-md cursor-pointer transition-colors border"
                  style={{
                    background: processoSelecionado?.id === p.id ? 'oklch(0.48 0.22 25)' : 'oklch(0.16 0.005 285)',
                    borderColor: processoSelecionado?.id === p.id ? 'oklch(0.48 0.22 25)' : 'oklch(0.22 0.005 285)',
                    color: processoSelecionado?.id === p.id ? 'white' : 'oklch(0.80 0.005 65)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 overflow-hidden">
                      <p className="font-rajdhani font-semibold text-sm truncate">{p.numeroProcesso}</p>
                      <p className="text-[11px] truncate" style={{ opacity: 0.7 }}>{p.nomeInvoice || '—'}</p>
                      <p className="text-[10px] mt-1" style={{ opacity: 0.6 }}>
                        {p.itens.length} item{p.itens.length !== 1 ? 'ns' : ''}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoverProcesso(p.id);
                      }}
                      className="p-1 rounded hover:bg-red-600/20 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Detalhes do Processo */}
        {processoSelecionado ? (
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Formulário de Edição */}
            <div className="border rounded-lg p-4 flex-shrink-0 overflow-y-auto"
              style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
              <h2 className="font-rajdhani font-bold text-lg mb-4" style={{ color: 'oklch(0.85 0.005 65)' }}>
                Processo {processoSelecionado.numeroProcesso}
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                    Nome da Invoice
                  </label>
                  <input
                    type="text"
                    value={processoSelecionado.nomeInvoice}
                    onChange={e => handleAtualizarProcesso('nomeInvoice', e.target.value)}
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
                    Data do Processo
                  </label>
                  <input
                    type="date"
                    value={processoSelecionado.dataProcesso}
                    onChange={e => handleAtualizarProcesso('dataProcesso', e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-md border text-sm"
                    style={{
                      background: 'oklch(0.18 0.005 285)',
                      borderColor: 'oklch(0.26 0.005 285)',
                      color: 'oklch(0.90 0.005 65)',
                    }}
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                    NCM
                  </label>
                  <input
                    type="text"
                    value={processoSelecionado.ncm}
                    onChange={e => handleAtualizarProcesso('ncm', e.target.value)}
                    placeholder="Ex: 8512.90.00"
                    className="w-full mt-1 px-3 py-2 rounded-md border text-sm"
                    style={{
                      background: 'oklch(0.18 0.005 285)',
                      borderColor: 'oklch(0.26 0.005 285)',
                      color: 'oklch(0.90 0.005 65)',
                    }}
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                    Observações
                  </label>
                  <textarea
                    value={processoSelecionado.observacoes}
                    onChange={e => handleAtualizarProcesso('observacoes', e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-md border text-sm"
                    rows={2}
                    style={{
                      background: 'oklch(0.18 0.005 285)',
                      borderColor: 'oklch(0.26 0.005 285)',
                      color: 'oklch(0.90 0.005 65)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3 mt-4 flex-shrink-0">
              <div className="rounded-lg p-3 border" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Total Itens</p>
                <p className="font-rajdhani font-bold text-xl mt-1" style={{ color: 'oklch(0.85 0.005 65)' }}>{stats.totalItens}</p>
              </div>
              <div className="rounded-lg p-3 border" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Total USD</p>
                <p className="font-rajdhani font-bold text-xl mt-1" style={{ color: 'oklch(0.85 0.005 65)' }}>${stats.totalDolar.toFixed(2)}</p>
              </div>
              <div className="rounded-lg p-3 border" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Sarom</p>
                <p className="font-rajdhani font-bold text-xl mt-1" style={{ color: 'oklch(0.85 0.005 65)' }}>{stats.totalSarom}</p>
              </div>
              <div className="rounded-lg p-3 border" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Alexandre</p>
                <p className="font-rajdhani font-bold text-xl mt-1" style={{ color: 'oklch(0.85 0.005 65)' }}>{stats.totalAlexandre}</p>
              </div>
            </div>

            {/* Tabela de Itens */}
            <div className="flex-1 overflow-auto mt-4 border rounded-lg" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
              <table className="w-full text-sm" style={{ color: 'oklch(0.85 0.005 65)' }}>
                <thead style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }} className="border-b sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Descrição</th>
                    <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Unid</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Qtd</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Preço Unit USD</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Total USD</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Sarom</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Alexandre</th>
                    <th className="text-center px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {processoSelecionado.itens.map(item => (
                    <tr
                      key={item.id}
                      style={{ borderColor: 'oklch(0.18 0.005 285)' }}
                      className="border-b transition-colors"
                      onMouseEnter={e => (e.currentTarget.style.background = 'oklch(0.16 0.005 285)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.descricao}
                          onChange={e => handleAtualizarItem(item.id, 'descricao', e.target.value)}
                          className="w-full px-2 py-1 rounded text-xs bg-transparent border"
                          style={{ borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.85 0.005 65)' }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.unidade}
                          onChange={e => handleAtualizarItem(item.id, 'unidade', e.target.value)}
                          className="w-20 px-2 py-1 rounded text-xs bg-transparent border"
                          style={{ borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.85 0.005 65)' }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={item.quantidade}
                          onChange={e => handleAtualizarItem(item.id, 'quantidade', parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 rounded text-xs bg-transparent border text-right"
                          style={{ borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.85 0.005 65)' }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={item.precoUnitarioDolar}
                          onChange={e => handleAtualizarItem(item.id, 'precoUnitarioDolar', parseFloat(e.target.value) || 0)}
                          step="0.01"
                          className="w-24 px-2 py-1 rounded text-xs bg-transparent border text-right"
                          style={{ borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.85 0.005 65)' }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-rajdhani font-semibold" style={{ color: 'oklch(0.48 0.22 25)' }}>
                        ${item.precoTotalDolar.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={item.pedidoSarom}
                          onChange={e => handleAtualizarItem(item.id, 'pedidoSarom', parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 rounded text-xs bg-transparent border text-right"
                          style={{ borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.85 0.005 65)' }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={item.pedidoAlexandre}
                          onChange={e => handleAtualizarItem(item.id, 'pedidoAlexandre', parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 rounded text-xs bg-transparent border text-right"
                          style={{ borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.85 0.005 65)' }}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleRemoverItem(item.id)}
                          className="p-1 rounded hover:bg-red-600/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" style={{ color: 'oklch(0.65 0.22 25)' }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Form para Adicionar Item */}
            <div className="mt-4 border rounded-lg p-4" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
              <h3 className="font-rajdhani font-bold text-sm mb-3" style={{ color: 'oklch(0.85 0.005 65)' }}>
                Adicionar Item
              </h3>
              <div className="grid grid-cols-7 gap-2">
                <input
                  type="text"
                  placeholder="Descrição"
                  value={formItem.descricao}
                  onChange={e => setFormItem({ ...formItem, descricao: e.target.value })}
                  className="col-span-2 px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Unid"
                  value={formItem.unidade}
                  onChange={e => setFormItem({ ...formItem, unidade: e.target.value })}
                  className="px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
                <input
                  type="number"
                  placeholder="Qtd"
                  value={formItem.quantidade}
                  onChange={e => setFormItem({ ...formItem, quantidade: parseFloat(e.target.value) || 1 })}
                  className="px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
                <input
                  type="number"
                  placeholder="Preço USD"
                  value={formItem.precoUnitarioDolar}
                  onChange={e => setFormItem({ ...formItem, precoUnitarioDolar: parseFloat(e.target.value) || 0 })}
                  step="0.01"
                  className="px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
                <input
                  type="number"
                  placeholder="Sarom"
                  value={formItem.pedidoSarom}
                  onChange={e => setFormItem({ ...formItem, pedidoSarom: parseFloat(e.target.value) || 0 })}
                  className="px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
                <input
                  type="number"
                  placeholder="Alexandre"
                  value={formItem.pedidoAlexandre}
                  onChange={e => setFormItem({ ...formItem, pedidoAlexandre: parseFloat(e.target.value) || 0 })}
                  className="px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
                <button
                  onClick={handleAdicionarItem}
                  className="px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1"
                  style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
            </div>

            {/* Botão de Exportação */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleExportarExcel}
                className="flex-1 px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                style={{ background: 'oklch(0.20 0.005 285)', borderColor: 'oklch(0.26 0.005 285)', border: '1px solid', color: 'oklch(0.80 0.005 65)' }}
                title="Exportar processo para Excel"
              >
                <Download className="w-4 h-4" />
                Exportar Excel
              </button>
            </div>
          </main>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'oklch(0.45 0.010 285)' }}>
            <div className="text-center">
              <p className="text-lg font-rajdhani">Selecione ou crie um processo SR</p>
              <p className="text-sm mt-2">Clique em "Novo Processo SR" para começar</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Novo Processo */}
      {showNovoProcesso && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowNovoProcesso(false)}>
          <div
            className="rounded-xl p-6 w-96 shadow-2xl border"
            style={{ background: 'oklch(0.16 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-rajdhani font-bold mb-4" style={{ color: 'oklch(0.85 0.005 65)' }}>
              Novo Processo SR
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                  Número do Processo *
                </label>
                <input
                  type="text"
                  value={formProcesso.numeroProcesso}
                  onChange={e => setFormProcesso({ ...formProcesso, numeroProcesso: e.target.value })}
                  placeholder="Ex: SR-2026-001"
                  className="w-full mt-2 px-4 py-2.5 rounded-md border"
                  style={{
                    background: 'oklch(0.14 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                  Nome da Invoice
                </label>
                <input
                  type="text"
                  value={formProcesso.nomeInvoice}
                  onChange={e => setFormProcesso({ ...formProcesso, nomeInvoice: e.target.value })}
                  placeholder="Ex: INV-123456"
                  className="w-full mt-2 px-4 py-2.5 rounded-md border"
                  style={{
                    background: 'oklch(0.14 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                  Data do Processo
                </label>
                <input
                  type="date"
                  value={formProcesso.dataProcesso}
                  onChange={e => setFormProcesso({ ...formProcesso, dataProcesso: e.target.value })}
                  className="w-full mt-2 px-4 py-2.5 rounded-md border"
                  style={{
                    background: 'oklch(0.14 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowNovoProcesso(false)}
                className="flex-1 px-4 py-2.5 rounded-md font-medium transition-colors"
                style={{ background: 'oklch(0.18 0.005 285)', color: 'oklch(0.80 0.005 65)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAdicionarProcesso}
                className="flex-1 px-4 py-2.5 rounded-md font-medium transition-colors"
                style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
