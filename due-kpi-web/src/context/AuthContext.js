import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch, setSessionExpiredHandler } from '../utils/api';

const AuthContext = createContext(null);

// Chuẩn hoá: /me và /login đều có thể trả { User: {...} } hoặc trả thẳng object User.
const extractUser = (data) => (data && data.User != null ? data.User : data);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Khôi phục phiên: hỏi server xem cookie hiện tại còn hợp lệ không.
    const refreshUser = useCallback(async () => {
        try {
            const res = await apiFetch('auth/me');
            if (res.ok) {
                const data = await res.json();
                setUser(extractUser(data) || null);
                return true;
            }
        } catch (err) {
            console.error('Lỗi khôi phục phiên đăng nhập:', err);
        }
        setUser(null);
        return false;
    }, []);

    useEffect(() => {
        // Khi interceptor refresh thất bại (401) => server hết phiên => xoá user.
        setSessionExpiredHandler(() => setUser(null));

        // App load lần đầu: gọi /me để biết đã đăng nhập hay chưa.
        refreshUser().finally(() => setLoading(false));

        return () => setSessionExpiredHandler(null);
    }, [refreshUser]);

    const login = useCallback(async (credentials) => {
        const res = await apiFetch('auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });

        let result = {};
        try {
            result = await res.json();
        } catch (err) {
            result = {};
        }

        if (res.ok && result.Success) {
            // Token đã nằm trong cookie httpOnly do server set — chỉ giữ User ở state.
            setUser(extractUser(result) || null);
            return { success: true };
        }
        return { success: false, message: result.message || 'Sai thông tin đăng nhập!' };
    }, []);

    const logout = useCallback(async () => {
        try {
            // Server thu hồi refresh token + xoá cookie httpOnly (JS không xoá được).
            await apiFetch('auth/logout', { method: 'POST' });
        } catch (err) {
            console.error('Lỗi đăng xuất:', err);
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
        throw new Error('useAuth phải được dùng bên trong <AuthProvider>');
    }
    return ctx;
};
