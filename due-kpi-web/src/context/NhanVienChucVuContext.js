import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { layQuyenChucVu } from "../utils/nhanVienChucVuApi";

const Context = createContext({ quyen: null, loading: false, error: "", refresh: () => {} });
export const useQuyenChucVu = () => useContext(Context);

/**
 * Quyền kê khai chức vụ (GET api/nhan-vien-chuc-vu/quyen, đợt 2026-10-20).
 * KHÔNG suy từ chức vụ trong token: backend cộng cả chức vụ kiêm nhiệm và ủy quyền.
 *
 * `trongModule` gom ba trang mà quyền này gác: màn ủy quyền, kê khai chức vụ của
 * người dùng và hệ số giảm trừ theo năm. Vào / ra nhóm đó thì nạp lại, để người
 * vừa được cấp hoặc vừa bị thu hồi không làm việc trên quyền cũ.
 */
export function NhanVienChucVuProvider({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [state, setState] = useState({ owner: null, quyen: null, loading: false, error: "" });
  const request = useRef(0);
  const trongModule = pathname.startsWith("/quan-ly-chuc-vu") ||
    pathname.startsWith("/quan-ly-nguoi-dung") ||
    pathname.startsWith("/giam-tru-chuc-vu-theo-nam");
  const refresh = useCallback(async () => {
    const seq = ++request.current;
    if (!user) { setState({ owner: null, quyen: null, loading: false, error: "" }); return; }
    setState({ owner: user, quyen: null, loading: true, error: "" });
    try {
      const quyen = await layQuyenChucVu();
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
