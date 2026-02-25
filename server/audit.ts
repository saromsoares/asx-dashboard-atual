import { getDb, type Transaction } from './db';
import { auditLogs } from '../drizzle/schema';
import type { InsertAuditLog } from '../drizzle/schema';

/**
 * Registra uma ação de auditoria no banco de dados
 * @param tx - Transação opcional (se fornecida, usa a transação; caso contrário, usa db padrão)
 */
export async function registrarAuditoria(
  {
    userId,
    acao,
    entidade,
    entidadeId,
    dadosAntigos,
    dadosNovos,
    descricao,
    ipAddress,
    userAgent,
  }: Omit<InsertAuditLog, 'criadoEm'>,
  tx?: Transaction
) {
  try {
    // Se tx foi fornecida, usar a transação; caso contrário, usar db padrão
    const db = tx || (await getDb());
    if (!db) {
      console.warn('[Auditoria] Database não disponível');
      return;
    }
    await db.insert(auditLogs).values({
      userId,
      acao,
      entidade,
      entidadeId,
      dadosAntigos: dadosAntigos ? JSON.stringify(dadosAntigos) : null,
      dadosNovos: dadosNovos ? JSON.stringify(dadosNovos) : null,
      descricao,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
    // Não lançar erro para não interromper a operação principal
  }
}

/**
 * Extrai informações do contexto da requisição
 */
export function extrairContextoRequisicao(req: any) {
  const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'desconhecido';
  const userAgent = req.headers['user-agent'] || 'desconhecido';
  return { ipAddress, userAgent };
}

/**
 * Cria uma descrição legível da ação
 */
export function criarDescricaoAcao(acao: string, entidade: string, dados?: any): string {
  const acoes: Record<string, string> = {
    criou: 'Criou',
    atualizou: 'Atualizou',
    deletou: 'Deletou',
    alterou_status: 'Alterou status de',
    adicionou: 'Adicionou',
    removeu: 'Removeu',
  };

  const entidades: Record<string, string> = {
    pedido: 'Pedido',
    item_pedido: 'Item do Pedido',
    estoque: 'Estoque',
    preco: 'Preço',
  };

  const acaoTexto = acoes[acao] || acao;
  const entidadeTexto = entidades[entidade] || entidade;

  if (acao === 'alterou_status' && dados?.novoStatus) {
    return `${acaoTexto} ${entidadeTexto} para: ${dados.novoStatus}`;
  }

  return `${acaoTexto} ${entidadeTexto}`;
}
