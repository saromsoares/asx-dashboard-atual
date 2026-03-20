import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { upsertEstoque, getEstoque, getAllEstoques, upsertPreco, getPreco, getAllPrecos, criarPedido, getPedido, getAllPedidos, atualizarStatusPedido, deletarPedido, adicionarItemPedido, removerItemPedido, getItensDoPedido, getAllItensPedidos, criarContainer, getContainer, getAllContainers, atualizarStatusContainer, deletarContainer, vincularPedidoAContainer, desvincularPedidoDoContainer, getPedidosDoContainer, getContainersComPedidos, importarProdutosDoArquivo, listarProdutos, getProduto, criarProduto, criarProcessoSR, getProcessoSR, getAllProcessosSR, atualizarProcessoSR, atualizarStatusProcessoSR, deletarProcessoSR, adicionarItemProcesso, getItensDoProcesso, atualizarItemProcesso, removerItemProcesso, getAllDebitos, criarDebito, atualizarDebito, deletarDebito, getAllPagamentos, criarPagamento, atualizarPagamento, deletarPagamento } from "./db";
import { registrarAuditoria, extrairContextoRequisicao, criarDescricaoAcao } from "./audit";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const { id, name, email, role } = opts.ctx.user;
      return { id, name, email, role };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      (ctx.res as any).clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
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
    deletar: adminProcedure
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
    adicionarBatch: protectedProcedure
      .input(z.object({
        pedidoId: z.number().int().positive(),
        itens: z.array(z.object({
          produtoId: z.string().min(1).max(100).trim(),
          quantidadeSarom: z.number().int().min(0).max(999999),
          quantidadeAlexandre: z.number().int().min(0).max(999999),
          precoUnitario: z.number().min(0).max(999999.99),
        })).min(1).max(200),
      }))
      .mutation(async ({ input }) => {
        const { executeInTransaction } = await import("./db");
        return await executeInTransaction(async () => {
          const results = [];
          for (const item of input.itens) {
            const result = await adicionarItemPedido(
              input.pedidoId,
              item.produtoId,
              item.quantidadeSarom,
              item.quantidadeAlexandre,
              item.precoUnitario
            );
            results.push(result);
          }
          return { added: results.length };
        });
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
    deletar: adminProcedure
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
      .input(z.object({ containerId: z.number().int().positive(), pedidoId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const result = await vincularPedidoAContainer(input.containerId, input.pedidoId);
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
    importarDoArquivo: adminProcedure
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
        descricaoCompleta: z.string().max(2000).trim().optional(),
        observacoes: z.string().max(2000).trim().optional(),
        fotoUrl: z.string().max(500).trim().optional(),
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
          descricaoCompleta: input.descricaoCompleta || '',
          observacoes: input.observacoes || '',
          fotoUrl: input.fotoUrl || '',
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

  processoSR: router({
    criar: protectedProcedure
      .input(z.object({
        numero: z.string().min(1).max(64).trim(),
        observacoes: z.string().max(2000).trim().optional(),
        confirmado: z.number().int().min(0).max(1).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await criarProcessoSR({
          numero: input.numero,
          status: 'Em andamento',
          confirmado: input.confirmado ?? 0,
          observacoes: input.observacoes || null,
        });
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'criou',
          entidade: 'processo_sr',
          entidadeId: String(result?.id),
          dadosNovos: JSON.stringify({ numero: input.numero }),
          descricao: criarDescricaoAcao('criou', 'processo_sr', { numero: input.numero }),
          ipAddress,
          userAgent,
        });
        return result;
      }),
    get: protectedProcedure
      .input(z.object({ processoId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return await getProcessoSR(input.processoId);
      }),
    getAll: protectedProcedure
      .query(async () => {
        return await getAllProcessosSR();
      }),
    atualizar: protectedProcedure
      .input(z.object({
        processoId: z.number().int().positive(),
        observacoes: z.string().max(2000).trim().optional(),
        confirmado: z.number().int().min(0).max(1).optional(),
        dataFechamento: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { processoId, ...data } = input;
        const updateData: any = {};
        if (data.observacoes !== undefined) updateData.observacoes = data.observacoes;
        if (data.confirmado !== undefined) updateData.confirmado = data.confirmado;
        if (data.dataFechamento !== undefined) updateData.dataFechamento = data.dataFechamento;
        const result = await atualizarProcessoSR(processoId, updateData);
        return result;
      }),
    atualizarStatus: protectedProcedure
      .input(z.object({
        processoId: z.number().int().positive(),
        novoStatus: z.enum(["Em andamento", "Finalizado", "Cancelado"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await atualizarStatusProcessoSR(input.processoId, input.novoStatus);
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'alterou_status',
          entidade: 'processo_sr',
          entidadeId: String(input.processoId),
          dadosNovos: JSON.stringify({ status: input.novoStatus }),
          descricao: criarDescricaoAcao('alterou_status', 'processo_sr', { novoStatus: input.novoStatus }),
          ipAddress,
          userAgent,
        });
        return result;
      }),
    deletar: adminProcedure
      .input(z.object({ processoId: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const processo = await getProcessoSR(input.processoId);
        const result = await deletarProcessoSR(input.processoId);
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'deletou',
          entidade: 'processo_sr',
          entidadeId: String(input.processoId),
          dadosAntigos: JSON.stringify({ numero: processo?.numero, status: processo?.status }),
          descricao: criarDescricaoAcao('deletou', 'processo_sr'),
          ipAddress,
          userAgent,
        });
        return result;
      }),
  }),

  itemProcesso: router({
    adicionar: protectedProcedure
      .input(z.object({
        processoId: z.number().int().positive(),
        codigoProduto: z.string().min(1).max(64).trim(),
        descricao: z.string().min(1).max(500).trim(),
        quantidade: z.number().int().min(0).max(999999),
        precoUnitarioUsd: z.number().min(0).max(999999.99),
      }))
      .mutation(async ({ input }) => {
        const precoTotal = input.quantidade * input.precoUnitarioUsd;
        return await adicionarItemProcesso(input.processoId, {
          codigoProduto: input.codigoProduto,
          descricao: input.descricao,
          quantidade: input.quantidade,
          precoUnitarioUsd: String(input.precoUnitarioUsd),
          precoTotalUsd: String(Math.round(precoTotal * 100) / 100),
        });
      }),
    getByProcesso: protectedProcedure
      .input(z.object({ processoId: z.number().int().positive() }))
      .query(async ({ input }) => {
        return await getItensDoProcesso(input.processoId);
      }),
    atualizar: protectedProcedure
      .input(z.object({
        itemId: z.number().int().positive(),
        processoId: z.number().int().positive(),
        quantidade: z.number().int().min(0).max(999999).optional(),
        precoUnitarioUsd: z.number().min(0).max(999999.99).optional(),
      }))
      .mutation(async ({ input }) => {
        const { itemId, processoId, ...data } = input;
        const updateData: Record<string, unknown> = {};
        if (data.quantidade !== undefined) updateData.quantidade = data.quantidade;
        if (data.precoUnitarioUsd !== undefined) updateData.precoUnitarioUsd = String(data.precoUnitarioUsd);
        // Recalcular preço total se quantidade ou preço unitário mudaram
        if (data.quantidade !== undefined || data.precoUnitarioUsd !== undefined) {
          const itensAtuais = await getItensDoProcesso(processoId);
          const itemAtual = itensAtuais.find(i => i.id === itemId);
          const qty = data.quantidade ?? (itemAtual?.quantidade ?? 0);
          const price = data.precoUnitarioUsd ?? parseFloat(String(itemAtual?.precoUnitarioUsd ?? "0"));
          updateData.precoTotalUsd = String(Math.round(qty * price * 100) / 100);
        }
        return await atualizarItemProcesso(itemId, updateData);
      }),
    remover: protectedProcedure
      .input(z.object({ itemId: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        return await removerItemProcesso(input.itemId);
      }),
  }),

  debito: router({
    getAll: protectedProcedure.query(async () => getAllDebitos()),
    criar: protectedProcedure
      .input(z.object({
        descricao: z.string().min(1).max(255).trim(),
        valor: z.number().min(0).max(99999999.99),
        moeda: z.string().max(10).trim().optional(),
        dataVencimento: z.string().trim(),
        pago: z.number().int().min(0).max(1).default(0),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await criarDebito({
          descricao: input.descricao,
          valor: String(input.valor),
          moeda: input.moeda || 'USD',
          dataVencimento: new Date(input.dataVencimento),
          pago: input.pago,
        });
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'criou',
          entidade: 'debito',
          entidadeId: String(result.id),
          dadosNovos: JSON.stringify(input),
          descricao: criarDescricaoAcao('criou', 'debito'),
          ipAddress,
          userAgent,
        });
        return result;
      }),
    atualizar: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        descricao: z.string().min(1).max(255).trim().optional(),
        valor: z.number().min(0).max(99999999.99).optional(),
        moeda: z.string().max(10).trim().optional(),
        dataVencimento: z.string().trim().optional(),
        pago: z.number().int().min(0).max(1).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, valor, dataVencimento, ...rest } = input;
        const updateData: Record<string, unknown> = { ...rest };
        if (valor !== undefined) updateData.valor = String(valor);
        if (dataVencimento !== undefined) updateData.dataVencimento = new Date(dataVencimento);
        const result = await atualizarDebito(id, updateData);
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'atualizou',
          entidade: 'debito',
          entidadeId: String(id),
          dadosNovos: JSON.stringify(updateData),
          descricao: criarDescricaoAcao('atualizou', 'debito'),
          ipAddress,
          userAgent,
        });
        return result;
      }),
    deletar: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const result = await deletarDebito(input.id);
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'deletou',
          entidade: 'debito',
          entidadeId: String(input.id),
          descricao: criarDescricaoAcao('deletou', 'debito'),
          ipAddress,
          userAgent,
        });
        return result;
      }),
  }),

  pagamento: router({
    getAll: protectedProcedure.query(async () => getAllPagamentos()),
    criar: protectedProcedure
      .input(z.object({
        debitoId: z.number().int().positive().optional(),
        valor: z.number().min(0).max(99999999.99),
        dataPagamento: z.string().trim(),
        observacoes: z.string().max(2000).trim().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await criarPagamento({
          debitoId: input.debitoId,
          valor: String(input.valor),
          dataPagamento: new Date(input.dataPagamento),
          observacoes: input.observacoes || null,
        });
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'criou',
          entidade: 'pagamento',
          entidadeId: String(result.id),
          dadosNovos: JSON.stringify(input),
          descricao: criarDescricaoAcao('criou', 'pagamento'),
          ipAddress,
          userAgent,
        });
        return result;
      }),
    atualizar: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        debitoId: z.number().int().positive().optional(),
        valor: z.number().min(0).max(99999999.99).optional(),
        dataPagamento: z.string().trim().optional(),
        observacoes: z.string().max(2000).trim().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, valor, dataPagamento, ...rest } = input;
        const updateData: Record<string, unknown> = { ...rest };
        if (valor !== undefined) updateData.valor = String(valor);
        if (dataPagamento !== undefined) updateData.dataPagamento = new Date(dataPagamento);
        const result = await atualizarPagamento(id, updateData as any);
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'atualizou',
          entidade: 'pagamento',
          entidadeId: String(id),
          dadosNovos: JSON.stringify(updateData),
          descricao: criarDescricaoAcao('atualizou', 'pagamento'),
          ipAddress,
          userAgent,
        });
        return result;
      }),
    deletar: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        const result = await deletarPagamento(input.id);
        const { ipAddress, userAgent } = extrairContextoRequisicao(ctx.req);
        await registrarAuditoria({
          userId: ctx.user.id,
          acao: 'deletou',
          entidade: 'pagamento',
          entidadeId: String(input.id),
          descricao: criarDescricaoAcao('deletou', 'pagamento'),
          ipAddress,
          userAgent,
        });
        return result;
      }),
  }),
});
export type AppRouter = typeof appRouter;
