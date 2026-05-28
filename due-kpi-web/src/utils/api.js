import { isTokenExpired } from './jwtUtils';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

let refreshTokenPromise = null;

const handleRefreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    if (refreshTokenPromise) {
        return refreshTokenPromise;
    }

    refreshTokenPromise = (async () => {
        try {
            const response = await fetch(`${BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 'RefreshToken': refreshToken })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.Success && data.Tokens) {
                    localStorage.setItem('accessToken', data.Tokens.AccessToken);
                    localStorage.setItem('refreshToken', data.Tokens.RefreshToken);
                    return data.Tokens.AccessToken;
                }
            }
        } catch (err) {
            console.error("Lỗi refresh token:", err);
        } finally {
            refreshTokenPromise = null;
        }
        return null;
    })();

    return refreshTokenPromise;
};

export const apiFetch = async (endpoint, options = {}) => {
    let token = localStorage.getItem('accessToken');

    if (isTokenExpired(token)) {
        console.warn("[API Fetch] Token hết hạn. Đang làm mới...");
        const newToken = await handleRefreshToken();

        if (newToken) {
            token = newToken;
        } else {
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            throw new Error("Session expired");
        }
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
    };

    const url = `${BASE_URL}/${endpoint}`;
    return fetch(url, { ...options, headers });
};