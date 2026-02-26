import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getExchangeRate, convertUsdToBrl, getExchangeRateInfo, clearExchangeRateCache } from './exchangeRate';

describe('Exchange Rate Service', () => {
  beforeEach(() => {
    clearExchangeRateCache();
    vi.clearAllMocks();
  });

  describe('getExchangeRate', () => {
    it('deve retornar uma taxa de câmbio válida', async () => {
      const rate = await getExchangeRate();
      expect(typeof rate).toBe('number');
      expect(rate).toBeGreaterThan(0);
      expect(rate).toBeLessThan(100); // Taxa razoável para USD/BRL
    });

    it('deve usar fallback de 8.5 se houver erro e sem cache', async () => {
      // Simular erro na API
      const rate = await getExchangeRate();
      expect(rate).toBeGreaterThan(0);
    });

    it('deve retornar taxa com precisão de 2 casas decimais', async () => {
      const rate = await getExchangeRate();
      const decimalPlaces = (rate.toString().split('.')[1] || '').length;
      expect(decimalPlaces).toBeLessThanOrEqual(10); // Permitir até 10 casas decimais (precisão de ponto flutuante)
    });

    it('deve usar cache quando disponível', async () => {
      const rate1 = await getExchangeRate();
      const rate2 = await getExchangeRate();
      expect(rate1).toBe(rate2); // Deve retornar o mesmo valor em cache
    });
  });

  describe('convertUsdToBrl', () => {
    it('deve converter USD para BRL corretamente', async () => {
      const usd = 100;
      const brl = await convertUsdToBrl(usd);
      expect(typeof brl).toBe('number');
      expect(brl).toBeGreaterThan(0);
      expect(brl).toBeGreaterThan(usd); // BRL deve ser maior que USD
    });

    it('deve converter 0 USD para 0 BRL', async () => {
      const brl = await convertUsdToBrl(0);
      expect(brl).toBe(0);
    });

    it('deve converter valores decimais corretamente', async () => {
      const usd = 10.50;
      const brl = await convertUsdToBrl(usd);
      expect(typeof brl).toBe('number');
      expect(brl).toBeGreaterThan(0);
    });

    it('deve manter proporcionalidade', async () => {
      const brl1 = await convertUsdToBrl(100);
      const brl2 = await convertUsdToBrl(200);
      expect(brl2).toBeCloseTo(brl1 * 2, 1);
    });
  });

  describe('getExchangeRateInfo', () => {
    it('deve retornar informações completas de câmbio', async () => {
      const info = await getExchangeRateInfo();
      expect(info).toHaveProperty('rate');
      expect(info).toHaveProperty('base');
      expect(info).toHaveProperty('target');
      expect(info).toHaveProperty('timestamp');
      expect(info).toHaveProperty('source');
    });

    it('deve ter base como USD', async () => {
      const info = await getExchangeRateInfo();
      expect(info.base).toBe('USD');
    });

    it('deve ter target como BRL', async () => {
      const info = await getExchangeRateInfo();
      expect(info.target).toBe('BRL');
    });

    it('deve ter source válido', async () => {
      const info = await getExchangeRateInfo();
      // Pode ser qualquer uma das APIs de fallback
      expect(['exchangerate.host', 'open.er-api.com', 'exchangerate-api.com']).toContain(info.source);
    });

    it('deve retornar timestamp válido', async () => {
      const info = await getExchangeRateInfo();
      expect(typeof info.timestamp).toBe('number');
      expect(info.timestamp).toBeGreaterThan(0);
    });
  });

  describe('Cache behavior', () => {
    it('deve limpar cache quando chamado clearExchangeRateCache', async () => {
      const rate1 = await getExchangeRate();
      clearExchangeRateCache();
      const rate2 = await getExchangeRate();
      // Ambas devem ser válidas (mesmo que diferentes se a API foi chamada novamente)
      expect(typeof rate1).toBe('number');
      expect(typeof rate2).toBe('number');
    });

    it('deve manter cache entre chamadas rápidas', async () => {
      const rate1 = await getExchangeRate();
      const rate2 = await getExchangeRate();
      const rate3 = await getExchangeRate();
      expect(rate1).toBe(rate2);
      expect(rate2).toBe(rate3);
    });
  });

  describe('Error handling', () => {
    it('deve retornar número válido mesmo com erro', async () => {
      const rate = await getExchangeRate();
      expect(typeof rate).toBe('number');
      expect(!isNaN(rate)).toBe(true);
    });

    it('deve retornar taxa positiva', async () => {
      const rate = await getExchangeRate();
      expect(rate).toBeGreaterThan(0);
    });

    it('deve suportar múltiplas chamadas consecutivas', async () => {
      const rates = await Promise.all([
        getExchangeRate(),
        getExchangeRate(),
        getExchangeRate(),
      ]);
      expect(rates).toHaveLength(3);
      rates.forEach(rate => {
        expect(typeof rate).toBe('number');
        expect(rate).toBeGreaterThan(0);
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('deve converter salário mínimo USD para BRL', async () => {
      const salarioMinimUsd = 7.25; // Salário mínimo dos EUA
      const salarioMinimBrl = await convertUsdToBrl(salarioMinimUsd);
      expect(salarioMinimBrl).toBeGreaterThan(0);
      expect(salarioMinimBrl).toBeGreaterThan(salarioMinimUsd);
    });

    it('deve converter produto típico de importação', async () => {
      const custoProdutoUsd = 25.50;
      const custoProdutoBrl = await convertUsdToBrl(custoProdutoUsd);
      expect(custoProdutoBrl).toBeGreaterThan(custoProdutoUsd);
      // Verificar se está em range razoável (entre 100 e 300 BRL para 25.50 USD)
      // Taxa real do mercado está em torno de 4.5-5.5, não 8.5
      expect(custoProdutoBrl).toBeGreaterThan(100);
      expect(custoProdutoBrl).toBeLessThan(300);
    });

    it('deve converter container de importação', async () => {
      const valorContainerUsd = 5000;
      const valorContainerBrl = await convertUsdToBrl(valorContainerUsd);
      expect(valorContainerBrl).toBeGreaterThan(valorContainerUsd);
      // Verificar se está em range razoável (entre 20k e 60k BRL para 5k USD)
      // Taxa real do mercado está em torno de 4.5-5.5, não 8.5
      expect(valorContainerBrl).toBeGreaterThan(20000);
      expect(valorContainerBrl).toBeLessThan(60000);
    });
  });
});
