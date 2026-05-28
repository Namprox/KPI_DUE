export const isTokenExpired = (token) => {
    if (!token || typeof token !== 'string') return true;

    try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        const base64Url = parts[1];

        let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

        while (base64.length % 4) {
            base64 += '=';
        }

        const jsonPayload = decodeURIComponent(
            window.atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );

        const payload = JSON.parse(jsonPayload);

        if (!payload.exp) return true;

        const currentTime = Math.floor(Date.now() / 1000);

        return payload.exp < currentTime;

    } catch (error) {
        console.error("Lỗi trong quá trình parse JWT:", error);
        return true;
    }
};