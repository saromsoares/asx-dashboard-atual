// Design: Dark Command Center — Contêiner SR
// Gerenciamento de processos de importação com invoice, NCM e itens

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { X, Plus, Trash2, Copy, ArrowLeft, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { produtos } from '../data/produtos';

interface ItemConteiner {
  id: string;
  codigo: string;
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
  status: 'Em andamento' | 'Finalizado' | 'Cancelado';
}

const STORAGE_KEY_PROCESSOS = 'asx_processos_sr';
const STORAGE_KEY_CONFIRMADOS = 'asx_processos_confirmados';

function carregarProcessos(): ProcessoSR[] {
  try {
    const dados = localStorage.getItem(STORAGE_KEY_PROCESSOS);
    if (dados) return JSON.parse(dados);
  } catch (e) {
    console.error('Erro ao carregar processos:', e);
  }
  return [];
}

function carregarConfirmados(): Set<string> {
  try {
    const dados = localStorage.getItem(STORAGE_KEY_CONFIRMADOS);
    if (dados) return new Set(JSON.parse(dados));
  } catch (e) {
    console.error('Erro ao carregar confirmados:', e);
  }
  return new Set();
}

export default function Conteiner() {
  const [, setLocation] = useLocation();
  const [processos, setProcessos] = useState<ProcessoSR[]>(() => carregarProcessos());
  const [showNovoProcesso, setShowNovoProcesso] = useState(false);
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoSR | null>(null);
  const [processosConfirmados, setProcessosConfirmados] = useState<Set<string>>(() => carregarConfirmados());
  const [filtroConfirmados, setFiltroConfirmados] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<'Todos' | 'Em andamento' | 'Finalizado' | 'Cancelado'>('Todos');

  // Persistir processos no localStorage sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROCESSOS, JSON.stringify(processos));
    } catch (e) {
      console.error('Erro ao salvar processos:', e);
    }
  }, [processos]);

  // Persistir confirmados no localStorage sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIRMADOS, JSON.stringify(Array.from(processosConfirmados)));
    } catch (e) {
      console.error('Erro ao salvar confirmados:', e);
    }
  }, [processosConfirmados]);

  const processosFiltrados = useMemo(() => {
    let resultado = processos;
    
    if (filtroConfirmados) {
      resultado = resultado.filter(p => processosConfirmados.has(p.id));
    }
    
    if (filtroStatus !== 'Todos') {
      resultado = resultado.filter(p => p.status === filtroStatus);
    }
    
    return resultado;
  }, [processos, processosConfirmados, filtroConfirmados, filtroStatus]);

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

  // Autocomplete de produto por código
  const [nomeProdutoEncontrado, setNomeProdutoEncontrado] = useState('');
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [sugestoes, setSugestoes] = useState<typeof produtos>([]);
  const [indiceSugestao, setIndiceSugestao] = useState(-1);

  const handleBuscarProduto = (codigo: string) => {
    setFormItem(prev => ({ ...prev, descricao: codigo }));
    setIndiceSugestao(-1);

    // Busca exata
    const produtoExato = produtos.find(p => p.codigo.toLowerCase() === codigo.toLowerCase());
    if (produtoExato) {
      setNomeProdutoEncontrado(produtoExato.descricao);
      setFormItem(prev => ({ ...prev, descricao: codigo, unidade: produtoExato.unid }));
      setShowSugestoes(false);
      setSugestoes([]);
      return;
    }

    // Busca parcial para sugestões
    if (codigo.length >= 2) {
      const filtrados = produtos.filter(p =>
        p.codigo.toLowerCase().includes(codigo.toLowerCase()) ||
        p.descricao.toLowerCase().includes(codigo.toLowerCase())
      ).slice(0, 8);
      setSugestoes(filtrados);
      setShowSugestoes(filtrados.length > 0);
    } else {
      setSugestoes([]);
      setShowSugestoes(false);
    }

    setNomeProdutoEncontrado('');
    setFormItem(prev => ({ ...prev, descricao: codigo, unidade: '' }));
  };

  const handleSelecionarSugestao = (produto: typeof produtos[0]) => {
    setFormItem(prev => ({
      ...prev,
      descricao: produto.codigo,
      unidade: produto.unid,
    }));
    setNomeProdutoEncontrado(produto.descricao);
    setShowSugestoes(false);
    setSugestoes([]);
    setIndiceSugestao(-1);
  };

  const handleKeyDownSugestao = (e: React.KeyboardEvent) => {
    if (!showSugestoes || sugestoes.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceSugestao(prev => (prev < sugestoes.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceSugestao(prev => (prev > 0 ? prev - 1 : sugestoes.length - 1));
    } else if (e.key === 'Enter' && indiceSugestao >= 0) {
      e.preventDefault();
      handleSelecionarSugestao(sugestoes[indiceSugestao]);
    } else if (e.key === 'Escape') {
      setShowSugestoes(false);
    }
  };

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
      status: 'Em andamento',
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
      codigo: formItem.descricao,
      descricao: nomeProdutoEncontrado || formItem.descricao,
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
    setNomeProdutoEncontrado('');
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
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Em andamento': return { bg: 'oklch(0.48 0.22 25)', text: 'white' };
      case 'Finalizado': return { bg: 'oklch(0.50 0.15 142)', text: 'white' };
      case 'Cancelado': return { bg: 'oklch(0.40 0.10 0)', text: 'white' };
      default: return { bg: 'oklch(0.20 0.005 285)', text: 'oklch(0.80 0.005 65)' };
    }
  };

  const handleAlterarStatus = (id: string, novoStatus: 'Em andamento' | 'Finalizado' | 'Cancelado') => {
    setProcessos(prev => prev.map(p => 
      p.id === id ? { ...p, status: novoStatus } : p
    ));
    setProcessoSelecionado(prev => prev ? { ...prev, status: novoStatus } : null);
  };

  const handleReabrirProcesso = (id: string) => {
    setProcessosConfirmados(prev => {
      const novo = new Set(prev);
      novo.delete(id);
      return novo;
    });
  };

  const handleExportarPlanilhaCompra = () => {
    if (!processoSelecionado) return;

    const ws = XLSX.utils.aoa_to_sheet([
      ['PLANILHA DE COMPRA - CONTÊINER', processoSelecionado.numeroProcesso],
      ['Invoice', processoSelecionado.nomeInvoice],
      ['Data', processoSelecionado.dataProcesso],
      ['Status', processoSelecionado.status],
      [],
      ['CÓDIGO', 'DESCRIÇÃO', 'UNIDADE', 'QUANTIDADE', 'PREÇO UNITÁRIO USD', 'TOTAL USD', 'PEDIDO SAROM', 'PEDIDO ALEXANDRE'],
      ...processoSelecionado.itens.map(item => [
        item.codigo,
        item.descricao,
        item.unidade,
        item.quantidade,
        item.precoUnitarioDolar.toFixed(2),
        item.precoTotalDolar.toFixed(2),
        item.pedidoSarom,
        item.pedidoAlexandre,
      ]),
      [],
      ['TOTAIS'],
      ['Total Itens', processoSelecionado.itens.length],
      ['Total USD', processoSelecionado.itens.reduce((sum, item) => sum + item.precoTotalDolar, 0).toFixed(2)],
      ['Total Sarom', processoSelecionado.itens.reduce((sum, item) => sum + item.pedidoSarom, 0)],
      ['Total Alexandre', processoSelecionado.itens.reduce((sum, item) => sum + item.pedidoAlexandre, 0)],
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Compra');
    const fileName = `ASX_Planilha_Compra_${processoSelecionado.numeroProcesso}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

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
    const headers = ['CODIGO', 'DESCRICAO', 'UNIDADE', 'QUANTIDADE', 'PRECO UNITARIO USD', 'PRECO TOTAL USD', 'PEDIDO SAROM', 'PEDIDO ALEXANDRE'];
    const itensDados = processoSelecionado.itens.map(item => [
      item.codigo,
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
  const handleConfirmarProcesso = () => {
    if (!processoSelecionado) return;
    setProcessosConfirmados(prev => new Set(Array.from(prev).concat([processoSelecionado.id])));
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
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'oklch(0.45 0.010 285)' }}>
              Processos SR ({processosFiltrados.length})
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-1">
                {(['Todos', 'Em andamento', 'Finalizado', 'Cancelado'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setFiltroStatus(status)}
                    className="flex-1 px-2 py-1 rounded text-[9px] font-semibold transition-colors"
                    style={{
                      background: filtroStatus === status ? getStatusColor(status === 'Todos' ? 'Em andamento' : status).bg : 'oklch(0.20 0.005 285)',
                      color: filtroStatus === status ? 'white' : 'oklch(0.60 0.005 65)'
                    }}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setFiltroConfirmados(!filtroConfirmados)}
                className="px-2 py-1 rounded text-[10px] font-semibold transition-colors"
                style={{
                  background: filtroConfirmados ? 'oklch(0.48 0.22 25)' : 'oklch(0.20 0.005 285)',
                  color: 'white'
                }}
                title={filtroConfirmados ? 'Mostrando confirmados' : 'Mostrar todos'}
              >
                {filtroConfirmados ? '✓ Confirmados' : 'Mostrar Todos'}
              </button>
            </div>
          </div>

          <div className="space-y-1 p-3">
            {processosFiltrados.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: 'oklch(0.40 0.010 285)' }}>
                {filtroConfirmados ? 'Nenhum processo confirmado' : 'Nenhum processo criado'}
              </p>
            ) : (
              processosFiltrados.map(p => (
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
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-rajdhani font-semibold text-sm truncate">{p.numeroProcesso}</p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap" style={{ background: getStatusColor(p.status).bg, color: getStatusColor(p.status).text }}>
                          {p.status}
                        </span>
                      </div>
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
          <main className="flex-1 flex flex-col overflow-y-auto">
            {/* Formulário de Edição */}
            <div className="border rounded-lg p-4 flex-shrink-0 overflow-y-auto"
              style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
              <h2 className="font-rajdhani font-bold text-lg mb-4" style={{ color: 'oklch(0.85 0.005 65)' }}>
                Processo {processoSelecionado.numeroProcesso}
              </h2>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                    Status
                  </label>
                  <select
                    value={processoSelecionado.status}
                    onChange={e => handleAlterarStatus(processoSelecionado.id, e.target.value as 'Em andamento' | 'Finalizado' | 'Cancelado')}
                    className="w-full mt-1 px-3 py-2 rounded-md border text-sm"
                    style={{
                      background: 'oklch(0.18 0.005 285)',
                      borderColor: 'oklch(0.26 0.005 285)',
                      color: 'oklch(0.90 0.005 65)',
                    }}
                  >
                    <option value="Em andamento">Em andamento</option>
                    <option value="Finalizado">Finalizado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
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
                    <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Código</th>
                    <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Nome</th>
                    <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Unid</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Qtd</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Preço Unit USD</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Total USD</th>
                    <th className="text-center px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Ações</th>
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
                        <span className="text-xs font-mono" style={{ color: 'oklch(0.48 0.22 25)' }}>{item.codigo}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs" style={{ color: 'oklch(0.85 0.005 65)' }}>{item.descricao}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-center block" style={{ color: 'oklch(0.85 0.005 65)' }}>{item.unidade}</span>
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
<div className="grid grid-cols-6 gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Código"
                    value={formItem.descricao}
                    onChange={e => handleBuscarProduto(e.target.value)}
                    onKeyDown={handleKeyDownSugestao}
                    onFocus={() => { if (sugestoes.length > 0) setShowSugestoes(true); }}
                    onBlur={() => setTimeout(() => setShowSugestoes(false), 200)}
                    className="w-full px-3 py-2 rounded-md border text-sm"
                    style={{
                      background: 'oklch(0.18 0.005 285)',
                      borderColor: 'oklch(0.26 0.005 285)',
                      color: 'oklch(0.90 0.005 65)',
                    }}
                  />
                  {showSugestoes && sugestoes.length > 0 && (
                    <div
                      className="absolute z-50 left-0 right-0 mt-1 rounded-md border overflow-hidden shadow-lg"
                      style={{
                        background: 'oklch(0.16 0.005 285)',
                        borderColor: 'oklch(0.30 0.005 285)',
                        maxHeight: '240px',
                        overflowY: 'auto',
                      }}
                    >
                      {sugestoes.map((prod, idx) => (
                        <div
                          key={prod.id}
                          onMouseDown={() => handleSelecionarSugestao(prod)}
                          className="px-3 py-2 cursor-pointer transition-colors text-xs"
                          style={{
                            background: idx === indiceSugestao ? 'oklch(0.22 0.005 285)' : 'transparent',
                            borderBottom: '1px solid oklch(0.20 0.005 285)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'oklch(0.22 0.005 285)')}
                          onMouseLeave={e => (e.currentTarget.style.background = idx === indiceSugestao ? 'oklch(0.22 0.005 285)' : 'transparent')}
                        >
                          <span className="font-mono font-bold" style={{ color: 'oklch(0.48 0.22 25)' }}>{prod.codigo}</span>
                          <span className="ml-2" style={{ color: 'oklch(0.70 0.005 65)' }}>{prod.descricao}</span>
                          <span className="ml-2 opacity-60" style={{ color: 'oklch(0.55 0.005 65)' }}>({prod.unid})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Nome (automático)"
                  value={nomeProdutoEncontrado}
                  readOnly
                  className="col-span-2 px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.15 0.005 285)',
                    borderColor: nomeProdutoEncontrado ? 'oklch(0.40 0.18 145)' : 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Unid"
                  value={formItem.unidade}
                  readOnly
                  className="px-3 py-2 rounded-md border text-sm text-center"
                  style={{
                    background: 'oklch(0.15 0.005 285)',
                    borderColor: formItem.unidade ? 'oklch(0.40 0.18 145)' : 'oklch(0.26 0.005 285)',
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
              </div>
              <button
                onClick={handleAdicionarItem}
                className="mt-2 px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1"
                style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>

            {/* Botões de Ação */}
            <div className="mt-4 flex gap-2 flex-shrink-0 pb-2">
              <button
                onClick={handleExportarExcel}
                className="flex-1 px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                style={{ background: 'oklch(0.20 0.005 285)', borderColor: 'oklch(0.26 0.005 285)', border: '1px solid', color: 'oklch(0.80 0.005 65)' }}
                title="Exportar processo para Excel"
              >
                <Download className="w-4 h-4" />
                Exportar Processo
              </button>
              <button
                onClick={handleExportarPlanilhaCompra}
                className="flex-1 px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                style={{ background: 'oklch(0.50 0.15 142)', color: 'white' }}
                title="Exportar planilha de compra com dados de Sarom e Alexandre"
              >
                <Download className="w-4 h-4" />
                Exportar Compra
              </button>
              <button
                onClick={handleConfirmarProcesso}
                disabled={processosConfirmados.has(processoSelecionado?.id || '')}
                className="flex-1 px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: processosConfirmados.has(processoSelecionado?.id || '') ? 'oklch(0.30 0.005 285)' : 'oklch(0.48 0.22 25)', color: 'white' }}
                title={processosConfirmados.has(processoSelecionado?.id || '') ? 'Processo já confirmado' : 'Confirmar e finalizar processo'}
              >
                ✓ Confirmar Processo
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
