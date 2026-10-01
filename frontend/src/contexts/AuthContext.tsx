import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, unwrap } from '../api/client';
import type { User } from '../types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (code: string) => boolean;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/auth/me')
      .then((res) => setUser(unwrap(res)))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.post('/auth/login', { username, password });
    setUser(unwrap(res).user);
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  const hasPermission = (code: string) =>
    !!user && (user.role === 'Administrator' || user.permissions.includes(code));

  return (
    <Ctx.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);