import { useState, useEffect, useCallback } from 'react';

export interface AuthUser {
  email: string;
  name: string;
  role: 'admin' | 'user';
}

const USERS = [
  {
    email: 'sarom@asxstore.com',
    password: 'Asxx@China',
    name: 'Sarom',
    role: 'admin' as const,
  },
  {
    email: 'alexandre@asx.com.br',
    password: 'China@2013',
    name: 'Alexandre',
    role: 'user' as const,
  },
  {
    email: 'frederico@asx.com.br',
    password: 'China@2013',
    name: 'Frederico',
    role: 'user' as const,
  },
  {
    email: 'michaelfeng89@hotmail.com',
    password: 'China@2013',
    name: 'Michael',
    role: 'user' as const,
  },
];

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
      const found = USERS.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );

      if (found) {
        const userData: AuthUser = {
          email: found.email,
          name: found.name,
          role: found.role,
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
