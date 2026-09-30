import React from "react";
import { TongHopGioGiang } from "../../pages/QuanLyKeHoach/GioGiangTkbPanels";
import "../../css/QuanLyKeHoach/QL_GioGiang.css";
import "../../css/QuanLyKeHoach/GioGiangTyLe.css";

export default function GioGiangNamCard({ user, idNam, revision }) {
  if (!user?.IdNhanVien || !idNam || !user.DonVi?.some((dv) => Number(dv.LoaiDoiTuong) === 1)) return null;
  return <TongHopGioGiang key={user.IdNhanVien} idNam={idNam} idNhanVien={user.IdNhanVien} revision={revision} tyLe />;
}
