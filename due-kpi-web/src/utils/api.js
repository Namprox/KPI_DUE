const BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

let onSessionExpired = null;
export const setSessionExpiredHandler = (fn) => {
  onSessionExpired = fn;
};

let refreshPromise = null;

const refreshSession = async () => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return false;
      const data = await res.json().catch(() => null);
      return data?.Success === true;
    } catch (err) {
      console.error("Lỗi refresh phiên:", err);
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const apiFetch = async (endpoint, options = {}) => {
  const url = `${BASE_URL}/${endpoint}`;

  const isAuthEndpoint =
    endpoint === "auth/refresh" || endpoint === "auth/login";

  const buildInit = () => {
    const isFormData = options.body instanceof FormData;
    const defaultHeaders = isFormData ? {} : { "Content-Type": "application/json" };
    return {
      ...options,
      credentials: "include",
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };
  };

  let response = await fetch(url, buildInit());

  if (response.status === 401 && !isAuthEndpoint) {
    const refreshed = await refreshSession();

    if (refreshed) {
      response = await fetch(url, buildInit());
      if (response.status === 401 && onSessionExpired) onSessionExpired();
    } else {
      if (onSessionExpired) onSessionExpired();
    }
  }

  return response;
};
