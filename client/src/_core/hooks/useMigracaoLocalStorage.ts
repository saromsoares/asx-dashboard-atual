import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * Hook para sincronizar dados do localStorage para o banco de dados
 * Executa automaticamente ao montar o componente
 */
export function useMigracaoLocalStorage() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  // Mutations para sincronizar dados
  const updateCustosBatchMutation = trpc.migracao.updateCustosBatch.useMutation();
  const updateEstoquesBatchMutation = trpc.migracao.updateEstoquesBatch.useMutation();
  const updatePreferenciasMutation = trpc.migracao.updatePreferencias.useMutation();

  /**
   * Sincronizar todos os dados do localStorage para o banco
   */
  const sincronizarDados = async () => {
    try {
      setIsSyncing(true);
      setSyncStatus('syncing');
      setSyncMessage('Sincronizando dados...');

      // 1. Sincronizar custos em USD
      const custosStr = localStorage.getItem('custos');
      if (custosStr) {
        const custos = JSON.parse(custosStr);
        const custosArray = Object.entries(custos).map(([produtoId, custoUsd]) => ({
          produtoId,
          custoUsd: Number(custoUsd),
        }));

        if (custosArray.length > 0) {
          await updateCustosBatchMutation.mutateAsync({
            custos: custosArray,
          });
          setSyncMessage(`✅ ${custosArray.length} custos sincronizados`);
        }
      }

      // 2. Sincronizar estoques por usuário
      const estoqueSaromStr = localStorage.getItem('estoque_sarom');
      const estoqueAlexandreStr = localStorage.getItem('estoque_alexandre');

      const estoquesArray: Array<{ produtoId: string; quantidade: number }> = [];

      if (estoqueSaromStr) {
        const estoque = JSON.parse(estoqueSaromStr);
        Object.entries(estoque).forEach(([produtoId, quantidade]) => {
          estoquesArray.push({
            produtoId,
            quantidade: Number(quantidade),
          });
        });
      }

      if (estoqueAlexandreStr) {
        const estoque = JSON.parse(estoqueAlexandreStr);
        Object.entries(estoque).forEach(([produtoId, quantidade]) => {
          estoquesArray.push({
            produtoId,
            quantidade: Number(quantidade),
          });
        });
      }

      if (estoquesArray.length > 0) {
        await updateEstoquesBatchMutation.mutateAsync({
          estoques: estoquesArray,
        });
        setSyncMessage(`✅ ${estoquesArray.length} estoques sincronizados`);
      }

      // 3. Sincronizar preferências (taxa de câmbio customizada)
      const taxaCambioStr = localStorage.getItem('taxa_cambio');
      if (taxaCambioStr) {
        const taxaCambio = Number(taxaCambioStr);
        await updatePreferenciasMutation.mutateAsync({
          taxaCambioCustomizada: taxaCambio,
          usarTaxaCustomizada: true,
        });
        setSyncMessage(`✅ Taxa de câmbio sincronizada: ${taxaCambio}`);
      }

      setSyncStatus('success');
      setSyncMessage('✅ Todos os dados foram sincronizados com sucesso!');

      // Limpar localStorage após sincronização bem-sucedida
      setTimeout(() => {
        localStorage.removeItem('custos');
        localStorage.removeItem('estoque_sarom');
        localStorage.removeItem('estoque_alexandre');
        localStorage.removeItem('taxa_cambio');
        localStorage.setItem('migracao_concluida', 'true');
      }, 1000);
    } catch (error) {
      console.error('[Migração] Erro ao sincronizar dados:', error);
      setSyncStatus('error');
      setSyncMessage(`❌ Erro ao sincronizar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  /**
   * Verificar se já foi migrado e sincronizar se necessário
   */
  useEffect(() => {
    const jaMigrado = localStorage.getItem('migracao_concluida');
    const temDadosParaMigrar = localStorage.getItem('custos') || 
                               localStorage.getItem('estoque_sarom') || 
                               localStorage.getItem('estoque_alexandre') || 
                               localStorage.getItem('taxa_cambio');

    if (!jaMigrado && temDadosParaMigrar) {
      // Sincronizar automaticamente na primeira vez
      sincronizarDados();
    }
  }, []);

  return {
    isSyncing,
    syncStatus,
    syncMessage,
    sincronizarDados,
  };
}
