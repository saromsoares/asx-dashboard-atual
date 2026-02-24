import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Search, ArrowLeft, Save, X } from 'lucide-react';
import { produtos, TAXA_CAMBIO } from '@/data/produtos';
import { useIdioma } from '@/hooks/useIdioma';

interface ProdutoEditavel {
  id: number;
  codigo: string;
  descricao: string;
  custoUsd: number;
  precoVendaBrl: number;
  categoria: string;
}

export default function Desenvolvimento() {
  const [, setLocation] = useLocation();
  const { t } = useIdioma();
  const [categoriaSelected, setCategoriaSelected] = useState<string>('');
  const [busca, setBusca] = useState('');
  const [produtosEditando, setProdutosEditando] = useState<Record<number, Partial<ProdutoEditavel>>>({});
  const [alteracoesSalvas, setAlteracoesSalvas] = useState<Record<number, boolean>>({});

  // Extrair categorias únicas
  const categorias = useMemo(() => {
    const cats = Array.from(new Set(produtos.map(p => p.categoria)));
    return cats.sort();
  }, []);

  // Filtrar produtos por categoria e busca
  const produtosFiltrados = useMemo(() => {
    let filtered = produtos;

    if (categoriaSelected) {
      filtered = filtered.filter(p => p.categoria === categoriaSelected);
    }

    if (busca.trim()) {
      filtered = filtered.filter(p =>
        p.codigo.toLowerCase().includes(busca.toLowerCase()) ||
        p.descricao.toLowerCase().includes(busca.toLowerCase())
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
    setProdutosEditando(prev => ({
      ...prev,
      [produtoId]: {
        ...prev[produtoId],
        [campo]: valor,
      },
    }));
    setAlteracoesSalvas(prev => ({ ...prev, [produtoId]: false }));
  };

  // Salvar alterações (simular salvamento)
  const handleSalvar = (produtoId: number) => {
    setAlteracoesSalvas(prev => ({ ...prev, [produtoId]: true }));
    // Aqui você poderia enviar para um backend
    console.log(`Produto ${produtoId} salvo:`, produtosEditando[produtoId]);
  };

  // Cancelar edição
  const handleCancelar = (produtoId: number) => {
    setProdutosEditando(prev => {
      const novo = { ...prev };
      delete novo[produtoId];
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

  return (
    <div className="h-full flex flex-col" style={{ background: 'oklch(0.12 0.005 285)', color: 'oklch(0.95 0.005 65)' }}>
      {/* Botão Voltar */}
      <div className="px-6 py-3 border-b flex items-center" style={{ borderColor: 'oklch(0.22 0.005 285)' }}>
        <button
          onClick={() => setLocation('/')}
          className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors"
          style={{ background: 'oklch(0.16 0.005 285)', color: 'oklch(0.80 0.005 65)' }}
          title={t('voltarMenu') || 'Voltar ao menu principal'}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">{t('menu') || 'Menu'}</span>
        </button>
      </div>

      {/* Header */}
      <header className="sticky top-12 z-40 border-b px-6 py-4" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
        <h1 className="font-rajdhani font-bold text-2xl" style={{ color: 'oklch(0.80 0.005 65)' }}>
          🚀 {t('desenvolvimento') || 'Desenvolvimento de Produtos'}
        </h1>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Seletor de Categoria e Busca */}
          <div className="mb-6 p-4 rounded-lg border flex gap-4 items-end flex-wrap" style={{ background: 'oklch(0.16 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
            <div className="flex-1 min-w-48">
              <label className="text-sm font-semibold" style={{ color: 'oklch(0.70 0.010 285)' }}>
                {t('categoria') || 'Categoria'}
              </label>
              <select
                value={categoriaSelected}
                onChange={e => setCategoriaSelected(e.target.value)}
                className="w-full px-3 py-2 rounded-md border text-sm mt-1"
                style={{
                  background: 'oklch(0.14 0.005 285)',
                  borderColor: 'oklch(0.26 0.005 285)',
                  color: 'oklch(0.90 0.005 65)',
                }}
              >
                <option value="">{t('selecionarCategoria') || 'Selecionar categoria...'}</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-48">
              <label className="text-sm font-semibold" style={{ color: 'oklch(0.70 0.010 285)' }}>
                {t('buscar') || 'Buscar'}
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'oklch(0.50 0.010 285)' }} />
                <input
                  type="text"
                  placeholder={t('codigo_ou_descricao') || 'Código ou descrição...'}
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-md border text-sm"
                  style={{
                    background: 'oklch(0.14 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Tabela de Produtos */}
          {produtosFiltrados.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'oklch(0.50 0.010 285)' }}>
              <p>{t('nenhumProduto') || 'Nenhum produto encontrado'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: 'oklch(0.26 0.005 285)' }}>
              <table className="w-full text-sm">
                <thead style={{ background: 'oklch(0.12 0.005 285)' }}>
                  <tr style={{ borderBottom: '2px solid oklch(0.26 0.005 285)' }}>
                    <th className="px-4 py-3 text-left font-bold" style={{ color: 'oklch(0.80 0.005 65)' }}>COD</th>
                    <th className="px-4 py-3 text-left font-bold" style={{ color: 'oklch(0.80 0.005 65)' }}>{t('descricao') || 'DESCRIÇÃO'}</th>
                    <th className="px-4 py-3 text-center font-bold" style={{ color: 'oklch(0.80 0.005 65)' }}>CUSTO USD</th>
                    <th className="px-4 py-3 text-center font-bold" style={{ color: 'oklch(0.80 0.005 65)' }}>CUSTO BRL</th>
                    <th className="px-4 py-3 text-center font-bold" style={{ color: 'oklch(0.80 0.005 65)' }}>PREÇO VENDA BRL</th>
                    <th className="px-4 py-3 text-center font-bold" style={{ color: 'oklch(0.80 0.005 65)' }}>MARGEM BRL</th>
                    <th className="px-4 py-3 text-center font-bold" style={{ color: 'oklch(0.80 0.005 65)' }}>MARKUP %</th>
                    <th className="px-4 py-3 text-center font-bold" style={{ color: 'oklch(0.80 0.005 65)' }}>AÇÕES</th>
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
                          background: idx % 2 === 0 ? 'oklch(0.14 0.005 285)' : 'oklch(0.16 0.005 285)',
                          borderBottom: '1px solid oklch(0.22 0.005 285)',
                        }}
                      >
                        <td className="px-4 py-3 font-mono" style={{ color: 'oklch(0.85 0.005 65)' }}>{produto.codigo}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: 'oklch(0.80 0.005 65)' }}>{produto.descricao}</td>

                        {/* CUSTO USD */}
                        <td className="px-4 py-3 text-center">
                          {editando ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editando.custoUsd ?? custoUsd}
                              onChange={e => handleEditarValor(produto.id, 'custoUsd', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1 rounded text-center text-sm"
                              style={{
                                background: 'oklch(0.12 0.005 285)',
                                borderColor: 'oklch(0.26 0.005 285)',
                                color: 'oklch(0.90 0.005 65)',
                                border: '1px solid oklch(0.26 0.005 285)',
                              }}
                            />
                          ) : (
                            <span style={{ color: 'oklch(0.80 0.005 65)' }}>${custoUsd.toFixed(2)}</span>
                          )}
                        </td>

                        {/* CUSTO BRL */}
                        <td className="px-4 py-3 text-center" style={{ color: 'oklch(0.75 0.010 285)' }}>
                          R$ {custoBrl.toFixed(2)}
                        </td>

                        {/* PREÇO VENDA BRL */}
                        <td className="px-4 py-3 text-center">
                          {editando ? (
                            <input
                              type="number"
                              step="0.01"
                              value={editando.precoVendaBrl ?? precoVendaBrl}
                              onChange={e => handleEditarValor(produto.id, 'precoVendaBrl', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 rounded text-center text-sm"
                              style={{
                                background: 'oklch(0.12 0.005 285)',
                                borderColor: 'oklch(0.26 0.005 285)',
                                color: 'oklch(0.90 0.005 65)',
                                border: '1px solid oklch(0.26 0.005 285)',
                              }}
                            />
                          ) : (
                            <span style={{ color: 'oklch(0.85 0.005 65)' }}>R$ {precoVendaBrl.toFixed(2)}</span>
                          )}
                        </td>

                        {/* MARGEM */}
                        <td className="px-4 py-3 text-center" style={{ color: margem > 0 ? 'oklch(0.72 0.17 145)' : 'oklch(0.70 0.22 30)' }}>
                          R$ {margem.toFixed(2)}
                        </td>

                        {/* MARKUP % */}
                        <td className="px-4 py-3 text-center" style={{ color: markup > 50 ? 'oklch(0.72 0.17 145)' : markup > 20 ? 'oklch(0.80 0.18 85)' : 'oklch(0.70 0.22 30)' }}>
                          {markup.toFixed(1)}%
                        </td>

                        {/* AÇÕES */}
                        <td className="px-4 py-3 text-center flex gap-2 justify-center">
                          {editando ? (
                            <>
                              <button
                                onClick={() => handleSalvar(produto.id)}
                                className="p-1.5 rounded transition-colors"
                                style={{ background: 'oklch(0.60 0.17 145)', color: 'white' }}
                                title="Salvar"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCancelar(produto.id)}
                                className="p-1.5 rounded transition-colors"
                                style={{ background: 'oklch(0.70 0.22 30)', color: 'white' }}
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setProdutosEditando(prev => ({ ...prev, [produto.id]: {} }))}
                              className="px-3 py-1 rounded text-sm transition-colors"
                              style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
                            >
                              {t('editar') || 'Editar'}
                            </button>
                          )}
                          {salvo && (
                            <span className="text-xs" style={{ color: 'oklch(0.72 0.17 145)' }}>✓ Salvo</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Resumo */}
          {produtosFiltrados.length > 0 && (
            <div className="mt-6 p-4 rounded-lg border" style={{ background: 'oklch(0.16 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
              <p className="text-sm" style={{ color: 'oklch(0.70 0.010 285)' }}>
                {t('totalProdutos') || 'Total de produtos'}: <strong style={{ color: 'oklch(0.85 0.005 65)' }}>{produtosFiltrados.length}</strong>
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
