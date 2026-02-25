import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { upsertEstoque, getEstoque, getAllEstoques, upsertPreco, getPreco, getAllPrecos, criarPedido, getPedido, getAllPedidos, atualizarStatusPedido, deletarPedido, adicionarItemPedido, removerItemPedido, getItensDoPedido, getAllItensPedidos, criarContainer, getContainer, getAllContainers, atualizarStatusContainer, deletarContainer, vincularPedidoAContainer, desvincularPedidoDoContainer, getPedidosDoContainer, getContainersComPedidos, importarProdutosDoArquivo, listarProdutos, getProduto, criarProduto } from "./db";
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
      .input(z.object({ produtoId: z.string().min(1).max(100).trim(), quantidade: z.number().int().min(0).max(999999), dataAtualizacao: z.date().optional() }))
      .mutation(async ({ input }) => {
        await upsertEstoque(input.produtoId, input.quantidade, input.dataAtualizacao);
        return { success: true };
      }),
    get: protectedProcedure
      .input(z.object({ produtoId: z.string().min(1).max(100).trim() }))
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
      .input(z.object({ produtoId: z.string().min(1).max(100).trim(), custoUsd: z.number().min(0).multipleOf(0.01).max(999999.99), precoVendaBrl: z.number().min(0).multipleOf(0.01).max(999999.99) }))
      .mutation(async ({ input }) => {
        await upsertPreco(input.produtoId, input.custoUsd, input.precoVendaBrl);
        return { success: true };
      }),
    get: protectedProcedure
      .input(z.object({ produtoId: z.string().min(1).max(100).trim() }))
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
      .input(z.object({ nome: z.string().min(1).max(255).trim() }))
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
      .input(z.object({ pedidoId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return await getPedido(input.pedidoId);
      }),
    getAll: protectedProcedure
      .query(async () => {
        return await getAllPedidos();
      }),
    atualizarStatus: protectedProcedure
      .input(z.object({ pedidoId: z.number().int().positive(), novoStatus: z.enum(["Pendente", "Confirmado", "Recebido"]) }))
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
      .input(z.object({ pedidoId: z.number().int().positive() }))
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

  itemPedido: router({
    adicionar: protectedProcedure
      .input(z.object({
        pedidoId: z.number().int().positive(),
        produtoId: z.string().min(1).max(100).trim(),
        quantidadeSarom: z.number().int().min(0).max(999999),
        quantidadeAlexandre: z.number().int().min(0).max(999999),
        precoUnitario: z.number().min(0).max(999999.99),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await adicionarItemPedido(
          input.pedidoId,
          input.produtoId,
          input.quantidadeSarom,
          input.quantidadeAlexandre,
          input.precoUnitario
        );
        return result;
      }),
    remover: protectedProcedure
      .input(z.object({ itemId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        return await removerItemPedido(input.itemId);
      }),
    getByPedido: protectedProcedure
      .input(z.object({ pedidoId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return await getItensDoPedido(input.pedidoId);
      }),
    getAll: protectedProcedure
      .query(async () => {
        return await getAllItensPedidos();
      }),
  }),

  container: router({
    criar: protectedProcedure
      .input(z.object({ numero: z.string().min(1).max(100).trim(), capacidadeMaxima: z.number().int().positive().max(999999).optional(), pesoMaximo: z.number().positive().max(999999.99).optional() }))
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
      .input(z.object({ containerId: z.number().int().positive() }))
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
      .input(z.object({ containerId: z.number().int().positive(), novoStatus: z.enum(["Vazio", "Preenchendo", "Cheio", "Enviado", "Entregue"]) }))
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
      .input(z.object({ containerId: z.number().int().positive() }))
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
      .input(z.object({ containerId: z.number().int().positive(), pedidoId: z.number().int().positive(), sequencia: z.number().int().min(0).optional() }))
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
      .input(z.object({ containerPedidoId: z.number().int().positive() }))
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
      .input(z.object({ containerId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return await getPedidosDoContainer(input.containerId);
       }),
  }),

  produto: router({
    importarDoArquivo: protectedProcedure
      .mutation(async ({ ctx }) => {
        const result = await importarProdutosDoArquivo();
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'importou_produtos',
          entidade: 'produto',
          entidadeId: 'batch',
          dadosNovos: JSON.stringify({ sucessoCount: result.sucesso, erroCount: result.erro }),
          descricao: criarDescricaoAcao('importou', 'produtos', { total: result.sucesso }),
          ipAddress,
          userAgent,
        });
        return result;
      }),
    listar: protectedProcedure
      .query(async () => {
        return await listarProdutos();
      }),
    get: protectedProcedure
      .input(z.object({ produtoId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return await getProduto(input.produtoId);
      }),
    criar: protectedProcedure
      .input(z.object({
        codigo: z.string().min(1).max(100).trim(),
        descricao: z.string().min(1).max(500).trim(),
        categoria: z.string().min(1).max(100).trim(),
        unidade: z.string().max(50).trim().optional(),
        caixa: z.string().max(50).trim().optional(),
        voltagem: z.string().max(50).trim().optional(),
        codigoBarras: z.string().max(50).trim().optional(),
        ncm: z.string().max(20).trim().optional(),
        custoUsd: z.number().min(0).multipleOf(0.01).max(999999.99).optional(),
        precoVendaBrl: z.number().min(0).multipleOf(0.01).max(999999.99).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await criarProduto({
          codigo: input.codigo,
          descricao: input.descricao,
          categoria: input.categoria,
          unidade: input.unidade || 'UND',
          caixa: input.caixa || 'PAR',
          voltagem: input.voltagem || 'BIVOLT',
          codigoBarras: input.codigoBarras || null,
          ncm: input.ncm || null,
          custoUsd: String(input.custoUsd || 0),
          precoVendaBrl: String(input.precoVendaBrl || 0),
          ativo: 'true',
        });
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'criou',
          entidade: 'produto',
          entidadeId: String(result?.id),
          dadosNovos: JSON.stringify({ codigo: input.codigo, descricao: input.descricao }),
          descricao: criarDescricaoAcao('criou', 'produto', { codigo: input.codigo }),
          ipAddress,
          userAgent,
        });
        return result;
      }),
  }),
});
export type AppRouter = typeof appRouter;
