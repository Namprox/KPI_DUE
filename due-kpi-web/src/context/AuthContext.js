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
      if (res.status === 403) {
        const errData = await res.json().catch(() => null);
        console.warn("Tài khoản chưa được gán đơn vị chính:", errData?.Message || errData?.message);
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

  const login = useCallback(
    async (credentials) => {
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
        // Nạp đầy đủ thông tin User kèm mảng DonVi[] từ GET /api/auth/me
        await refreshUser();
        return { success: true };
      }

      const msg =
        result.Message ||
        result.message ||
        (res.status === 403
          ? "Tài khoản chưa được gán đơn vị chính. Vui lòng liên hệ quản trị viên."
          : "Sai thông tin đăng nhập!");

      return {
        success: false,
        message: msg,
      };
    },
    [refreshUser],
  );

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
