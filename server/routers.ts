import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { upsertEstoque, getEstoque, getAllEstoques, upsertPreco, getPreco, getAllPrecos, criarPedido, getPedido, getAllPedidos, atualizarStatusPedido, deletarPedido, criarContainer, getContainer, getAllContainers, atualizarStatusContainer, deletarContainer, vincularPedidoAContainer, desvincularPedidoDoContainer, getPedidosDoContainer, getContainersComPedidos } from "./db";
import { registrarAuditoria, extrairContextoRequisicao, criarDescricaoAcao } from "./audit";

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
      .mutation(async ({ input, ctx }) => {
        const result = await criarPedido(input.nome);
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        if (result) {
          await registrarAuditoria({
            userId: ctx.user.id,
            acao: 'criou',
            entidade: 'pedido',
            entidadeId: String(result.id),
          dadosNovos: JSON.stringify({ nome: input.nome, status: 'Pendente' }),
            descricao: criarDescricaoAcao('criou', 'pedido'),
            ipAddress,
            userAgent,
          });
        }
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
      .input(z.object({ pedidoId: z.number(), novoStatus: z.enum(["Pendente", "Confirmado", "Recebido"]) }))
      .mutation(async ({ input, ctx }) => {
        const pedidoAnterior = await getPedido(input.pedidoId);
        const result = await atualizarStatusPedido(input.pedidoId, input.novoStatus);
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'alterou_status',
          entidade: 'pedido',
          entidadeId: String(input.pedidoId),
          dadosAntigos: JSON.stringify({ status: pedidoAnterior?.status }),
          dadosNovos: JSON.stringify({ status: input.novoStatus }),
          descricao: criarDescricaoAcao('alterou_status', 'pedido', { novoStatus: input.novoStatus }),
          ipAddress,
          userAgent,
        });
        return result;
      }),
    deletar: protectedProcedure
      .input(z.object({ pedidoId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const pedido = await getPedido(input.pedidoId);
        const result = await deletarPedido(input.pedidoId);
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'deletou',
          entidade: 'pedido',
          entidadeId: String(input.pedidoId),
          dadosAntigos: JSON.stringify({ nome: pedido?.nome, status: pedido?.status }),
          descricao: criarDescricaoAcao('deletou', 'pedido'),
          ipAddress,
          userAgent,
        });
        return result;
      }),
  }),

  container: router({
    criar: protectedProcedure
      .input(z.object({ numero: z.string(), capacidadeMaxima: z.number().optional(), pesoMaximo: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const result = await criarContainer(input.numero, input.capacidadeMaxima, input.pesoMaximo);
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'criou',
          entidade: 'container',
          entidadeId: String(result?.id),
          dadosNovos: JSON.stringify({ numero: input.numero, status: 'Vazio' }),
          descricao: criarDescricaoAcao('criou', 'container', { numero: input.numero }),
          ipAddress,
          userAgent,
        });
        return result;
      }),
    get: protectedProcedure
      .input(z.object({ containerId: z.number() }))
      .query(async ({ input }) => {
        return await getContainer(input.containerId);
      }),
    getAll: protectedProcedure
      .query(async () => {
        return await getAllContainers();
      }),
    getAllComPedidos: protectedProcedure
      .query(async () => {
        return await getContainersComPedidos();
      }),
    atualizarStatus: protectedProcedure
      .input(z.object({ containerId: z.number(), novoStatus: z.enum(["Vazio", "Preenchendo", "Cheio", "Enviado", "Entregue"]) }))
      .mutation(async ({ input, ctx }) => {
        const result = await atualizarStatusContainer(input.containerId, input.novoStatus);
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'alterou_status',
          entidade: 'container',
          entidadeId: String(input.containerId),
          dadosNovos: JSON.stringify({ novoStatus: input.novoStatus }),
          descricao: criarDescricaoAcao('alterou_status', 'container', { novoStatus: input.novoStatus }),
          ipAddress,
          userAgent,
        });
        return result;
      }),
    deletar: protectedProcedure
      .input(z.object({ containerId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const container = await getContainer(input.containerId);
        const result = await deletarContainer(input.containerId);
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'deletou',
          entidade: 'container',
          entidadeId: String(input.containerId),
          dadosAntigos: JSON.stringify({ numero: container?.numero, status: container?.status }),
          descricao: criarDescricaoAcao('deletou', 'container'),
          ipAddress,
          userAgent,
        });
        return result;
      }),
  }),

  containerPedido: router({
    vincular: protectedProcedure
      .input(z.object({ containerId: z.number(), pedidoId: z.number(), sequencia: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        const result = await vincularPedidoAContainer(input.containerId, input.pedidoId, input.sequencia);
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'vinculou_pedido',
          entidade: 'container_pedido',
          entidadeId: String(result?.id),
          dadosNovos: JSON.stringify({ containerId: input.containerId, pedidoId: input.pedidoId }),
          descricao: criarDescricaoAcao('vinculou_pedido', 'container', { containerId: input.containerId, pedidoId: input.pedidoId }),
          ipAddress,
          userAgent,
        });
        return result;
      }),
    desvincular: protectedProcedure
      .input(z.object({ containerPedidoId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const result = await desvincularPedidoDoContainer(input.containerPedidoId);
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'desvinculou_pedido',
          entidade: 'container_pedido',
          entidadeId: String(input.containerPedidoId),
          descricao: criarDescricaoAcao('desvinculou_pedido', 'container'),
          ipAddress,
          userAgent,
        });
        return result;
      }),
    getPedidos: protectedProcedure
      .input(z.object({ containerId: z.number() }))
      .query(async ({ input }) => {
        return await getPedidosDoContainer(input.containerId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
