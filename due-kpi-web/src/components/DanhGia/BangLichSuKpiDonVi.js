import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPhieuDonViDetail, laDongChamTay } from "../../utils/phieuDonViApi";
import { formatDiem, formatNgay } from "../../utils/phieuApi";
import { TrangThaiDonViBadge, XepLoaiBadge } from "../QuanLyChamDiem/TrangThaiBadge";
import TienDoCham from "../QuanLyChamDiem/TienDoCham";

export default function BangLichSuKpiDonVi({ rows, donVi, config, filters, page, onPageChange }) {
  const navigate = useNavigate();
  const [tienDo, setTienDo] = useState({});

  useEffect(() => {
    let con = true;
    setTienDo({});
    const canTai = rows.filter((p) => [2, 3].includes(Number(p.TrangThai)));
    const taiPhieu = async (p) => {
          let result = null;
          try {
            const phieu = await fetchPhieuDonViDetail(p.IdPhieuDv);
            if (Array.isArray(phieu?.ChiTiet)) {
              const dong = phieu.ChiTiet.filter(laDongChamTay);
              const truong = Number(p.TrangThai) === 2 ? "DiemDuyetDv" : "DiemTruong";
              result = { tong: dong.length, xong: dong.filter((ct) => ct[truong] != null).length };
            }
          } catch { /* Không chặn bảng tra cứu khi chưa lấy được tiến độ. */ }
          if (con) setTienDo((prev) => ({ ...prev, [p.IdPhieuDv]: result }));
    };
    const tai = async () => {
      for (let i = 0; i < canTai.length && con; i += 5) {
        await Promise.all(canTai.slice(i, i + 5).map(taiPhieu));
      }
    };
    tai();
    return () => { con = false; };
  }, [rows]);

  const trangThaiCham = (p) => {
    const tt = Number(p.TrangThai);
    if (tt === 1) return <span className="kpi-dv-history-muted">Chưa nộp, chưa chấm</span>;
    if (tt === 4) return <span>Đã duyệt, chờ chốt</span>;
    if (tt === 5) return <span>Đã hoàn tất</span>;
    const td = tienDo[p.IdPhieuDv];
    if (td === undefined) return <span className="kpi-dv-history-muted">Đang tải tiến độ...</span>;
    if (!td) return <span className="kpi-dv-history-muted">Chưa tải được tiến độ</span>;
    if (!td.tong) return <span>Không có tiêu chí chấm tay</span>;
    return <TienDoCham {...td} nhan={tt === 2 ? "Trưởng đơn vị chấm" : "Cấp Trường chấm"} />;
  };

  return <div className="modern-table-card">
    {!rows.length ? <div className="cd-empty">
      <i className="fa-solid fa-folder-open"></i>
      <h3>Không có phiếu nào</h3>
      <p>Không có phiếu đánh giá khớp bộ lọc hiện tại. Thử chọn "Tất cả các năm".</p>
    </div> : <div style={{ overflowX: "auto" }}>
      <table className="custom-table" style={{ minWidth: 1080 }}>
        <thead><tr>
          <th style={{ width: "8%" }}>Năm học</th>
          <th style={{ width: "16%" }}>Đơn vị</th>
          <th style={{ width: "14%", textAlign: "center" }}>Trạng thái</th>
          <th style={{ width: "18%" }}>Trạng thái chấm</th>
          <th style={{ width: "10%", textAlign: "right" }}>Tổng điểm</th>
          <th style={{ width: "14%", textAlign: "center" }}>Xếp loại</th>
          <th style={{ width: "10%" }}>Ngày gửi</th>
          <th style={{ width: "10%", textAlign: "center" }}>Thao tác</th>
        </tr></thead>
        <tbody>{rows.map((p) => <tr key={p.IdPhieuDv}>
          <td style={{ fontWeight: 700, color: "#0f172a" }}>{p.IdNam}</td>
          <td style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{p.TenDonVi || donVi.TenDonVi}</td>
          <td style={{ textAlign: "center" }}><TrangThaiDonViBadge trangThai={p.TrangThai} /></td>
          <td>{trangThaiCham(p)}</td>
          <td style={{ textAlign: "right", fontWeight: 700, color: "#0f172a" }}>{formatDiem(p.TongDiemTichLuy)}</td>
          <td style={{ textAlign: "center" }}><XepLoaiBadge xepLoai={p.XepLoai} /></td>
          <td style={{ fontSize: 13 }}>{p.NgayGui ? formatNgay(p.NgayGui) : <span className="kpi-dv-history-muted">Chưa nộp</span>}</td>
          <td><div className="table-actions">
            <button type="button" className="action-btn view-btn" title="Xem điểm từng tiêu chí và minh chứng" aria-label="Xem chi tiết"
              onClick={() => navigate(`${config.lichSu}/${p.IdPhieuDv}`, { state: { kpiFilters: filters } })}><i className="fa-solid fa-list-check"></i></button>
            <button type="button" className="action-btn view-btn" title="Xem minh chứng của phiếu này" aria-label="Xem minh chứng"
              onClick={() => navigate(`/kho-minh-chung-don-vi?idPhieuDv=${p.IdPhieuDv}`)}><i className="fa-solid fa-paperclip"></i></button>
          </div></td>
        </tr>)}</tbody>
      </table>
    </div>}
    <div className="kpi-dv-history-pager">
      <span>Trang {page}</span>
      <div className="kpi-dv-history-page-actions">
        <button className="btn-cancel" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><i className="fa-solid fa-chevron-left"></i> Trước</button>
        <button className="btn-cancel" disabled={rows.length < 20} onClick={() => onPageChange(page + 1)}>Sau <i className="fa-solid fa-chevron-right"></i></button>
      </div>
    </div>
  </div>;
}
