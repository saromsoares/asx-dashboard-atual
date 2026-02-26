/**
 * Hook useMigrateFromLocalStorage — Migra dados do localStorage para banco de dados
 * Executado uma única vez ao carregar a aplicação
 * Remove localStorage após migração bem-sucedida
 */

import { useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useAuth } from './useAuth';

export function useMigrateFromLocalStorage() {
  const { user } = useAuth();
  const updateCustosMutation = trpc.migracao.updateCustosBatch.useMutation();
  const updateEstoquesMutation = trpc.migracao.updateEstoquesBatch.useMutation();
  const updatePreferenciasMutation = trpc.migracao.updatePreferencias.useMutation();

  useEffect(() => {
    if (!user) return;

    // Verificar se já foi migrado
    const migrationKey = `asx_migrated_v2_${user.id}`;
    if (localStorage.getItem(migrationKey)) {
      // Já foi migrado, remover localStorage
      clearLocalStorage();
      return;
    }

    // Migrar custos
    const custosStr = localStorage.getItem('asx_custos_usd');
    if (custosStr) {
      try {
        const custos = JSON.parse(custosStr);
        const custosArray = Object.entries(custos).map(([produtoId, custoUsd]) => ({
          produtoId,
          custoUsd: Number(custoUsd),
        }));

        if (custosArray.length > 0) {
          updateCustosMutation.mutate({ custos: custosArray });
        }
      } catch (e) {
        console.error('Erro ao migrar custos:', e);
      }
    }

    // Migrar taxa de câmbio
    const taxaStr = localStorage.getItem('asx_taxa_cambio');
    if (taxaStr) {
      try {
        const taxa = parseFloat(taxaStr);
        updatePreferenciasMutation.mutate({
          taxaCambioCustomizada: taxa,
          usarTaxaCustomizada: true,
        });
      } catch (e) {
        console.error('Erro ao migrar taxa de câmbio:', e);
      }
    }

    // Migrar estoques (Sarom)
    const estoqueSaromStr = localStorage.getItem('asx_central_sarom');
    if (estoqueSaromStr) {
      try {
        const estoques = JSON.parse(estoqueSaromStr);
        const estoquesArray = Object.entries(estoques).map(([produtoId, dados]: any) => ({
          produtoId,
          quantidade: dados.estoqueInicial || 0,
        }));

        if (estoquesArray.length > 0) {
          updateEstoquesMutation.mutate({ estoques: estoquesArray });
        }
      } catch (e) {
        console.error('Erro ao migrar estoques:', e);
      }
    }

    // Marcar como migrado e limpar localStorage
    localStorage.setItem(migrationKey, 'true');
    clearLocalStorage();
  }, [user, updateCustosMutation, updateEstoquesMutation, updatePreferenciasMutation]);
}

/**
 * Limpa localStorage removendo todas as chaves de dados críticos
 * Mantém apenas preferências de UI (idioma, tema, etc)
 */
function clearLocalStorage() {
  const keysToRemove = [
    'asx_custos_usd',
    'asx_taxa_cambio',
    'asx_central_sarom',
    'asx_central_alexandre',
    'asx_central_meta_sarom',
    'asx_central_meta_alexandre',
    'asx_processos_sr',
    'asx_remembered_email',
    'asx_remember_me',
    'asx_cotacao_ptax',
    'asx_cotacao_timestamp',
  ];

  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`Erro ao remover ${key}:`, e);
    }
  });
}
