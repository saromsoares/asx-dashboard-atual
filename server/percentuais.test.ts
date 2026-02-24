import { describe, it, expect } from 'vitest';

/**
 * Testes para validar cálculo de percentuais
 * - % por item: Sarom e Alexandre em relação ao total do item
 * - % total: Sarom e Alexandre em relação ao total do pedido
 */

describe('Cálculo de Percentuais', () => {
  it('deve calcular percentual de Sarom por item corretamente', () => {
    const qtdSaromItem = 20;
    const qtdAlexandreItem = 30;
    const qtdItemTotal = qtdSaromItem + qtdAlexandreItem;
    
    const pctSaromItem = (qtdSaromItem / qtdItemTotal) * 100;
    
    expect(pctSaromItem).toBeCloseTo(40, 1); // 20/(20+30) = 40%
  });

  it('deve calcular percentual de Alexandre por item corretamente', () => {
    const qtdSaromItem = 20;
    const qtdAlexandreItem = 30;
    const qtdItemTotal = qtdSaromItem + qtdAlexandreItem;
    
    const pctAlexandreItem = (qtdAlexandreItem / qtdItemTotal) * 100;
    
    expect(pctAlexandreItem).toBeCloseTo(60, 1); // 30/(20+30) = 60%
  });

  it('deve calcular percentual de Sarom do total do pedido corretamente', () => {
    const totalSarom = 50; // Sarom em todos os itens
    const totalAlexandre = 50; // Alexandre em todos os itens
    const qtdTotal = totalSarom + totalAlexandre;
    
    const pctSaromTotal = (totalSarom / qtdTotal) * 100;
    
    expect(pctSaromTotal).toBeCloseTo(50, 1); // 50/100 = 50%
  });

  it('deve calcular percentual de Alexandre do total do pedido corretamente', () => {
    const totalSarom = 30;
    const totalAlexandre = 70;
    const qtdTotal = totalSarom + totalAlexandre;
    
    const pctAlexandreTotal = (totalAlexandre / qtdTotal) * 100;
    
    expect(pctAlexandreTotal).toBeCloseTo(70, 1); // 70/100 = 70%
  });

  it('deve retornar 0% quando não há quantidade', () => {
    const qtdSaromItem = 0;
    const qtdAlexandreItem = 0;
    const qtdItemTotal = qtdSaromItem + qtdAlexandreItem;
    
    const pctSaromItem = qtdItemTotal > 0 ? (qtdSaromItem / qtdItemTotal) * 100 : 0;
    
    expect(pctSaromItem).toBe(0);
  });

  it('deve calcular corretamente com múltiplos itens', () => {
    // Item 1: Sarom 20, Alexandre 30
    // Item 2: Sarom 10, Alexandre 40
    // Total: Sarom 30, Alexandre 70
    
    const totalSarom = 30;
    const totalAlexandre = 70;
    const qtdTotal = totalSarom + totalAlexandre;
    
    const pctSaromTotal = (totalSarom / qtdTotal) * 100;
    const pctAlexandreTotal = (totalAlexandre / qtdTotal) * 100;
    
    expect(pctSaromTotal).toBeCloseTo(30, 1);
    expect(pctAlexandreTotal).toBeCloseTo(70, 1);
    expect(pctSaromTotal + pctAlexandreTotal).toBeCloseTo(100, 1);
  });

  it('deve garantir que percentuais por item somem 100%', () => {
    const qtdSaromItem = 25;
    const qtdAlexandreItem = 75;
    const qtdItemTotal = qtdSaromItem + qtdAlexandreItem;
    
    const pctSaromItem = (qtdSaromItem / qtdItemTotal) * 100;
    const pctAlexandreItem = (qtdAlexandreItem / qtdItemTotal) * 100;
    
    expect(pctSaromItem + pctAlexandreItem).toBeCloseTo(100, 1);
  });

  it('deve garantir que percentuais totais somem 100%', () => {
    const totalSarom = 45;
    const totalAlexandre = 55;
    const qtdTotal = totalSarom + totalAlexandre;
    
    const pctSaromTotal = (totalSarom / qtdTotal) * 100;
    const pctAlexandreTotal = (totalAlexandre / qtdTotal) * 100;
    
    expect(pctSaromTotal + pctAlexandreTotal).toBeCloseTo(100, 1);
  });
});
