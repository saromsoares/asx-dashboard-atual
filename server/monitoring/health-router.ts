import { router, publicProcedure, protectedProcedure } from '../_core/trpc';
import { checkDatabaseHealth, generateHealthReport } from './db-health-check';

export const healthRouter = router({
  /**
   * Verifica a saúde do banco de dados
   * Público para permitir monitoramento externo
   */
  checkDatabase: publicProcedure.query(async () => {
    return await checkDatabaseHealth();
  }),

  /**
   * Gera relatório de saúde do banco de dados
   * Apenas para usuários autenticados
   */
  getHealthReport: protectedProcedure.query(async ({ ctx }) => {
    // Apenas admins podem ver relatórios
    if (ctx.user?.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }
    return await generateHealthReport();
  }),

  /**
   * Status geral do sistema
   */
  getSystemStatus: publicProcedure.query(async () => {
    const dbHealth = await checkDatabaseHealth();
    
    return {
      timestamp: new Date().toISOString(),
      database: dbHealth.status,
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed / 1024 / 1024,
        total: process.memoryUsage().heapTotal / 1024 / 1024,
      },
      message: dbHealth.message,
    };
  }),
});
