import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Search, ArrowLeft, Save, X, Download, AlertCircle } from 'lucide-react';
import { produtos, TAXA_CAMBIO } from '@/data/produtos';
import { useIdioma } from '@/hooks/useIdioma';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ProdutoEditavel {
  id: number;
  codigo: string;
  descricao: string;
  custoUsd: number;
  precoVendaBrl: number;
  categoria: string;
}

const STORAGE_KEY = 'asx_produtos_edicoes';

export default function Desenvolvimento() {
  const [, setLocation] = useLocation();
  const { t } = useIdioma();
  const [categoriaSelected, setCategoriaSelected] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [produtosEditando, setProdutosEditando] = useState<Record<number, Partial<ProdutoEditavel>>>({});
  const [alteracoesSalvas, setAlteracoesSalvas] = useState<Record<number, boolean>>({});
  const [mostrarModalNovoProduto, setMostrarModalNovoProduto] = useState(false);
  const [novoProduto, setNovoProduto] = useState({
    categoria: '',
    nome: '',
    codigoBarras: '',
    codigoProduto: '',
    descricao: '',
    observacoes: '',
  });

  // Carregar edições do localStorage ao montar
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setProdutosEditando(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao carregar edições:', e);
      }
    }
  }, []);

  // Extrair categorias únicas
  const categorias = useMemo(() => {
    const cats = Array.from(new Set(produtos.map(p => p.categoria)));
    return cats.sort();
  }, []);

  // Filtrar produtos por categoria e busca
  const produtosFiltrados = useMemo(() => {
    let filtered = [...produtos];

    // Filtro por categoria
    if (categoriaSelected && categoriaSelected.trim() !== '') {
      filtered = filtered.filter(p => p.categoria === categoriaSelected);
    }

    // Filtro por busca
    if (busca && busca.trim() !== '') {
      const searchTerm = busca.toLowerCase();
      filtered = filtered.filter(p =>
        p.codigo.toLowerCase().includes(searchTerm) ||
        p.descricao.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }, [categoriaSelected, busca]);

  // Obter valor editável ou original
  const getValor = (produto: typeof produtos[0], campo: 'custoUsd' | 'precoVendaBrl') => {
    const editado = produtosEditando[produto.id];
    if (editado && campo === 'custoUsd') return editado.custoUsd ?? produto.custo_usd;
    if (editado && campo === 'precoVendaBrl') return editado.precoVendaBrl ?? produto.preco_venda;
    return campo === 'custoUsd' ? produto.custo_usd : produto.preco_venda;
  };

  // Atualizar valor editável
  const handleEditarValor = (produtoId: number, campo: 'custoUsd' | 'precoVendaBrl', valor: number) => {
    setProdutosEditando(prev => {
      const novo = {
        ...prev,
        [produtoId]: {
          ...prev[produtoId],
          [campo]: valor,
        },
      };
      // Salvar no localStorage imediatamente
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novo));
      return novo;
    });
    setAlteracoesSalvas(prev => ({ ...prev, [produtoId]: false }));
  };

  // Salvar alterações
  const handleSalvar = (produtoId: number) => {
    setAlteracoesSalvas(prev => ({ ...prev, [produtoId]: true }));
    // Dados já estão salvos no localStorage
    console.log(`Produto ${produtoId} salvo:`, produtosEditando[produtoId]);
    
    // Mostrar feedback visual (opcional)
    setTimeout(() => {
      setAlteracoesSalvas(prev => ({ ...prev, [produtoId]: false }));
    }, 2000);
  };

  // Cancelar edição
  const handleCancelar = (produtoId: number) => {
    setProdutosEditando(prev => {
      const novo = { ...prev };
      delete novo[produtoId];
      // Atualizar localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novo));
      return novo;
    });
    setAlteracoesSalvas(prev => ({ ...prev, [produtoId]: false }));
  };

  // Calcular custo em BRL
  const calcularCustoBrl = (custoUsd: number) => {
    return custoUsd * TAXA_CAMBIO;
  };

  // Calcular margem
  const calcularMargem = (custoUsd: number, precoVendaBrl: number) => {
    const custoBrl = calcularCustoBrl(custoUsd);
    return precoVendaBrl - custoBrl;
  };

  // Calcular markup %
  const calcularMarkup = (custoUsd: number, precoVendaBrl: number) => {
    const custoBrl = calcularCustoBrl(custoUsd);
    if (custoBrl === 0) return 0;
    return ((precoVendaBrl - custoBrl) / custoBrl) * 100;
  };

  // Obter cor de status para margem
  const getCorMargem = (markup: number) => {
    if (markup > 50) return 'oklch(0.70 0.15 140)'; // Verde
    if (markup > 20) return 'oklch(0.80 0.15 60)';  // Amarelo
    return 'oklch(0.60 0.20 25)';                   // Vermelho
  };

  // Importação de produtos
  const importarProdutos = trpc.produto.importarDoArquivo.useMutation();
  const [importStatus, setImportStatus] = useState<{ tipo: 'sucesso' | 'erro' | null; mensagem: string }>({ tipo: null, mensagem: '' });

  const handleImportarProdutos = async () => {
    try {
      const result = await importarProdutos.mutateAsync();
      setImportStatus({
        tipo: 'sucesso',
        mensagem: `✅ ${result.sucesso} produtos importados com sucesso!${result.erro > 0 ? ` (${result.erro} erros)` : ''}`,
      });
      setTimeout(() => setImportStatus({ tipo: null, mensagem: '' }), 5000);
    } catch (error) {
      setImportStatus({
        tipo: 'erro',
        mensagem: `❌ Erro ao importar produtos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      });
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-asx-dark)', color: 'var(--color-asx-text)' }}>
      {/* Botão Voltar */}
      <div className="px-6 py-3 border-b flex items-center" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
          style={{ background: 'var(--color-asx-surface)', color: 'var(--color-asx-text-heading)' }}
          title={t('voltarMenu') || 'Voltar ao menu principal'}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">{t('menu') || 'Menu'}</span>
        </button>
      </div>

      {/* Header */}
      <header className="sticky top-12 z-40 border-b px-6 py-4" style={{ background: 'var(--color-asx-base)', borderColor: 'var(--color-asx-border)' }}>
        <h1 className="font-rajdhani font-bold text-2xl" style={{ color: 'var(--color-asx-text-heading)' }}>
          🚀 {t('desenvolvimento') || 'Desenvolvimento de Produtos'}
        </h1>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Seletor de Categoria e Busca */}
          <div className="mb-6 p-4 rounded-lg border flex gap-4 items-end flex-wrap" style={{ background: 'var(--color-asx-surface)', borderColor: 'var(--color-asx-border)' }}>
            <div className="flex-1 min-w-48">
              <label className="text-sm font-semibold" style={{ color: 'var(--color-asx-text-secondary)' }}>
                {t('categoria') || 'Categoria'}
              </label>
              <select
                value={categoriaSelected}
                onChange={e => {
                  console.log('Select changed to:', e.target.value);
                  setCategoriaSelected(e.target.value);
                }}
                className="w-full px-3 py-2 rounded-md border text-sm mt-1"
                style={{
                  background: 'var(--color-asx-base)',
                  borderColor: 'var(--color-asx-border)',
                  color: 'var(--color-asx-text)',
                }}
              >
                <option value="">{t('selecionarCategoria') || 'Selecione uma categoria...'}</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleImportarProdutos}
              disabled={importarProdutos.isPending}
              className="px-4 py-2 rounded-md border transition-colors flex items-center gap-2"
              style={{
                background: importarProdutos.isPending ? 'oklch(0.40 0.010 285)' : 'var(--color-asx-red)',
                borderColor: 'var(--color-asx-red)',
                color: 'white',
              }}
              title="Importar todos os produtos do arquivo local para o banco de dados"
            >
              <Download className="w-4 h-4" />
              {importarProdutos.isPending ? 'Importando...' : 'Importar Produtos'}
            </button>

            <div className="flex-1 min-w-48">
              <label className="text-sm font-semibold md:block hidden" style={{ color: 'var(--color-asx-text-secondary)' }}>
                {t('buscar') || 'Buscar'}
              </label>
              <div className="relative md:mt-1 mt-0">
                <Search className="absolute left-3 md:top-2.5 top-3 w-4 h-4" style={{ color: 'oklch(0.50 0.010 285)' }} />
                <input
                  type="text"
                  placeholder={t('codigo_ou_descricao') || 'Código ou descrição...'}
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 md:py-2 py-3 rounded-md border text-sm md:h-auto h-11"
                  style={{
                    background: 'var(--color-asx-base)',
                    borderColor: 'var(--color-asx-border)',
                    color: 'var(--color-asx-text)',
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between" style={{ color: 'var(--color-asx-text-muted)' }}>
              <div className="text-xs">
                {produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'produto' : 'produtos'}
              </div>
              <button
                onClick={() => setMostrarModalNovoProduto(true)}
                className="px-4 py-2 md:py-2 py-3 rounded-md font-semibold text-sm transition-colors flex-shrink-0 md:h-auto h-11 md:w-auto w-full"
                style={{ background: "var(--color-asx-red)", color: "white" }}
              >
                + Novo Produto
              </button>
            </div>
          </div>

          {/* Tabela de Produtos */}
          {produtosFiltrados.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'oklch(0.50 0.010 285)' }}>
              <p>{t('nenhumProduto') || 'Nenhum produto encontrado'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'var(--color-asx-border)' }}>
              <table className="w-full text-sm">
                <thead style={{ background: 'var(--color-asx-dark)' }}>
                  <tr style={{ borderBottom: '2px solid var(--color-asx-border)' }}>
                    <th className="px-4 py-3 text-left font-bold" style={{ color: 'var(--color-asx-text-heading)' }}>COD</th>
                    <th className="px-4 py-3 text-left font-bold" style={{ color: 'var(--color-asx-text-heading)' }}>{t('descricao') || 'DESCRIÇÃO'}</th>
                    <th className="px-4 py-3 text-center font-bold" style={{ color: 'var(--color-asx-text-heading)' }}>CUSTO USD</th>
                    <th className="px-4 py-3 text-center font-bold" style={{ color: 'var(--color-asx-text-heading)' }}>CUSTO BRL</th>
                    <th className="px-4 py-3 text-center font-bold" style={{ color: 'var(--color-asx-text-heading)' }}>PREÇO VENDA BRL</th>
                    <th className="px-4 py-3 text-center font-bold" style={{ color: 'var(--color-asx-text-heading)' }}>MARGEM BRL</th>
                    <th className="px-4 py-3 text-center font-bold" style={{ color: 'var(--color-asx-text-heading)' }}>MARKUP %</th>
                    <th className="px-4 py-3 text-center font-bold" style={{ color: 'var(--color-asx-text-heading)' }}>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {produtosFiltrados.map((produto, idx) => {
                    const custoUsd = getValor(produto, 'custoUsd');
                    const precoVendaBrl = getValor(produto, 'precoVendaBrl');
                    const custoBrl = calcularCustoBrl(custoUsd);
                    const margem = calcularMargem(custoUsd, precoVendaBrl);
                    const markup = calcularMarkup(custoUsd, precoVendaBrl);
                    const editando = produtosEditando[produto.id];
                    const salvo = alteracoesSalvas[produto.id];

                    return (
                      <tr
                        key={produto.id}
                        style={{
                          borderBottom: '1px solid var(--color-asx-surface-2)',
                          background: idx % 2 === 0 ? 'var(--color-asx-dark)' : 'var(--color-asx-base)',
                        }}
                      >
                        <td className="px-4 py-3" style={{ color: 'var(--color-asx-text-heading)' }}>{produto.codigo}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'oklch(0.75 0.005 65)' }}>{produto.descricao}</td>
                        <td className="px-4 py-3 text-center">
                          {editando ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editando.custoUsd ?? custoUsd}
                              onChange={e => handleEditarValor(produto.id, 'custoUsd', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 rounded text-center text-sm"
                              style={{
                                background: 'oklch(0.18 0.005 285)',
                                borderColor: 'var(--color-asx-border)',
                                color: 'var(--color-asx-text)',
                              }}
                            />
                          ) : (
                            <span style={{ color: 'var(--color-asx-text-heading)' }}>${custoUsd.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center" style={{ color: 'oklch(0.75 0.005 65)' }}>
                          R$ {custoBrl.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editando ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editando.precoVendaBrl ?? precoVendaBrl}
                              onChange={e => handleEditarValor(produto.id, 'precoVendaBrl', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 rounded text-center text-sm"
                              style={{
                                background: 'oklch(0.18 0.005 285)',
                                borderColor: 'var(--color-asx-border)',
                                color: 'var(--color-asx-text)',
                              }}
                            />
                          ) : (
                            <span style={{ color: 'var(--color-asx-text-heading)' }}>R$ {precoVendaBrl.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center" style={{ color: getCorMargem(markup) }}>
                          R$ {margem.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center font-bold" style={{ color: getCorMargem(markup) }}>
                          {markup.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-center">
                          {editando ? (
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => handleSalvar(produto.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
                                style={{ background: 'oklch(0.60 0.20 140)', color: 'oklch(0.98 0.001 285)' }}
                              >
                                <Save className="w-3 h-3" />
                                {salvo ? 'Salvo!' : 'Salvar'}
                              </button>
                              <button
                                onClick={() => handleCancelar(produto.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
                                style={{ background: 'oklch(0.40 0.10 285)', color: 'oklch(0.98 0.001 285)' }}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setProdutosEditando(prev => ({
                                ...prev,
                                [produto.id]: {
                                  custoUsd: custoUsd,
                                  precoVendaBrl: precoVendaBrl,
                                },
                              }))}
                              className="px-3 py-1 rounded text-xs font-medium transition-colors"
                              style={{ background: 'var(--color-asx-red)', color: 'oklch(0.98 0.001 285)' }}
                            >
                              Editar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Novo Produto */}
      {mostrarModalNovoProduto && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-black rounded-lg border max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ borderColor: 'var(--color-asx-border)' }}>
            <div className="sticky top-0 px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-asx-border)', background: 'var(--color-asx-base)' }}>
              <h2 className="text-xl font-rajdhani font-bold" style={{ color: 'var(--color-asx-text-heading)' }}>Novo Produto</h2>
              <button onClick={() => setMostrarModalNovoProduto(false)} className="p-1 rounded hover:bg-white/10">
                <X className="w-5 h-5" style={{ color: 'oklch(0.65 0.010 285)' }} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold" style={{ color: 'var(--color-asx-text-secondary)' }}>Categoria *</label>
                <select
                  value={novoProduto.categoria}
                  onChange={e => setNovoProduto({...novoProduto, categoria: e.target.value})}
                  className="w-full px-3 py-2 rounded-md border text-sm mt-1"
                  style={{ background: 'var(--color-asx-surface)', borderColor: 'var(--color-asx-border)', color: 'var(--color-asx-text)' }}
                >
                  <option value="">Selecione uma categoria...</option>
                  {categorias.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold" style={{ color: 'var(--color-asx-text-secondary)' }}>Nome do Produto *</label>
                <input
                  type="text"
                  value={novoProduto.nome}
                  onChange={e => setNovoProduto({...novoProduto, nome: e.target.value})}
                  className="w-full px-3 py-2 rounded-md border text-sm mt-1"
                  style={{ background: 'var(--color-asx-surface)', borderColor: 'var(--color-asx-border)', color: 'var(--color-asx-text)' }}
                  placeholder="Nome do produto"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold" style={{ color: 'var(--color-asx-text-secondary)' }}>Código do Produto *</label>
                  <input
                    type="text"
                    value={novoProduto.codigoProduto}
                    onChange={e => setNovoProduto({...novoProduto, codigoProduto: e.target.value})}
                    className="w-full px-3 py-2 rounded-md border text-sm mt-1"
                    style={{ background: 'var(--color-asx-surface)', borderColor: 'var(--color-asx-border)', color: 'var(--color-asx-text)' }}
                    placeholder="Ex: ASX1001"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold" style={{ color: 'var(--color-asx-text-secondary)' }}>Código de Barras *</label>
                  <input
                    type="text"
                    value={novoProduto.codigoBarras}
                    onChange={e => setNovoProduto({...novoProduto, codigoBarras: e.target.value})}
                    className="w-full px-3 py-2 rounded-md border text-sm mt-1"
                    style={{ background: 'var(--color-asx-surface)', borderColor: 'var(--color-asx-border)', color: 'var(--color-asx-text)' }}
                    placeholder="EAN/UPC"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold" style={{ color: 'var(--color-asx-text-secondary)' }}>Descrição do Produto</label>
                <textarea
                  value={novoProduto.descricao}
                  onChange={e => setNovoProduto({...novoProduto, descricao: e.target.value})}
                  className="w-full px-3 py-2 rounded-md border text-sm mt-1 resize-none"
                  style={{ background: 'var(--color-asx-surface)', borderColor: 'var(--color-asx-border)', color: 'var(--color-asx-text)' }}
                  placeholder="Descrição detalhada do produto"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-semibold" style={{ color: 'var(--color-asx-text-secondary)' }}>Observações</label>
                <textarea
                  value={novoProduto.observacoes}
                  onChange={e => setNovoProduto({...novoProduto, observacoes: e.target.value})}
                  className="w-full px-3 py-2 rounded-md border text-sm mt-1 resize-none"
                  style={{ background: 'var(--color-asx-surface)', borderColor: 'var(--color-asx-border)', color: 'var(--color-asx-text)' }}
                  placeholder="Observações adicionais"
                  rows={2}
                />
              </div>
              <div>
                <label className="text-sm font-semibold" style={{ color: 'var(--color-asx-text-secondary)' }}>Foto do Produto</label>
                <div className="mt-2 p-4 rounded-md border-2 border-dashed text-center cursor-pointer transition-colors hover:bg-white/5" style={{ borderColor: 'var(--color-asx-border)' }}>
                  <input type="file" accept="image/*" className="hidden" id="foto-input" />
                  <label htmlFor="foto-input" className="cursor-pointer">
                    <p style={{ color: 'var(--color-asx-text-secondary)' }}>Clique para adicionar foto</p>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setMostrarModalNovoProduto(false)}
                  className="flex-1 px-4 py-2 rounded-md font-semibold transition-colors"
                  style={{ background: 'oklch(0.18 0.005 285)', color: 'var(--color-asx-text-secondary)' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (novoProduto.categoria && novoProduto.nome && novoProduto.codigoProduto && novoProduto.codigoBarras) {
                      alert('Produto criado com sucesso!\n' + JSON.stringify(novoProduto));
                      setMostrarModalNovoProduto(false);
                      setNovoProduto({ categoria: '', nome: '', codigoBarras: '', codigoProduto: '', descricao: '', observacoes: '' });
                    } else {
                      alert('Preencha todos os campos obrigatórios');
                    }
                  }}
                  className="flex-1 px-4 py-2 rounded-md font-semibold transition-colors flex items-center justify-center gap-2"
                  style={{ background: 'var(--color-asx-red)', color: 'white' }}
                >
                  <Save className="w-4 h-4" />
                  Criar Produto
                </button>
              </div>
            </div>

            {importStatus.tipo && (
              <div className="w-full p-3 rounded-md flex items-center gap-2" style={{
                background: importStatus.tipo === 'sucesso' ? 'oklch(0.30 0.15 140)' : 'oklch(0.30 0.20 25)',
                color: importStatus.tipo === 'sucesso' ? 'oklch(0.85 0.15 140)' : 'oklch(0.85 0.20 25)',
              }}>
                <AlertCircle className="w-4 h-4" />
                {importStatus.mensagem}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
