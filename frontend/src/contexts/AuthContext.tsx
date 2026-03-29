import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
  businessName: string | null;
  businessType: string | null;
  languagePreference: string | null;
  city: string | null;
  state: string | null;
  profileImageUrl?: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
}

export interface RegisterPayload {
  phone: string;
  password: string;
  name: string;
  businessType?: string;
  languagePreference?: string;
  city?: string;
  state?: string;
  businessName?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  adminUser: AdminUser | null;
  adminToken: string | null;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
}

export const TOKEN_KEY = "voicetrace_token";
export const USER_KEY = "voicetrace_user";
export const ADMIN_TOKEN_KEY = "voicetrace_admin_token";
export const ADMIN_USER_KEY = "voicetrace_admin_user";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);
    const storedAdminToken = localStorage.getItem(ADMIN_TOKEN_KEY);
    const storedAdminUser = localStorage.getItem(ADMIN_USER_KEY);

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }

    if (storedAdminToken && storedAdminUser) {
      try {
        setAdminToken(storedAdminToken);
        setAdminUser(JSON.parse(storedAdminUser));
      } catch {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        localStorage.removeItem(ADMIN_USER_KEY);
      }
    }

    setIsLoading(false);
  }, []);

  const persist = (t: string, u: AuthUser) => {
    // Vendor login should clear any existing admin session.
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    setAdminToken(null);
    setAdminUser(null);

    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(t);
    setUser(u);
  };

  const persistAdmin = (t: string, u: AdminUser) => {
    // Admin login should clear any existing vendor session.
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("voicetrace_user_id");
    setToken(null);
    setUser(null);

    localStorage.setItem(ADMIN_TOKEN_KEY, t);
    localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(u));
    setAdminToken(t);
    setAdminUser(u);
  };

  const login = async (phone: string, password: string) => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://voicetrace-api-xtzg.onrender.com";
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Login failed");
    persist(payload.token, payload.user);
  };

  const register = async (data: RegisterPayload) => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://voicetrace-api-xtzg.onrender.com";
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Registration failed");
    persist(payload.token, payload.user);
  };

  const adminLogin = async (email: string, password: string) => {
    const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://voicetrace-api-xtzg.onrender.com";
    const res = await fetch(`${API_BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error || "Admin login failed");
    persistAdmin(payload.token, payload.adminUser);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem("voicetrace_user_id");
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(ADMIN_USER_KEY);
    setToken(null);
    setUser(null);
    setAdminToken(null);
    setAdminUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, adminUser, adminToken, isLoading, login, adminLogin, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
