import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  debitos,
  pagamentos as pagamentosTable,
  vendas_produto,
  compras_produto,
  cotacao_ptax,
  saldo_embarque,
  preferencias_usuario,
  config_json,
} from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

// ============ DB HELPERS ============

// --- Débitos ---
async function listDebitos() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(debitos).orderBy(debitos.id);
}

async function insertDebito(data: { descricao: string; valor: number; data: string; observacoes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(debitos).values({
    descricao: data.descricao,
    valor: data.valor.toFixed(2),
    data: data.data,
    observacoes: data.observacoes ?? null,
  });
  return { id: result[0].insertId };
}

async function deleteDebito(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(debitos).where(eq(debitos.id, id));
}

// --- Pagamentos ---
async function listPagamentos() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pagamentosTable).orderBy(pagamentosTable.id);
}

async function insertPagamento(data: { descricao: string; valor: number; data: string; observacoes?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pagamentosTable).values({
    descricao: data.descricao,
    valor: data.valor.toFixed(2),
    data: data.data,
    observacoes: data.observacoes ?? null,
  });
  return { id: result[0].insertId };
}

async function deletePagamento(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(pagamentosTable).where(eq(pagamentosTable.id, id));
}

// --- Vendas por produto ---
async function listVendas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendas_produto).orderBy(vendas_produto.produtoId);
}

async function upsertVenda(produtoId: string, vendaTrimestre: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(vendas_produto).values({ produtoId, vendaTrimestre })
    .onDuplicateKeyUpdate({ set: { vendaTrimestre } });
}

async function upsertVendasBatch(items: { produtoId: string; vendaTrimestre: number }[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  for (const item of items) {
    await db.insert(vendas_produto).values(item)
      .onDuplicateKeyUpdate({ set: { vendaTrimestre: item.vendaTrimestre } });
  }
}

// --- Compras por produto ---
async function listCompras() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(compras_produto).orderBy(compras_produto.produtoId);
}

async function upsertCompra(produtoId: string, quantidadeCompra: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(compras_produto).values({ produtoId, quantidadeCompra })
    .onDuplicateKeyUpdate({ set: { quantidadeCompra } });
}

async function upsertComprasBatch(items: { produtoId: string; quantidadeCompra: number }[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  for (const item of items) {
    await db.insert(compras_produto).values(item)
      .onDuplicateKeyUpdate({ set: { quantidadeCompra: item.quantidadeCompra } });
  }
}

// --- Cotação PTAX ---
async function getCotacaoPtax() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(cotacao_ptax).orderBy(cotacao_ptax.id).limit(1);
  return rows[0] ?? null;
}

async function upsertCotacaoPtax(data: { compra: number; venda: number; dataHoraCotacao: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getCotacaoPtax();
  if (existing) {
    await db.update(cotacao_ptax).set({
      compra: data.compra.toFixed(4),
      venda: data.venda.toFixed(4),
      dataHoraCotacao: data.dataHoraCotacao,
    }).where(eq(cotacao_ptax.id, existing.id));
  } else {
    await db.insert(cotacao_ptax).values({
      compra: data.compra.toFixed(4),
      venda: data.venda.toFixed(4),
      dataHoraCotacao: data.dataHoraCotacao,
    });
  }
}

// --- Saldo de Embarque ---
async function listSaldoEmbarque() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(saldo_embarque).orderBy(saldo_embarque.processoId);
}

async function upsertSaldoEmbarque(processoId: string, saldoUnidades: number, saldoValorUsd: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(saldo_embarque).values({
    processoId,
    saldoUnidades,
    saldoValorUsd: saldoValorUsd.toFixed(2),
  }).onDuplicateKeyUpdate({
    set: { saldoUnidades, saldoValorUsd: saldoValorUsd.toFixed(2) },
  });
}

async function deleteSaldoEmbarque(processoId: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(saldo_embarque).where(eq(saldo_embarque.processoId, processoId));
}

// --- Preferências UI (tema, sidebar width, idioma, lembrar email) ---
async function getPreferenciasUI(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(preferencias_usuario).where(eq(preferencias_usuario.userId, userId));
  return rows[0] ?? null;
}

// ============ ROUTER ============

export const dadosRouter = router({
  // --- Débitos ---
  listDebitos: protectedProcedure.query(async () => {
    return await listDebitos();
  }),

  addDebito: protectedProcedure
    .input(z.object({
      descricao: z.string(),
      valor: z.number(),
      data: z.string(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await insertDebito(input);
    }),

  deleteDebito: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteDebito(input.id);
      return { success: true };
    }),

  // --- Pagamentos ---
  listPagamentos: protectedProcedure.query(async () => {
    return await listPagamentos();
  }),

  addPagamento: protectedProcedure
    .input(z.object({
      descricao: z.string(),
      valor: z.number(),
      data: z.string(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await insertPagamento(input);
    }),

  deletePagamento: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deletePagamento(input.id);
      return { success: true };
    }),

  // --- Vendas ---
  listVendas: protectedProcedure.query(async () => {
    return await listVendas();
  }),

  updateVenda: protectedProcedure
    .input(z.object({
      produtoId: z.string(),
      vendaTrimestre: z.number(),
    }))
    .mutation(async ({ input }) => {
      await upsertVenda(input.produtoId, input.vendaTrimestre);
      return { success: true };
    }),

  updateVendasBatch: protectedProcedure
    .input(z.object({
      vendas: z.array(z.object({
        produtoId: z.string(),
        vendaTrimestre: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      await upsertVendasBatch(input.vendas);
      return { success: true };
    }),

  // --- Compras ---
  listCompras: protectedProcedure.query(async () => {
    return await listCompras();
  }),

  updateCompra: protectedProcedure
    .input(z.object({
      produtoId: z.string(),
      quantidadeCompra: z.number(),
    }))
    .mutation(async ({ input }) => {
      await upsertCompra(input.produtoId, input.quantidadeCompra);
      return { success: true };
    }),

  updateComprasBatch: protectedProcedure
    .input(z.object({
      compras: z.array(z.object({
        produtoId: z.string(),
        quantidadeCompra: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      await upsertComprasBatch(input.compras);
      return { success: true };
    }),

  // --- Cotação PTAX ---
  getCotacao: protectedProcedure.query(async () => {
    return await getCotacaoPtax();
  }),

  updateCotacao: protectedProcedure
    .input(z.object({
      compra: z.number(),
      venda: z.number(),
      dataHoraCotacao: z.string(),
    }))
    .mutation(async ({ input }) => {
      await upsertCotacaoPtax(input);
      return { success: true };
    }),

  // --- Saldo Embarque ---
  listSaldoEmbarque: protectedProcedure.query(async () => {
    return await listSaldoEmbarque();
  }),

  updateSaldoEmbarque: protectedProcedure
    .input(z.object({
      processoId: z.string(),
      saldoUnidades: z.number(),
      saldoValorUsd: z.number(),
    }))
    .mutation(async ({ input }) => {
      await upsertSaldoEmbarque(input.processoId, input.saldoUnidades, input.saldoValorUsd);
      return { success: true };
    }),

  deleteSaldoEmbarque: protectedProcedure
    .input(z.object({ processoId: z.string() }))
    .mutation(async ({ input }) => {
      await deleteSaldoEmbarque(input.processoId);
      return { success: true };
    }),

  updateSaldoEmbarqueBatch: protectedProcedure
    .input(z.object({
      saldos: z.array(z.object({
        processoId: z.string(),
        saldoUnidades: z.number(),
        saldoValorUsd: z.number(),
      })),
    }))
    .mutation(async ({ input }) => {
      for (const saldo of input.saldos) {
        await upsertSaldoEmbarque(saldo.processoId, saldo.saldoUnidades, saldo.saldoValorUsd);
      }
      return { success: true };
    }),

  // --- Config JSON genérico (saldo embarques, etc) ---
  getSaldo: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(config_json).where(eq(config_json.chave, 'saldo_embarques')).limit(1);
    return rows[0] || null;
  }),

  updateSaldo: protectedProcedure
    .input(z.object({ dados: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.insert(config_json).values({
        chave: 'saldo_embarques',
        dados: input.dados,
      }).onDuplicateKeyUpdate({
        set: { dados: input.dados },
      });
      return { success: true };
    }),

  getConfig: protectedProcedure
    .input(z.object({ chave: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const rows = await db.select().from(config_json).where(eq(config_json.chave, input.chave)).limit(1);
      return rows[0] || null;
    }),

  setConfig: protectedProcedure
    .input(z.object({ chave: z.string(), dados: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      await db.insert(config_json).values({
        chave: input.chave,
        dados: input.dados,
      }).onDuplicateKeyUpdate({
        set: { dados: input.dados },
      });
      return { success: true };
    }),
});
