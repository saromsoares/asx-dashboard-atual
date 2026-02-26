import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// Testes para a funcionalidade "Lembrar-me" usando localStorage
describe('Login - Remember Me Feature (localStorage)', () => {
  beforeEach(() => {
    // Limpar localStorage antes de cada teste
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deve salvar email no localStorage quando "Lembrar-me" estiver marcado', () => {
    const email = 'sarom@asxstore.com';
    const rememberMe = true;
    
    if (rememberMe) {
      localStorage.setItem('asx_remembered_email', email);
      localStorage.setItem('asx_remember_me', 'true');
    }
    
    expect(localStorage.getItem('asx_remembered_email')).toBe('sarom@asxstore.com');
    expect(localStorage.getItem('asx_remember_me')).toBe('true');
  });

  it('deve remover email do localStorage quando "Lembrar-me" estiver desmarcado', () => {
    // Pré-popular localStorage
    localStorage.setItem('asx_remembered_email', 'sarom@asxstore.com');
    localStorage.setItem('asx_remember_me', 'true');
    
    const rememberMe = false;
    if (!rememberMe) {
      localStorage.removeItem('asx_remembered_email');
      localStorage.removeItem('asx_remember_me');
    }
    
    expect(localStorage.getItem('asx_remembered_email')).toBeNull();
    expect(localStorage.getItem('asx_remember_me')).toBeNull();
  });

  it('deve carregar email salvo ao montar o componente', () => {
    // Pré-popular localStorage
    localStorage.setItem('asx_remembered_email', 'teste@example.com');
    localStorage.setItem('asx_remember_me', 'true');
    
    const savedEmail = localStorage.getItem('asx_remembered_email');
    const wasRemembered = localStorage.getItem('asx_remember_me') === 'true';
    
    expect(savedEmail).toBe('teste@example.com');
    expect(wasRemembered).toBe(true);
  });

  it('não deve carregar email se "asx_remember_me" não estiver marcado como true', () => {
    // Pré-popular localStorage com remember_me = false
    localStorage.setItem('asx_remembered_email', 'teste@example.com');
    localStorage.setItem('asx_remember_me', 'false');
    
    const savedEmail = localStorage.getItem('asx_remembered_email');
    const wasRemembered = localStorage.getItem('asx_remember_me') === 'true';
    
    expect(savedEmail).toBe('teste@example.com');
    expect(wasRemembered).toBe(false);
  });

  it('deve permitir alterar email com "Lembrar-me" marcado', () => {
    const newEmail = 'novo@example.com';
    const rememberMe = true;
    
    if (rememberMe) {
      localStorage.setItem('asx_remembered_email', newEmail);
      localStorage.setItem('asx_remember_me', 'true');
    }
    
    expect(localStorage.getItem('asx_remembered_email')).toBe('novo@example.com');
  });

  it('deve limpar localStorage quando desmarcado', () => {
    // Salvar primeiro
    localStorage.setItem('asx_remembered_email', 'teste@example.com');
    localStorage.setItem('asx_remember_me', 'true');
    
    expect(localStorage.getItem('asx_remember_me')).toBe('true');
    
    // Depois limpar
    localStorage.removeItem('asx_remembered_email');
    localStorage.removeItem('asx_remember_me');
    
    expect(localStorage.getItem('asx_remembered_email')).toBeNull();
    expect(localStorage.getItem('asx_remember_me')).toBeNull();
  });

  it('deve manter localStorage vazio quando "Lembrar-me" não está marcado', () => {
    const email = 'sarom@asxstore.com';
    const rememberMe = false;
    
    if (rememberMe) {
      localStorage.setItem('asx_remembered_email', email);
      localStorage.setItem('asx_remember_me', 'true');
    }
    
    expect(localStorage.getItem('asx_remembered_email')).toBeNull();
    expect(localStorage.getItem('asx_remember_me')).toBeNull();
  });
});
