import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db functions
vi.mock("./db", () => ({
  upsertEstoque: vi.fn(),
  getEstoque: vi.fn(),
  getAllEstoques: vi.fn().mockResolvedValue([]),
  upsertPreco: vi.fn(),
  getPreco: vi.fn(),
  getAllPrecos: vi.fn().mockResolvedValue([]),
  criarPedido: vi.fn().mockResolvedValue({ id: 1, nome: "Test", status: "Pendente", dataCreacao: new Date(), dataAtualizacao: new Date() }),
  getPedido: vi.fn().mockResolvedValue({ id: 1, nome: "Test", status: "Pendente" }),
  getAllPedidos: vi.fn().mockResolvedValue([{ id: 1, nome: "Test", status: "Pendente", dataCreacao: new Date(), dataAtualizacao: new Date() }]),
  atualizarStatusPedido: vi.fn().mockResolvedValue({ success: true }),
  deletarPedido: vi.fn().mockResolvedValue({ success: true }),
  adicionarItemPedido: vi.fn().mockResolvedValue({ id: 1, updated: false }),
  removerItemPedido: vi.fn().mockResolvedValue({ success: true }),
  getItensDoPedido: vi.fn().mockResolvedValue([
    { id: 1, pedidoId: 1, produtoId: "ASX1001", quantidadeSarom: 10, quantidadeAlexandre: 5, precoUnitario: "3.40", dataAdicao: new Date() }
  ]),
  getAllItensPedidos: vi.fn().mockResolvedValue([
    { id: 1, pedidoId: 1, produtoId: "ASX1001", quantidadeSarom: 10, quantidadeAlexandre: 5, precoUnitario: "3.40", dataAdicao: new Date() }
  ]),
  criarContainer: vi.fn().mockResolvedValue({ id: 1, numero: "CONT-001" }),
  getContainer: vi.fn(),
  getAllContainers: vi.fn().mockResolvedValue([]),
  atualizarStatusContainer: vi.fn(),
  deletarContainer: vi.fn(),
  vincularPedidoAContainer: vi.fn().mockResolvedValue({ success: true, id: 1 }),
  desvincularPedidoDoContainer: vi.fn().mockResolvedValue({ success: true }),
  getPedidosDoContainer: vi.fn().mockResolvedValue([
    { id: 1, containerId: 1, pedidoId: 1, sequencia: 0, dataVinculacao: new Date(), pedidoNome: "Test", pedidoStatus: "Confirmado" }
  ]),
  getContainersComPedidos: vi.fn().mockResolvedValue([]),
  importarProdutosDoArquivo: vi.fn(),
  listarProdutos: vi.fn().mockResolvedValue([]),
  getProduto: vi.fn(),
  criarProduto: vi.fn(),
}));

vi.mock("./audit", () => ({
  registrarAuditoria: vi.fn().mockResolvedValue(undefined),
  extrairContextoRequisicao: vi.fn().mockReturnValue({ ip: "127.0.0.1", userAgent: "test" }),
  criarDescricaoAcao: vi.fn().mockReturnValue("test action"),
}));

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "sample-user",
      email: "sample@example.com",
      name: "Sample User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("itemPedido routes", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    caller = appRouter.createCaller(createAuthContext());
  });

  it("adicionar - adds item to pedido", async () => {
    const result = await caller.itemPedido.adicionar({
      pedidoId: 1,
      produtoId: "ASX1001",
      quantidadeSarom: 10,
      quantidadeAlexandre: 5,
      precoUnitario: 3.40,
    });

    expect(result).toEqual({ id: 1, updated: false });
  });

  it("adicionar - rejects empty produtoId", async () => {
    await expect(
      caller.itemPedido.adicionar({
        pedidoId: 1,
        produtoId: "",
        quantidadeSarom: 10,
        quantidadeAlexandre: 5,
        precoUnitario: 3.40,
      })
    ).rejects.toThrow();
  });

  it("adicionar - rejects negative quantities", async () => {
    await expect(
      caller.itemPedido.adicionar({
        pedidoId: 1,
        produtoId: "ASX1001",
        quantidadeSarom: -1,
        quantidadeAlexandre: 5,
        precoUnitario: 3.40,
      })
    ).rejects.toThrow();
  });

  it("remover - removes item from pedido", async () => {
    const result = await caller.itemPedido.remover({ itemId: 1 });
    expect(result).toEqual({ success: true });
  });

  it("getByPedido - returns items for a pedido", async () => {
    const result = await caller.itemPedido.getByPedido({ pedidoId: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].produtoId).toBe("ASX1001");
    expect(result[0].quantidadeSarom).toBe(10);
  });

  it("getAll - returns all items", async () => {
    const result = await caller.itemPedido.getAll();
    expect(result).toHaveLength(1);
  });
});

describe("containerPedido routes", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    caller = appRouter.createCaller(createAuthContext());
  });

  it("vincular - links pedido to container", async () => {
    const result = await caller.containerPedido.vincular({
      containerId: 1,
      pedidoId: 1,
    });
    expect(result).toEqual({ success: true, id: 1 });
  });

  it("desvincular - unlinks pedido from container", async () => {
    const result = await caller.containerPedido.desvincular({
      containerPedidoId: 1,
    });
    expect(result).toEqual({ success: true });
  });

  it("getPedidos - returns pedidos with names for a container", async () => {
    const result = await caller.containerPedido.getPedidos({
      containerId: 1,
    });
    expect(result).toHaveLength(1);
    expect(result[0].pedidoNome).toBe("Test");
    expect(result[0].pedidoStatus).toBe("Confirmado");
  });
});
