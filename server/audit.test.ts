import { describe, it, expect, vi, beforeEach } from 'vitest';
import { criarDescricaoAcao, extrairContextoRequisicao } from './audit';

describe('Audit Functions', () => {
  describe('criarDescricaoAcao', () => {
    it('deve criar descrição para ação "criou"', () => {
      const descricao = criarDescricaoAcao('criou', 'pedido');
      expect(descricao).toBe('Criou Pedido');
    });

    it('deve criar descrição para ação "atualizou"', () => {
      const descricao = criarDescricaoAcao('atualizou', 'estoque');
      expect(descricao).toBe('Atualizou Estoque');
    });

    it('deve criar descrição para ação "deletou"', () => {
      const descricao = criarDescricaoAcao('deletou', 'item_pedido');
      expect(descricao).toBe('Deletou Item do Pedido');
    });

    it('deve criar descrição para ação "alterou_status" com novo status', () => {
      const descricao = criarDescricaoAcao('alterou_status', 'pedido', { novoStatus: 'Enviado' });
      expect(descricao).toBe('Alterou status de Pedido para: Enviado');
    });

    it('deve retornar ação desconhecida como está', () => {
      const descricao = criarDescricaoAcao('acao_desconhecida', 'pedido');
      expect(descricao).toBe('acao_desconhecida Pedido');
    });
  });

  describe('extrairContextoRequisicao', () => {
    it('deve extrair IP e User-Agent da requisição', () => {
      const mockReq = {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        socket: {
          remoteAddress: '127.0.0.1',
        },
      };

      const contexto = extrairContextoRequisicao(mockReq);
      expect(contexto.ipAddress).toBe('192.168.1.1');
      expect(contexto.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
    });

    it('deve usar socket.remoteAddress se x-forwarded-for não existir', () => {
      const mockReq = {
        headers: {},
        socket: {
          remoteAddress: '10.0.0.1',
        },
      };

      const contexto = extrairContextoRequisicao(mockReq);
      expect(contexto.ipAddress).toBe('10.0.0.1');
    });

    it('deve usar "desconhecido" se IP não puder ser determinado', () => {
      const mockReq = {
        headers: {},
        socket: {},
      };

      const contexto = extrairContextoRequisicao(mockReq);
      expect(contexto.ipAddress).toBe('desconhecido');
    });

    it('deve usar "desconhecido" se User-Agent não existir', () => {
      const mockReq = {
        headers: {},
        socket: {
          remoteAddress: '192.168.1.1',
        },
      };

      const contexto = extrairContextoRequisicao(mockReq);
      expect(contexto.userAgent).toBe('desconhecido');
    });
  });
});
