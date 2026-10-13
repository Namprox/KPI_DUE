import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { layCauHinh, quyenTuCauHinh } from "../utils/nhiemVuPhucVuApi";

const Context = createContext({ quyen: null, loading: false, error: "", refresh: () => {} });
export const useQuyenNhiemVuPhucVu = () => useContext(Context);
export function NhiemVuPhucVuProvider({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [state, setState] = useState({ owner: null, quyen: null, loading: false, error: "" });
  const request = useRef(0);
  const trongModule = pathname.startsWith("/nhiem-vu-phuc-vu");
  const refresh = useCallback(async () => {
    const seq = ++request.current;
    if (!user) { setState({ owner: null, quyen: null, loading: false, error: "" }); return; }
    setState({ owner: user, quyen: null, loading: true, error: "" });
    try {
      const config = await layCauHinh();
      if (seq === request.current) setState({ owner: user, quyen: quyenTuCauHinh(config), loading: false, error: "" });
    } catch (e) {
      if (seq === request.current) setState({ owner: user, quyen: null, loading: false, error: e.message });
    }
  }, [user]);
  useEffect(() => { refresh(); return () => { request.current += 1; }; }, [refresh, trongModule]);
  const current = state.owner === user ? state : { quyen: null, loading: !!user, error: "" };
  return <Context.Provider value={{ ...current, refresh }}>{children}</Context.Provider>;
}
