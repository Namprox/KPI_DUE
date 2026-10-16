const BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api";

let onSessionExpired = null;
export const setSessionExpiredHandler = (fn) => {
  onSessionExpired = fn;
};

export const NETWORK_ERROR_MESSAGE =
  "Không kết nối được máy chủ. Vui lòng kiểm tra kết nối mạng hoặc thử lại sau.";

// fetch() chỉ reject khi không tới được server (mất mạng, server tắt, CORS) và
// trình duyệt trả thông điệp thô kiểu "Failed to fetch" - đổi sang tiếng Việt để
// màn hình nào hiện e.message cũng đọc được. AbortError giữ nguyên cho bên gọi.
const fetchOrThrow = async (url, init) => {
  try {
    return await fetch(url, init);
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw Object.assign(new Error(NETWORK_ERROR_MESSAGE), { isNetworkError: true, cause: err });
  }
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

  /** @returns {RequestInit} */
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

  let response = await fetchOrThrow(url, buildInit());

  if (response.status === 401 && !isAuthEndpoint) {
    const refreshed = await refreshSession();

    if (refreshed) {
      response = await fetchOrThrow(url, buildInit());
      if (response.status === 401 && onSessionExpired) onSessionExpired();
    } else {
      if (onSessionExpired) onSessionExpired();
    }
  }

  return response;
};
