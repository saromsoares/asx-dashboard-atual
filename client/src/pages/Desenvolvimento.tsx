import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Search, Plus, Trash2, Edit2, ArrowLeft } from 'lucide-react';
import { produtos } from '@/data/produtos';
import { useIdioma } from '@/hooks/useIdioma';

interface ProdutoDesenvolvimento {
  id: string;
  nome: string;
  codigo: string;
  codigoBarras: string;
  imagemUrl: string | null;
  precoDolar: number;
  moq: number;
}

export default function Desenvolvimento() {
  const [, setLocation] = useLocation();
  const { idioma, t } = useIdioma();
  const [busca, setBusca] = useState('');
  const [produtosDesenvolvimento, setProdutosDesenvolvimento] = useState<ProdutoDesenvolvimento[]>(() => {
    const saved = localStorage.getItem('asx_produtos_desenvolvimento');
    return saved ? JSON.parse(saved) : [];
  });
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ProdutoDesenvolvimento>>({
    nome: '',
    codigo: '',
    codigoBarras: '',
    imagemUrl: null,
    precoDolar: 0,
    moq: 1,
  });

  // Salvar no localStorage
  const salvarProdutos = (novos: ProdutoDesenvolvimento[]) => {
    setProdutosDesenvolvimento(novos);
    localStorage.setItem('asx_produtos_desenvolvimento', JSON.stringify(novos));
  };

  // Filtrar produtos
  const produtosFiltrados = useMemo(() => {
    return produtosDesenvolvimento.filter(p =>
      p.codigo.toLowerCase().includes(busca.toLowerCase()) ||
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.codigoBarras.toLowerCase().includes(busca.toLowerCase())
    );
  }, [produtosDesenvolvimento, busca]);

  // Adicionar novo produto
  const handleAdicionar = () => {
    if (!formData.nome || !formData.codigo) {
      alert('Nome e Código são obrigatórios');
      return;
    }

    if (editandoId) {
      // Editar existente
      const novos = produtosDesenvolvimento.map(p =>
        p.id === editandoId ? { ...p, ...formData } as ProdutoDesenvolvimento : p
      );
      salvarProdutos(novos);
      setEditandoId(null);
    } else {
      // Adicionar novo
      const novo: ProdutoDesenvolvimento = {
        id: Date.now().toString(),
        nome: formData.nome || '',
        codigo: formData.codigo || '',
        codigoBarras: formData.codigoBarras || '',
        imagemUrl: formData.imagemUrl || null,
        precoDolar: formData.precoDolar || 0,
        moq: formData.moq || 1,
      };
      salvarProdutos([...produtosDesenvolvimento, novo]);
    }

    setFormData({
      nome: '',
      codigo: '',
      codigoBarras: '',
      imagemUrl: null,
      precoDolar: 0,
      moq: 1,
    });
  };

  // Deletar produto
  const handleDeletar = (id: string) => {
    if (confirm('Tem certeza que deseja deletar este produto?')) {
      salvarProdutos(produtosDesenvolvimento.filter(p => p.id !== id));
    }
  };

  // Editar produto
  const handleEditar = (produto: ProdutoDesenvolvimento) => {
    setFormData(produto);
    setEditandoId(produto.id);
  };

  // Cancelar edição
  const handleCancelar = () => {
    setFormData({
      nome: '',
      codigo: '',
      codigoBarras: '',
      imagemUrl: null,
      precoDolar: 0,
      moq: 1,
    });
    setEditandoId(null);
  };

  // Buscar produto existente
  const handleBuscarProdutoExistente = (codigo: string) => {
    const prod = produtos.find(p => p.codigo === codigo);
    if (prod) {
      setFormData({
        nome: prod.descricao,
        codigo: prod.codigo,
        codigoBarras: prod.cod_barras,
        imagemUrl: prod.imagem_url,
        precoDolar: formData.precoDolar || 0,
        moq: formData.moq || 1,
      });
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: 'oklch(0.12 0.005 285)', color: 'oklch(0.95 0.005 65)' }}>
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
      <header className="sticky top-12 z-40 border-b px-6 py-4" style={{ background: 'oklch(0.14 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
        <h1 className="font-rajdhani font-bold text-2xl" style={{ color: 'oklch(0.80 0.005 65)' }}>
          🚀 Desenvolvimento de Produtos
        </h1>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {/* Formulário */}
          <div className="mb-8 p-6 rounded-lg border" style={{ background: 'oklch(0.16 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'oklch(0.80 0.005 65)' }}>
              {editandoId ? '✏️ Editar Produto' : '➕ Novo Produto'}
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Código */}
              <div>
                <label className="text-sm" style={{ color: 'oklch(0.70 0.010 285)' }}>
                  Código *
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Ex: ASX1301"
                    value={formData.codigo || ''}
                    onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                    className="flex-1 px-3 py-2 rounded-md border text-sm"
                    style={{
                      background: 'oklch(0.14 0.005 285)',
                      borderColor: 'oklch(0.26 0.005 285)',
                      color: 'oklch(0.90 0.005 65)',
                    }}
                  />
                  <button
                    onClick={() => handleBuscarProdutoExistente(formData.codigo || '')}
                    className="px-3 py-2 rounded-md text-sm transition-colors"
                    style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
                  >
                    Buscar
                  </button>
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="text-sm" style={{ color: 'oklch(0.70 0.010 285)' }}>
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  placeholder="Ex: ULTRA LED CSP H1"
                  value={formData.nome || ''}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border text-sm mt-1"
                  style={{
                    background: 'oklch(0.14 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
              </div>

              {/* Código de Barras */}
              <div>
                <label className="text-sm" style={{ color: 'oklch(0.70 0.010 285)' }}>
                  Código de Barras
                </label>
                <input
                  type="text"
                  placeholder="Ex: 7898765432109"
                  value={formData.codigoBarras || ''}
                  onChange={e => setFormData({ ...formData, codigoBarras: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border text-sm mt-1"
                  style={{
                    background: 'oklch(0.14 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
              </div>

              {/* Preço em Dólar */}
              <div>
                <label className="text-sm" style={{ color: 'oklch(0.70 0.010 285)' }}>
                  Preço em Dólar (USD)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 25.50"
                  value={formData.precoDolar || ''}
                  onChange={e => setFormData({ ...formData, precoDolar: parseFloat(e.target.value) || 0 })}
                  step="0.01"
                  className="w-full px-3 py-2 rounded-md border text-sm mt-1"
                  style={{
                    background: 'oklch(0.14 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
              </div>

              {/* MOQ */}
              <div>
                <label className="text-sm" style={{ color: 'oklch(0.70 0.010 285)' }}>
                  MOQ (Quantidade Mínima)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 100"
                  value={formData.moq || ''}
                  onChange={e => setFormData({ ...formData, moq: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full px-3 py-2 rounded-md border text-sm mt-1"
                  style={{
                    background: 'oklch(0.14 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
              </div>

              {/* URL da Imagem */}
              <div className="col-span-2">
                <label className="text-sm" style={{ color: 'oklch(0.70 0.010 285)' }}>
                  URL da Imagem
                </label>
                <input
                  type="text"
                  placeholder="Ex: https://..."
                  value={formData.imagemUrl || ''}
                  onChange={e => setFormData({ ...formData, imagemUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border text-sm mt-1"
                  style={{
                    background: 'oklch(0.14 0.005 285)',
                    borderColor: 'oklch(0.26 0.005 285)',
                    color: 'oklch(0.90 0.005 65)',
                  }}
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={handleAdicionar}
                className="px-6 py-2 rounded-md font-medium transition-colors flex items-center gap-2"
                style={{ background: 'oklch(0.48 0.22 25)', color: 'white' }}
              >
                <Plus className="w-4 h-4" />
                {editandoId ? 'Atualizar' : 'Adicionar'}
              </button>
              {editandoId && (
                <button
                  onClick={handleCancelar}
                  className="px-6 py-2 rounded-md font-medium transition-colors"
                  style={{ background: 'oklch(0.24 0.006 286)', color: 'oklch(0.70 0.010 285)' }}
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>

          {/* Busca */}
          <div className="mb-6 flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4" style={{ color: 'oklch(0.50 0.010 285)' }} />
              <input
                type="text"
                placeholder="Buscar por código, nome ou código de barras..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-md border"
                style={{
                  background: 'oklch(0.16 0.005 285)',
                  borderColor: 'oklch(0.26 0.005 285)',
                  color: 'oklch(0.90 0.005 65)',
                }}
              />
            </div>
          </div>

          {/* Tabela de Produtos */}
          <div className="rounded-lg border overflow-hidden" style={{ background: 'oklch(0.16 0.005 285)', borderColor: 'oklch(0.26 0.005 285)' }}>
            {produtosFiltrados.length === 0 ? (
              <div className="p-8 text-center" style={{ color: 'oklch(0.50 0.010 285)' }}>
                <p>Nenhum produto de desenvolvimento cadastrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead style={{ background: 'oklch(0.14 0.005 285)', borderBottom: '1px solid oklch(0.26 0.005 285)' }}>
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Foto</th>
                      <th className="px-4 py-3 text-left font-semibold">Código</th>
                      <th className="px-4 py-3 text-left font-semibold">Nome</th>
                      <th className="px-4 py-3 text-left font-semibold">Código Barras</th>
                      <th className="px-4 py-3 text-right font-semibold">Preço USD</th>
                      <th className="px-4 py-3 text-right font-semibold">MOQ</th>
                      <th className="px-4 py-3 text-center font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtosFiltrados.map((produto, idx) => (
                      <tr
                        key={produto.id}
                        style={{
                          background: idx % 2 === 0 ? 'oklch(0.14 0.005 285)' : 'oklch(0.16 0.005 285)',
                          borderBottom: '1px solid oklch(0.26 0.005 285)',
                        }}
                      >
                        <td className="px-4 py-3">
                          {produto.imagemUrl ? (
                            <img
                              src={produto.imagemUrl}
                              alt={produto.nome}
                              className="w-10 h-10 rounded object-cover"
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded flex items-center justify-center text-xs"
                              style={{ background: 'oklch(0.24 0.006 286)' }}
                            >
                              -
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold" style={{ color: 'oklch(0.80 0.005 65)' }}>
                          {produto.codigo}
                        </td>
                        <td className="px-4 py-3">{produto.nome}</td>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: 'oklch(0.60 0.010 285)' }}>
                          {produto.codigoBarras || '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold" style={{ color: 'oklch(0.48 0.22 25)' }}>
                          ${produto.precoDolar.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          {produto.moq}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleEditar(produto)}
                              className="p-2 rounded transition-colors"
                              style={{ background: 'oklch(0.24 0.006 286)', color: 'oklch(0.70 0.010 285)' }}
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletar(produto.id)}
                              className="p-2 rounded transition-colors"
                              style={{ background: 'oklch(0.24 0.006 286)', color: 'oklch(0.70 0.010 285)' }}
                              title="Deletar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
