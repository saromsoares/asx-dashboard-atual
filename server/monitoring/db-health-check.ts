import { getDb } from '../db';
import { notifyOwner } from '../_core/notification';
import { format } from 'date-fns';
import { sql } from 'drizzle-orm';

export interface HealthCheckResult {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  details: {
    connectionTime: number;
    tableCount: number;
    lastError?: string;
  };
}

/**
 * Verifica a saúde do banco de dados
 * - Testa conexão
 * - Conta tabelas
 * - Verifica integridade básica
 */
export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const result: HealthCheckResult = {
    timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    status: 'healthy',
    message: 'Database is healthy',
    details: {
      connectionTime: 0,
      tableCount: 0,
    },
  };

  try {
    const db = await getDb();
    if (!db) {
      throw new Error('Database connection not available');
    }

    // Teste 1: Conexão básica
    const pingStart = Date.now();
    const pingResult = await db.execute('SELECT 1 as ping');
    result.details.connectionTime = Date.now() - pingStart;

    if (!pingResult) {
      throw new Error('Ping query returned no result');
    }

    // Teste 2: Contar tabelas
    const tablesResult = await db.execute(
      sql`SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = DATABASE()`
    ) as any[];
    
    const tableCount = tablesResult?.[0]?.count || 0;
    result.details.tableCount = tableCount;

    if (tableCount === 0) {
      result.status = 'degraded';
      result.message = 'Warning: No tables found in database';
    }

    // Teste 3: Verificar tabelas críticas
    const criticalTables = [
      'produtos',
      'pedidos',
      'users',
      'containers',
      'itens_pedidos',
    ];

    const missingTables: string[] = [];
    for (const table of criticalTables) {
      const checkResult = await db.execute(
        sql`SELECT 1 FROM information_schema.tables 
         WHERE table_schema = DATABASE() AND table_name = ${table}`
      ) as any[];
      
      if (!checkResult || checkResult.length === 0) {
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      result.status = 'degraded';
      result.message = `Missing critical tables: ${missingTables.join(', ')}`;
    }

    const totalTime = Date.now() - startTime;
    console.log(
      `[DB Health Check] ${result.status.toUpperCase()} - ${result.message} (${totalTime}ms)`
    );

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.status = 'unhealthy';
    result.message = `Database health check failed: ${errorMessage}`;
    result.details.lastError = errorMessage;

    console.error('[DB Health Check] UNHEALTHY:', errorMessage);

    // Notificar o proprietário sobre o problema
    try {
      await notifyOwner({
        title: '🚨 ASX Dashboard - Database Health Check Failed',
        content: `
The database health check failed at ${result.timestamp}.

**Error:** ${errorMessage}

**Details:**
- Connection Time: ${result.details.connectionTime}ms
- Table Count: ${result.details.tableCount}

**Action Required:** Please check the database connection and logs immediately.
        `.trim(),
      });
    } catch (notifyError) {
      console.error('[DB Health Check] Failed to send notification:', notifyError);
    }

    return result;
  }
}

/**
 * Monitora o banco de dados continuamente
 * Executa verificações em intervalos regulares
 */
export async function startDatabaseMonitoring(intervalMinutes: number = 60) {
  console.log(`[DB Monitoring] Starting database health checks every ${intervalMinutes} minutes`);

  // Executa verificação imediatamente
  await checkDatabaseHealth();

  // Agenda verificações periódicas
  setInterval(async () => {
    await checkDatabaseHealth();
  }, intervalMinutes * 60 * 1000);
}

/**
 * Gera relatório de saúde do banco de dados
 */
export async function generateHealthReport(): Promise<string> {
  const health = await checkDatabaseHealth();
  
  return `
# Database Health Report
Generated: ${health.timestamp}

## Status: ${health.status.toUpperCase()}
${health.message}

## Details
- Connection Time: ${health.details.connectionTime}ms
- Table Count: ${health.details.tableCount}
${health.details.lastError ? `- Last Error: ${health.details.lastError}` : ''}
  `.trim();
}
