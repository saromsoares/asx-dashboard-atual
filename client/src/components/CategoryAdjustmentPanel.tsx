import React, { useState, useMemo } from 'react';
import { produtos, categorias, type Produto } from '@/data/produtos';
import { X, Search, Check } from 'lucide-react';

interface CategoryAdjustmentPanelProps {
  onClose: () => void;
}

export const CategoryAdjustmentPanel: React.FC<CategoryAdjustmentPanelProps> = ({ onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState<string>('');

  // Filtrar produtos por busca
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    return produtos.filter(p => 
      p.codigo.toLowerCase().includes(term) ||
      p.descricao.toLowerCase().includes(term) ||
      p.cod_barras.includes(term)
    ).slice(0, 20); // Limitar a 20 resultados
  }, [searchTerm]);

  // Produtos por categoria
  const productsByCategory = useMemo(() => {
    if (!selectedCategory) return [];
    return produtos.filter(p => p.categoria === selectedCategory);
  }, [selectedCategory]);

  const handleChangeCategory = (productId: number, newCat: string) => {
    const idx = produtos.findIndex(p => p.id === productId);
    if (idx >= 0) {
      produtos[idx].categoria = newCat;
      // Disparar evento para atualizar UI
      window.dispatchEvent(new Event('categoriasAtualizadas'));
      setEditingProductId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" style={{
        background: 'oklch(0.10 0.005 285)',
        borderColor: 'oklch(0.20 0.010 285)',
        borderWidth: '1px',
      }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{
          borderColor: 'oklch(0.20 0.010 285)',
        }}>
          <h2 className="text-lg font-bold" style={{ color: 'oklch(0.85 0.005 65)' }}>
            Ajustar Categorias de Produtos
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'oklch(0.50 0.010 285)' }} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-hidden flex gap-4 p-4">
          {/* Coluna 1: Busca e seleção por categoria */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <div>
              <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>
                Buscar Produto
              </label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4" style={{ color: 'oklch(0.40 0.010 285)' }} />
                <input
                  type="text"
                  placeholder="Código, nome ou EAN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded text-sm"
                  style={{
                    background: 'oklch(0.15 0.005 285)',
                    color: 'oklch(0.85 0.005 65)',
                    borderColor: 'oklch(0.25 0.010 285)',
                    borderWidth: '1px',
                  }}
                />
              </div>
            </div>

            {/* Resultados da busca */}
            {searchTerm.trim() && (
              <div className="flex-1 overflow-y-auto rounded border" style={{
                borderColor: 'oklch(0.20 0.010 285)',
              }}>
                {filteredProducts.length > 0 ? (
                  <div className="divide-y" style={{ borderColor: 'oklch(0.20 0.010 285)' }}>
                    {filteredProducts.map(p => (
                      <div
                        key={p.id}
                        className="p-3 hover:bg-gray-800 cursor-pointer transition-colors"
                        onClick={() => setEditingProductId(p.id)}
                      >
                        <p className="text-xs font-semibold" style={{ color: 'oklch(0.48 0.22 25)' }}>
                          {p.codigo}
                        </p>
                        <p className="text-xs line-clamp-1 mt-0.5" style={{ color: 'oklch(0.70 0.005 65)' }}>
                          {p.descricao}
                        </p>
                        <p className="text-[10px] mt-1" style={{ color: 'oklch(0.45 0.010 285)' }}>
                          Cat: {p.categoria}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs" style={{ color: 'oklch(0.40 0.010 285)' }}>
                    Nenhum produto encontrado
                  </div>
                )}
              </div>
            )}

            {/* Seleção por categoria */}
            <div>
              <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>
                Ou Selecione uma Categoria
              </label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {categorias.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`p-2 rounded text-xs text-left transition-colors ${
                      selectedCategory === cat ? 'ring-2' : ''
                    }`}
                    style={{
                      background: selectedCategory === cat ? 'oklch(0.20 0.010 285)' : 'oklch(0.15 0.005 285)',
                      color: selectedCategory === cat ? 'oklch(0.85 0.005 65)' : 'oklch(0.70 0.005 65)',
                      outlineColor: selectedCategory === cat ? 'oklch(0.48 0.22 25)' : '',
                    } as React.CSSProperties}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna 2: Produtos da categoria selecionada */}
          {selectedCategory && (
            <div className="flex-1 flex flex-col overflow-hidden border-l" style={{
              borderColor: 'oklch(0.20 0.010 285)',
              paddingLeft: '1rem',
            }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'oklch(0.85 0.005 65)' }}>
                {productsByCategory.length} produtos em "{selectedCategory}"
              </h3>
              <div className="flex-1 overflow-y-auto rounded border" style={{
                borderColor: 'oklch(0.20 0.010 285)',
              }}>
                {productsByCategory.length > 0 ? (
                  <div className="divide-y" style={{ borderColor: 'oklch(0.20 0.010 285)' }}>
                    {productsByCategory.map(p => (
                      <div
                        key={p.id}
                        className={`p-3 hover:bg-gray-800 cursor-pointer transition-colors ${
                          editingProductId === p.id ? 'bg-gray-800' : ''
                        }`}
                        onClick={() => setEditingProductId(p.id)}
                      >
                        <p className="text-xs font-semibold" style={{ color: 'oklch(0.48 0.22 25)' }}>
                          {p.codigo}
                        </p>
                        <p className="text-xs line-clamp-1 mt-0.5" style={{ color: 'oklch(0.70 0.005 65)' }}>
                          {p.descricao}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs" style={{ color: 'oklch(0.40 0.010 285)' }}>
                    Nenhum produto nesta categoria
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Coluna 3: Editor de categoria */}
          {editingProductId && (
            <div className="w-80 flex flex-col gap-4 border-l" style={{
              borderColor: 'oklch(0.20 0.010 285)',
              paddingLeft: '1rem',
            }}>
              {(() => {
                const product = produtos.find(p => p.id === editingProductId);
                if (!product) return null;

                return (
                  <>
                    <div>
                      <h3 className="text-sm font-semibold mb-2" style={{ color: 'oklch(0.85 0.005 65)' }}>
                        Editando Produto
                      </h3>
                      <div className="space-y-1 text-xs">
                        <p>
                          <span style={{ color: 'oklch(0.45 0.010 285)' }}>Código:</span>{' '}
                          <span style={{ color: 'oklch(0.48 0.22 25)' }} className="font-semibold">
                            {product.codigo}
                          </span>
                        </p>
                        <p>
                          <span style={{ color: 'oklch(0.45 0.010 285)' }}>Descrição:</span>{' '}
                          <span style={{ color: 'oklch(0.70 0.005 65)' }} className="line-clamp-2">
                            {product.descricao}
                          </span>
                        </p>
                        <p>
                          <span style={{ color: 'oklch(0.45 0.010 285)' }}>Categoria Atual:</span>{' '}
                          <span style={{ color: 'oklch(0.70 0.005 65)' }} className="font-semibold">
                            {product.categoria}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs uppercase tracking-wider" style={{ color: 'oklch(0.45 0.010 285)' }}>
                        Nova Categoria
                      </label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full mt-2 p-2 rounded text-sm"
                        style={{
                          background: 'oklch(0.15 0.005 285)',
                          color: 'oklch(0.85 0.005 65)',
                          borderColor: 'oklch(0.25 0.010 285)',
                          borderWidth: '1px',
                        }}
                      >
                        <option value="">Selecione uma categoria...</option>
                        {categorias.map(cat => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        if (newCategory && newCategory !== product.categoria) {
                          handleChangeCategory(editingProductId, newCategory);
                          setNewCategory('');
                        }
                      }}
                      disabled={!newCategory || newCategory === product.categoria}
                      className={`w-full py-2 rounded font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
                        newCategory && newCategory !== product.categoria
                          ? 'hover:opacity-90'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                      style={{
                        background: 'oklch(0.48 0.22 25)',
                        color: 'white',
                      }}
                    >
                      <Check className="w-4 h-4" />
                      Confirmar Mudança
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
