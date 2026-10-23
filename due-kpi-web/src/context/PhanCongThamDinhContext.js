import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { layQuyenThamDinh } from "../utils/phanCongThamDinhApi";

const Context = createContext({ quyen: null, loading: false, error: "", refresh: () => {} });
export const useQuyenThamDinh = () => useContext(Context);

/**
 * Quyền thẩm định (GET api/phan-cong-tham-dinh/quyen, đợt 2026-10-23).
 * KHÔNG suy từ chức vụ trong token: backend cộng mọi chức vụ đang giữ (kể cả
 * kiêm nhiệm) và phân công đang hiệu lực, đọc thẳng từ CSDL.
 *
 * Phân công / thu hồi có hiệu lực ngay mà không cần đăng nhập lại, nên mỗi lần
 * vào / ra nhóm màn thẩm định thì nạp lại - người vừa bị thu hồi không làm việc
 * trên quyền cũ, người vừa được giao thấy menu ngay.
 */
export function PhanCongThamDinhProvider({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [state, setState] = useState({ owner: null, quyen: null, loading: false, error: "" });
  const request = useRef(0);
  const trongModule = pathname.startsWith("/quan-ly/tham-dinh") ||
    pathname.startsWith("/quan-ly/phieu/") ||
    pathname.startsWith("/quan-ly/phan-cong-tham-dinh");
  const refresh = useCallback(async () => {
    const seq = ++request.current;
    if (!user) { setState({ owner: null, quyen: null, loading: false, error: "" }); return; }
    setState({ owner: user, quyen: null, loading: true, error: "" });
    try {
      const quyen = await layQuyenThamDinh();
      if (seq === request.current) setState({ owner: user, quyen, loading: false, error: "" });
    } catch (e) {
      if (seq === request.current) setState({ owner: user, quyen: null, loading: false, error: e.message });
    }
  }, [user]);
  useEffect(() => {
    refresh();
    return () => { request.current += 1; };
  }, [refresh, trongModule]);
  const current = state.owner === user ? state : { quyen: null, loading: !!user, error: "" };
  return <Context.Provider value={{ ...current, refresh }}>{children}</Context.Provider>;
}
