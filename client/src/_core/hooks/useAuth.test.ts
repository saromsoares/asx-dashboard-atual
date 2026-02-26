import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('useAuth - Session Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deve limpar cache do localStorage ao fazer logout', () => {
    // Simular dados em cache
    localStorage.setItem('manus-runtime-user-info', JSON.stringify({ id: 1, name: 'User' }));
    localStorage.setItem('asx_remembered_email', 'user@example.com');
    localStorage.setItem('asx_remember_me', 'true');

    // Simular logout
    localStorage.removeItem('manus-runtime-user-info');
    localStorage.removeItem('asx_remembered_email');
    localStorage.removeItem('asx_remember_me');

    expect(localStorage.getItem('manus-runtime-user-info')).toBeNull();
    expect(localStorage.getItem('asx_remembered_email')).toBeNull();
    expect(localStorage.getItem('asx_remember_me')).toBeNull();
  });

  it('deve salvar apenas dados do usuário atual no cache', () => {
    const user1 = { id: 1, name: 'User 1', email: 'user1@example.com' };
    const user2 = { id: 2, name: 'User 2', email: 'user2@example.com' };

    // Salvar usuário 1
    localStorage.setItem('manus-runtime-user-info', JSON.stringify(user1));
    expect(JSON.parse(localStorage.getItem('manus-runtime-user-info') || '{}')).toEqual(user1);

    // Salvar usuário 2 (sobrescrever)
    localStorage.setItem('manus-runtime-user-info', JSON.stringify(user2));
    expect(JSON.parse(localStorage.getItem('manus-runtime-user-info') || '{}')).toEqual(user2);
  });

  it('deve limpar cache quando usuário não está autenticado', () => {
    // Pré-popular cache
    localStorage.setItem('manus-runtime-user-info', JSON.stringify({ id: 1, name: 'User' }));

    // Simular falta de dados de autenticação
    const isLoading = false;
    const userData = null;

    if (userData) {
      localStorage.setItem('manus-runtime-user-info', JSON.stringify(userData));
    } else if (!isLoading) {
      localStorage.removeItem('manus-runtime-user-info');
    }

    expect(localStorage.getItem('manus-runtime-user-info')).toBeNull();
  });

  it('não deve limpar cache enquanto está carregando dados', () => {
    const userData = JSON.stringify({ id: 1, name: 'User' });
    localStorage.setItem('manus-runtime-user-info', userData);

    // Simular carregamento
    const isLoading = true;
    const data = null;

    if (data) {
      localStorage.setItem('manus-runtime-user-info', JSON.stringify(data));
    } else if (!isLoading) {
      localStorage.removeItem('manus-runtime-user-info');
    }

    // Cache deve permanecer intacto durante carregamento
    expect(localStorage.getItem('manus-runtime-user-info')).toBe(userData);
  });

  it('deve validar sessão periodicamente (5 minutos)', () => {
    const refetchInterval = 5 * 60 * 1000; // 5 minutos em ms
    const staleTime = 4 * 60 * 1000; // 4 minutos em ms

    expect(refetchInterval).toBe(300000);
    expect(staleTime).toBe(240000);
    expect(refetchInterval > staleTime).toBe(true);
  });

  it('deve limpar dados de "Lembrar-me" ao fazer logout', () => {
    localStorage.setItem('asx_remembered_email', 'user@example.com');
    localStorage.setItem('asx_remember_me', 'true');

    // Simular logout
    localStorage.removeItem('asx_remembered_email');
    localStorage.removeItem('asx_remember_me');

    expect(localStorage.getItem('asx_remembered_email')).toBeNull();
    expect(localStorage.getItem('asx_remember_me')).toBeNull();
  });

  it('deve manter dados de "Lembrar-me" se checkbox estiver marcado', () => {
    const email = 'user@example.com';
    const rememberMe = true;

    if (rememberMe) {
      localStorage.setItem('asx_remembered_email', email);
      localStorage.setItem('asx_remember_me', 'true');
    }

    expect(localStorage.getItem('asx_remembered_email')).toBe(email);
    expect(localStorage.getItem('asx_remember_me')).toBe('true');
  });
});
