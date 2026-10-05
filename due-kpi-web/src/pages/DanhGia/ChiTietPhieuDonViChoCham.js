import React, { useEffect, useState } from "react";
import { fetchPhieuDonViKemLoai } from "../../utils/phieuDonViApi";
import ChiTietPhieuDonVi from "./ChiTietPhieuDonVi";
import ChiTietPhieuPhong from "./ChiTietPhieuPhong";

export default function ChiTietPhieuDonViChoCham({ idPhieu, backTo }) {
  const [retry, setRetry] = useState(0);
  const [data, setData] = useState({ loading: true, error: "", phieu: null, loai: null });

  useEffect(() => {
    let active = true;
    setData({ loading: true, error: "", phieu: null, loai: null });
    fetchPhieuDonViKemLoai(idPhieu)
      .then((result) => {
        if (active) setData({ ...result, loading: false, error: "" });
      })
      .catch((error) => {
        if (active) setData({ loading: false, error: error.message, phieu: null, loai: null });
      });
    return () => { active = false; };
  }, [idPhieu, retry]);

  if (data.loading) return <div className="cd-empty">Đang tải phiếu...</div>;
  if (data.error) return <div className="cd-empty" role="alert">
    <p>{data.error}</p>
    <button className="btn-cancel" onClick={() => setRetry((value) => value + 1)}>Thử lại</button>
  </div>;

  const Detail = data.loai === "phong" ? ChiTietPhieuPhong : ChiTietPhieuDonVi;
  return <Detail key={idPhieu} idPhieu={idPhieu} phieuBanDau={data.phieu} embedded backTo={backTo} chiChamDonVi />;
}
