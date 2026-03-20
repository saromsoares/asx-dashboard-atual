// Design: Dark Command Center — Contêiner SR
// Gerenciamento de processos de importação com invoice, NCM e itens
// Migrated from localStorage to tRPC + Supabase DB

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'wouter';
import { X, Plus, Trash2, ArrowLeft, Download, AlertTriangle, Link2, ShoppingCart, Check } from 'lucide-react';
import XLSX from 'xlsx-js-style';
import { produtos } from '../data/produtos';
import { dispatchProcessosChange } from '../hooks/useEstoque';
import { VinculadorEmbarques } from '../components/VinculadorEmbarques';
import { useEmbarques } from '../hooks/useEmbarques';
import { useIdioma } from '../hooks/useIdioma';
import { trpc } from '../lib/trpc';
import { formatUSD } from '../lib/formatters';

// DB item type adapter — decimal fields come as strings from Drizzle
interface ItemConteiner {
  id: number;
  processoId: number;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  precoUnitarioDolar: number; // parsed from string
  precoTotalDolar: number;   // parsed from string
  pedidoSarom: number;
  pedidoAlexandre: number;
  ordemCompra: string;
}

/** Parse a DB item (decimal strings) into our local numeric type */
function parseItem(raw: any): ItemConteiner {
  return {
    id: raw.id,
    processoId: raw.processoId,
    codigo: raw.codigo,
    descricao: typeof raw.descricao === 'string' ? raw.descricao : String(raw.descricao ?? ''),
    unidade: raw.unidade || 'UND',
    quantidade: raw.quantidade ?? 0,
    precoUnitarioDolar: parseFloat(raw.precoUnitarioDolar) || 0,
    precoTotalDolar: parseFloat(raw.precoTotalDolar) || 0,
    pedidoSarom: raw.pedidoSarom ?? 0,
    pedidoAlexandre: raw.pedidoAlexandre ?? 0,
    ordemCompra: raw.ordemCompra || '',
  };
}

export default function Conteiner() {
  const [, setLocation] = useLocation();
  const { t } = useIdioma();
  const { embarques } = useEmbarques();
  const utils = trpc.useUtils();

  // ===== tRPC Queries =====
  const { data: processosRaw = [], isLoading: isLoadingProcessos } = trpc.processoSR.getAll.useQuery();

  // Adapt DB types: decimals → numbers, id → number
  const processos = useMemo(() => processosRaw.map((p: any) => ({
    ...p,
    pesoBrutoKg: parseFloat(p.pesoBrutoKg) || 0,
    pesoLiquidoKg: parseFloat(p.pesoLiquidoKg) || 0,
    cbm: parseFloat(p.cbm) || 0,
    observacoes: p.observacoes || '',
    ncm: p.ncm || '',
  })), [processosRaw]);

  // ===== tRPC Mutations =====
  const criarProcessoMut = trpc.processoSR.criar.useMutation({
    onSuccess: () => {
      utils.processoSR.getAll.invalidate();
      dispatchProcessosChange();
    },
  });
  const atualizarProcessoMut = trpc.processoSR.atualizar.useMutation({
    onSuccess: () => {
      utils.processoSR.getAll.invalidate();
      dispatchProcessosChange();
    },
  });
  const atualizarStatusMut = trpc.processoSR.atualizarStatus.useMutation({
    onSuccess: () => {
      utils.processoSR.getAll.invalidate();
      dispatchProcessosChange();
    },
  });
  const deletarProcessoMut = trpc.processoSR.deletar.useMutation({
    onSuccess: () => {
      utils.processoSR.getAll.invalidate();
      dispatchProcessosChange();
    },
  });
  const adicionarItemMut = trpc.itemProcesso.adicionar.useMutation({
    onSuccess: () => {
      utils.itemProcesso.getByProcesso.invalidate();
      dispatchProcessosChange();
    },
  });
  const atualizarItemMut = trpc.itemProcesso.atualizar.useMutation({
    onSuccess: () => {
      utils.itemProcesso.getByProcesso.invalidate();
      dispatchProcessosChange();
    },
  });
  const removerItemMut = trpc.itemProcesso.remover.useMutation({
    onSuccess: () => {
      utils.itemProcesso.getByProcesso.invalidate();
      dispatchProcessosChange();
    },
  });

  // ===== Local UI state =====
  const [showNovoProcesso, setShowNovoProcesso] = useState(false);
  const [selectedProcessoId, setSelectedProcessoId] = useState<number | null>(null);
  const [filtroConfirmados, setFiltroConfirmados] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<'Todos' | 'Em andamento' | 'Finalizado' | 'Cancelado'>('Todos');
  const [showVinculador, setShowVinculador] = useState(false);
  const { obterEmbarquesProcesso } = useEmbarques();

  // Derive the selected processo from the list
  const processoSelecionado = useMemo(
    () => processos.find((p: any) => p.id === selectedProcessoId) ?? null,
    [processos, selectedProcessoId]
  );

  // Items for selected processo
  const { data: itensRaw = [] } = trpc.itemProcesso.getByProcesso.useQuery(
    { processoId: selectedProcessoId ?? 0 },
    { enabled: !!selectedProcessoId }
  );
  const itensDoProcesso: ItemConteiner[] = useMemo(() => itensRaw.map(parseItem), [itensRaw]);

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
  // TODO: Migrate asx_saldo_embarques to a DB table in a future session
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
  const handleConfirmarImportacao = useCallback(async () => {
    if (!processoSelecionado) return;

    const nomePedido = pedidosDb.find((p: any) => p.id === pedidoSelecionadoImport)?.nome || '';
    let importedCount = 0;

    for (const item of itensDoSelecionado) {
      const qtd = qtdsEmbarcar[item.produtoId] || { sarom: 0, alexandre: 0 };
      if (qtd.sarom === 0 && qtd.alexandre === 0) continue;

      // Verificar se item já existe no processo
      const jaExiste = itensDoProcesso.some(i => i.codigo === item.produtoId);
      if (jaExiste) continue;

      try {
        await adicionarItemMut.mutateAsync({
          processoId: processoSelecionado.id,
          codigoProduto: item.produtoId,
          descricao: item.descricao,
          quantidade: qtd.sarom + qtd.alexandre,
          precoUnitarioUsd: item.precoUnitario,
        });
        importedCount++;
      } catch (err) {
        console.error('Erro ao importar item:', err);
      }
    }

    if (importedCount === 0) {
      // TODO: Replace alert() with toast notification
      alert('Nenhum item novo para importar (todos já existem ou quantidades são 0).');
      return;
    }

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

    // TODO: Replace alert() with toast notification
    alert(`${importedCount} item(ns) importado(s)! Saldo pendente atualizado.`);
    setShowModalImport(false);
    setPedidoSelecionadoImport(null);
    setQtdsEmbarcar({});
  }, [processoSelecionado, itensDoSelecionado, qtdsEmbarcar, pedidosDb, pedidoSelecionadoImport, saldoEmbarques, salvarSaldo, itensDoProcesso, adicionarItemMut]);

  const processosFiltrados = useMemo(() => {
    let resultado = processos;

    if (filtroConfirmados) {
      resultado = resultado.filter((p: any) => p.confirmado === 1);
    }

    if (filtroStatus !== 'Todos') {
      resultado = resultado.filter((p: any) => p.status === filtroStatus);
    }

    return resultado;
  }, [processos, filtroConfirmados, filtroStatus]);

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

    const produtoExato = produtos.find(p => p.codigo.toLowerCase() === codigo.toLowerCase());
    if (produtoExato) {
      setNomeProdutoEncontrado(produtoExato.descricao);
      setFormItem(prev => ({ ...prev, descricao: codigo, unidade: produtoExato.unid }));
      setShowSugestoes(false);
      setSugestoes([]);
      return;
    }

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

  const handleAdicionarProcesso = async () => {
    if (!formProcesso.numeroProcesso.trim()) {
      // TODO: Replace alert() with toast notification
      alert('Preencha o número do processo');
      return;
    }

    try {
      const result = await criarProcessoMut.mutateAsync({
        numero: formProcesso.numeroProcesso,
        observacoes: formProcesso.observacoes || undefined,
      });
      if (result?.id) {
        setSelectedProcessoId(result.id);
      }
      setFormProcesso({
        numeroProcesso: '',
        nomeInvoice: '',
        dataProcesso: new Date().toISOString().slice(0, 10),
        observacoes: '',
        ncm: '',
      });
      setShowNovoProcesso(false);
    } catch (err: any) {
      // TODO: Replace alert() with toast notification
      alert('Erro ao criar processo: ' + (err?.message || 'Erro desconhecido'));
    }
  };

  const handleAdicionarItem = async () => {
    if (!processoSelecionado) return;
    if (!formItem.descricao.trim()) {
      // TODO: Replace alert() with toast notification
      alert('Preencha a descrição do item');
      return;
    }

    try {
      await adicionarItemMut.mutateAsync({
        processoId: processoSelecionado.id,
        codigoProduto: formItem.descricao,
        descricao: nomeProdutoEncontrado || formItem.descricao,
        quantidade: formItem.quantidade,
        precoUnitarioUsd: formItem.precoUnitarioDolar,
      });
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
    } catch (err: any) {
      // TODO: Replace alert() with toast notification
      alert('Erro ao adicionar item: ' + (err?.message || 'Erro desconhecido'));
    }
  };

  const handleRemoverItem = async (itemId: number) => {
    try {
      await removerItemMut.mutateAsync({ itemId });
    } catch (err: any) {
      // TODO: Replace alert() with toast notification
      alert('Erro ao remover item: ' + (err?.message || 'Erro desconhecido'));
    }
  };

  const handleRemoverProcesso = async (processoId: number) => {
    // TODO: Replace confirm() with modal confirmation
    if (!confirm('Tem certeza que deseja excluir este processo?')) return;
    try {
      await deletarProcessoMut.mutateAsync({ processoId });
      if (selectedProcessoId === processoId) {
        setSelectedProcessoId(null);
      }
    } catch (err: any) {
      // TODO: Replace alert() with toast notification
      alert('Erro ao remover processo: ' + (err?.message || 'Erro desconhecido'));
    }
  };

  // Debounced processo field update
  const updateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleAtualizarProcesso = (campo: string, valor: any) => {
    if (!processoSelecionado) return;
    // Debounce the mutation to avoid too many requests while typing
    if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
    updateTimerRef.current = setTimeout(() => {
      const payload: any = { processoId: processoSelecionado.id };
      if (campo === 'pesoBrutoKg' || campo === 'pesoLiquidoKg' || campo === 'cbm') {
        payload[campo] = Number(valor) || 0;
      } else if (campo === 'caixasPapelao') {
        payload[campo] = Number(valor) || 0;
      } else {
        payload[campo] = valor;
      }
      atualizarProcessoMut.mutate(payload);
    }, 400);
  };

  // Debounced item field update
  const itemUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleAtualizarItem = (itemId: number, campo: string, valor: any) => {
    if (!processoSelecionado) return;
    if (itemUpdateTimerRef.current) clearTimeout(itemUpdateTimerRef.current);
    itemUpdateTimerRef.current = setTimeout(() => {
      const payload: any = { itemId, processoId: processoSelecionado.id };
      if (campo === 'quantidade') {
        payload.quantidade = Number(valor) || 0;
      } else if (campo === 'precoUnitarioDolar') {
        payload.precoUnitarioDolar = Number(valor) || 0;
      } else if (campo === 'pedidoSarom') {
        payload.pedidoSarom = Number(valor) || 0;
      } else if (campo === 'pedidoAlexandre') {
        payload.pedidoAlexandre = Number(valor) || 0;
      } else if (campo === 'ordemCompra') {
        payload.ordemCompra = valor;
      }
      atualizarItemMut.mutate(payload);
    }, 400);
  };

  // Local editable state for inline editing (optimistic, synced via debounced mutation)
  const [localItemEdits, setLocalItemEdits] = useState<Record<number, Partial<ItemConteiner>>>({});

  const getItemValue = (item: ItemConteiner, campo: keyof ItemConteiner) => {
    return localItemEdits[item.id]?.[campo] ?? item[campo];
  };

  const setLocalItemEdit = (itemId: number, campo: string, valor: any) => {
    setLocalItemEdits(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [campo]: valor },
    }));
    handleAtualizarItem(itemId, campo, valor);
  };

  // Clear local edits when items refresh
  useEffect(() => {
    setLocalItemEdits({});
  }, [itensRaw]);

  // Local editable state for processo fields (optimistic)
  const [localProcessoEdits, setLocalProcessoEdits] = useState<Record<string, any>>({});

  const getProcessoValue = (campo: string) => {
    return localProcessoEdits[campo] ?? (processoSelecionado as any)?.[campo] ?? '';
  };

  const setLocalProcessoEdit = (campo: string, valor: any) => {
    setLocalProcessoEdits(prev => ({ ...prev, [campo]: valor }));
    handleAtualizarProcesso(campo, valor);
  };

  // Clear local edits when selected processo changes
  useEffect(() => {
    setLocalProcessoEdits({});
  }, [selectedProcessoId]);

  const stats = useMemo(() => {
    if (!processoSelecionado || itensDoProcesso.length === 0) return { totalItens: 0, totalDolar: 0, totalSarom: 0, totalAlexandre: 0, totalQtd: 0, divergentes: 0 };
    const totalItens = itensDoProcesso.length;
    const totalDolar = itensDoProcesso.reduce((s, i) => s + i.precoTotalDolar, 0);
    const totalSarom = itensDoProcesso.reduce((s, i) => s + i.pedidoSarom, 0);
    const totalAlexandre = itensDoProcesso.reduce((s, i) => s + i.pedidoAlexandre, 0);
    const totalQtd = itensDoProcesso.reduce((s, i) => s + i.quantidade, 0);
    const divergentes = itensDoProcesso.filter(i => (i.pedidoSarom + i.pedidoAlexandre) !== i.quantidade).length;
    return { totalItens, totalDolar, totalSarom, totalAlexandre, totalQtd, divergentes };
  }, [processoSelecionado, itensDoProcesso]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Em andamento': return { bg: 'var(--color-asx-red)', text: 'white' };
      case 'Finalizado': return { bg: 'oklch(0.50 0.15 142)', text: 'white' };
      case 'Cancelado': return { bg: 'oklch(0.40 0.10 0)', text: 'white' };
      default: return { bg: 'var(--color-asx-surface-2)', text: 'oklch(0.80 0.005 65)' };
    }
  };

  const handleAlterarStatus = (id: number, novoStatus: 'Em andamento' | 'Finalizado' | 'Cancelado') => {
    atualizarStatusMut.mutate({ processoId: id, novoStatus });
  };

  const handleReabrirProcesso = (id: number) => {
    atualizarProcessoMut.mutate({ processoId: id, confirmado: 0 });
  };

  // ===== EXCEL EXPORT FUNCTIONS =====
  // These use itensDoProcesso (the tRPC-loaded items)

  const handleExportarPlanilhaCompra = () => {
    if (!processoSelecionado) return;
    const wb = XLSX.utils.book_new();

    const FATOR_BRL = 8.5;
    const totalQtd = itensDoProcesso.reduce((s, i) => s + i.quantidade, 0);
    const totalUSD = Number(itensDoProcesso.reduce((s, i) => s + i.precoTotalDolar, 0).toFixed(2));
    const totalSaromPreco = Number(itensDoProcesso.reduce((s, i) => s + (i.pedidoSarom * i.precoUnitarioDolar), 0).toFixed(2));
    const totalAlexPreco = Number(itensDoProcesso.reduce((s, i) => s + (i.pedidoAlexandre * i.precoUnitarioDolar), 0).toFixed(2));
    const numItens = itensDoProcesso.length;

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

    setCell('A1', 'MIC TRADE SERVICE LIMITED\nRM 502C 5/F\nHO KING COMM CTR\n2-16 FAYUEN ST MONGKOK KL HONGKONG CHINA', {
      font: fontBold12, alignment: alignCenter, border: borderMediumLeft
    });
    setCell('A2', 'COMERCIAL INVOICE', {
      font: fontBold12, alignment: alignCenter, border: borderMediumLeft
    });
    setCell('A3', 'TO', { font: fontBold12, alignment: alignCenter, border: borderMediumLeft });
    setCell('B3', 'SONRES & REZENDE INPORT. EXPORT LTDA\nCNPJ: 23 113 383/0002-90\nRUA ALFREDO NERLO 560/ SALA 05\nMOMRIND MLA VELH ES', {
      font: fontBold10, alignment: alignCenter, border: borderThin
    });
    setCell('G3', 'INVOICE:', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('I3', processoSelecionado.numeroProcesso || 'SR 201', { font: fontNormal10, alignment: alignCenter, border: borderThin });
    setCell('B4', 'PROSPER INTELIGÊNCIA ADUANEIRA LTDA\nADDRESS: RUA GONCALVES DIAS, 110, SALA 17, CENTRO, PORTO\nVELHO, RO, CEP 76.801-076\nCNPJ: 59.574.729/0001-14', {
      font: fontBold10, alignment: alignCenter, border: borderThin
    });
    setCell('G4', `DATE: ${processoSelecionado.dataProcesso}`, { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('I4', `NCM ${processoSelecionado.ncm || '8539'}`, { font: fontBold10, alignment: alignCenter, border: borderThin });
    setCell('G5', 'OBS:', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('I5', processoSelecionado.observacoes || '', { font: fontNormal9, alignment: alignCenter, border: borderThin });

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

    const itemStartRow = 8;
    itensDoProcesso.forEach((item, idx) => {
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

    const totalRow = itemStartRow + numItens;
    setCell(`I${totalRow}`, totalQtd, { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`K${totalRow}`, totalUSD, { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`N${totalRow}`, totalSaromPreco, { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`P${totalRow}`, totalAlexPreco, { font: fontBold9, alignment: alignCenter, border: borderThin });

    const embarqueRow = totalRow + 2;
    const cx = processoSelecionado.caixasPapelao || 0;
    const pb = processoSelecionado.pesoBrutoKg || 0;
    const pl = processoSelecionado.pesoLiquidoKg || 0;
    const cbmVal = processoSelecionado.cbm || 0;
    setCell(`A${embarqueRow}`, ` CAIXAS ${cx} PAPELAO   / PESO BRUTO ${pb} KG   /  PESO LIQUIDO ${pl} KG / CBM ${cbmVal}`, {
      font: fontBold9, alignment: alignLeft, border: borderMediumLeft
    });

    const factoryHeaderRow = embarqueRow + 1;
    setCell(`A${factoryHeaderRow}`, '.', { font: fontBold9, alignment: alignCenter, border: borderMediumLeft });
    setCell(`C${factoryHeaderRow}`, 'Factory', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`G${factoryHeaderRow}`, 'Address', { font: fontBold9, alignment: alignCenter, border: borderThin });

    const f1Row = factoryHeaderRow + 1;
    setCell(`A${f1Row}`, '1-11', { font: fontNormal9, alignment: alignCenter, border: borderMediumLeft });
    setCell(`C${f1Row}`, 'HEBEI SHUANGQI AUTOMOBILE LIGHTING APPLIANCE CO., LTD.', { font: fontNormal9, alignment: alignCenter, border: borderThin });
    setCell(`G${f1Row}`, 'LIUFEN VILLAGE, WOFOTANG TOWN, HEJIAN CITY, HEBEI PROVINCE, CHINA', { font: fontNormal9, alignment: alignCenter, border: borderThin });

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

    const bankRow = delRow + 1;
    setCell(`A${bankRow}`, 'BANK INFORMATION\nBeneficiary Name:  MIC TRADE SERVICE LIMITED\nAccount No.:  NRA30006829988 (please also input "NRA")\nADDRESS: RM 502C 5/F, HO KING COMM CTR,2-16 FAYUEN ST MONGKOK,KL\n\nBeneficiary Bank: DBS Bank (China) Ltd Guangzhou Branch\nSwift Code : DBSSCNSHGZU\nBeneficiary Bank Address: One-link Center, 18/F Onelink Centre, No.230-232, Tianhe Road, Tianhe District, Guangzhou', {
      font: fontBold9, alignment: alignLeft, border: borderMediumLeft
    });

    const merges: any[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 16 } },
      { s: { r: 2, c: 0 }, e: { r: 4, c: 0 } },
      { s: { r: 2, c: 1 }, e: { r: 2, c: 5 } },
      { s: { r: 2, c: 6 }, e: { r: 2, c: 7 } },
      { s: { r: 2, c: 8 }, e: { r: 2, c: 16 } },
      { s: { r: 3, c: 1 }, e: { r: 4, c: 5 } },
      { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
      { s: { r: 3, c: 8 }, e: { r: 4, c: 16 } },
      { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
      { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } },
      { s: { r: 5, c: 1 }, e: { r: 5, c: 6 } },
      { s: { r: 6, c: 1 }, e: { r: 6, c: 6 } },
    ];
    for (let i = 0; i < numItens; i++) {
      const r = itemStartRow - 1 + i;
      merges.push({ s: { r, c: 1 }, e: { r, c: 6 } });
    }
    merges.push({ s: { r: embarqueRow - 1, c: 0 }, e: { r: embarqueRow - 1, c: 16 } });
    merges.push({ s: { r: factoryHeaderRow - 1, c: 0 }, e: { r: factoryHeaderRow - 1, c: 1 } });
    merges.push({ s: { r: factoryHeaderRow - 1, c: 2 }, e: { r: factoryHeaderRow - 1, c: 5 } });
    merges.push({ s: { r: factoryHeaderRow - 1, c: 6 }, e: { r: factoryHeaderRow - 1, c: 16 } });
    merges.push({ s: { r: f1Row - 1, c: 0 }, e: { r: f1Row - 1, c: 1 } });
    merges.push({ s: { r: f1Row - 1, c: 2 }, e: { r: f1Row - 1, c: 5 } });
    merges.push({ s: { r: f1Row - 1, c: 6 }, e: { r: f1Row - 1, c: 16 } });
    merges.push({ s: { r: condRow - 1, c: 0 }, e: { r: condRow - 1, c: 4 } });
    merges.push({ s: { r: condRow - 1, c: 5 }, e: { r: condRow - 1, c: 16 } });
    merges.push({ s: { r: priceRow - 1, c: 0 }, e: { r: priceRow - 1, c: 1 } });
    merges.push({ s: { r: priceRow - 1, c: 2 }, e: { r: priceRow - 1, c: 4 } });
    merges.push({ s: { r: priceRow - 1, c: 5 }, e: { r: priceRow - 1, c: 7 } });
    merges.push({ s: { r: priceRow - 1, c: 8 }, e: { r: priceRow - 1, c: 16 } });
    merges.push({ s: { r: payRow - 1, c: 0 }, e: { r: payRow - 1, c: 1 } });
    merges.push({ s: { r: payRow - 1, c: 2 }, e: { r: payRow - 1, c: 4 } });
    merges.push({ s: { r: payRow - 1, c: 5 }, e: { r: payRow - 1, c: 7 } });
    merges.push({ s: { r: payRow - 1, c: 8 }, e: { r: payRow - 1, c: 16 } });
    merges.push({ s: { r: embRow - 1, c: 0 }, e: { r: embRow - 1, c: 1 } });
    merges.push({ s: { r: embRow - 1, c: 2 }, e: { r: embRow - 1, c: 4 } });
    merges.push({ s: { r: embRow - 1, c: 5 }, e: { r: embRow - 1, c: 7 } });
    merges.push({ s: { r: embRow - 1, c: 8 }, e: { r: embRow - 1, c: 16 } });
    merges.push({ s: { r: delRow - 1, c: 5 }, e: { r: delRow - 1, c: 7 } });
    merges.push({ s: { r: delRow - 1, c: 8 }, e: { r: delRow - 1, c: 16 } });
    merges.push({ s: { r: bankRow - 1, c: 0 }, e: { r: bankRow - 1, c: 16 } });

    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 5.16 }, { wch: 6.16 }, { wch: 5.5 }, { wch: 7.5 }, { wch: 9.66 }, { wch: 18.66 },
      { wch: 33.16 }, { wch: 6.16 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 16 },
    ];

    const rows: any = {};
    rows[0] = { hpt: 63 }; rows[1] = { hpt: 16 }; rows[2] = { hpt: 65 };
    rows[3] = { hpt: 27 }; rows[4] = { hpt: 43 }; rows[5] = { hpt: 25 }; rows[6] = { hpt: 29 };
    for (let i = 0; i < numItens; i++) { rows[itemStartRow - 1 + i] = { hpt: 20.25 }; }
    rows[embarqueRow - 1] = { hpt: 16 };
    rows[bankRow - 1] = { hpt: 133 };
    const maxRowIdx = Math.max(...Object.keys(rows).map(Number));
    const rowsArr: any[] = [];
    for (let i = 0; i <= maxRowIdx; i++) { rowsArr.push(rows[i] || {}); }
    ws['!rows'] = rowsArr;
    ws['!ref'] = `A1:Q${bankRow}`;

    XLSX.utils.book_append_sheet(wb, ws, 'PI FINAL TOTAL');
    const fileName = `${processoSelecionado.numeroProcesso || 'SR'}PI_Compra.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportarExcel = () => {
    if (!processoSelecionado) return;
    const wb = XLSX.utils.book_new();

    const totalUSD = Number(itensDoProcesso.reduce((s, i) => s + i.precoTotalDolar, 0).toFixed(2));
    const totalQtd = itensDoProcesso.reduce((s, i) => s + i.quantidade, 0);
    const numItens = itensDoProcesso.length;

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

    setCell('A1', 'MIC TRADE SERVICE LIMITED\nRM 502C 5/F\nHO KING COMM CTR\n2-16 FAYUEN ST MONGKOK KL HONGKONG CHINA', {
      font: fontBold12, alignment: alignCenter, border: borderMediumLeft
    });
    setCell('A2', 'COMERCIAL INVOICE', { font: fontBold12, alignment: alignCenter, border: borderMediumLeft });
    setCell('A3', 'TO', { font: fontBold12, alignment: alignCenter, border: borderMediumLeft });
    setCell('B3', 'SONRES & REZENDE INPORT. EXPORT LTDA\nCNPJ: 23 113 383/0002-90\nRUA ALFREDO NERLO 560/ SALA 05\nMOMRIND MLA VELH ES', {
      font: fontBold10, alignment: alignCenter, border: borderThin
    });
    setCell('G3', 'INVOICE:', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('I3', processoSelecionado.numeroProcesso || 'SR 201', { font: fontNormal10, alignment: alignCenter, border: borderThin });
    setCell('B4', 'PROSPER INTELIGÊNCIA ADUANEIRA LTDA\nADDRESS: RUA GONCALVES DIAS, 110, SALA 17, CENTRO, PORTO\nVELHO, RO, CEP 76.801-076\nCNPJ: 59.574.729/0001-14', {
      font: fontBold10, alignment: alignCenter, border: borderThin
    });
    setCell('G4', `DATE: ${processoSelecionado.dataProcesso}`, { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('I4', `NCM ${processoSelecionado.ncm || '8539'}`, { font: fontBold10, alignment: alignCenter, border: borderThin });
    setCell('G5', 'OBS:', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell('I5', processoSelecionado.observacoes || '', { font: fontNormal9, alignment: alignCenter, border: borderThin });

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

    const itemStartRow = 8;
    itensDoProcesso.forEach((item, idx) => {
      const r = itemStartRow + idx;
      setCell(`A${r}`, idx + 1, { font: fontNormal9, alignment: alignCenter, border: borderMediumLeft });
      setCell(`B${r}`, `${item.codigo} - ${item.descricao}`, { font: fontNormal9, alignment: alignLeft, border: borderThin });
      setCell(`H${r}`, item.unidade || 'PIC', { font: fontNormal9, alignment: alignCenter, border: borderThin });
      setCell(`I${r}`, item.quantidade, { font: fontNormal9, alignment: alignCenter, border: borderThin });
      setCell(`J${r}`, Number(item.precoUnitarioDolar.toFixed(2)), { font: fontNormal9, alignment: alignCenter, border: borderThin });
      setCell(`K${r}`, Number(item.precoTotalDolar.toFixed(2)), { font: fontNormal9, alignment: alignCenter, border: borderThin });
    });

    const totalRow = itemStartRow + numItens;
    setCell(`I${totalRow}`, totalQtd, { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`K${totalRow}`, totalUSD, { font: fontBold9, alignment: alignCenter, border: borderThin });

    const embarqueRow = totalRow + 2;
    const cx = processoSelecionado.caixasPapelao || 0;
    const pb = processoSelecionado.pesoBrutoKg || 0;
    const pl = processoSelecionado.pesoLiquidoKg || 0;
    const cbmVal = processoSelecionado.cbm || 0;
    setCell(`A${embarqueRow}`, ` CAIXAS ${cx} PAPELAO   / PESO BRUTO ${pb} KG   /  PESO LIQUIDO ${pl} KG / CBM ${cbmVal}`, {
      font: fontBold9, alignment: alignLeft, border: borderMediumLeft
    });

    const factoryHeaderRow = embarqueRow + 1;
    setCell(`A${factoryHeaderRow}`, '.', { font: fontBold9, alignment: alignCenter, border: borderMediumLeft });
    setCell(`C${factoryHeaderRow}`, 'Factory', { font: fontBold9, alignment: alignCenter, border: borderThin });
    setCell(`G${factoryHeaderRow}`, 'Address', { font: fontBold9, alignment: alignCenter, border: borderThin });

    const f1Row = factoryHeaderRow + 1;
    setCell(`A${f1Row}`, '1-11', { font: fontNormal9, alignment: alignCenter, border: borderMediumLeft });
    setCell(`C${f1Row}`, 'HEBEI SHUANGQI AUTOMOBILE LIGHTING APPLIANCE CO., LTD.', { font: fontNormal9, alignment: alignCenter, border: borderThin });
    setCell(`G${f1Row}`, 'LIUFEN VILLAGE, WOFOTANG TOWN, HEJIAN CITY, HEBEI PROVINCE, CHINA', { font: fontNormal9, alignment: alignCenter, border: borderThin });

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

    const bankRow = delRow + 1;
    setCell(`A${bankRow}`, 'BANK INFORMATION\nBeneficiary Name:  MIC TRADE SERVICE LIMITED\nAccount No.:  NRA30006829988 (please also input "NRA")\nADDRESS: RM 502C 5/F, HO KING COMM CTR,2-16 FAYUEN ST MONGKOK,KL\n\nBeneficiary Bank: DBS Bank (China) Ltd Guangzhou Branch\nSwift Code : DBSSCNSHGZU\nBeneficiary Bank Address: One-link Center, 18/F Onelink Centre, No.230-232, Tianhe Road, Tianhe District, Guangzhou', {
      font: fontBold9, alignment: alignLeft, border: borderMediumLeft
    });

    const merges: any[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
      { s: { r: 2, c: 0 }, e: { r: 4, c: 0 } },
      { s: { r: 2, c: 1 }, e: { r: 2, c: 5 } },
      { s: { r: 2, c: 6 }, e: { r: 2, c: 7 } },
      { s: { r: 2, c: 8 }, e: { r: 2, c: 10 } },
      { s: { r: 3, c: 1 }, e: { r: 4, c: 5 } },
      { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } },
      { s: { r: 3, c: 8 }, e: { r: 4, c: 10 } },
      { s: { r: 4, c: 6 }, e: { r: 4, c: 7 } },
      { s: { r: 5, c: 0 }, e: { r: 6, c: 0 } },
      { s: { r: 5, c: 1 }, e: { r: 6, c: 6 } },
    ];
    for (let i = 0; i < numItens; i++) {
      const r = itemStartRow - 1 + i;
      merges.push({ s: { r, c: 1 }, e: { r, c: 6 } });
    }
    merges.push({ s: { r: embarqueRow - 1, c: 0 }, e: { r: embarqueRow - 1, c: 10 } });
    merges.push({ s: { r: factoryHeaderRow - 1, c: 0 }, e: { r: factoryHeaderRow - 1, c: 1 } });
    merges.push({ s: { r: factoryHeaderRow - 1, c: 2 }, e: { r: factoryHeaderRow - 1, c: 5 } });
    merges.push({ s: { r: factoryHeaderRow - 1, c: 6 }, e: { r: factoryHeaderRow - 1, c: 10 } });
    merges.push({ s: { r: f1Row - 1, c: 0 }, e: { r: f1Row - 1, c: 1 } });
    merges.push({ s: { r: f1Row - 1, c: 2 }, e: { r: f1Row - 1, c: 5 } });
    merges.push({ s: { r: f1Row - 1, c: 6 }, e: { r: f1Row - 1, c: 10 } });
    merges.push({ s: { r: condRow - 1, c: 0 }, e: { r: condRow - 1, c: 4 } });
    merges.push({ s: { r: condRow - 1, c: 5 }, e: { r: condRow - 1, c: 10 } });
    merges.push({ s: { r: priceRow - 1, c: 0 }, e: { r: priceRow - 1, c: 1 } });
    merges.push({ s: { r: priceRow - 1, c: 2 }, e: { r: priceRow - 1, c: 4 } });
    merges.push({ s: { r: priceRow - 1, c: 5 }, e: { r: priceRow - 1, c: 6 } });
    merges.push({ s: { r: priceRow - 1, c: 8 }, e: { r: priceRow - 1, c: 10 } });
    merges.push({ s: { r: payRow - 1, c: 0 }, e: { r: payRow - 1, c: 1 } });
    merges.push({ s: { r: payRow - 1, c: 2 }, e: { r: payRow - 1, c: 4 } });
    merges.push({ s: { r: payRow - 1, c: 5 }, e: { r: payRow - 1, c: 6 } });
    merges.push({ s: { r: payRow - 1, c: 8 }, e: { r: payRow - 1, c: 10 } });
    merges.push({ s: { r: embRow - 1, c: 0 }, e: { r: embRow - 1, c: 1 } });
    merges.push({ s: { r: embRow - 1, c: 2 }, e: { r: embRow - 1, c: 4 } });
    merges.push({ s: { r: embRow - 1, c: 5 }, e: { r: embRow - 1, c: 6 } });
    merges.push({ s: { r: embRow - 1, c: 8 }, e: { r: embRow - 1, c: 10 } });
    merges.push({ s: { r: delRow - 1, c: 5 }, e: { r: delRow - 1, c: 6 } });
    merges.push({ s: { r: delRow - 1, c: 8 }, e: { r: delRow - 1, c: 10 } });
    merges.push({ s: { r: bankRow - 1, c: 0 }, e: { r: bankRow - 1, c: 10 } });

    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 5.16 }, { wch: 6.16 }, { wch: 5.5 }, { wch: 7.5 }, { wch: 9.66 }, { wch: 18.66 },
      { wch: 33.16 }, { wch: 6.16 }, { wch: 13.33 }, { wch: 15.0 }, { wch: 19.0 },
    ];

    const rows: any = {};
    rows[0] = { hpt: 63 }; rows[1] = { hpt: 16 }; rows[2] = { hpt: 65 };
    rows[3] = { hpt: 27 }; rows[4] = { hpt: 43 }; rows[5] = { hpt: 25 }; rows[6] = { hpt: 29 };
    for (let i = 0; i < numItens; i++) { rows[itemStartRow - 1 + i] = { hpt: 20.25 }; }
    rows[embarqueRow - 1] = { hpt: 16 };
    rows[bankRow - 1] = { hpt: 133 };
    const maxRowIdx = Math.max(...Object.keys(rows).map(Number));
    const rowsArr: any[] = [];
    for (let i = 0; i <= maxRowIdx; i++) { rowsArr.push(rows[i] || {}); }
    ws['!rows'] = rowsArr;
    ws['!ref'] = `A1:K${bankRow}`;

    XLSX.utils.book_append_sheet(wb, ws, 'PI FINAL TOTAL');
    const fileName = `${processoSelecionado.numeroProcesso || 'SR'}PI.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleConfirmarProcesso = () => {
    if (!processoSelecionado) return;
    atualizarProcessoMut.mutate({ processoId: processoSelecionado.id, confirmado: 1 });
  };

  // Loading state
  if (isLoadingProcessos) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--color-asx-dark)', color: 'var(--color-asx-text)' }}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-t-transparent rounded-full mx-auto mb-3" style={{ borderColor: 'var(--color-asx-red)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--color-asx-text-muted)' }}>Carregando processos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--color-asx-dark)', color: 'oklch(0.95 0.005 65)' }}>
      {/* Botao Voltar */}
      <div className="px-6 py-3 border-b flex items-center" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
          style={{ background: 'var(--color-asx-surface)', color: 'oklch(0.80 0.005 65)' }}
          title="Voltar ao menu principal"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Menu</span>
        </button>
      </div>
      {/* Header */}
      <header className="sticky top-12 z-40 border-b px-6 h-14 flex items-center gap-4" style={{ background: 'var(--color-asx-base)', borderColor: 'var(--color-asx-border)' }}>
        <span className="font-rajdhani font-bold text-lg tracking-wide" style={{ color: 'oklch(0.80 0.005 65)' }}>
          GERENCIADOR DE CONTEINERES
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setShowNovoProcesso(true)}
          className="px-4 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
          style={{ background: 'var(--color-asx-red)', color: 'white' }}
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
                      background: filtroStatus === status ? getStatusColor(status === 'Todos' ? 'Em andamento' : status).bg : 'var(--color-asx-surface-2)',
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
                  background: filtroConfirmados ? 'var(--color-asx-red)' : 'var(--color-asx-surface-2)',
                  color: 'white'
                }}
                title={filtroConfirmados ? 'Mostrando confirmados' : 'Mostrar todos'}
              >
                {filtroConfirmados ? 'Confirmados' : 'Mostrar Todos'}
              </button>
            </div>
          </div>

          <div className="space-y-1 p-3">
            {processosFiltrados.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: 'oklch(0.40 0.010 285)' }}>
                {filtroConfirmados ? 'Nenhum processo confirmado' : 'Nenhum processo criado'}
              </p>
            ) : (
              processosFiltrados.map((p: any) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProcessoId(p.id)}
                  className="p-3 rounded-md cursor-pointer transition-colors border"
                  style={{
                    background: selectedProcessoId === p.id ? 'var(--color-asx-red)' : 'var(--color-asx-surface)',
                    borderColor: selectedProcessoId === p.id ? 'var(--color-asx-red)' : 'oklch(0.22 0.005 285)',
                    color: selectedProcessoId === p.id ? 'white' : 'oklch(0.80 0.005 65)',
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
                      <p className="text-[11px] truncate" style={{ opacity: 0.7 }}>{p.nomeInvoice || '\u2014'}</p>
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
            {/* Formulario de Edicao */}
            <div className="border rounded-lg p-4 flex-shrink-0 overflow-y-auto"
              style={{ background: 'var(--color-asx-base)', borderColor: 'oklch(0.22 0.005 285)' }}>
              <h2 className="font-rajdhani font-bold text-lg mb-4" style={{ color: 'var(--color-asx-text-heading)' }}>
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
                      borderColor: 'var(--color-asx-border)',
                      color: 'var(--color-asx-text)',
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
                    value={getProcessoValue('nomeInvoice')}
                    onChange={e => setLocalProcessoEdit('nomeInvoice', e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-md border text-sm"
                    style={{
                      background: 'oklch(0.18 0.005 285)',
                      borderColor: 'var(--color-asx-border)',
                      color: 'var(--color-asx-text)',
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                    Data do Processo
                  </label>
                  <input
                    type="date"
                    value={getProcessoValue('dataProcesso')}
                    onChange={e => setLocalProcessoEdit('dataProcesso', e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-md border text-sm"
                    style={{
                      background: 'oklch(0.18 0.005 285)',
                      borderColor: 'var(--color-asx-border)',
                      color: 'var(--color-asx-text)',
                    }}
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                    NCM
                  </label>
                  <input
                    type="text"
                    value={getProcessoValue('ncm')}
                    onChange={e => setLocalProcessoEdit('ncm', e.target.value)}
                    placeholder="Ex: 8512.90.00"
                    className="w-full mt-1 px-3 py-2 rounded-md border text-sm"
                    style={{
                      background: 'oklch(0.18 0.005 285)',
                      borderColor: 'var(--color-asx-border)',
                      color: 'var(--color-asx-text)',
                    }}
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                    Observacoes
                  </label>
                  <textarea
                    value={getProcessoValue('observacoes')}
                    onChange={e => setLocalProcessoEdit('observacoes', e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-md border text-sm"
                    rows={2}
                    style={{
                      background: 'oklch(0.18 0.005 285)',
                      borderColor: 'var(--color-asx-border)',
                      color: 'var(--color-asx-text)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-5 gap-3 mt-4 flex-shrink-0">
              <div className="rounded-lg p-3 border" style={{ background: 'var(--color-asx-base)', borderColor: 'oklch(0.22 0.005 285)' }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Total Itens</p>
                <p className="font-rajdhani font-bold text-xl mt-1" style={{ color: 'var(--color-asx-text-heading)' }}>{stats.totalItens}</p>
              </div>
              <div className="rounded-lg p-3 border" style={{ background: 'var(--color-asx-base)', borderColor: 'oklch(0.22 0.005 285)' }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Total USD</p>
                <p className="font-rajdhani font-bold text-xl mt-1" style={{ color: 'var(--color-asx-text-heading)' }}>{formatUSD(stats.totalDolar)}</p>
              </div>
              <div className="rounded-lg p-3 border" style={{ background: 'var(--color-asx-base)', borderColor: 'oklch(0.22 0.005 285)' }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Sarom</p>
                <p className="font-rajdhani font-bold text-xl mt-1" style={{ color: 'var(--color-asx-text-heading)' }}>{stats.totalSarom}</p>
              </div>
              <div className="rounded-lg p-3 border" style={{ background: 'var(--color-asx-base)', borderColor: 'oklch(0.22 0.005 285)' }}>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>Alexandre</p>
                <p className="font-rajdhani font-bold text-xl mt-1" style={{ color: 'var(--color-asx-text-heading)' }}>{stats.totalAlexandre}</p>
              </div>
              <div className="rounded-lg p-3 border" style={{
                background: stats.divergentes > 0 ? 'oklch(0.20 0.08 30)' : 'var(--color-asx-base)',
                borderColor: stats.divergentes > 0 ? 'oklch(0.50 0.20 30)' : 'oklch(0.22 0.005 285)',
              }}>
                <p className="text-[10px] uppercase tracking-wider flex items-center gap-1" style={{ color: stats.divergentes > 0 ? 'oklch(0.70 0.18 30)' : 'oklch(0.45 0.010 285)' }}>
                  {stats.divergentes > 0 && <AlertTriangle className="w-3 h-3" />}
                  Divergencias
                </p>
                <p className="font-rajdhani font-bold text-xl mt-1" style={{ color: stats.divergentes > 0 ? 'oklch(0.75 0.20 30)' : 'var(--color-asx-success)' }}>
                  {stats.divergentes > 0 ? stats.divergentes : 'OK'}
                </p>
              </div>
            </div>

            {/* Banner de alerta de divergencia */}
            {stats.divergentes > 0 && (
              <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-lg border" style={{
                background: 'oklch(0.18 0.06 30)',
                borderColor: 'oklch(0.45 0.18 30)',
              }}>
                <AlertTriangle className="w-5 h-5 flex-shrink-0" style={{ color: 'oklch(0.75 0.20 40)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'oklch(0.85 0.12 40)' }}>
                    {stats.divergentes} {stats.divergentes === 1 ? 'item com' : 'itens com'} divergencia na distribuicao
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'oklch(0.65 0.08 40)' }}>
                    A soma de Sarom + Alexandre nao corresponde a quantidade total. Verifique os itens destacados em vermelho.
                  </p>
                </div>
              </div>
            )}

            {/* Tabela de Itens */}
            <div className="flex-1 overflow-auto mt-4 border rounded-lg" style={{ borderColor: 'oklch(0.22 0.005 285)', minHeight: 0 }}>
              <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ color: 'var(--color-asx-text-heading)', minWidth: '1200px' }}>
                <thead style={{ background: 'var(--color-asx-base)', borderColor: 'oklch(0.22 0.005 285)' }} className="border-b sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Codigo</th>
                    <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Nome</th>
                    <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Unid</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Qtd</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Preco Unit USD</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Total USD</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.40 0.15 200)' }}>Sarom</th>
                    <th className="text-right px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.40 0.15 145)' }}>Alexandre</th>
                    <th className="text-left px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Ordem</th>
                    <th className="text-center px-3 py-2 text-[11px] uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {itensDoProcesso.map(item => {
                    const qtd = Number(getItemValue(item, 'quantidade')) || 0;
                    const sarom = Number(getItemValue(item, 'pedidoSarom')) || 0;
                    const alexandre = Number(getItemValue(item, 'pedidoAlexandre')) || 0;
                    const precoUnit = Number(getItemValue(item, 'precoUnitarioDolar')) || 0;
                    const somaDistrib = sarom + alexandre;
                    const isDivergente = somaDistrib !== qtd;
                    const diff = somaDistrib - qtd;
                    return (
                    <tr
                      key={item.id}
                      style={{
                        borderColor: isDivergente ? 'oklch(0.40 0.18 30)' : 'oklch(0.18 0.005 285)',
                        background: isDivergente ? 'oklch(0.16 0.06 30)' : 'transparent',
                      }}
                      className="border-b transition-colors"
                      onMouseEnter={e => (e.currentTarget.style.background = isDivergente ? 'oklch(0.19 0.08 30)' : 'var(--color-asx-surface)')}
                      onMouseLeave={e => (e.currentTarget.style.background = isDivergente ? 'oklch(0.16 0.06 30)' : 'transparent')}
                      title={isDivergente ? `Divergencia: Sarom(${sarom}) + Alexandre(${alexandre}) = ${somaDistrib} != Qtd(${qtd}). Diferenca: ${diff > 0 ? '+' : ''}${diff}` : ''}
                    >
                      <td className="px-3 py-2">
                        <span className="text-xs font-mono" style={{ color: 'var(--color-asx-red)' }}>{item.codigo}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs" style={{ color: 'var(--color-asx-text-heading)' }}>{item.descricao}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-center block" style={{ color: 'var(--color-asx-text-heading)' }}>{item.unidade}</span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={getItemValue(item, 'quantidade')}
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            setLocalItemEdit(item.id, 'quantidade', parseFloat(val) || 0);
                          }}
                          onFocus={e => e.target.select()}
                          className="w-16 px-2 py-1 rounded text-xs bg-transparent border text-right"
                          style={{ borderColor: 'var(--color-asx-border)', color: 'var(--color-asx-text-heading)' }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={getItemValue(item, 'precoUnitarioDolar')}
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9.]/g, '');
                            setLocalItemEdit(item.id, 'precoUnitarioDolar', parseFloat(val) || 0);
                          }}
                          onFocus={e => e.target.select()}
                          className="w-24 px-2 py-1 rounded text-xs bg-transparent border text-right"
                          style={{ borderColor: 'var(--color-asx-border)', color: 'var(--color-asx-text-heading)' }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-rajdhani font-semibold" style={{ color: 'var(--color-asx-red)' }}>
                        {formatUSD(qtd * precoUnit)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={getItemValue(item, 'pedidoSarom')}
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setLocalItemEdit(item.id, 'pedidoSarom', parseInt(val) || 0);
                          }}
                          onFocus={e => e.target.select()}
                          className="w-16 px-2 py-1 rounded text-xs bg-transparent border text-right"
                          style={{ borderColor: 'var(--color-asx-border)', color: 'oklch(0.60 0.15 200)' }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={getItemValue(item, 'pedidoAlexandre')}
                          onChange={e => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            setLocalItemEdit(item.id, 'pedidoAlexandre', parseInt(val) || 0);
                          }}
                          onFocus={e => e.target.select()}
                          className="w-16 px-2 py-1 rounded text-xs bg-transparent border text-right"
                          style={{ borderColor: 'var(--color-asx-border)', color: 'oklch(0.60 0.15 145)' }}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={getItemValue(item, 'ordemCompra') || ''}
                          onChange={e => setLocalItemEdit(item.id, 'ordemCompra', e.target.value)}
                          onFocus={e => e.target.select()}
                          placeholder="Ex: TRUCK1225"
                          className="w-24 px-2 py-1 rounded text-xs bg-transparent border"
                          style={{ borderColor: 'var(--color-asx-border)', color: 'var(--color-asx-text-heading)' }}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isDivergente && (
                            <span className="relative group">
                              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" style={{ color: 'oklch(0.75 0.20 40)' }} />
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50" style={{ background: 'oklch(0.20 0.08 30)', color: 'oklch(0.90 0.10 40)', border: '1px solid oklch(0.45 0.18 30)' }}>
                                S({sarom}) + A({alexandre}) = {somaDistrib} != {qtd}
                                <br />
                                {diff > 0 ? `Excedente: +${diff}` : `Faltam: ${Math.abs(diff)}`}
                              </span>
                            </span>
                          )}
                          <button
                            onClick={() => handleRemoverItem(item.id)}
                            className="p-1 rounded hover:bg-red-600/20 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" style={{ color: 'var(--color-asx-error)' }} />
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
            <div className="mt-4 border rounded-lg p-4" style={{ background: 'var(--color-asx-base)', borderColor: 'oklch(0.22 0.005 285)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-rajdhani font-bold text-sm" style={{ color: 'var(--color-asx-text-heading)' }}>
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

              <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'oklch(0.45 0.010 285)' }}>
                Adicionar manualmente:
              </p>
<div className="grid grid-cols-9 gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Codigo"
                    value={formItem.descricao}
                    onChange={e => handleBuscarProduto(e.target.value)}
                    onKeyDown={handleKeyDownSugestao}
                    onFocus={() => { if (sugestoes.length > 0) setShowSugestoes(true); }}
                    onBlur={() => setTimeout(() => setShowSugestoes(false), 200)}
                    className="w-full px-3 py-2 rounded-md border text-sm"
                    style={{
                      background: 'oklch(0.18 0.005 285)',
                      borderColor: 'var(--color-asx-border)',
                      color: 'var(--color-asx-text)',
                    }}
                  />
                  {showSugestoes && sugestoes.length > 0 && (
                    <div
                      className="absolute z-50 left-0 right-0 mt-1 rounded-md border overflow-hidden shadow-lg"
                      style={{
                        background: 'var(--color-asx-surface)',
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
                            borderBottom: '1px solid var(--color-asx-surface-2)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'oklch(0.22 0.005 285)')}
                          onMouseLeave={e => (e.currentTarget.style.background = idx === indiceSugestao ? 'oklch(0.22 0.005 285)' : 'transparent')}
                        >
                          <span className="font-mono font-bold" style={{ color: 'var(--color-asx-red)' }}>{prod.codigo}</span>
                          <span className="ml-2" style={{ color: 'oklch(0.70 0.005 65)' }}>{prod.descricao}</span>
                          <span className="ml-2 opacity-60" style={{ color: 'oklch(0.55 0.005 65)' }}>({prod.unid})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Nome (automatico)"
                  value={nomeProdutoEncontrado}
                  readOnly
                  className="col-span-2 px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.15 0.005 285)',
                    borderColor: nomeProdutoEncontrado ? 'oklch(0.40 0.18 145)' : 'var(--color-asx-border)',
                    color: 'var(--color-asx-text)',
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
                    borderColor: formItem.unidade ? 'oklch(0.40 0.18 145)' : 'var(--color-asx-border)',
                    color: 'var(--color-asx-text)',
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
                    borderColor: 'var(--color-asx-border)',
                    color: 'var(--color-asx-text)',
                  }}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Preco USD"
                  value={formItem.precoUnitarioDolar}
                  onChange={e => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setFormItem({ ...formItem, precoUnitarioDolar: parseFloat(val) || 0 });
                  }}
                  onFocus={e => e.target.select()}
                  className="px-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.18 0.005 285)',
                    borderColor: 'var(--color-asx-border)',
                    color: 'var(--color-asx-text)',
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
                    borderColor: 'var(--color-asx-border)',
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
                    borderColor: 'var(--color-asx-border)',
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
                    borderColor: 'var(--color-asx-border)',
                    color: 'var(--color-asx-text)',
                  }}
                />
              </div>
              <button
                onClick={handleAdicionarItem}
                disabled={adicionarItemMut.isPending}
                className="mt-2 px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                style={{ background: 'var(--color-asx-red)', color: 'white' }}
              >
                <Plus className="w-4 h-4" />
                {adicionarItemMut.isPending ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>

            {/* Dados de Embarque */}
            <div className="mt-4 p-3 rounded-lg" style={{ background: 'oklch(0.18 0.005 285)', border: '1px solid var(--color-asx-border)' }}>
              <h4 className="text-sm font-bold mb-3" style={{ color: 'oklch(0.75 0.005 65)' }}>DADOS DE EMBARQUE</h4>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'oklch(0.55 0.010 285)' }}>CAIXAS PAPELAO</label>
                  <input
                    type="number"
                    min="0"
                    value={getProcessoValue('caixasPapelao') || 0}
                    onChange={(e) => setLocalProcessoEdit('caixasPapelao', Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={{ background: 'oklch(0.15 0.005 285)', border: '1px solid var(--color-asx-border)', color: 'var(--color-asx-text)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'oklch(0.55 0.010 285)' }}>PESO BRUTO (KG)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={getProcessoValue('pesoBrutoKg') || 0}
                    onChange={(e) => setLocalProcessoEdit('pesoBrutoKg', Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={{ background: 'oklch(0.15 0.005 285)', border: '1px solid var(--color-asx-border)', color: 'var(--color-asx-text)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'oklch(0.55 0.010 285)' }}>PESO LIQUIDO (KG)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={getProcessoValue('pesoLiquidoKg') || 0}
                    onChange={(e) => setLocalProcessoEdit('pesoLiquidoKg', Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={{ background: 'oklch(0.15 0.005 285)', border: '1px solid var(--color-asx-border)', color: 'var(--color-asx-text)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'oklch(0.55 0.010 285)' }}>CBM</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={getProcessoValue('cbm') || 0}
                    onChange={(e) => setLocalProcessoEdit('cbm', Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={{ background: 'oklch(0.15 0.005 285)', border: '1px solid var(--color-asx-border)', color: 'var(--color-asx-text)' }}
                  />
                </div>
              </div>
            </div>

            {/* Botoes de Acao */}
            <div className="mt-4 flex gap-2 flex-shrink-0 pb-2">
              <button
                onClick={handleExportarExcel}
                className="flex-1 px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                style={{ background: 'var(--color-asx-surface-2)', borderColor: 'var(--color-asx-border)', border: '1px solid', color: 'oklch(0.80 0.005 65)' }}
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
                title="Vincular compras a este conteiner"
              >
                <Link2 className="w-4 h-4" />
                Vincular Compras
              </button>
              <button
                onClick={handleConfirmarProcesso}
                disabled={processoSelecionado?.confirmado === 1}
                className="flex-1 px-4 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: processoSelecionado?.confirmado === 1 ? 'oklch(0.30 0.005 285)' : 'var(--color-asx-red)', color: 'white' }}
                title={processoSelecionado?.confirmado === 1 ? 'Processo ja confirmado' : 'Confirmar e finalizar processo'}
              >
                Confirmar Processo
              </button>
            </div>
          </main>
        ) : (
          <div className="flex-1 flex items-center justify-center" style={{ color: 'oklch(0.45 0.010 285)' }}>
            <div className="text-center">
              <p className="text-lg font-rajdhani">Selecione ou crie um processo SR</p>
              <p className="text-sm mt-2">Clique em "Novo Processo SR" para comecar</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Novo Processo */}
      {showNovoProcesso && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowNovoProcesso(false)}>
          <div
            className="rounded-xl p-6 w-96 shadow-2xl border"
            style={{ background: 'var(--color-asx-surface)', borderColor: 'var(--color-asx-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-rajdhani font-bold mb-4" style={{ color: 'var(--color-asx-text-heading)' }}>
              Novo Processo SR
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.50 0.010 285)' }}>
                  Numero do Processo *
                </label>
                <input
                  type="text"
                  value={formProcesso.numeroProcesso}
                  onChange={e => setFormProcesso({ ...formProcesso, numeroProcesso: e.target.value })}
                  placeholder="Ex: SR-2026-001"
                  className="w-full mt-2 px-4 py-2.5 rounded-md border"
                  style={{
                    background: 'var(--color-asx-base)',
                    borderColor: 'var(--color-asx-border)',
                    color: 'var(--color-asx-text)',
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
                    background: 'var(--color-asx-base)',
                    borderColor: 'var(--color-asx-border)',
                    color: 'var(--color-asx-text)',
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
                    background: 'var(--color-asx-base)',
                    borderColor: 'var(--color-asx-border)',
                    color: 'var(--color-asx-text)',
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
                disabled={criarProcessoMut.isPending}
                className="flex-1 px-4 py-2.5 rounded-md font-medium transition-colors disabled:opacity-50"
                style={{ background: 'var(--color-asx-red)', color: 'white' }}
              >
                {criarProcessoMut.isPending ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vinculador de Embarques */}
      {showVinculador && processoSelecionado && (
        <VinculadorEmbarques
          processoId={String(processoSelecionado.id)}
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
                <h2 className="text-lg font-rajdhani font-bold" style={{ color: 'var(--color-asx-text)' }}>
                  Importar Itens para Invoice -- {processoSelecionado.numeroProcesso}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'oklch(0.50 0.010 285)' }}>
                  Selecione o pedido e ajuste as quantidades a embarcar neste conteiner
                </p>
              </div>
              <button onClick={() => { setShowModalImport(false); setPedidoSelecionadoImport(null); }} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--color-asx-text-muted)' }}>
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Selecao de Pedido */}
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
                  style={{ background: 'oklch(0.18 0.005 285)', borderColor: 'oklch(0.30 0.005 285)', color: 'var(--color-asx-text)' }}
                >
                  <option value="">-- Selecione um pedido confirmado --</option>
                  {pedidosConfirmadosDb.map((p: any) => {
                    const saldo = saldoEmbarques[String(p.id)];
                    const temSaldo = saldo && Object.keys(saldo).length > 0;
                    return (
                      <option key={p.id} value={p.id}>
                        {p.nome} (#{p.id}) {temSaldo ? 'parcialmente embarcado' : ''}
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
                  <p className="text-sm">Este pedido nao possui itens.</p>
                </div>
              ) : (
                <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: '0 2px' }}>
                  <thead>
                    <tr style={{ background: 'oklch(0.18 0.005 285)' }}>
                      <th className="px-2 py-2.5 text-left font-bold" style={{ color: 'var(--color-asx-text-muted)' }}>CODIGO</th>
                      <th className="px-2 py-2.5 text-left font-bold" style={{ color: 'var(--color-asx-text-muted)' }}>DESCRICAO</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'oklch(0.55 0.15 200)' }}>PEDIDO S</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'oklch(0.55 0.15 145)' }}>PEDIDO A</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'oklch(0.50 0.010 285)' }}>JA EMB. S</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'oklch(0.50 0.010 285)' }}>JA EMB. A</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'oklch(0.70 0.18 85)' }}>SALDO S</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'oklch(0.70 0.18 85)' }}>SALDO A</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'var(--color-asx-red)', background: 'oklch(0.48 0.22 25 / 0.10)' }}>EMBARCAR S</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'var(--color-asx-red)', background: 'oklch(0.48 0.22 25 / 0.10)' }}>EMBARCAR A</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'var(--color-asx-text-muted)' }}>%</th>
                      <th className="px-2 py-2.5 text-right font-bold" style={{ color: 'var(--color-asx-text-muted)' }}>USD</th>
                      <th className="px-2 py-2.5 text-center font-bold" style={{ color: 'var(--color-asx-text-muted)' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensDoSelecionado.map((item, idx) => {
                      const qtd = qtdsEmbarcar[item.produtoId] || { sarom: 0, alexandre: 0 };
                      const totalPedido = item.pedidoSarom + item.pedidoAlexandre;
                      const totalEmbarcar = qtd.sarom + qtd.alexandre;
                      const totalJaEmb = item.jaEmbarcadoSarom + item.jaEmbarcadoAlexandre;
                      const pctEmbarcar = totalPedido > 0 ? ((totalJaEmb + totalEmbarcar) / totalPedido) * 100 : 0;
                      const jaExiste = itensDoProcesso.some(i => i.codigo === item.produtoId);
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
                          <td className="px-2 py-2 font-mono font-bold" style={{ color: 'var(--color-asx-red)' }}>{item.produtoId}</td>
                          <td className="px-2 py-2 max-w-[200px] truncate" style={{ color: 'var(--color-asx-text-secondary)' }}>{item.descricao}</td>
                          <td className="px-2 py-2 text-center font-bold" style={{ color: 'oklch(0.60 0.15 200)' }}>{item.pedidoSarom}</td>
                          <td className="px-2 py-2 text-center font-bold" style={{ color: 'oklch(0.60 0.15 145)' }}>{item.pedidoAlexandre}</td>
                          <td className="px-2 py-2 text-center" style={{ color: 'oklch(0.50 0.010 285)' }}>{item.jaEmbarcadoSarom}</td>
                          <td className="px-2 py-2 text-center" style={{ color: 'oklch(0.50 0.010 285)' }}>{item.jaEmbarcadoAlexandre}</td>
                          <td className="px-2 py-2 text-center font-bold" style={{ color: item.saldoSarom > 0 ? 'oklch(0.80 0.18 85)' : 'oklch(0.40 0.010 285)' }}>{item.saldoSarom}</td>
                          <td className="px-2 py-2 text-center font-bold" style={{ color: item.saldoAlexandre > 0 ? 'oklch(0.80 0.18 85)' : 'oklch(0.40 0.010 285)' }}>{item.saldoAlexandre}</td>
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
                                background: 'var(--color-asx-base)',
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
                                background: 'var(--color-asx-base)',
                                borderColor: qtd.alexandre > 0 ? 'oklch(0.55 0.15 145)' : 'oklch(0.25 0.005 285)',
                                color: 'oklch(0.60 0.15 145)',
                              }}
                            />
                          </td>
                          <td className="px-2 py-2 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-[10px] font-bold" style={{ color: pctEmbarcar >= 100 ? 'var(--color-asx-success)' : pctEmbarcar > 0 ? 'oklch(0.80 0.18 85)' : 'oklch(0.40 0.010 285)' }}>
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

            {/* Footer com resumo e acao */}
            {pedidoSelecionadoImport && itensDoSelecionado.length > 0 && (
              <div className="px-6 py-4 border-t" style={{ borderColor: 'oklch(0.25 0.005 285)', background: 'oklch(0.11 0.005 285)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4">
                    <div className="text-center px-3 py-1.5 rounded" style={{ background: 'oklch(0.18 0.005 285)' }}>
                      <div className="text-[10px] uppercase font-bold" style={{ color: 'oklch(0.50 0.010 285)' }}>Itens</div>
                      <div className="text-sm font-bold" style={{ color: 'var(--color-asx-text-heading)' }}>{totaisImport.itensComEmbarque}/{itensDoSelecionado.length}</div>
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
                      <div className="text-sm font-bold" style={{ color: 'var(--color-asx-text-heading)' }}>{formatUSD(totaisImport.totalUsdEmbarcar)}</div>
                    </div>
                    <div className="text-center px-3 py-1.5 rounded" style={{ background: 'oklch(0.18 0.005 285)' }}>
                      <div className="text-[10px] uppercase font-bold" style={{ color: 'oklch(0.50 0.010 285)' }}>% Geral</div>
                      <div className="text-lg font-bold" style={{
                        color: totaisImport.pctGeral >= 100 ? 'var(--color-asx-success)' : totaisImport.pctGeral >= 50 ? 'oklch(0.80 0.18 85)' : 'oklch(0.70 0.22 30)',
                      }}>{totaisImport.pctGeral.toFixed(0)}%</div>
                    </div>
                    {totaisImport.saldoRestante > 0 && (
                      <div className="text-center px-3 py-1.5 rounded" style={{ background: 'oklch(0.70 0.18 85 / 0.12)' }}>
                        <div className="text-[10px] uppercase font-bold" style={{ color: 'oklch(0.70 0.18 85)' }}>Saldo Pendente</div>
                        <div className="text-sm font-bold" style={{ color: 'oklch(0.80 0.18 85)' }}>{totaisImport.saldoRestante} un</div>
                      </div>
                    )}
                  </div>

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
                      disabled={totaisImport.itensComEmbarque === 0 || adicionarItemMut.isPending}
                      className="px-6 py-2.5 rounded-md text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-40"
                      style={{ background: 'var(--color-asx-red)', color: 'white' }}
                    >
                      <Check className="w-4 h-4" />
                      Confirmar Embarque ({totaisImport.itensComEmbarque} itens -- {totaisImport.pctGeral.toFixed(0)}%)
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
