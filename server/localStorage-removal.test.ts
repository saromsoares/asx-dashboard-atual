import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Testes para garantir que localStorage foi completamente removido
 * do código de produção (exceto auth core que precisa limpar sessão)
 */

function findFilesRecursive(dir: string, ext: string[]): string[] {
  const results: string[] = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory() && !item.name.includes('node_modules') && !item.name.includes('.manus')) {
      results.push(...findFilesRecursive(fullPath, ext));
    } else if (item.isFile() && ext.some(e => item.name.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('localStorage Removal Verification', () => {
  const clientSrcDir = path.resolve(__dirname, '../client/src');

  it('não deve ter localStorage.getItem em hooks de produção', () => {
    const hookFiles = findFilesRecursive(path.join(clientSrcDir, 'hooks'), ['.ts', '.tsx'])
      .filter(f => !f.includes('.test.'));
    
    const violations: string[] = [];
    for (const file of hookFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('localStorage.getItem') || content.includes('localStorage.setItem')) {
        violations.push(path.relative(clientSrcDir, file));
      }
    }
    
    expect(violations).toEqual([]);
  });

  it('não deve ter localStorage.getItem em páginas de produção', () => {
    const pageFiles = findFilesRecursive(path.join(clientSrcDir, 'pages'), ['.ts', '.tsx'])
      .filter(f => !f.includes('.test.'));
    
    const violations: string[] = [];
    for (const file of pageFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('localStorage.getItem') || content.includes('localStorage.setItem')) {
        violations.push(path.relative(clientSrcDir, file));
      }
    }
    
    expect(violations).toEqual([]);
  });

  it('não deve ter localStorage.getItem em componentes de produção', () => {
    const componentFiles = findFilesRecursive(path.join(clientSrcDir, 'components'), ['.ts', '.tsx'])
      .filter(f => !f.includes('.test.'));
    
    const violations: string[] = [];
    for (const file of componentFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('localStorage.getItem') || content.includes('localStorage.setItem')) {
        violations.push(path.relative(clientSrcDir, file));
      }
    }
    
    expect(violations).toEqual([]);
  });

  it('não deve ter localStorage em contexts de produção', () => {
    const contextFiles = findFilesRecursive(path.join(clientSrcDir, 'contexts'), ['.ts', '.tsx'])
      .filter(f => !f.includes('.test.'));
    
    const violations: string[] = [];
    for (const file of contextFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes('localStorage.getItem') || content.includes('localStorage.setItem')) {
        violations.push(path.relative(clientSrcDir, file));
      }
    }
    
    expect(violations).toEqual([]);
  });

  it('hooks antigos devem ter sido removidos', () => {
    const oldHooks = [
      'hooks/useCustos.ts',
      'hooks/useEstoque.ts',
      'hooks/useIdioma.ts',
      'hooks/useMigrateFromLocalStorage.ts',
    ];
    
    for (const hook of oldHooks) {
      const fullPath = path.join(clientSrcDir, hook);
      expect(fs.existsSync(fullPath), `${hook} should be deleted`).toBe(false);
    }
  });

  it('hooks novos com tRPC devem existir', () => {
    const newHooks = [
      'hooks/useCustosDB.ts',
      'hooks/useEstoqueDB.ts',
      'hooks/useIdiomaDB.ts',
      'hooks/useImageUpload.ts',
      'hooks/useEmbarques.ts',
    ];
    
    for (const hook of newHooks) {
      const fullPath = path.join(clientSrcDir, hook);
      expect(fs.existsSync(fullPath), `${hook} should exist`).toBe(true);
    }
  });

  it('novos hooks devem importar trpc', () => {
    const newHooks = [
      'hooks/useCustosDB.ts',
      'hooks/useEstoqueDB.ts',
      'hooks/useIdiomaDB.ts',
      'hooks/useImageUpload.ts',
      'hooks/useEmbarques.ts',
    ];
    
    for (const hook of newHooks) {
      const fullPath = path.join(clientSrcDir, hook);
      const content = fs.readFileSync(fullPath, 'utf-8');
      expect(content.includes('trpc'), `${hook} should import trpc`).toBe(true);
    }
  });

  it('App.tsx não deve importar hooks de migração', () => {
    const appPath = path.join(clientSrcDir, 'App.tsx');
    const content = fs.readFileSync(appPath, 'utf-8');
    expect(content.includes('useMigracaoLocalStorage')).toBe(false);
    expect(content.includes('useMigrateFromLocalStorage')).toBe(false);
  });
});
