import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { layQuyenKhenThuong } from "../utils/khenThuongDotXuatApi";

const Context = createContext({ quyen: null, loading: false, error: "", refresh: () => {} });
export const useQuyenKhenThuong = () => useContext(Context);
export function KhenThuongDotXuatProvider({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [state, setState] = useState({ owner: null, quyen: null, loading: false, error: "" });
  const request = useRef(0);
  const trongModule = pathname.startsWith("/khen-thuong-dot-xuat");
  const refresh = useCallback(async () => {
    const seq = ++request.current;
    if (!user) { setState({ owner: null, quyen: null, loading: false, error: "" }); return; }
    setState({ owner: user, quyen: null, loading: true, error: "" });
    try {
      const quyen = await layQuyenKhenThuong();
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
