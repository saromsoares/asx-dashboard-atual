import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getPreferenciaUsuario,
  upsertPreferenciaUsuario,
  getEstoqueUsuario,
  upsertEstoqueUsuario,
  listEstoquesUsuario,
  getCustoProduto,
  upsertCustoProduto,
  listCustosProdutos,
} from '../db';

describe('Migração de dados do localStorage', () => {
  const testUserId = 1;
  const testProdutoId = 'ASX1001';

  describe('Preferências do usuário', () => {
    it('deve criar preferência do usuário', async () => {
      const result = await upsertPreferenciaUsuario(testUserId, {
        taxaCambioCustomizada: '9.50',
        usarTaxaCustomizada: 1,
      });

      expect(result).toBeDefined();
      expect(result?.userId).toBe(testUserId);
      expect(result?.taxaCambioCustomizada).toBe('9.5000');
    });

    it('deve obter preferência do usuário', async () => {
      await upsertPreferenciaUsuario(testUserId, {
        taxaCambioCustomizada: '9.50',
      });

      const result = await getPreferenciaUsuario(testUserId);
      expect(result).toBeDefined();
      expect(result?.userId).toBe(testUserId);
    });

    it('deve atualizar preferência do usuário', async () => {
      await upsertPreferenciaUsuario(testUserId, {
        taxaCambioCustomizada: '9.50',
      });

      const updated = await upsertPreferenciaUsuario(testUserId, {
        taxaCambioCustomizada: '10.00',
      });

      expect(updated?.taxaCambioCustomizada).toBe('10.0000');
    });
  });

  describe('Estoques do usuário', () => {
    it('deve criar estoque do usuário', async () => {
      const result = await upsertEstoqueUsuario(testUserId, testProdutoId, 100);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(testUserId);
      expect(result?.produtoId).toBe(testProdutoId);
      expect(result?.quantidade).toBe(100);
    });

    it('deve obter estoque do usuário', async () => {
      await upsertEstoqueUsuario(testUserId, testProdutoId, 100);

      const result = await getEstoqueUsuario(testUserId, testProdutoId);
      expect(result).toBeDefined();
      expect(result?.quantidade).toBe(100);
    });

    it('deve atualizar estoque do usuário', async () => {
      await upsertEstoqueUsuario(testUserId, testProdutoId, 100);
      const updated = await upsertEstoqueUsuario(testUserId, testProdutoId, 150);

      expect(updated?.quantidade).toBe(150);
    });

    it('deve listar estoques do usuário', async () => {
      await upsertEstoqueUsuario(testUserId, 'ASX1001', 100);
      await upsertEstoqueUsuario(testUserId, 'ASX1002', 200);

      const result = await listEstoquesUsuario(testUserId);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Custos de produtos', () => {
    it('deve criar custo de produto', async () => {
      const result = await upsertCustoProduto(testProdutoId, 50.00);

      expect(result).toBeDefined();
      expect(result?.produtoId).toBe(testProdutoId);
      expect(Number(result?.custoUsd)).toBe(50.00);
    });

    it('deve obter custo de produto', async () => {
      await upsertCustoProduto(testProdutoId, 50.00);

      const result = await getCustoProduto(testProdutoId);
      expect(result).toBeDefined();
      expect(Number(result?.custoUsd)).toBe(50.00);
    });

    it('deve atualizar custo de produto', async () => {
      await upsertCustoProduto(testProdutoId, 50.00);
      const updated = await upsertCustoProduto(testProdutoId, 75.00);

      expect(Number(updated?.custoUsd)).toBe(75.00);
    });

    it('deve listar custos de produtos', async () => {
      await upsertCustoProduto('ASX1001', 50.00);
      await upsertCustoProduto('ASX1002', 75.00);

      const result = await listCustosProdutos();
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Migração em lote', () => {
    it('deve migrar múltiplos custos', async () => {
      const custos = [
        { produtoId: 'ASX1001', custoUsd: 50.00 },
        { produtoId: 'ASX1002', custoUsd: 75.00 },
        { produtoId: 'ASX1003', custoUsd: 100.00 },
      ];

      for (const custo of custos) {
        await upsertCustoProduto(custo.produtoId, custo.custoUsd);
      }

      const result = await listCustosProdutos();
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('deve migrar múltiplos estoques', async () => {
      const estoques = [
        { produtoId: 'ASX1001', quantidade: 100 },
        { produtoId: 'ASX1002', quantidade: 200 },
        { produtoId: 'ASX1003', quantidade: 300 },
      ];

      for (const estoque of estoques) {
        await upsertEstoqueUsuario(testUserId, estoque.produtoId, estoque.quantidade);
      }

      const result = await listEstoquesUsuario(testUserId);
      expect(result.length).toBeGreaterThanOrEqual(3);
    });
  });
});
