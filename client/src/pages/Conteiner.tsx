// Design: Dark Command Center — Contêiner SR
// Gerenciamento de processos de importação com invoice, NCM e itens

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { X, Plus, Trash2, Copy, ArrowLeft, Download, AlertTriangle, Link2, ShoppingCart, Check } from 'lucide-react';
import XLSX from 'xlsx-js-style';
import { produtos } from '../data/produtos';
import { dispatchProcessosChange } from '../hooks/useEstoqueDB';
import { VinculadorEmbarques } from '../components/VinculadorEmbarques';
import { useEmbarques } from '../hooks/useEmbarques';
import { useIdiomaDB as useIdioma } from '../hooks/useIdiomaDB';
import { trpc } from '../lib/trpc';

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
  ordemCompra: string;
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
  // Campos do rodapé da invoice
  caixasPapelao: number;
  pesoBrutoKg: number;
  pesoLiquidoKg: number;
  cbm: number;
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
  const { t } = useIdioma();
  const { embarques } = useEmbarques();
  const [processos, setProcessos] = useState<ProcessoSR[]>(() => carregarProcessos());
  const [showNovoProcesso, setShowNovoProcesso] = useState(false);
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoSR | null>(null);
  const [processosConfirmados, setProcessosConfirmados] = useState<Set<string>>(() => carregarConfirmados());
  const [filtroConfirmados, setFiltroConfirmados] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<'Todos' | 'Em andamento' | 'Finalizado' | 'Cancelado'>('Todos');
  const [showVinculador, setShowVinculador] = useState(false);
  const { obterEmbarquesProcesso } = useEmbarques();

  // ===== IMPORTAR DE PEDIDO CONFIRMADO (Modal Grande) =====
  const [showModalImport, setShowModalImport] = useState(false);
  const [pedidoSelecionadoImport, setPedidoSelecionadoImport] = useState<number | null>(null);

  // Auto-abrir modal se veio do Rastreamento (sessionStorage)
  useEffect(() => {
    const pedidoId = sessionStorage.getItem('asx_importar_pedido');
    if (pedidoId) {
      sessionStorage.removeItem('asx_importar_pedido');
      const id = Number(pedidoId);
      if (id > 0) {
        // Aguardar dados carregarem e abrir modal
        setTimeout(() => {
          setPedidoSelecionadoImport(id);
          setShowModalImport(true);
        }, 500);
      }
    }
  }, []);

  // Queries tRPC para pedidos confirmados
  const { data: pedidosDb = [] } = trpc.pedido.getAll.useQuery();
  const { data: todosItensDb = [] } = trpc.itemPedido.getAll.useQuery();

  // Saldo pendente: quantidades já embarcadas de cada pedido em contêineres anteriores
  const STORAGE_SALDO = 'asx_saldo_embarques';
  const [saldoEmbarques, setSaldoEmbarques] = useState<Record<string, Record<string, { sarom: number; alexandre: number }>>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SALDO);
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const salvarSaldo = useCallback((novoSaldo: typeof saldoEmbarques) => {
    setSaldoEmbarques(novoSaldo);
    try { localStorage.setItem(STORAGE_SALDO, JSON.stringify(novoSaldo)); } catch {}
  }, []);

  // Filtrar apenas pedidos confirmados
  const pedidosConfirmadosDb = useMemo(() => {
    return pedidosDb.filter((p: any) => p.status === 'Confirmado');
  }, [pedidosDb]);

  // Itens do pedido selecionado com saldo pendente calculado
  const itensDoSelecionado = useMemo(() => {
    if (!pedidoSelecionadoImport) return [];
    const saldoPedido = saldoEmbarques[String(pedidoSelecionadoImport)] || {};

    return todosItensDb
      .filter((i: any) => i.pedidoId === pedidoSelecionadoImport)
      .map((item: any) => {
        const prod = produtos.find(p => p.codigo === item.produtoId);
        const jaEmbarcado = saldoPedido[item.produtoId] || { sarom: 0, alexandre: 0 };
        const pedSarom = item.quantidadeSarom || 0;
        const pedAlexandre = item.quantidadeAlexandre || 0;
        const saldoSarom = Math.max(0, pedSarom - jaEmbarcado.sarom);
        const saldoAlexandre = Math.max(0, pedAlexandre - jaEmbarcado.alexandre);
        return {
          produtoId: item.produtoId,
          descricao: prod?.descricao || item.produtoId,
          unidade: prod?.unid || 'UND',
          pedidoSarom: pedSarom,
          pedidoAlexandre: pedAlexandre,
          jaEmbarcadoSarom: jaEmbarcado.sarom,
          jaEmbarcadoAlexandre: jaEmbarcado.alexandre,
          saldoSarom,
          saldoAlexandre,
          precoUnitario: parseFloat(item.precoUnitario) || prod?.custo_usd || 0,
        };
      });
  }, [pedidoSelecionadoImport, todosItensDb, saldoEmbarques]);

  // Quantidades editáveis no modal (embarcar agora)
  const [qtdsEmbarcar, setQtdsEmbarcar] = useState<Record<string, { sarom: number; alexandre: number }>>({});

  // Inicializar qtds quando seleciona pedido (preenche com saldo pendente)
  useEffect(() => {
    if (!pedidoSelecionadoImport || itensDoSelecionado.length === 0) return;
    const initial: Record<string, { sarom: number; alexandre: number }> = {};
    itensDoSelecionado.forEach(item => {
      initial[item.produtoId] = { sarom: item.saldoSarom, alexandre: item.saldoAlexandre };
    });
    setQtdsEmbarcar(initial);
  }, [pedidoSelecionadoImport, itensDoSelecionado.length]);

  // Atualizar quantidade de embarque
  const updateQtdEmbarcar = useCallback((produtoId: string, campo: 'sarom' | 'alexandre', valor: number) => {
    setQtdsEmbarcar(prev => ({
      ...prev,
      [produtoId]: { ...prev[produtoId], [campo]: Math.max(0, valor) },
    }));
  }, []);

  // Totais do modal
  const totaisImport = useMemo(() => {
    let totalSaromPedido = 0, totalAlexandrePedido = 0;
    let totalSaromEmbarcar = 0, totalAlexandreEmbarcar = 0;
    let totalUsdEmbarcar = 0;
    let itensComEmbarque = 0;

    itensDoSelecionado.forEach(item => {
      totalSaromPedido += item.saldoSarom;
      totalAlexandrePedido += item.saldoAlexandre;
      const qtd = qtdsEmbarcar[item.produtoId] || { sarom: 0, alexandre: 0 };
      totalSaromEmbarcar += qtd.sarom;
      totalAlexandreEmbarcar += qtd.alexandre;
      totalUsdEmbarcar += (qtd.sarom + qtd.alexandre) * item.precoUnitario;
      if (qtd.sarom > 0 || qtd.alexandre > 0) itensComEmbarque++;
    });

    const pctSarom = totalSaromPedido > 0 ? (totalSaromEmbarcar / totalSaromPedido) * 100 : 0;
    const pctAlexandre = totalAlexandrePedido > 0 ? (totalAlexandreEmbarcar / totalAlexandrePedido) * 100 : 0;
    const totalGeralPedido = totalSaromPedido + totalAlexandrePedido;
    const totalGeralEmbarcar = totalSaromEmbarcar + totalAlexandreEmbarcar;
    const pctGeral = totalGeralPedido > 0 ? (totalGeralEmbarcar / totalGeralPedido) * 100 : 0;

    return {
      totalSaromPedido, totalAlexandrePedido, totalSaromEmbarcar, totalAlexandreEmbarcar,
      totalUsdEmbarcar, itensComEmbarque, pctSarom, pctAlexandre, pctGeral,
      totalGeralPedido, totalGeralEmbarcar,
      saldoRestante: totalGeralPedido - totalGeralEmbarcar,
    };
  }, [itensDoSelecionado, qtdsEmbarcar]);

  // Handler: confirmar importação do modal
  const handleConfirmarImportacao = useCallback(() => {
    if (!processoSelecionado) return;

    // Gerar itens para a invoice
    const novosItens: ItemConteiner[] = [];
    const nomePedido = pedidosDb.find((p: any) => p.id === pedidoSelecionadoImport)?.nome || '';

    itensDoSelecionado.forEach(item => {
      const qtd = qtdsEmbarcar[item.produtoId] || { sarom: 0, alexandre: 0 };
      if (qtd.sarom === 0 && qtd.alexandre === 0) return;

      // Verificar se item já existe no processo
      const jaExiste = processoSelecionado.itens.some(i => i.codigo === item.produtoId);
      if (jaExiste) return;

      novosItens.push({
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        codigo: item.produtoId,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: qtd.sarom + qtd.alexandre,
        precoUnitarioDolar: item.precoUnitario,
        precoTotalDolar: (qtd.sarom + qtd.alexandre) * item.precoUnitario,
        pedidoSarom: qtd.sarom,
        pedidoAlexandre: qtd.alexandre,
        ordemCompra: nomePedido,
      });
    });

    if (novosItens.length === 0) {
      alert('Nenhum item novo para importar (todos já existem ou quantidades são 0).');
      return;
    }

    // Atualizar processo
    const processoAtualizado = {
      ...processoSelecionado,
      itens: [...processoSelecionado.itens, ...novosItens],
    };
    setProcessos(prev => prev.map(p => p.id === processoSelecionado.id ? processoAtualizado : p));
    setProcessoSelecionado(processoAtualizado);

    // Atualizar saldo de embarques (registrar o que foi embarcado)
    const pedidoKey = String(pedidoSelecionadoImport);
    const saldoAtual = { ...saldoEmbarques };
    if (!saldoAtual[pedidoKey]) saldoAtual[pedidoKey] = {};

    itensDoSelecionado.forEach(item => {
      const qtd = qtdsEmbarcar[item.produtoId] || { sarom: 0, alexandre: 0 };
      if (qtd.sarom === 0 && qtd.alexandre === 0) return;
      const atual = saldoAtual[pedidoKey][item.produtoId] || { sarom: 0, alexandre: 0 };
      saldoAtual[pedidoKey][item.produtoId] = {
        sarom: atual.sarom + qtd.sarom,
        alexandre: atual.alexandre + qtd.alexandre,
      };
    });
    salvarSaldo(saldoAtual);

    alert(`${novosItens.length} item(ns) importado(s)! Saldo pendente atualizado.`);
    setShowModalImport(false);
    setPedidoSelecionadoImport(null);
    setQtdsEmbarcar({});
  }, [processoSelecionado, itensDoSelecionado, qtdsEmbarcar, pedidosDb, pedidoSelecionadoImport, saldoEmbarques, salvarSaldo, processos]);

  // Persistir processos no localStorage sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROCESSOS, JSON.stringify(processos));
      dispatchProcessosChange(); // Notificar useEstoque da mudança
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
    ordemCompra: '',
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
      caixasPapelao: 0,
      pesoBrutoKg: 0,
      pesoLiquidoKg: 0,
      cbm: 0,
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
      ordemCompra: formItem.ordemCompra,
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
      ordemCompra: '',
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
    if (!processoSelecionado) return { totalItens: 0, totalDolar: 0, totalSarom: 0, totalAlexandre: 0, totalQtd: 0, divergentes: 0 };
    const totalItens = processoSelecionado.itens.length;
    const totalDolar = processoSelecionado.itens.reduce((s, i) => s + i.precoTotalDolar, 0);
    const totalSarom = processoSelecionado.itens.reduce((s, i) => s + i.pedidoSarom, 0);
    const totalAlexandre = processoSelecionado.itens.reduce((s, i) => s + i.pedidoAlexandre, 0);
    const totalQtd = processoSelecionado.itens.reduce((s, i) => s + i.quantidade, 0);
    const divergentes = processoSelecionado.itens.filter(i => (i.pedidoSarom + i.pedidoAlexandre) !== i.quantidade).length;
    return { totalItens, totalDolar, totalSarom, totalAlexandre, totalQtd, divergentes };
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
    const wb = XLSX.utils.book_new();

    const FATOR_BRL = 8.5;
    const totalQtd = processoSelecionado.itens.reduce((s, i) => s + i.quantidade, 0);
    const totalUSD = Number(processoSelecionado.itens.reduce((s, i) => s + i.precoTotalDolar, 0).toFixed(2));
    const totalSaromPreco = Number(processoSelecionado.itens.reduce((s, i) => s + (i.pedidoSarom * i.precoUnitarioDolar), 0).toFixed(2));
    const totalAlexPreco = Number(processoSelecionado.itens.reduce((s, i) => s + (i.pedidoAlexandre * i.precoUnitarioDolar), 0).toFixed(2));
    const numItens = processoSelecionado.itens.length;

    // Estilos base
    const fontBold12: any = { name: 'Times New Roman', sz: 12, bold: true };
    const fontBold10: any = { name: 'Times New Roman', sz: 10, bold: true };
    const fontBold9: any = { name: 'Times New Roman', sz: 9, bold: true };
    const fontNormal9: any = { name: 'Times New Roman', sz: 9 };
    const fontNormal10: any = { name: 'Times New Roman', sz: 10 };
    const borderThin: any = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    const borderMediumLeft: any = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'medium' }, right: { style: 'thin' } };
    const alignCenter: any = { horizontal: 'center', vertical: 'center', wrapText: true };
    const alignLeft: any = { horizontal: 'left', vertical: 'center', wrapText: true };

    const ws: any = {};
    const setCell = (ref: string, value: any, style: any = {}) => {
      const cell: any = { v: value, t: typeof value === 'number' ? 'n' : 's' };
      cell.s = style;
      ws[ref] = cell;
    };

    // === ROW 1: Header MIC TRADE (merged A1:Q1) ===
    setCell('A1', 'MIC TRADE SERVICE LIMITED\nRM 502C 5/F\nHO KING COMM CTR\n2-16 FAYUEN ST MONGKOK KL HONGKONG CHINA', {
      font: fontBold12, alignment: alignCenter, border: borderMediumLeft
    });

    // === ROW 2: COMERCIAL INVOICE (merged A2:Q2) ===
    setCell('A2', 'COMERCIAL INVOICE', {
      font: fontBold12, alignment: alignCenter, border: borderMediumLeft
    });

    // === ROW 3: TO + Destinatário + INVOICE ===
    setCell('A3', 'TO', { font: fontBold12, alignment: alignCenter, border: borderMediumLeft });
    setCell('B3', 'SONRES & REZENDE INPORT. EXPORT LTDA\nCNPJ: 23 113 383/0002-90\nRUA ALFREDO NERLO 560/ SALA 05\nMOMRIND MLA VELH ES', {
      font: fontBold10, alignment: alignCenter, border: borderThin
    });
    setCell('G3', 'INVOICE:', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('I3', processoSelecionado.numeroProcesso || 'SR 201', { font: fontNormal10, alignment: alignCenter, border: borderThin });

    // === ROW 4: Despachante + DATE + NCM ===
    setCell('B4', 'PROSPER INTELIGÊNCIA ADUANEIRA LTDA\nADDRESS: RUA GONCALVES DIAS, 110, SALA 17, CENTRO, PORTO\nVELHO, RO, CEP 76.801-076\nCNPJ: 59.574.729/0001-14', {
      font: fontBold10, alignment: alignCenter, border: borderThin
    });
    setCell('G4', `DATE: ${processoSelecionado.dataProcesso}`, { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('I4', `NCM ${processoSelecionado.ncm || '8539'}`, { font: fontBold10, alignment: alignCenter, border: borderThin });

    // === ROW 5: OBS ===
    setCell('G5', 'OBS:', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('I5', processoSelecionado.observacoes || '', { font: fontNormal9, alignment: alignCenter, border: borderThin });

    // === ROW 6: Cabeçalho da tabela (primeira linha) ===
    setCell('A6', 'ITEM', { font: fontBold9, alignment: alignCenter, border: borderMediumLeft });
    setCell('B6', 'DESCRICAO DOS PRODUTOS MAIS CODIGO', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('J6', 'PRICE', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('K6', 'TOTAL PRICE', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('L6', 'preco BR', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('M6', 'SAROM QUANT', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('N6', 'SAROM PRECO', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('O6', 'ALEXANDR QUAN', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('P6', 'ALEXANDR PRECO', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('Q6', 'ORDEM DE COMPRA', { font: fontBold9, alignment: alignCenter, border: borderThin });

    // === ROW 7: Sub-cabeçalho ===
    setCell('A7', '', { font: fontBold9, alignment: alignCenter, border: borderMediumLeft });
    setCell('B7', '', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('H7', 'UND', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('I7', 'QUANT', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('J7', 'USD', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('K7', 'USD', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('L7', '', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('M7', '', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('N7', '', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('O7', '', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('P7', '', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('Q7', '', { font: fontBold9, alignment: alignCenter, border: borderThin });

    // === ROWS 8+: Itens ===
    const itemStartRow = 8;
    processoSelecionado.itens.forEach((item, idx) => {
      const r = itemStartRow + idx;
      const precoBR = Number((item.precoUnitarioDolar * FATOR_BRL).toFixed(2));
      const saromPreco = Number((item.pedidoSarom * item.precoUnitarioDolar).toFixed(2));
      const alexPreco = Number((item.pedidoAlexandre * item.precoUnitarioDolar).toFixed(2));

      setCell(`A${r}`, idx + 1, { font: fontNormal9, alignment: alignCenter, border: borderMediumLeft });
      setCell(`B${r}`, `${item.codigo} - ${item.descricao}`, { font: fontNormal9, alignment: alignLeft, border: borderThin });
      setCell(`H${r}`, item.unidade || 'PIC', { font: fontNormal9, alignment: alignCenter, border: borderThin });
      setCell(`I${r}`, item.quantidade, { font: fontNormal9, alignment: alignCenter, border: borderThin });
      setCell(`J${r}`, Number(item.precoUnitarioDolar.toFixed(2)), { font: fontNormal9, alignment: alignCenter, border: borderThin });
      setCell(`K${r}`, Number(item.precoTotalDolar.toFixed(2)), { font: fontNormal9, alignment: alignCenter, border: borderThin });
      setCell(`L${r}`, precoBR, { font: fontNormal9, alignment: alignCenter, border: borderThin });
      setCell(`M${r}`, item.pedidoSarom, { font: fontNormal9, alignment: alignCenter, border: borderThin });
      setCell(`N${r}`, saromPreco, { font: fontNormal9, alignment: alignCenter, border: borderThin });
      setCell(`O${r}`, item.pedidoAlexandre, { font: fontNormal9, alignment: alignCenter, border: borderThin });
      setCell(`P${r}`, alexPreco, { font: fontNormal9, alignment: alignCenter, border: borderThin });
      setCell(`Q${r}`, item.ordemCompra || '', { font: fontNormal9, alignment: alignCenter, border: borderThin });
    });

    // === ROW TOTAIS ===
    const totalRow = itemStartRow + numItens;
    setCell(`I${totalRow}`, totalQtd, { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`K${totalRow}`, totalUSD, { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`N${totalRow}`, totalSaromPreco, { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`P${totalRow}`, totalAlexPreco, { font: fontBold9, alignment: alignCenter, border: borderThin });

    // === ROW EMBARQUE (merged A:Q) ===
    const embarqueRow = totalRow + 2;
    const cx = processoSelecionado.caixasPapelao || 0;
    const pb = processoSelecionado.pesoBrutoKg || 0;
    const pl = processoSelecionado.pesoLiquidoKg || 0;
    const cbm = processoSelecionado.cbm || 0;
    setCell(`A${embarqueRow}`, ` CAIXAS ${cx} PAPELAO   / PESO BRUTO ${pb} KG   /  PESO LIQUIDO ${pl} KG / CBM ${cbm}`, {
      font: fontBold9, alignment: alignLeft, border: borderMediumLeft
    });

    // === ROW FACTORY ===
    const factoryHeaderRow = embarqueRow + 1;
    setCell(`A${factoryHeaderRow}`, '.', { font: fontBold9, alignment: alignCenter, border: borderMediumLeft });
    setCell(`C${factoryHeaderRow}`, 'Factory', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`G${factoryHeaderRow}`, 'Address', { font: fontBold9, alignment: alignCenter, border: borderThin });

    const f1Row = factoryHeaderRow + 1;
    setCell(`A${f1Row}`, '1-11', { font: fontNormal9, alignment: alignCenter, border: borderMediumLeft });
    setCell(`C${f1Row}`, 'HEBEI SHUANGQI AUTOMOBILE LIGHTING APPLIANCE CO., LTD.', { font: fontNormal9, alignment: alignCenter, border: borderThin });
    setCell(`G${f1Row}`, 'LIUFEN VILLAGE, WOFOTANG TOWN, HEJIAN CITY, HEBEI PROVINCE, CHINA', { font: fontNormal9, alignment: alignCenter, border: borderThin });

    // === CONDITIONS ROW ===
    const condRow = f1Row + 1;
    setCell(`A${condRow}`, 'CONDITIONS OF TERM AND PAYMENT', { font: fontBold9, alignment: alignLeft, border: borderMediumLeft });
    setCell(`F${condRow}`, 'TRANSPORTATION METHOD', { font: fontBold9, alignment: alignLeft, border: borderThin });

    const priceRow = condRow + 1;
    setCell(`A${priceRow}`, 'TERM OF PRICE:', { font: fontBold9, alignment: alignLeft, border: borderMediumLeft });
    setCell(`C${priceRow}`, 'FOB', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`F${priceRow}`, 'VIA:', { font: fontBold9, alignment: alignLeft, border: borderThin });
    setCell(`I${priceRow}`, 'SHIP', { font: fontNormal9, alignment: alignCenter, border: borderThin });

    const payRow = priceRow + 1;
    setCell(`A${payRow}`, 'TERM OF PAYMENT:', { font: fontBold9, alignment: alignLeft, border: borderMediumLeft });
    setCell(`C${payRow}`, '100% ADVANCED UNTIL 90 DAYS AFTER RECEIVE BL', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`F${payRow}`, 'PORT TO LOADING:', { font: fontBold9, alignment: alignLeft, border: borderThin });
    setCell(`I${payRow}`, 'GUANGZHOU, China', { font: fontNormal9, alignment: alignCenter, border: borderThin });

    const embRow = payRow + 1;
    setCell(`A${embRow}`, 'PREVISAO DE EMBARQUE', { font: fontBold9, alignment: alignLeft, border: borderMediumLeft });
    setCell(`C${embRow}`, processoSelecionado.dataProcesso || '', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`F${embRow}`, 'PORT OF DESTINATION:', { font: fontBold9, alignment: alignLeft, border: borderThin });
    setCell(`I${embRow}`, 'SALVADOR / BAHIA / BRASIL.', { font: fontNormal9, alignment: alignCenter, border: borderThin });

    const delRow = embRow + 1;
    setCell(`F${delRow}`, 'TIME OF DELIVERY:', { font: fontBold9, alignment: alignLeft, border: borderThin });

    // === BANK INFORMATION ===
    const bankRow = delRow + 1;
    setCell(`A${bankRow}`, 'BANK INFORMATION\nBeneficiary Name:  MIC TRADE SERVICE LIMITED\nAccount No.:  NRA30006829988 (please also input "NRA")\nADDRESS: RM 502C 5/F, HO KING COMM CTR,2-16 FAYUEN ST MONGKOK,KL\n\nBeneficiary Bank: DBS Bank (China) Ltd Guangzhou Branch\nSwift Code : DBSSCNSHGZU\nBeneficiary Bank Address: One-link Center, 18/F Onelink Centre, No.230-232, Tianhe Road, Tianhe District, Guangzhou', {
      font: fontBold9, alignment: alignLeft, border: borderMediumLeft
    });

    // === MERGES (17 colunas A-Q, cols 0-16) ===
    const merges: any[] = [
      // Row 1: A1:Q1
      { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },
      // Row 2: A2:Q2
      { s: { r: 1, c: 0 }, e: { r: 1, c: 16 } },
      // Row 3: A3:A5 (TO), B3:F3 (destinatário), G3:H3 (INVOICE:), I3:Q3 (número)
      { s: { r: 2, c: 0 }, e: { r: 4, c: 0 } },
      { s: { r: 2, c: 1 }, e: { r: 2, c: 5 } },
      { s: { r: 2, c: 6 }, e: { r: 2, c: 7 } },
      { s: { r: 2, c: 8 }, e: { r: 2, c: 16 } },
      // Row 4: B4:F5 (despachante), G4:H4 (DATE), I4:Q5 (NCM)
      { s: { r: 3, c: 1 }, e: { r: 4, c: 5 } },
      { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
      { s: { r: 3, c: 8 }, e: { r: 4, c: 16 } },
      // Row 5: G5:H5 (OBS)
      { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
      // Row 6-7: A6:A7 (ITEM), B6:G6 (descricao header)
      { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } },
      { s: { r: 5, c: 1 }, e: { r: 5, c: 6 } },
      // Row 7: B7:G7 (sub-header vazio)
      { s: { r: 6, c: 1 }, e: { r: 6, c: 6 } },
    ];

    // Itens: B:G merged para cada item
    for (let i = 0; i < numItens; i++) {
      const r = itemStartRow - 1 + i; // 0-indexed
      merges.push({ s: { r, c: 1 }, e: { r, c: 6 } });
    }

    // Embarque row merge A:Q
    merges.push({ s: { r: embarqueRow - 1, c: 0 }, e: { r: embarqueRow - 1, c: 16 } });

    // Factory header merges
    merges.push({ s: { r: factoryHeaderRow - 1, c: 0 }, e: { r: factoryHeaderRow - 1, c: 1 } });
    merges.push({ s: { r: factoryHeaderRow - 1, c: 2 }, e: { r: factoryHeaderRow - 1, c: 5 } });
    merges.push({ s: { r: factoryHeaderRow - 1, c: 6 }, e: { r: factoryHeaderRow - 1, c: 16 } });

    // Factory data merges
    merges.push({ s: { r: f1Row - 1, c: 0 }, e: { r: f1Row - 1, c: 1 } });
    merges.push({ s: { r: f1Row - 1, c: 2 }, e: { r: f1Row - 1, c: 5 } });
    merges.push({ s: { r: f1Row - 1, c: 6 }, e: { r: f1Row - 1, c: 16 } });

    // Conditions merges
    merges.push({ s: { r: condRow - 1, c: 0 }, e: { r: condRow - 1, c: 4 } });
    merges.push({ s: { r: condRow - 1, c: 5 }, e: { r: condRow - 1, c: 16 } });
    // Price row
    merges.push({ s: { r: priceRow - 1, c: 0 }, e: { r: priceRow - 1, c: 1 } });
    merges.push({ s: { r: priceRow - 1, c: 2 }, e: { r: priceRow - 1, c: 4 } });
    merges.push({ s: { r: priceRow - 1, c: 5 }, e: { r: priceRow - 1, c: 7 } });
    merges.push({ s: { r: priceRow - 1, c: 8 }, e: { r: priceRow - 1, c: 16 } });
    // Payment row
    merges.push({ s: { r: payRow - 1, c: 0 }, e: { r: payRow - 1, c: 1 } });
    merges.push({ s: { r: payRow - 1, c: 2 }, e: { r: payRow - 1, c: 4 } });
    merges.push({ s: { r: payRow - 1, c: 5 }, e: { r: payRow - 1, c: 7 } });
    merges.push({ s: { r: payRow - 1, c: 8 }, e: { r: payRow - 1, c: 16 } });
    // Embarque previsao row
    merges.push({ s: { r: embRow - 1, c: 0 }, e: { r: embRow - 1, c: 1 } });
    merges.push({ s: { r: embRow - 1, c: 2 }, e: { r: embRow - 1, c: 4 } });
    merges.push({ s: { r: embRow - 1, c: 5 }, e: { r: embRow - 1, c: 7 } });
    merges.push({ s: { r: embRow - 1, c: 8 }, e: { r: embRow - 1, c: 16 } });
    // Delivery row
    merges.push({ s: { r: delRow - 1, c: 5 }, e: { r: delRow - 1, c: 7 } });
    merges.push({ s: { r: delRow - 1, c: 8 }, e: { r: delRow - 1, c: 16 } });
    // Bank info merge A:Q
    merges.push({ s: { r: bankRow - 1, c: 0 }, e: { r: bankRow - 1, c: 16 } });

    ws['!merges'] = merges;

    // === COLUMN WIDTHS (17 colunas A-Q) ===
    ws['!cols'] = [
      { wch: 5.16 },   // A - ITEM
      { wch: 6.16 },   // B - Desc start
      { wch: 5.5 },    // C
      { wch: 7.5 },    // D
      { wch: 9.66 },   // E
      { wch: 18.66 },  // F
      { wch: 33.16 },  // G - Desc end
      { wch: 6.16 },   // H - UND
      { wch: 10 },     // I - QUANT
      { wch: 10 },     // J - PRICE USD
      { wch: 12 },     // K - TOTAL PRICE USD
      { wch: 10 },     // L - preco BR
      { wch: 12 },     // M - SAROM QUANT
      { wch: 12 },     // N - SAROM PRECO
      { wch: 12 },     // O - ALEXANDR QUAN
      { wch: 14 },     // P - ALEXANDR PRECO
      { wch: 16 },     // Q - ORDEM DE COMPRA
    ];

    // === ROW HEIGHTS ===
    const rows: any = {};
    rows[0] = { hpt: 63 }; // Row 1
    rows[1] = { hpt: 16 }; // Row 2
    rows[2] = { hpt: 65 }; // Row 3
    rows[3] = { hpt: 27 }; // Row 4
    rows[4] = { hpt: 43 }; // Row 5
    rows[5] = { hpt: 25 }; // Row 6
    rows[6] = { hpt: 29 }; // Row 7
    for (let i = 0; i < numItens; i++) {
      rows[itemStartRow - 1 + i] = { hpt: 20.25 };
    }
    rows[embarqueRow - 1] = { hpt: 16 };
    rows[bankRow - 1] = { hpt: 133 };
    const maxRowIdx = Math.max(...Object.keys(rows).map(Number));
    const rowsArr: any[] = [];
    for (let i = 0; i <= maxRowIdx; i++) {
      rowsArr.push(rows[i] || {});
    }
    ws['!rows'] = rowsArr;

    // Set ref range
    ws['!ref'] = `A1:Q${bankRow}`;

    XLSX.utils.book_append_sheet(wb, ws, 'PI FINAL TOTAL');
    const fileName = `${processoSelecionado.numeroProcesso || 'SR'}PI_Compra.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportarExcel = () => {
    if (!processoSelecionado) return;
    const wb = XLSX.utils.book_new();

    const totalUSD = Number(processoSelecionado.itens.reduce((s, i) => s + i.precoTotalDolar, 0).toFixed(2));
    const totalQtd = processoSelecionado.itens.reduce((s, i) => s + i.quantidade, 0);
    const numItens = processoSelecionado.itens.length;

    // Estilos base
    const fontBold12: any = { name: 'Times New Roman', sz: 12, bold: true };
    const fontBold10: any = { name: 'Times New Roman', sz: 10, bold: true };
    const fontBold9: any = { name: 'Times New Roman', sz: 9, bold: true };
    const fontNormal9: any = { name: 'Times New Roman', sz: 9 };
    const fontNormal10: any = { name: 'Times New Roman', sz: 10 };
    const borderThin: any = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    const borderMediumLeft: any = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'medium' }, right: { style: 'thin' } };
    const alignCenter: any = { horizontal: 'center', vertical: 'center', wrapText: true };
    const alignLeft: any = { horizontal: 'left', vertical: 'center', wrapText: true };

    // Criar worksheet vazio
    const ws: any = {};

    // Helper para setar célula com estilo
    const setCell = (ref: string, value: any, style: any = {}) => {
      const cell: any = { v: value, t: typeof value === 'number' ? 'n' : 's' };
      cell.s = style;
      ws[ref] = cell;
    };

    // === ROW 1: Header MIC TRADE (merged A1:K1) ===
    setCell('A1', 'MIC TRADE SERVICE LIMITED\nRM 502C 5/F\nHO KING COMM CTR\n2-16 FAYUEN ST MONGKOK KL HONGKONG CHINA', {
      font: fontBold12, alignment: alignCenter, border: borderMediumLeft
    });

    // === ROW 2: COMERCIAL INVOICE (merged A2:K2) ===
    setCell('A2', 'COMERCIAL INVOICE', {
      font: fontBold12, alignment: alignCenter, border: borderMediumLeft
    });

    // === ROW 3: TO + Destinatário + INVOICE ===
    setCell('A3', 'TO', { font: fontBold12, alignment: alignCenter, border: borderMediumLeft });
    setCell('B3', 'SONRES & REZENDE INPORT. EXPORT LTDA\nCNPJ: 23 113 383/0002-90\nRUA ALFREDO NERLO 560/ SALA 05\nMOMRIND MLA VELH ES', {
      font: fontBold10, alignment: alignCenter, border: borderThin
    });
    setCell('G3', 'INVOICE:', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('I3', processoSelecionado.numeroProcesso || 'SR 201', { font: fontNormal10, alignment: alignCenter, border: borderThin });

    // === ROW 4: Despachante + DATE + NCM ===
    setCell('B4', 'PROSPER INTELIGÊNCIA ADUANEIRA LTDA\nADDRESS: RUA GONCALVES DIAS, 110, SALA 17, CENTRO, PORTO\nVELHO, RO, CEP 76.801-076\nCNPJ: 59.574.729/0001-14', {
      font: fontBold10, alignment: alignCenter, border: borderThin
    });
    setCell('G4', `DATE: ${processoSelecionado.dataProcesso}`, { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('I4', `NCM ${processoSelecionado.ncm || '8539'}`, { font: fontBold10, alignment: alignCenter, border: borderThin });

    // === ROW 5: OBS ===
    setCell('G5', 'OBS:', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('I5', processoSelecionado.observacoes || '', { font: fontNormal9, alignment: alignCenter, border: borderThin });

    // === ROW 6-7: Cabeçalho da tabela (merged) ===
    setCell('A6', 'ITEM', { font: fontBold9, alignment: alignCenter, border: borderMediumLeft });
    setCell('B6', 'codigo e descricao do produto', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('H6', 'UND', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('I6', 'QUANT', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('H7', '', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('I7', '', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('J7', '', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('K7', '', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('J6', 'PRICE\nUSD', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('K6', 'TOTAL PRICE\nUSD', { font: fontBold9, alignment: alignCenter, border: borderThin });

    // === ROWS 8+: Itens ===
    const itemStartRow = 8;
    processoSelecionado.itens.forEach((item, idx) => {
      const r = itemStartRow + idx;
      setCell(`A${r}`, idx + 1, { font: fontNormal9, alignment: alignCenter, border: borderMediumLeft });
      setCell(`B${r}`, `${item.codigo} - ${item.descricao}`, { font: fontNormal9, alignment: alignLeft, border: borderThin });
      setCell(`H${r}`, item.unidade || 'PIC', { font: fontNormal9, alignment: alignCenter, border: borderThin });
      setCell(`I${r}`, item.quantidade, { font: fontNormal9, alignment: alignCenter, border: borderThin });
      setCell(`J${r}`, Number(item.precoUnitarioDolar.toFixed(2)), { font: fontNormal9, alignment: alignCenter, border: borderThin });
      setCell(`K${r}`, Number(item.precoTotalDolar.toFixed(2)), { font: fontNormal9, alignment: alignCenter, border: borderThin });
    });

    // === ROW TOTAIS ===
    const totalRow = itemStartRow + numItens;
    setCell(`I${totalRow}`, totalQtd, { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`K${totalRow}`, totalUSD, { font: fontBold9, alignment: alignCenter, border: borderThin });

    // === ROW EMBARQUE (merged A:K) ===
    const embarqueRow = totalRow + 2;
    const cx = processoSelecionado.caixasPapelao || 0;
    const pb = processoSelecionado.pesoBrutoKg || 0;
    const pl = processoSelecionado.pesoLiquidoKg || 0;
    const cbm = processoSelecionado.cbm || 0;
    setCell(`A${embarqueRow}`, ` CAIXAS ${cx} PAPELAO   / PESO BRUTO ${pb} KG   /  PESO LIQUIDO ${pl} KG / CBM ${cbm}`, {
      font: fontBold9, alignment: alignLeft, border: borderMediumLeft
    });

    // === ROW FACTORY ===
    const factoryHeaderRow = embarqueRow + 1;
    setCell(`A${factoryHeaderRow}`, '.', { font: fontBold9, alignment: alignCenter, border: borderMediumLeft });
    setCell(`C${factoryHeaderRow}`, 'Factory', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`G${factoryHeaderRow}`, 'Address', { font: fontBold9, alignment: alignCenter, border: borderThin });

    const f1Row = factoryHeaderRow + 1;
    setCell(`A${f1Row}`, '1-11', { font: fontNormal9, alignment: alignCenter, border: borderMediumLeft });
    setCell(`C${f1Row}`, 'HEBEI SHUANGQI AUTOMOBILE LIGHTING APPLIANCE CO., LTD.', { font: fontNormal9, alignment: alignCenter, border: borderThin });
    setCell(`G${f1Row}`, 'LIUFEN VILLAGE, WOFOTANG TOWN, HEJIAN CITY, HEBEI PROVINCE, CHINA', { font: fontNormal9, alignment: alignCenter, border: borderThin });

    // === CONDITIONS ROW ===
    const condRow = f1Row + 1;
    setCell(`A${condRow}`, 'CONDITIONS OF TERM AND PAYMENT', { font: fontBold9, alignment: alignLeft, border: borderMediumLeft });
    setCell(`F${condRow}`, 'TRANSPORTATION METHOD', { font: fontBold9, alignment: alignLeft, border: borderThin });

    const priceRow = condRow + 1;
    setCell(`A${priceRow}`, 'TERM OF PRICE:', { font: fontBold9, alignment: alignLeft, border: borderMediumLeft });
    setCell(`C${priceRow}`, 'FOB', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`F${priceRow}`, 'VIA:', { font: fontBold9, alignment: alignLeft, border: borderThin });
    setCell(`I${priceRow}`, 'SHIP', { font: fontNormal9, alignment: alignCenter, border: borderThin });

    const payRow = priceRow + 1;
    setCell(`A${payRow}`, 'TERM OF PAYMENT:', { font: fontBold9, alignment: alignLeft, border: borderMediumLeft });
    setCell(`C${payRow}`, '100% ADVANCED UNTIL 90 DAYS AFTER RECEIVE BL', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`F${payRow}`, 'PORT TO LOADING:', { font: fontBold9, alignment: alignLeft, border: borderThin });
    setCell(`I${payRow}`, 'GUANGZHOU, China', { font: fontNormal9, alignment: alignCenter, border: borderThin });

    const embRow = payRow + 1;
    setCell(`A${embRow}`, 'PREVISAO DE EMBARQUE', { font: fontBold9, alignment: alignLeft, border: borderMediumLeft });
    setCell(`C${embRow}`, processoSelecionado.dataProcesso || '', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`F${embRow}`, 'PORT OF DESTINATION:', { font: fontBold9, alignment: alignLeft, border: borderThin });
    setCell(`I${embRow}`, 'SALVADOR / BAHIA / BRASIL.', { font: fontNormal9, alignment: alignCenter, border: borderThin });

    const delRow = embRow + 1;
    setCell(`F${delRow}`, 'TIME OF DELIVERY:', { font: fontBold9, alignment: alignLeft, border: borderThin });

    // === BANK INFORMATION ===
    const bankRow = delRow + 1;
    setCell(`A${bankRow}`, 'BANK INFORMATION\nBeneficiary Name:  MIC TRADE SERVICE LIMITED\nAccount No.:  NRA30006829988 (please also input "NRA")\nADDRESS: RM 502C 5/F, HO KING COMM CTR,2-16 FAYUEN ST MONGKOK,KL\n\nBeneficiary Bank: DBS Bank (China) Ltd Guangzhou Branch\nSwift Code : DBSSCNSHGZU\nBeneficiary Bank Address: One-link Center, 18/F Onelink Centre, No.230-232, Tianhe Road, Tianhe District, Guangzhou', {
      font: fontBold9, alignment: alignLeft, border: borderMediumLeft
    });

    // === MERGES ===
    const merges: any[] = [
      // Row 1: A1:K1
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      // Row 2: A2:K2
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
      // Row 3: A3:A5 (TO), B3:F3 (destinatário), G3:H3 (INVOICE:), I3:K3 (número)
      { s: { r: 2, c: 0 }, e: { r: 4, c: 0 } },
      { s: { r: 2, c: 1 }, e: { r: 2, c: 5 } },
      { s: { r: 2, c: 6 }, e: { r: 2, c: 7 } },
      { s: { r: 2, c: 8 }, e: { r: 2, c: 10 } },
      // Row 4: B4:F5 (despachante), G4:H4 (DATE), I4:K5 (NCM)
      { s: { r: 3, c: 1 }, e: { r: 4, c: 5 } },
      { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
      { s: { r: 3, c: 8 }, e: { r: 4, c: 10 } },
      // Row 5: G5:H5 (OBS)
      { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
      // Row 6-7: A6:A7 (ITEM), B6:G7 (descricao), H6:I6 (UND/QUANT header)
      { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } },
      { s: { r: 5, c: 1 }, e: { r: 6, c: 6 } },
    ];

    // Itens: B:G merged para cada item
    for (let i = 0; i < numItens; i++) {
      const r = itemStartRow - 1 + i; // 0-indexed
      merges.push({ s: { r, c: 1 }, e: { r, c: 6 } });
    }

    // Total row merge
    // Embarque row merge A:K
    merges.push({ s: { r: embarqueRow - 1, c: 0 }, e: { r: embarqueRow - 1, c: 10 } });

    // Factory header merges
    merges.push({ s: { r: factoryHeaderRow - 1, c: 0 }, e: { r: factoryHeaderRow - 1, c: 1 } });
    merges.push({ s: { r: factoryHeaderRow - 1, c: 2 }, e: { r: factoryHeaderRow - 1, c: 5 } });
    merges.push({ s: { r: factoryHeaderRow - 1, c: 6 }, e: { r: factoryHeaderRow - 1, c: 10 } });

    // Factory data merges
    merges.push({ s: { r: f1Row - 1, c: 0 }, e: { r: f1Row - 1, c: 1 } });
    merges.push({ s: { r: f1Row - 1, c: 2 }, e: { r: f1Row - 1, c: 5 } });
    merges.push({ s: { r: f1Row - 1, c: 6 }, e: { r: f1Row - 1, c: 10 } });

    // Conditions merges
    merges.push({ s: { r: condRow - 1, c: 0 }, e: { r: condRow - 1, c: 4 } });
    merges.push({ s: { r: condRow - 1, c: 5 }, e: { r: condRow - 1, c: 10 } });
    // Price row
    merges.push({ s: { r: priceRow - 1, c: 0 }, e: { r: priceRow - 1, c: 1 } });
    merges.push({ s: { r: priceRow - 1, c: 2 }, e: { r: priceRow - 1, c: 4 } });
    merges.push({ s: { r: priceRow - 1, c: 5 }, e: { r: priceRow - 1, c: 6 } });
    merges.push({ s: { r: priceRow - 1, c: 8 }, e: { r: priceRow - 1, c: 10 } });
    // Payment row
    merges.push({ s: { r: payRow - 1, c: 0 }, e: { r: payRow - 1, c: 1 } });
    merges.push({ s: { r: payRow - 1, c: 2 }, e: { r: payRow - 1, c: 4 } });
    merges.push({ s: { r: payRow - 1, c: 5 }, e: { r: payRow - 1, c: 6 } });
    merges.push({ s: { r: payRow - 1, c: 8 }, e: { r: payRow - 1, c: 10 } });
    // Embarque row
    merges.push({ s: { r: embRow - 1, c: 0 }, e: { r: embRow - 1, c: 1 } });
    merges.push({ s: { r: embRow - 1, c: 2 }, e: { r: embRow - 1, c: 4 } });
    merges.push({ s: { r: embRow - 1, c: 5 }, e: { r: embRow - 1, c: 6 } });
    merges.push({ s: { r: embRow - 1, c: 8 }, e: { r: embRow - 1, c: 10 } });
    // Delivery row
    merges.push({ s: { r: delRow - 1, c: 5 }, e: { r: delRow - 1, c: 6 } });
    merges.push({ s: { r: delRow - 1, c: 8 }, e: { r: delRow - 1, c: 10 } });
    // Bank info merge A:K
    merges.push({ s: { r: bankRow - 1, c: 0 }, e: { r: bankRow - 1, c: 10 } });

    ws['!merges'] = merges;

    // === COLUMN WIDTHS (matching model) ===
    ws['!cols'] = [
      { wch: 5.16 },   // A
      { wch: 6.16 },   // B
      { wch: 5.5 },    // C
      { wch: 7.5 },    // D
      { wch: 9.66 },   // E
      { wch: 18.66 },  // F
      { wch: 33.16 },  // G
      { wch: 6.16 },   // H
      { wch: 13.33 },  // I
      { wch: 15.0 },   // J
      { wch: 19.0 },   // K
    ];

    // === ROW HEIGHTS ===
    const rows: any = {};
    rows[0] = { hpt: 63 }; // Row 1
    rows[1] = { hpt: 16 }; // Row 2
    rows[2] = { hpt: 65 }; // Row 3
    rows[3] = { hpt: 27 }; // Row 4
    rows[4] = { hpt: 43 }; // Row 5
    rows[5] = { hpt: 25 }; // Row 6
    rows[6] = { hpt: 29 }; // Row 7
    for (let i = 0; i < numItens; i++) {
      rows[itemStartRow - 1 + i] = { hpt: 20.25 };
    }
    rows[embarqueRow - 1] = { hpt: 16 };
    rows[bankRow - 1] = { hpt: 133 };
    const maxRowIdx = Math.max(...Object.keys(rows).map(Number));
    const rowsArr: any[] = [];
    for (let i = 0; i <= maxRowIdx; i++) {
      rowsArr.push(rows[i] || {});
    }
    ws['!rows'] = rowsArr;

    // Set ref range
    ws['!ref'] = `A1:K${bankRow}`;

    XLSX.utils.book_append_sheet(wb, ws, 'PI FINAL TOTAL');
    const fileName = `${processoSelecionado.numeroProcesso || 'SR'}PI.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const handleConfirmarProcesso = () => {
    if (!processoSelecionado) return;
    setProcessosConfirmados(prev => new Set(Array.from(prev).concat([processoSelecionado.id])));
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
            <div className="grid grid-cols-5 gap-3 mt-4 flex-shrink-0">
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
              <div className="rounded-lg p-3 border" style={{
                background: stats.divergentes > 0 ? 'oklch(0.20 0.08 30)' : 'oklch(0.14 0.005 285)',
                borderColor: stats.divergentes > 0 ? 'oklch(0.50 0.20 30)' : 'oklch(0.22 0.005 285)',
              }}>
                <p className="text-[10px] uppercase tracking-wider flex items-center gap-1" style={{ color: stats.divergentes > 0 ? 'oklch(0.70 0.18 30)' : 'oklch(0.45 0.010 285)' }}>
                  {stats.divergentes > 0 && <AlertTriangle className="w-3 h-3" />}
                  Divergências
                </p>
                <p className="font-rajdhani font-bold text-xl mt-1" style={{ color: stats.divergentes > 0 ? 'oklch(0.75 0.20 30)' : 'oklch(0.50 0.15 142)' }}>
                  {stats.divergentes > 0 ? stats.divergentes : '✓ OK'}
                </p>
              </div>
            </div>

            {/* Banner de alerta de divergência */}
            {stats.divergentes > 0 && (
              <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-lg border" style={{
                background: 'oklch(0.18 0.06 30)',
                borderColor: 'oklch(0.45 0.18 30)',
              }}>
                <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: 'oklch(0.75 0.20 40)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'oklch(0.85 0.12 40)' }}>
                    {stats.divergentes} {stats.divergentes === 1 ? 'item com' : 'itens com'} divergência na distribuição
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'oklch(0.65 0.08 40)' }}>
                    A soma de Sarom + Alexandre não corresponde à quantidade total. Verifique os itens destacados em vermelho.
                  </p>
                </div>
              </div>
            )}

            {/* Tabela de Itens */}
            <div className="flex-1 overflow-auto mt-4 border rounded-lg" style={{ borderColor: 'oklch(0.22 0.005 285)', minHeight: 0 }}>
              <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ color: 'oklch(0.85 0.005 65)', minWidth: '1200px' }}>
                <thead style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }} className="border-b sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Código</th>
                    <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Nome</th>
                    <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Unid</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Qtd</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Preço Unit USD</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Total USD</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.40 0.15 200)' }}>Sarom</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.40 0.15 145)' }}>Alexandre</th>
                    <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Ordem</th>
                    <th className="text-center px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {processoSelecionado.itens.map(item => {
                    const somaDistrib = item.pedidoSarom + item.pedidoAlexandre;
                    const isDivergente = somaDistrib !== item.quantidade;
                    const diff = somaDistrib - item.quantidade;
                    return (
                    <tr
                      key={item.id}
                      style={{
                        borderColor: isDivergente ? 'oklch(0.40 0.18 30)' : 'oklch(0.18 0.005 285)',
                        background: isDivergente ? 'oklch(0.16 0.06 30)' : 'transparent',
                      }}
                      className="border-b transition-colors"
                      onMouseEnter={e => (e.currentTarget.style.background = isDivergente ? 'oklch(0.19 0.08 30)' : 'oklch(0.16 0.005 285)')}
                      onMouseLeave={e => (e.currentTarget.style.background = isDivergente ? 'oklch(0.16 0.06 30)' : 'transparent')}
                      title={isDivergente ? `⚠ Divergência: Sarom(${item.pedidoSarom}) + Alexandre(${item.pedidoAlexandre}) = ${somaDistrib} ≠ Qtd(${item.quantidade}). Diferença: ${diff > 0 ? '+' : ''}${diff}` : ''}
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
                          type="text"
                          inputMode="numeric"
                          value={item.quantidade}
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            handleAtualizarItem(item.id, 'quantidade', parseFloat(val) || 0);
                          }}
                          onFocus={e => e.target.select()}
                          className="w-16 px-2 py-1 rounded text-xs bg-transparent border text-right"
                          style={{ borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.85 0.005 65)' }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={item.precoUnitarioDolar}
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            handleAtualizarItem(item.id, 'precoUnitarioDolar', parseFloat(val) || 0);
                          }}
                          onFocus={e => e.target.select()}
                          className="w-24 px-2 py-1 rounded text-xs bg-transparent border text-right"
                          style={{ borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.85 0.005 65)' }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-rajdhani font-semibold" style={{ color: 'oklch(0.48 0.22 25)' }}>
                        ${item.precoTotalDolar.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={item.pedidoSarom}
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            handleAtualizarItem(item.id, 'pedidoSarom', parseInt(val) || 0);
                          }}
                          onFocus={e => e.target.select()}
                          className="w-16 px-2 py-1 rounded text-xs bg-transparent border text-right"
                          style={{ borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.60 0.15 200)' }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={item.pedidoAlexandre}
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            handleAtualizarItem(item.id, 'pedidoAlexandre', parseInt(val) || 0);
                          }}
                          onFocus={e => e.target.select()}
                          className="w-16 px-2 py-1 rounded text-xs bg-transparent border text-right"
                          style={{ borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.60 0.15 145)' }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.ordemCompra || ''}
                          onChange={e => handleAtualizarItem(item.id, 'ordemCompra', e.target.value)}
                          onFocus={e => e.target.select()}
                          placeholder="Ex: TRUCK1225"
                          className="w-24 px-2 py-1 rounded text-xs bg-transparent border"
                          style={{ borderColor: 'oklch(0.26 0.005 285)', color: 'oklch(0.85 0.005 65)' }}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isDivergente && (
                            <span className="relative group">
                              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" style={{ color: 'oklch(0.75 0.20 40)' }} />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50" style={{ background: 'oklch(0.20 0.08 30)', color: 'oklch(0.90 0.10 40)', border: '1px solid oklch(0.45 0.18 30)' }}>
                                S({item.pedidoSarom}) + A({item.pedidoAlexandre}) = {somaDistrib} ≠ {item.quantidade}
                                <br />
                                {diff > 0 ? `Excedente: +${diff}` : `Faltam: ${Math.abs(diff)}`}
                              </span>
                            </span>
                          )}
                          <button
                            onClick={() => handleRemoverItem(item.id)}
                            className="p-1 rounded hover:bg-red-600/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" style={{ color: 'oklch(0.65 0.22 25)' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>

            {/* Form para Adicionar Item */}
            <div className="mt-4 border rounded-lg p-4" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.22 0.005 285)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-rajdhani font-bold text-sm" style={{ color: 'oklch(0.85 0.005 65)' }}>
                  Adicionar Item
                </h3>
                <button
                  onClick={() => setShowModalImport(true)}
                  className="px-4 py-2 rounded-md text-xs font-bold transition-colors flex items-center gap-2"
                  style={{ background: 'oklch(0.25 0.12 200)', color: 'white' }}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Importar de Pedido Confirmado
                </button>
              </div>

              {/* Adicionar manualmente */}
              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'oklch(0.45 0.010 285)' }}>
                Adicionar manualmente:
              </p>
<div className="grid grid-cols-9 gap-2">
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
                  type="text"
                  inputMode="numeric"
                  placeholder="Qtd"
                  value={formItem.quantidade}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setFormItem({ ...formItem, quantidade: parseFloat(val) || 0 });
                  }}
                  onFocus={e => e.target.select()}
                  className="px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Preço USD"
                  value={formItem.precoUnitarioDolar}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setFormItem({ ...formItem, precoUnitarioDolar: parseFloat(val) || 0 });
                  }}
                  onFocus={e => e.target.select()}
                  className="px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Sarom"
                  value={formItem.pedidoSarom}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setFormItem({ ...formItem, pedidoSarom: parseInt(val) || 0 });
                  }}
                  onFocus={e => e.target.select()}
                  className="px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.60 0.15 200)',
                  }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Alexandre"
                  value={formItem.pedidoAlexandre}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setFormItem({ ...formItem, pedidoAlexandre: parseInt(val) || 0 });
                  }}
                  onFocus={e => e.target.select()}
                  className="px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.60 0.15 145)',
                  }}
                />
                <input
                  type="text"
                  placeholder="Ordem"
                  value={formItem.ordemCompra}
                  onChange={e => setFormItem({ ...formItem, ordemCompra: e.target.value })}
                  onFocus={e => e.target.select()}
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

            {/* Dados de Embarque */}
            <div className="mt-4 p-3 rounded-lg" style={{ background: 'oklch(0.18 0.005 285)', border: '1px solid oklch(0.26 0.005 285)' }}>
              <h4 className="text-sm font-bold mb-3" style={{ color: 'oklch(0.75 0.005 65)' }}>DADOS DE EMBARQUE</h4>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'oklch(0.55 0.010 285)' }}>CAIXAS PAPELÃO</label>
                  <input
                    type="number"
                    min="0"
                    value={processoSelecionado?.caixasPapelao || 0}
                    onChange={(e) => {
                      if (!processoSelecionado) return;
                      const atualizado = { ...processoSelecionado, caixasPapelao: Number(e.target.value) };
                      setProcessoSelecionado(atualizado);
                      setProcessos(processos.map(p => p.id === atualizado.id ? atualizado : p));
                    }}
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={{ background: 'oklch(0.15 0.005 285)', border: '1px solid oklch(0.26 0.005 285)', color: 'oklch(0.90 0.005 65)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'oklch(0.55 0.010 285)' }}>PESO BRUTO (KG)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={processoSelecionado?.pesoBrutoKg || 0}
                    onChange={(e) => {
                      if (!processoSelecionado) return;
                      const atualizado = { ...processoSelecionado, pesoBrutoKg: Number(e.target.value) };
                      setProcessoSelecionado(atualizado);
                      setProcessos(processos.map(p => p.id === atualizado.id ? atualizado : p));
                    }}
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={{ background: 'oklch(0.15 0.005 285)', border: '1px solid oklch(0.26 0.005 285)', color: 'oklch(0.90 0.005 65)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'oklch(0.55 0.010 285)' }}>PESO LÍQUIDO (KG)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={processoSelecionado?.pesoLiquidoKg || 0}
                    onChange={(e) => {
                      if (!processoSelecionado) return;
                      const atualizado = { ...processoSelecionado, pesoLiquidoKg: Number(e.target.value) };
                      setProcessoSelecionado(atualizado);
                      setProcessos(processos.map(p => p.id === atualizado.id ? atualizado : p));
                    }}
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={{ background: 'oklch(0.15 0.005 285)', border: '1px solid oklch(0.26 0.005 285)', color: 'oklch(0.90 0.005 65)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'oklch(0.55 0.010 285)' }}>CBM</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={processoSelecionado?.cbm || 0}
                    onChange={(e) => {
                      if (!processoSelecionado) return;
                      const atualizado = { ...processoSelecionado, cbm: Number(e.target.value) };
                      setProcessoSelecionado(atualizado);
                      setProcessos(processos.map(p => p.id === atualizado.id ? atualizado : p));
                    }}
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={{ background: 'oklch(0.15 0.005 285)', border: '1px solid oklch(0.26 0.005 285)', color: 'oklch(0.90 0.005 65)' }}
                  />
                </div>
              </div>
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
                onClick={() => setShowVinculador(true)}
                className="flex-1 px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                style={{ background: 'oklch(0.35 0.10 200)', color: 'white' }}
                title="Vincular compras a este contêiner"
              >
                <Link2 className="w-4 h-4" />
                Vincular Compras
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

      {/* Modal Vinculador de Embarques */}
      {showVinculador && processoSelecionado && (
        <VinculadorEmbarques
          processoId={processoSelecionado.id}
          onClose={() => setShowVinculador(false)}
        />
      )}

      {/* ===== MODAL IMPORTAR DE PEDIDO (Fullscreen) ===== */}
      {showModalImport && processoSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'oklch(0.08 0.005 285 / 0.92)' }}>
          <div className="w-[95vw] max-w-[1400px] max-h-[92vh] flex flex-col rounded-xl overflow-hidden border" style={{ background: 'oklch(0.13 0.005 285)', borderColor: 'oklch(0.28 0.005 285)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'oklch(0.25 0.005 285)', background: 'oklch(0.11 0.005 285)' }}>
              <div>
                <h2 className="text-lg font-rajdhani font-bold" style={{ color: 'oklch(0.90 0.005 65)' }}>
                  Importar Itens para Invoice — {processoSelecionado.numeroProcesso}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0.010 285)' }}>
                  Selecione o pedido e ajuste as quantidades a embarcar neste contêiner
                </p>
              </div>
              <button onClick={() => { setShowModalImport(false); setPedidoSelecionadoImport(null); }} className="p-2 rounded-lg transition-colors" style={{ color: 'oklch(0.60 0.005 285)' }}>
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Seleção de Pedido */}
            <div className="px-6 py-3 border-b" style={{ borderColor: 'oklch(0.22 0.005 285)', background: 'oklch(0.15 0.005 285)' }}>
              <div className="flex items-center gap-4">
                <label className="text-xs font-bold uppercase" style={{ color: 'oklch(0.55 0.010 285)' }}>Pedido:</label>
                <select
                  value={pedidoSelecionadoImport || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setPedidoSelecionadoImport(val);
                    setQtdsEmbarcar({});
                  }}
                  className="flex-1 max-w-md px-3 py-2 rounded-md border text-sm"
                  style={{ background: 'oklch(0.18 0.005 285)', borderColor: 'oklch(0.30 0.005 285)', color: 'oklch(0.90 0.005 65)' }}
                >
                  <option value="">— Selecione um pedido confirmado —</option>
                  {pedidosConfirmadosDb.map((p: any) => {
                    const saldo = saldoEmbarques[String(p.id)];
                    const temSaldo = saldo && Object.keys(saldo).length > 0;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.nome} (#{p.id}) {temSaldo ? '⚠ parcialmente embarcado' : ''}
                      </option>
                    );
                  })}
                </select>
                {pedidoSelecionadoImport && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const next: Record<string, { sarom: number; alexandre: number }> = {};
                        itensDoSelecionado.forEach(i => { next[i.produtoId] = { sarom: i.saldoSarom, alexandre: i.saldoAlexandre }; });
                        setQtdsEmbarcar(next);
                      }}
                      className="px-3 py-1.5 rounded text-xs font-bold"
                      style={{ background: 'oklch(0.30 0.15 145)', color: 'white' }}
                    >
                      Embarcar Todo Saldo
                    </button>
                    <button
                      onClick={() => {
                        const next: Record<string, { sarom: number; alexandre: number }> = {};
                        itensDoSelecionado.forEach(i => { next[i.produtoId] = { sarom: 0, alexandre: 0 }; });
                        setQtdsEmbarcar(next);
                      }}
                      className="px-3 py-1.5 rounded text-xs font-bold"
                      style={{ background: 'oklch(0.25 0.005 285)', color: 'oklch(0.65 0.005 285)' }}
                    >
                      Zerar Tudo
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tabela de Itens */}
            <div className="flex-1 overflow-auto px-6 py-2">
              {!pedidoSelecionadoImport ? (
                <div className="flex items-center justify-center h-full" style={{ color: 'oklch(0.40 0.010 285)' }}>
                  <p className="text-sm">Selecione um pedido confirmado acima para ver os itens</p>
                </div>
              ) : itensDoSelecionado.length === 0 ? (
                <div className="flex items-center justify-center h-full" style={{ color: 'oklch(0.40 0.010 285)' }}>
                  <p className="text-sm">Este pedido não possui itens.</p>
                </div>
              ) : (
                <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: '0 2px' }}>
                  <thead>
                    <tr style={{ background: 'oklch(0.18 0.005 285)' }}>
                      <th className="px-2 py-2.5 text-left font-bold" style={{ color: 'oklch(0.60 0.005 285)' }}>CÓDIGO</th>
                      <th className="px-2 py-2.5 text-left font-bold" style={{ color: 'oklch(0.60 0.005 285)' }}>DESCRIÇÃO</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'oklch(0.55 0.15 200)' }}>PEDIDO S</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'oklch(0.55 0.15 145)' }}>PEDIDO A</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'oklch(0.50 0.010 285)' }}>JÁ EMB. S</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'oklch(0.50 0.010 285)' }}>JÁ EMB. A</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'oklch(0.70 0.18 85)' }}>SALDO S</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'oklch(0.70 0.18 85)' }}>SALDO A</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'oklch(0.48 0.22 25)', background: 'oklch(0.48 0.22 25 / 0.10)' }}>EMBARCAR S</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'oklch(0.48 0.22 25)', background: 'oklch(0.48 0.22 25 / 0.10)' }}>EMBARCAR A</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'oklch(0.60 0.005 285)' }}>%</th>
                      <th className="px-2 py-2.5 text-right font-bold" style={{ color: 'oklch(0.60 0.005 285)' }}>USD</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'oklch(0.60 0.005 285)' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensDoSelecionado.map((item, idx) => {
                      const qtd = qtdsEmbarcar[item.produtoId] || { sarom: 0, alexandre: 0 };
                      const totalPedido = item.pedidoSarom + item.pedidoAlexandre;
                      const totalEmbarcar = qtd.sarom + qtd.alexandre;
                      const totalJaEmb = item.jaEmbarcadoSarom + item.jaEmbarcadoAlexandre;
                      const pctEmbarcar = totalPedido > 0 ? ((totalJaEmb + totalEmbarcar) / totalPedido) * 100 : 0;
                      const jaExiste = processoSelecionado?.itens.some(i => i.codigo === item.produtoId);
                      const saldoZero = item.saldoSarom === 0 && item.saldoAlexandre === 0;
                      const usdLinha = totalEmbarcar * item.precoUnitario;

                      return (
                        <tr
                          key={item.produtoId}
                          style={{
                            background: idx % 2 === 0 ? 'transparent' : 'oklch(0.15 0.005 285 / 0.5)',
                            opacity: (jaExiste || saldoZero) ? 0.45 : 1,
                          }}
                        >
                          <td className="px-2 py-2 font-mono font-bold" style={{ color: 'oklch(0.48 0.22 25)' }}>{item.produtoId}</td>
                          <td className="px-2 py-2 max-w-[200px] truncate" style={{ color: 'oklch(0.70 0.010 285)' }}>{item.descricao}</td>
                          <td className="px-2 py-2 text-center font-bold" style={{ color: 'oklch(0.60 0.15 200)' }}>{item.pedidoSarom}</td>
                          <td className="px-2 py-2 text-center font-bold" style={{ color: 'oklch(0.60 0.15 145)' }}>{item.pedidoAlexandre}</td>
                          <td className="px-2 py-2 text-center" style={{ color: 'oklch(0.50 0.010 285)' }}>{item.jaEmbarcadoSarom}</td>
                          <td className="px-2 py-2 text-center" style={{ color: 'oklch(0.50 0.010 285)' }}>{item.jaEmbarcadoAlexandre}</td>
                          <td className="px-2 py-2 text-center font-bold" style={{ color: item.saldoSarom > 0 ? 'oklch(0.80 0.18 85)' : 'oklch(0.40 0.010 285)' }}>{item.saldoSarom}</td>
                          <td className="px-2 py-2 text-center font-bold" style={{ color: item.saldoAlexandre > 0 ? 'oklch(0.80 0.18 85)' : 'oklch(0.40 0.010 285)' }}>{item.saldoAlexandre}</td>
                          {/* Inputs editáveis */}
                          <td className="px-1 py-1 text-center" style={{ background: 'oklch(0.48 0.22 25 / 0.06)' }}>
                            <input
                              type="number"
                              min="0"
                              max={item.saldoSarom}
                              value={qtd.sarom}
                              disabled={jaExiste || saldoZero}
                              onChange={e => updateQtdEmbarcar(item.produtoId, 'sarom', Math.min(parseInt(e.target.value) || 0, item.saldoSarom))}
                              onFocus={e => e.target.select()}
                              className="w-16 px-1 py-1 text-center rounded border text-xs font-bold"
                              style={{
                                background: 'oklch(0.14 0.005 285)',
                                borderColor: qtd.sarom > 0 ? 'oklch(0.55 0.15 200)' : 'oklch(0.25 0.005 285)',
                                color: 'oklch(0.60 0.15 200)',
                              }}
                            />
                          </td>
                          <td className="px-1 py-1 text-center" style={{ background: 'oklch(0.48 0.22 25 / 0.06)' }}>
                            <input
                              type="number"
                              min="0"
                              max={item.saldoAlexandre}
                              value={qtd.alexandre}
                              disabled={jaExiste || saldoZero}
                              onChange={e => updateQtdEmbarcar(item.produtoId, 'alexandre', Math.min(parseInt(e.target.value) || 0, item.saldoAlexandre))}
                              onFocus={e => e.target.select()}
                              className="w-16 px-1 py-1 text-center rounded border text-xs font-bold"
                              style={{
                                background: 'oklch(0.14 0.005 285)',
                                borderColor: qtd.alexandre > 0 ? 'oklch(0.55 0.15 145)' : 'oklch(0.25 0.005 285)',
                                color: 'oklch(0.60 0.15 145)',
                              }}
                            />
                          </td>
                          {/* Barra de % */}
                          <td className="px-2 py-2 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] font-bold" style={{ color: pctEmbarcar >= 100 ? 'oklch(0.72 0.17 145)' : pctEmbarcar > 0 ? 'oklch(0.80 0.18 85)' : 'oklch(0.40 0.010 285)' }}>
                                {pctEmbarcar.toFixed(0)}%
                              </span>
                              <div className="w-12 h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(0.22 0.005 285)' }}>
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(100, pctEmbarcar)}%`,
                                    background: pctEmbarcar >= 100 ? 'oklch(0.55 0.17 145)' : pctEmbarcar >= 50 ? 'oklch(0.70 0.18 85)' : 'oklch(0.55 0.25 30)',
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right font-mono" style={{ color: 'oklch(0.65 0.010 285)' }}>${usdLinha.toFixed(2)}</td>
                          <td className="px-2 py-2 text-center">
                            {jaExiste ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'oklch(0.30 0.15 50)', color: 'oklch(0.80 0.15 50)' }}>NA INVOICE</span>
                            ) : saldoZero ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'oklch(0.30 0.15 145)', color: 'oklch(0.75 0.15 145)' }}>100% EMB.</span>
                            ) : totalEmbarcar > 0 ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: 'oklch(0.30 0.12 200)', color: 'oklch(0.75 0.12 200)' }}>EMBARCAR</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: 'oklch(0.40 0.010 285)' }}>PENDENTE</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer com resumo e ação */}
            {pedidoSelecionadoImport && itensDoSelecionado.length > 0 && (
              <div className="px-6 py-4 border-t" style={{ borderColor: 'oklch(0.25 0.005 285)', background: 'oklch(0.11 0.005 285)' }}>
                <div className="flex items-center justify-between">
                  {/* KPIs resumo */}
                  <div className="flex gap-4">
                    <div className="text-center px-3 py-1.5 rounded" style={{ background: 'oklch(0.18 0.005 285)' }}>
                      <div className="text-[10px] uppercase font-bold" style={{ color: 'oklch(0.50 0.010 285)' }}>Itens</div>
                      <div className="text-sm font-bold" style={{ color: 'oklch(0.85 0.005 65)' }}>{totaisImport.itensComEmbarque}/{itensDoSelecionado.length}</div>
                    </div>
                    <div className="text-center px-3 py-1.5 rounded" style={{ background: 'oklch(0.18 0.005 285)' }}>
                      <div className="text-[10px] uppercase font-bold" style={{ color: 'oklch(0.55 0.15 200)' }}>Sarom</div>
                      <div className="text-sm font-bold" style={{ color: 'oklch(0.60 0.15 200)' }}>{totaisImport.totalSaromEmbarcar}/{totaisImport.totalSaromPedido}</div>
                      <div className="text-[10px] font-bold" style={{ color: 'oklch(0.55 0.15 200)' }}>{totaisImport.pctSarom.toFixed(0)}%</div>
                    </div>
                    <div className="text-center px-3 py-1.5 rounded" style={{ background: 'oklch(0.18 0.005 285)' }}>
                      <div className="text-[10px] uppercase font-bold" style={{ color: 'oklch(0.55 0.15 145)' }}>Alexandre</div>
                      <div className="text-sm font-bold" style={{ color: 'oklch(0.60 0.15 145)' }}>{totaisImport.totalAlexandreEmbarcar}/{totaisImport.totalAlexandrePedido}</div>
                      <div className="text-[10px] font-bold" style={{ color: 'oklch(0.55 0.15 145)' }}>{totaisImport.pctAlexandre.toFixed(0)}%</div>
                    </div>
                    <div className="text-center px-3 py-1.5 rounded" style={{ background: 'oklch(0.18 0.005 285)' }}>
                      <div className="text-[10px] uppercase font-bold" style={{ color: 'oklch(0.50 0.010 285)' }}>Total USD</div>
                      <div className="text-sm font-bold" style={{ color: 'oklch(0.85 0.005 65)' }}>${totaisImport.totalUsdEmbarcar.toFixed(2)}</div>
                    </div>
                    <div className="text-center px-3 py-1.5 rounded" style={{ background: 'oklch(0.18 0.005 285)' }}>
                      <div className="text-[10px] uppercase font-bold" style={{ color: 'oklch(0.50 0.010 285)' }}>% Geral</div>
                      <div className="text-lg font-bold" style={{
                        color: totaisImport.pctGeral >= 100 ? 'oklch(0.72 0.17 145)' : totaisImport.pctGeral >= 50 ? 'oklch(0.80 0.18 85)' : 'oklch(0.70 0.22 30)',
                      }}>{totaisImport.pctGeral.toFixed(0)}%</div>
                    </div>
                    {totaisImport.saldoRestante > 0 && (
                      <div className="text-center px-3 py-1.5 rounded" style={{ background: 'oklch(0.70 0.18 85 / 0.12)' }}>
                        <div className="text-[10px] uppercase font-bold" style={{ color: 'oklch(0.70 0.18 85)' }}>Saldo Pendente</div>
                        <div className="text-sm font-bold" style={{ color: 'oklch(0.80 0.18 85)' }}>{totaisImport.saldoRestante} un</div>
                      </div>
                    )}
                  </div>

                  {/* Botões de ação */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setShowModalImport(false); setPedidoSelecionadoImport(null); }}
                      className="px-5 py-2.5 rounded-md text-sm font-bold"
                      style={{ background: 'oklch(0.22 0.005 285)', color: 'oklch(0.65 0.005 285)' }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmarImportacao}
                      disabled={totaisImport.itensComEmbarque === 0}
                      className="px-6 py-2.5 rounded-md text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-40"
                      style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
                    >
                      <Check className="w-4 h-4" />
                      Confirmar Embarque ({totaisImport.itensComEmbarque} itens — {totaisImport.pctGeral.toFixed(0)}%)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
