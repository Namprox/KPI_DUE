import React, { useState } from "react";
import { formatDiem } from "../../utils/phieuApi";
import { diemHieuLucCuaDong, laDongChamTay } from "../../utils/phieuDonViApi";
import MinhChungTieuChiBox from "./TieuChi/MinhChungTieuChiBox";

/** Cùng bố cục cdm-* với kết quả cá nhân, dùng đúng các lớp điểm của đơn vị. */
export default function TieuChiKetQuaDonViCard({ chiTiet: ct, stt, onXem, onTai }) {
  const [moRong, setMoRong] = useState(true);
  const tuDong = !laDongChamTay(ct);
  const diem = diemHieuLucCuaDong(ct);
  const minhChung = ct.MinhChung || [];
  const diemCacCap = [
    [tuDong ? "Hệ thống tính" : "Thư ký nhập", tuDong ? ct.DiemTongHop : ct.DiemNhap],
    ["Trưởng đơn vị", ct.DiemDuyetDv],
    ["Cấp Trường", ct.DiemTruong],
    ...(ct.DiemChinhThuc != null ? [["Chính thức", ct.DiemChinhThuc]] : []),
  ];
  const nhanXet = [
    ["Diễn giải của thư ký", ct.NhanXetNhap],
    ["Nhận xét của Trưởng đơn vị", ct.NhanXetDuyetDv],
    ["Nhận xét của cấp Trường", ct.NhanXetTruong],
  ].filter(([, text]) => text);
  const coChiTiet = ct.MoTa || nhanXet.length > 0 || minhChung.length > 0;

  return <div className="cdm-the" id={`tieu-chi-dv-${ct.IdChiTietDv}`}>
    <div className="cdm-main">
      <div className="cdm-dau">
        <p className="cdm-ten">{stt}. {ct.TenTieuChi || `Tiêu chí #${ct.IdTieuChi}`}</p>
        <div className="cdm-diem-nhom">
          {diemCacCap.map(([nhan, giaTri]) => <div className="cdm-diem-o" key={nhan}>
            <div className="cdm-diem-nhan">{nhan}</div>
            <div className={`cdm-diem-gt${giaTri == null ? " cdm-diem-trong" : nhan === "Chính thức" ? " cdm-diem-chinh-thuc" : ""}`}>{formatDiem(giaTri)}</div>
          </div>)}
        </div>
      </div>
      <div className="cdm-tags">
        {ct.CoPhanQuyen === true && <span className="cdm-pill">Đơn vị thẩm định: {ct.TenDonViCham || "Chưa có tên đơn vị"}</span>}
        <span className="cdm-pill">Tối đa {formatDiem(ct.DiemToiDa)}</span>
        <span className="cdm-pill"><i className={`fa-solid ${tuDong ? "fa-robot" : "fa-pen-to-square"}`}></i> {tuDong ? "Điểm tự động" : "Chấm thủ công"}</span>
        {ct.TenNhom && <span className="cdm-pill">{ct.TenNhom}</span>}
      </div>
      {coChiTiet && <>
        <button type="button" className="cdm-toggle" aria-expanded={moRong} onClick={() => setMoRong((v) => !v)}>
          <i className={`fa-solid ${moRong ? "fa-chevron-up" : "fa-chevron-down"}`}></i> {moRong ? "Thu gọn" : "Xem chi tiết"}
        </button>
        {moRong && <div className="cdm-khoi-phu">
          {ct.MoTa && <div className="cdm-hop"><div className="cdm-hop-tieu-de">Mô tả tiêu chí</div><div>{ct.MoTa}</div></div>}
          {nhanXet.map(([nhan, text]) => <div className="cdm-hop" key={nhan}>
            <div className="cdm-hop-tieu-de">{nhan}</div><p className="cd-tdg-nhan-xet">{text}</p>
          </div>)}
          {minhChung.length > 0 && <div className="cdm-hop">
            <div className="cdm-hop-tieu-de">Minh chứng ({minhChung.length})</div>
            <MinhChungTieuChiBox idChiTiet={ct.IdChiTietDv} danhSach={minhChung} choPhepSua={false} onXem={onXem} onTai={onTai} />
          </div>}
        </div>}
      </>}
    </div>
    <div className="cdm-ben">
      <div className="cdm-ben-tieu-de">{ct.DiemChinhThuc != null ? "Điểm chính thức" : "Điểm hiện có (chỉ đọc)"}</div>
      <div className="cdm-ben-diem"><span className="cdm-ben-diem-gt">
        <b className="cdm-ben-diem-so">{formatDiem(diem)}</b><span>/ {formatDiem(ct.DiemToiDa)}</span>
      </span></div>
      <div className="cdm-ghi-chu"><i className={`fa-solid ${tuDong ? "fa-robot" : "fa-lock"}`}></i>{" "}
        {tuDong ? "Điểm tổng hợp đã lưu trên phiếu; xem lịch sử không tính lại điểm." : "Chỉ xem điểm đã ghi nhận của các cấp đánh giá."}
      </div>
    </div>
  </div>;
}
