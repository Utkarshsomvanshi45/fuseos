import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as api from "./api";
import type { AuthUser } from "./api";

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setToken(api.getStoredToken());
    setUser(api.getStoredUser());
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const res = await api.login(email, password);
    api.setSession(res.access_token, res.user);
    setToken(res.access_token);
    setUser(res.user);
    return res.user;
  }

  function logout() {
    api.clearSession();
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
