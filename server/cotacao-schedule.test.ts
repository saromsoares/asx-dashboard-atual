import { describe, it, expect } from 'vitest';

/**
 * Testes para validar a lógica de atualização de cotação às 10h e 15h
 * Testa as funções de verificação de horário isoladamente
 */

const HORARIOS_ATUALIZACAO = [10, 15];
const JANELA_MINUTOS = 5;

function verificarSeDeveAtualizar(hora: number, minuto: number): boolean {
  for (const h of HORARIOS_ATUALIZACAO) {
    if (hora === h && minuto < JANELA_MINUTOS) {
      return true;
    }
  }
  return false;
}

function verificarSeJaAtualizouHoje(
  atualizadoEm: Date | null,
  agora: Date
): boolean {
  if (!atualizadoEm) return false;
  if (atualizadoEm.toDateString() === agora.toDateString()) {
    const horaAtual = agora.getHours();
    const horaUltimaAtualizacao = atualizadoEm.getHours();
    if (horaAtual >= 15 && horaUltimaAtualizacao >= 15) return true;
    if (horaAtual >= 10 && horaAtual < 15 && horaUltimaAtualizacao >= 10) return true;
  }
  return false;
}

describe('Cotação PTAX - Horários de Atualização', () => {
  describe('verificarSeDeveAtualizar', () => {
    it('deve retornar true às 10:00', () => {
      expect(verificarSeDeveAtualizar(10, 0)).toBe(true);
    });

    it('deve retornar true às 10:04', () => {
      expect(verificarSeDeveAtualizar(10, 4)).toBe(true);
    });

    it('deve retornar false às 10:05', () => {
      expect(verificarSeDeveAtualizar(10, 5)).toBe(false);
    });

    it('deve retornar false às 10:30', () => {
      expect(verificarSeDeveAtualizar(10, 30)).toBe(false);
    });

    it('deve retornar true às 15:00', () => {
      expect(verificarSeDeveAtualizar(15, 0)).toBe(true);
    });

    it('deve retornar true às 15:03', () => {
      expect(verificarSeDeveAtualizar(15, 3)).toBe(true);
    });

    it('deve retornar false às 15:05', () => {
      expect(verificarSeDeveAtualizar(15, 5)).toBe(false);
    });

    it('deve retornar false às 9:00', () => {
      expect(verificarSeDeveAtualizar(9, 0)).toBe(false);
    });

    it('deve retornar false às 12:00', () => {
      expect(verificarSeDeveAtualizar(12, 0)).toBe(false);
    });

    it('deve retornar false às 16:00', () => {
      expect(verificarSeDeveAtualizar(16, 0)).toBe(false);
    });

    it('deve retornar false às 8:00', () => {
      expect(verificarSeDeveAtualizar(8, 0)).toBe(false);
    });

    it('deve retornar false às 23:00', () => {
      expect(verificarSeDeveAtualizar(23, 0)).toBe(false);
    });
  });

  describe('verificarSeJaAtualizouHoje', () => {
    it('deve retornar false quando não há atualização anterior', () => {
      const agora = new Date(2026, 1, 26, 10, 0);
      expect(verificarSeJaAtualizouHoje(null, agora)).toBe(false);
    });

    it('deve retornar false quando última atualização foi ontem', () => {
      const agora = new Date(2026, 1, 26, 10, 0);
      const ontem = new Date(2026, 1, 25, 15, 0);
      expect(verificarSeJaAtualizouHoje(ontem, agora)).toBe(false);
    });

    it('deve retornar true quando já atualizou às 10h e estamos às 11h', () => {
      const agora = new Date(2026, 1, 26, 11, 0);
      const atualizado = new Date(2026, 1, 26, 10, 1);
      expect(verificarSeJaAtualizouHoje(atualizado, agora)).toBe(true);
    });

    it('deve retornar true quando já atualizou às 15h e estamos às 16h', () => {
      const agora = new Date(2026, 1, 26, 16, 0);
      const atualizado = new Date(2026, 1, 26, 15, 1);
      expect(verificarSeJaAtualizouHoje(atualizado, agora)).toBe(true);
    });

    it('deve retornar false quando atualizou às 10h mas agora são 15h (precisa atualizar de novo)', () => {
      const agora = new Date(2026, 1, 26, 15, 0);
      const atualizado = new Date(2026, 1, 26, 10, 1);
      // Hora atual >= 15, mas última atualização foi às 10 (< 15), então NÃO já atualizou
      expect(verificarSeJaAtualizouHoje(atualizado, agora)).toBe(false);
    });

    it('deve retornar false quando atualizou às 8h e agora são 10h', () => {
      const agora = new Date(2026, 1, 26, 10, 0);
      const atualizado = new Date(2026, 1, 26, 8, 0);
      // Hora atual >= 10, mas última atualização foi às 8 (< 10), então NÃO já atualizou
      expect(verificarSeJaAtualizouHoje(atualizado, agora)).toBe(false);
    });

    it('deve retornar true quando atualizou às 15h e estamos às 20h', () => {
      const agora = new Date(2026, 1, 26, 20, 0);
      const atualizado = new Date(2026, 1, 26, 15, 2);
      expect(verificarSeJaAtualizouHoje(atualizado, agora)).toBe(true);
    });
  });

  describe('Cenários combinados', () => {
    it('primeira carga do dia às 10:00 - deve atualizar', () => {
      const hora = 10, minuto = 0;
      const deveAtualizar = verificarSeDeveAtualizar(hora, minuto);
      const jaAtualizou = verificarSeJaAtualizouHoje(null, new Date(2026, 1, 26, hora, minuto));
      expect(deveAtualizar && !jaAtualizou).toBe(true);
    });

    it('segunda verificação às 10:02 após já ter atualizado - não deve atualizar', () => {
      const hora = 10, minuto = 2;
      const deveAtualizar = verificarSeDeveAtualizar(hora, minuto);
      const atualizado = new Date(2026, 1, 26, 10, 0);
      const agora = new Date(2026, 1, 26, hora, minuto);
      const jaAtualizou = verificarSeJaAtualizouHoje(atualizado, agora);
      expect(deveAtualizar && !jaAtualizou).toBe(false);
    });

    it('às 15:00 após ter atualizado às 10h - deve atualizar', () => {
      const hora = 15, minuto = 0;
      const deveAtualizar = verificarSeDeveAtualizar(hora, minuto);
      const atualizado = new Date(2026, 1, 26, 10, 1);
      const agora = new Date(2026, 1, 26, hora, minuto);
      const jaAtualizou = verificarSeJaAtualizouHoje(atualizado, agora);
      expect(deveAtualizar && !jaAtualizou).toBe(true);
    });

    it('às 12:00 - não deve atualizar (fora do horário)', () => {
      const hora = 12, minuto = 0;
      const deveAtualizar = verificarSeDeveAtualizar(hora, minuto);
      expect(deveAtualizar).toBe(false);
    });
  });
});
