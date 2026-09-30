import React from "react";
import { useAuth } from "../../context/AuthContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import SearchSelect from "../../components/Common/SearchSelect";
import GioGiangNamCard from "../../components/CaNhan/GioGiangNamCard";
import "../../css/Pages.css";
import "../../css/QuanLyKeHoach/QL_GioGiang.css";
import "../../css/QuanLyKeHoach/GioGiangTyLe.css";

export default function GioGiangCuaToi() {
  const { user } = useAuth();
  const { namList, selectedNam, setSelectedNam, dangTaiNam } = useNamDanhGia();

  return (
    <div className="page-container ggtk-page">
      <div className="ggtk-page-header">
        <div className="header-title">
          <h2>GIỜ GIẢNG CỦA TÔI</h2>
          <span className="breadcrumb">
            Xem tổng giờ thực hiện, định mức và giải trình theo năm đánh giá
          </span>
        </div>
        <div className="ggtk-year-field">
          <label>Năm đánh giá</label>
          <SearchSelect
            name="ggtl-year"
            ariaLabel="Năm đánh giá giờ giảng cá nhân"
            value={selectedNam}
            onChange={setSelectedNam}
            options={namList.map((nam) => ({
              value: String(nam.IdNam),
              label: `Năm đánh giá ${nam.IdNam}`,
            }))}
            disabled={dangTaiNam}
            placeholder="Chọn năm đánh giá"
          />
        </div>
      </div>

      {dangTaiNam ? (
        <p role="status">Đang tải năm đánh giá...</p>
      ) : selectedNam && user?.IdNhanVien ? (
        <GioGiangNamCard
          user={user}
          idNam={selectedNam}
        />
      ) : selectedNam ? (
        <div className="ggtk-load-state" role="alert">
          Tài khoản chưa có mã giảng viên để tải dữ liệu giờ giảng cá nhân.
        </div>
      ) : (
        <div className="ggtk-load-state" role="alert">
          Không có năm đánh giá để hiển thị. Vui lòng tải lại trang.
        </div>
      )}
    </div>
  );
}
