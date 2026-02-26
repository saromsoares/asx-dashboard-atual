import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { criarProcessoSR, atualizarStatusProcessoSR, getProcessoSR, getAllProcessosSR, deletarProcessoSR } from './db';

describe('Processo SR', () => {
  let processoId: number;

  it('deve criar um novo processo SR', async () => {
    const resultado = await criarProcessoSR({
      numeroProcesso: 'TEST-001',
      nomeInvoice: 'Invoice Test',
      dataProcesso: new Date().toISOString().slice(0, 10),
      observacoes: 'Teste',
      ncm: '8512.90',
    });

    expect(resultado).toBeDefined();
    expect(resultado?.id).toBeDefined();
    processoId = resultado!.id;
  });

  it('deve atualizar status para Finalizado e marcar como confirmado', async () => {
    const resultado = await atualizarStatusProcessoSR(processoId, 'Finalizado');
    expect(resultado?.success).toBe(true);

    // Verificar que o processo foi marcado como confirmado
    const processo = await getProcessoSR(processoId);
    expect(processo?.status).toBe('Finalizado');
    expect(processo?.confirmado).toBe(1);
  });

  it('deve atualizar status para Em andamento e remover confirmado', async () => {
    const resultado = await atualizarStatusProcessoSR(processoId, 'Em andamento');
    expect(resultado?.success).toBe(true);

    // Verificar que o processo não está mais confirmado
    const processo = await getProcessoSR(processoId);
    expect(processo?.status).toBe('Em andamento');
    expect(processo?.confirmado).toBe(0);
  });

  it('deve atualizar status para Cancelado e remover confirmado', async () => {
    const resultado = await atualizarStatusProcessoSR(processoId, 'Cancelado');
    expect(resultado?.success).toBe(true);

    // Verificar que o processo não está mais confirmado
    const processo = await getProcessoSR(processoId);
    expect(processo?.status).toBe('Cancelado');
    expect(processo?.confirmado).toBe(0);
  });

  afterAll(async () => {
    if (processoId) {
      await deletarProcessoSR(processoId);
    }
  });
});
