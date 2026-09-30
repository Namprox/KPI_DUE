import React from "react";
import SearchSelect from "../../components/Common/SearchSelect";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { TongHopGioGiang } from "./GioGiangTkbPanels";
import "../../css/Pages.css";
import "../../css/QuanLyKeHoach/QL_GioGiang.css";
import "../../css/QuanLyKeHoach/GioGiangTyLe.css";

export default function TyLeHoanThanhGioGiang() {
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();
  return <div className="page-container ggtk-page">
    <div className="ggtk-page-header">
      <div className="header-title"><h2>TỶ LỆ HOÀN THÀNH GIỜ GIẢNG</h2><span className="breadcrumb">Theo dõi giờ thực hiện và định mức sau giảm trừ theo năm đánh giá</span></div>
      <div className="ggtk-year-field"><label>Năm đánh giá</label><SearchSelect name="ggtl-year" ariaLabel="Năm đánh giá giờ giảng" value={selectedNam} onChange={setSelectedNam}
        options={namList.map((nam) => ({ value: String(nam.IdNam), label: `Năm đánh giá ${nam.IdNam}` }))} disabled={dangTaiNam} placeholder="Chọn năm đánh giá" /></div>
    </div>
    {dangTaiNam ? <p role="status">Đang tải năm đánh giá...</p> : selectedNam ? <TongHopGioGiang idNam={selectedNam} tyLe /> : <div className="ggtk-load-state" role="alert">Không có năm đánh giá để hiển thị. Vui lòng tải lại trang.</div>}
  </div>;
}
