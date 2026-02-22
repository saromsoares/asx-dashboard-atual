import { useState, useEffect } from 'react';

export type Idioma = 'pt' | 'en';

const translations = {
  pt: {
    dashboard: 'Dashboard de Produtos',
    compras: 'Gerenciador de Compras',
    configuracoes: 'Configurações',
    taxaCambio: 'Taxa de Câmbio (USD → R$)',
    idioma: 'Idioma',
    portugues: 'Português',
    ingles: 'Inglês',
    brasil: 'Brasil',
    china: 'China',
    salvar: 'Salvar',
    cancelar: 'Cancelar',
    buscar: 'Buscar código, nome, cód. barras...',
    nenhunsProdutos: 'Nenhum produto encontrado',
    categorias: 'Categorias',
    todas: 'Todas',
    precoVenda: 'Preço Venda',
    custoUSD: 'Custo USD',
    custoReal: 'Custo R$',
    lucro: 'Lucro',
    margem: 'Margem',
    produtos: 'Produtos',
    comCusto: 'Com Custo',
    totalVenda: 'Total Venda',
    totalLucro: 'Total Lucro',
    margemMedia: 'Margem Média',
    inserir: 'Inserir',
    gerenciadorPedidos: 'GERENCIADOR DE PEDIDOS DE COMPRA',
    gerarNovoPedido: 'GERAR NOVO PEDIDO',
    nomePedido: 'Nome do pedido...',
    nenhunsPedido: 'Nenhum pedido criado',
    selecioneCrie: 'Selecione ou crie um pedido',
    buscarProduto: 'Código ou nome...',
    nenhunItem: 'Nenhum item adicionado',
    pendente: 'Pendente',
    confirmado: 'Confirmado',
    qtdSarom: 'Qtd Sarom',
    qtdAlexandre: 'Qtd Alexandre',
    valorSarom: 'Valor Sarom',
    valorAlexandre: 'Valor Alexandre',
    qtdTotal: 'Qtd Total',
    valorTotal: 'Valor Total',
    adicionar: 'Adicionar',
    deletar: 'Deletar',
    exportarPDF: 'Exportar PDF',
    exportarExcel: 'Exportar Excel',
  },
  en: {
    dashboard: 'Product Dashboard',
    compras: 'Purchase Manager',
    configuracoes: 'Settings',
    taxaCambio: 'Exchange Rate (USD → BRL)',
    idioma: 'Language',
    portugues: 'Portuguese',
    ingles: 'English',
    brasil: 'Brazil',
    china: 'China',
    salvar: 'Save',
    cancelar: 'Cancel',
    buscar: 'Search code, name, barcode...',
    nenhunsProdutos: 'No products found',
    categorias: 'Categories',
    todas: 'All',
    precoVenda: 'Sale Price',
    custoUSD: 'Cost USD',
    custoReal: 'Cost BRL',
    lucro: 'Profit',
    margem: 'Margin',
    produtos: 'Products',
    comCusto: 'With Cost',
    totalVenda: 'Total Sales',
    totalLucro: 'Total Profit',
    margemMedia: 'Average Margin',
    inserir: 'Insert',
    gerenciadorPedidos: 'PURCHASE ORDER MANAGER',
    gerarNovoPedido: 'CREATE NEW ORDER',
    nomePedido: 'Order name...',
    nenhunsPedido: 'No orders created',
    selecioneCrie: 'Select or create an order',
    buscarProduto: 'Code or name...',
    nenhunItem: 'No items added',
    pendente: 'Pending',
    confirmado: 'Confirmed',
    qtdSarom: 'Qty Sarom',
    qtdAlexandre: 'Qty Alexandre',
    valorSarom: 'Value Sarom',
    valorAlexandre: 'Value Alexandre',
    qtdTotal: 'Total Qty',
    valorTotal: 'Total Value',
    adicionar: 'Add',
    deletar: 'Delete',
    exportarPDF: 'Export PDF',
    exportarExcel: 'Export Excel',
  },
};

export function useIdioma() {
  const [idioma, setIdiomaState] = useState<Idioma>(() => {
    const saved = localStorage.getItem('asx_idioma');
    return (saved as Idioma) || 'pt';
  });

  useEffect(() => {
    localStorage.setItem('asx_idioma', idioma);
  }, [idioma]);

  const t = (key: keyof typeof translations.pt): string => {
    return translations[idioma][key] || translations.pt[key];
  };

  return { idioma, setIdioma: setIdiomaState, t };
}
