import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { upsertEstoque, getEstoque, getAllEstoques, upsertPreco, getPreco, getAllPrecos, criarPedido, getPedido, getAllPedidos, atualizarStatusPedido, deletarPedido } from "./db";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  estoque: router({
    upsert: protectedProcedure
      .input(z.object({ produtoId: z.string(), quantidade: z.number(), dataAtualizacao: z.date().optional() }))
      .mutation(async ({ input }) => {
        await upsertEstoque(input.produtoId, input.quantidade, input.dataAtualizacao);
        return { success: true };
      }),
    get: protectedProcedure
      .input(z.object({ produtoId: z.string() }))
      .query(async ({ input }) => {
        return await getEstoque(input.produtoId);
      }),
    getAll: protectedProcedure
      .query(async () => {
        return await getAllEstoques();
      }),
  }),

  preco: router({
    upsert: protectedProcedure
      .input(z.object({ produtoId: z.string(), custoUsd: z.number(), precoVendaBrl: z.number() }))
      .mutation(async ({ input }) => {
        await upsertPreco(input.produtoId, input.custoUsd, input.precoVendaBrl);
        return { success: true };
      }),
    get: protectedProcedure
      .input(z.object({ produtoId: z.string() }))
      .query(async ({ input }) => {
        return await getPreco(input.produtoId);
      }),
    getAll: protectedProcedure
      .query(async () => {
        return await getAllPrecos();
      }),
  }),

  pedido: router({
    criar: protectedProcedure
      .input(z.object({ nome: z.string() }))
      .mutation(async ({ input }) => {
        const result = await criarPedido(input.nome);
        return result;
      }),
    get: protectedProcedure
      .input(z.object({ pedidoId: z.number() }))
      .query(async ({ input }) => {
        return await getPedido(input.pedidoId);
      }),
    getAll: protectedProcedure
      .query(async () => {
        return await getAllPedidos();
      }),
    atualizarStatus: protectedProcedure
      .input(z.object({ pedidoId: z.number(), novoStatus: z.enum(["Pendente", "Enviado", "Recebido"]) }))
      .mutation(async ({ input }) => {
        return await atualizarStatusPedido(input.pedidoId, input.novoStatus);
      }),
    deletar: protectedProcedure
      .input(z.object({ pedidoId: z.number() }))
      .mutation(async ({ input }) => {
        return await deletarPedido(input.pedidoId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
