import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  getPreferenciaUsuario,
  upsertPreferenciaUsuario,
  listEstoquesUsuario,
  upsertEstoqueUsuario,
  listCustosProdutos,
  upsertCustoProduto,
  getCustoProduto,
} from "../db";

/**
 * Router para migração de dados do localStorage para banco de dados
 */
export const migracaoRouter = router({
  /**
   * Obter preferências do usuário (taxa de câmbio customizada)
   */
  getPreferencias: protectedProcedure.query(async ({ ctx }) => {
    return await getPreferenciaUsuario(ctx.user.id);
  }),

  /**
   * Atualizar preferências do usuário
   */
  updatePreferencias: protectedProcedure
    .input(
      z.object({
        taxaCambioCustomizada: z.number().optional(),
        usarTaxaCustomizada: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await upsertPreferenciaUsuario(ctx.user.id, {
        taxaCambioCustomizada: input.taxaCambioCustomizada?.toString(),
        usarTaxaCustomizada: input.usarTaxaCustomizada ? 1 : 0,
      });
    }),

  /**
   * Obter todos os estoques do usuário
   */
  getEstoques: protectedProcedure.query(async ({ ctx }) => {
    return await listEstoquesUsuario(ctx.user.id);
  }),

  /**
   * Atualizar estoque de um produto
   */
  updateEstoque: protectedProcedure
    .input(
      z.object({
        produtoId: z.string(),
        quantidade: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await upsertEstoqueUsuario(ctx.user.id, input.produtoId, input.quantidade);
    }),

  /**
   * Atualizar múltiplos estoques de uma vez (para migração em lote)
   */
  updateEstoquesBatch: protectedProcedure
    .input(
      z.object({
        estoques: z.array(
          z.object({
            produtoId: z.string(),
            quantidade: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const results = [];
      for (const estoque of input.estoques) {
        const result = await upsertEstoqueUsuario(ctx.user.id, estoque.produtoId, estoque.quantidade);
        results.push(result);
      }
      return results;
    }),

  /**
   * Obter custo em USD de um produto
   */
  getCusto: protectedProcedure
    .input(z.object({ produtoId: z.string() }))
    .query(async ({ input }) => {
      return await getCustoProduto(input.produtoId);
    }),

  /**
   * Atualizar custo em USD de um produto
   */
  updateCusto: protectedProcedure
    .input(
      z.object({
        produtoId: z.string(),
        custoUsd: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await upsertCustoProduto(input.produtoId, input.custoUsd);
    }),

  /**
   * Atualizar múltiplos custos de uma vez (para migração em lote)
   */
  updateCustosBatch: protectedProcedure
    .input(
      z.object({
        custos: z.array(
          z.object({
            produtoId: z.string(),
            custoUsd: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const results = [];
      for (const custo of input.custos) {
        const result = await upsertCustoProduto(custo.produtoId, custo.custoUsd);
        results.push(result);
      }
      return results;
    }),

  /**
   * Listar todos os custos de produtos
   */
  listCustos: protectedProcedure.query(async () => {
    return await listCustosProdutos();
  }),
});
