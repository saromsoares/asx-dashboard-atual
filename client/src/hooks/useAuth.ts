import { useState, useEffect, useCallback } from 'react';

export interface AuthUser {
  email: string;
  name: string;
}

const DEFAULT_USER = {
  email: 'sarom@asxstore.com',
  password: 'Asxx@China',
  name: 'Sarom',
};

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verificar se há sessão salva ao montar o componente
  useEffect(() => {
    const savedUser = localStorage.getItem('authUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Erro ao restaurar sessão:', e);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback((email: string, password: string) => {
    setError(null);
    setLoading(true);

    // Simular delay de requisição
    setTimeout(() => {
      if (email === DEFAULT_USER.email && password === DEFAULT_USER.password) {
        const userData: AuthUser = {
          email: DEFAULT_USER.email,
          name: DEFAULT_USER.name,
        };
        setUser(userData);
        localStorage.setItem('authUser', JSON.stringify(userData));
        setLoading(false);
      } else {
        setError('Email ou senha inválidos');
        setLoading(false);
      }
    }, 500);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('authUser');
    setError(null);
  }, []);

  return {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
  };
}
