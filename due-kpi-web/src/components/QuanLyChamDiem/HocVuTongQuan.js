import React from "react";
import "../../css/HocVuTongQuan.css";

const hienThiSo = (value) =>
  value == null ? "—" : Number(value).toLocaleString("vi-VN");

const hienThiKhoa = (year) => {
  if (year == null || Number.isNaN(Number(year))) return "—";
  const nam = Number(year);
  return nam > 1974 ? String(nam - 1974) : String(nam);
};

const hienThiTyLe = (value) =>
  value == null
    ? "Chưa có dữ liệu"
    : `${Number(value).toLocaleString("vi-VN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%`;

const HocVuTongQuan = ({ hocVu }) => {
  if (!hocVu) return null;

  const soKhoa = Number(hocVu.SoKhoa) || 0;
  const chiSo = [
    {
      key: "tot-nghiep",
      nhan: "Tốt nghiệp đúng hạn",
      khoa: `Khóa ${hienThiKhoa(hocVu.NamNhapHocTotNghiep)}`,
      tyLe: hocVu.TyLeTotNghiepDungHan,
      tuSo: hocVu.SoTotNghiepDungHan,
      tong: hocVu.SoSvKhoaTotNghiep,
      thoiHoc: hocVu.SoThoiHocKhoaTotNghiep,
      nhanTuSo: "SV tốt nghiệp đúng hạn",
    },
    {
      key: "canh-bao",
      nhan: "Cảnh báo học vụ",
      khoa: `Khóa ${hienThiKhoa(hocVu.NamNhapHocCanhBaoTu)} - ${hienThiKhoa(hocVu.NamNhapHocCanhBaoDen)}`,
      tyLe: hocVu.TyLeCanhBaoHocVu,
      tuSo: hocVu.SoSvBiCanhBao,
      tong: hocVu.SoSvKhoaCanhBao,
      thoiHoc: hocVu.SoThoiHocKhoaCanhBao,
      nhanTuSo: "SV bị cảnh báo",
    },
  ];

  return (
    <section className="hoc-vu-tong-quan" aria-label="Tổng quan học vụ">
      <div className="hoc-vu-tong-quan-header">
        <h3>HỌC VỤ</h3>
        <span>{hienThiSo(soKhoa)} Khoa</span>
      </div>
      <div className="hoc-vu-tong-quan-grid">
        {chiSo.map((item) => (
          <div className="hoc-vu-tong-quan-card" key={item.key}>
            <div className="hoc-vu-tong-quan-label">{item.nhan}</div>
            <div className="hoc-vu-tong-quan-year">{item.khoa}</div>
            <div className="hoc-vu-tong-quan-ratio">
              {hienThiTyLe(item.tyLe)}
            </div>
            <div className="hoc-vu-tong-quan-detail">
              {hienThiSo(item.tuSo)} {item.nhanTuSo} / (
              {hienThiSo(item.tong)} SV − {hienThiSo(item.thoiHoc)} thôi học)
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HocVuTongQuan;
