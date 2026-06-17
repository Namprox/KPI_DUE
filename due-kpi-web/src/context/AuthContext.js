import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { apiFetch, setSessionExpiredHandler } from "../utils/api";

const AuthContext = createContext(null);

const extractUser = (data) => (data && data.User != null ? data.User : data);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiFetch("auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(extractUser(data) || null);
        return true;
      }
    } catch (err) {
      console.error("Lỗi khôi phục phiên đăng nhập:", err);
    }
    setUser(null);
    return false;
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));

    refreshUser().finally(() => setLoading(false));

    return () => setSessionExpiredHandler(null);
  }, [refreshUser]);

  const login = useCallback(async (credentials) => {
    const res = await apiFetch("auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    let result = {};
    try {
      result = await res.json();
    } catch (err) {
      result = {};
    }

    if (res.ok && result.Success) {
      setUser(extractUser(result) || null);
      return { success: true };
    }
    return {
      success: false,
      message: result.message || "Sai thông tin đăng nhập!",
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch("auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Lỗi đăng xuất:", err);
    }
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth phải được dùng bên trong <AuthProvider>");
  }
  return ctx;
};
