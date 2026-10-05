import React, { useEffect, useState } from "react";
import { fetchBaoCaoChuaLapPhieu } from "../../utils/phieuApi";
import TienDoCham from "./TienDoCham";
import "../../css/CaNhan/BaoCaoBoSung.css";

const so = (value) => value == null ? "—" : Number(value).toLocaleString("vi-VN");

export function XepLoaiBaoCao({ rows = [] }) {
  return <div className="tqk-xl-list">{rows.map((r) => (
    <span className="rating-badge" key={r.MaXepLoai}>{r.XepLoaiText || "Chưa có nhãn"}: {so(r.SoLuong)}</span>
  ))}</div>;
}

export function PhieuNamVienChuc({ data }) {
  if (!data) return null;
  return <section className="cd-phieu-header bc-bo-sung" aria-label="Phiếu năm viên chức từ quý">
    <h3>Phiếu năm viên chức lấy điểm từ quý · {so(data.SoPhieu)} phiếu</h3>
    <p className="tqk-goi-phu">Các số dưới đây là tập con của phiếu năm, không cộng thêm vào tổng phiếu.</p>
    <div className="bc-metrics">
      {[["SoChuaChotQuyNao", "Chưa chốt quý nào"], ["SoChotChuaDuQuy", "Đã chốt 1–3 quý"],
        ["SoChotDuBonQuy", "Đã chốt đủ 4 quý"], ["SoChuaTongHopQuy", "Chưa tổng hợp quý"],
        ["SoTongHopQuyCu", "Cần tổng hợp lại"]].map(([key, label]) => <div key={key}><span>{label}</span><strong>{so(data[key])}</strong></div>)}
    </div>
    <p>Chờ TK duyệt: <strong>{so(data.SoChoTkDuyet)}</strong> (<strong>{so(data.SoChoTkDuyetChuaChotQuy)}</strong> chưa duyệt được vì chưa có quý chốt).</p>
    <p className="tqk-goi-phu">Hồ sơ có 1–3 quý đã chốt có thể chốt với kết quả chỉ từ các quý đó. Tổng hợp lại khi có quý chốt sau lần tổng hợp gần nhất.</p>
  </section>;
}

export function PhieuQuyBaoCao({ rows = [], onChuaLap, quyHienTai }) {
  if (!rows.length) return null;
  return <section className="bc-bo-sung" aria-label="Tiến độ phiếu quý của viên chức">
    <h3>Tiến độ phiếu quý của viên chức{quyHienTai != null && ` · Quý lịch đã đến: ${quyHienTai}`}</h3>
    <div className="bc-quarter-grid">{rows.map((r) => <article key={r.Quy} className={`cd-phieu-header bc-quarter ${r.DaDenQuy === false ? "bc-future" : ""}`}>
      <h4>Quý {r.Quy}{r.DaDenQuy === false && " · Chưa đến quý"}</h4>
      <p>{so(r.SoNhanVien)} viên chức theo đơn vị chính</p>
      <div className="bc-metrics">
        <div className={r.DaDenQuy === true && r.SoChuaLapPhieu > 0 ? "bc-warning" : ""}>
          <span>Chưa lập</span><strong>{so(r.SoChuaLapPhieu)}</strong>
          {onChuaLap && <button className="btn-cancel" onClick={() => onChuaLap({ quy: r.Quy })}>Xem danh sách quý {r.Quy}</button>}
        </div>
        <div><span>Đang chấm</span><strong>{so(r.SoDangChamDiem)}</strong></div>
        <div><span>Chờ Trưởng phòng / Trưởng khoa duyệt</span><strong>{so(r.SoChoDuyet)}</strong></div>
        <div><span>Đã chốt</span><strong>{so(r.SoDaChot)}</strong></div>
      </div>
      <XepLoaiBaoCao rows={r.DemTheoXepLoaiQuy} />
    </article>)}</div>
  </section>;
}

export default function BaoCaoBoSung({ data, onChuaLap }) {
  if (!data) return null;
  return <>
    {data.SoNhanVien != null && <div className="cd-phieu-header">
      <p>{so(data.SoNhanVien)} nhân viên theo đơn vị chính · {so(data.TongSoPhieu)} phiếu năm đã lập</p>
      {data.SoChuaLapPhieu != null && <TienDoCham nhan="Nhân viên đã lập phiếu năm" xong={data.SoNhanVien - data.SoChuaLapPhieu} tong={data.SoNhanVien} />}
      {onChuaLap && <button className="btn-cancel" onClick={() => onChuaLap({ quy: 0 })}>Xem người chưa lập phiếu năm</button>}
    </div>}
    {!!data.TheoLoaiDoiTuong?.length && <div className="bc-quarter-grid">{data.TheoLoaiDoiTuong.map((r) => <section className="cd-phieu-header" key={r.LoaiDoiTuong}>
      <h3>{r.LoaiDoiTuongText}</h3>
      <div className="bc-metrics">{[["SoNhanVien", "Nhân viên"], ["SoChuaLapPhieu", "Chưa lập"], ["SoPhieu", "Phiếu đã lập"], ["SoHoanTat", "Hoàn tất"]].map(([key, label]) => <div key={key}><span>{label}</span><strong>{so(r[key])}</strong></div>)}</div>
      {onChuaLap && <button className="btn-cancel" onClick={() => onChuaLap({ quy: 0, loaiDoiTuong: r.LoaiDoiTuong })}>Xem người chưa lập · {r.LoaiDoiTuongText}</button>}
    </section>)}</div>}
    <PhieuNamVienChuc data={data.PhieuNamVienChuc} />
    {data.ApDungPhieuQuy === true && <PhieuQuyBaoCao rows={data.PhieuQuy} quyHienTai={data.QuyHienTai} onChuaLap={onChuaLap} />}
  </>;
}

// Mount with a key containing the scope/filter to reset pagination and discard old requests.
export function DanhSachChuaLap({ idNam, idDonVi, quy = 0, loaiDoiTuong, onClose }) {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ loading: true });
    fetchBaoCaoChuaLapPhieu({ idNam, idDonVi, quy, loaiDoiTuong, page, pageSize: 20 })
      .then((data) => { if (active) setState({ data }); })
      .catch((error) => { if (active) setState({ error: error.message }); });
    return () => { active = false; };
  }, [idNam, idDonVi, quy, loaiDoiTuong, page, retry]);
  return <section className="cd-phieu-header bc-bo-sung bc-danh-sach" aria-label="Danh sách chưa lập phiếu">
    <div className="bc-danh-sach-head">
      <h3>Chưa lập phiếu {quy ? `quý ${quy}` : "năm"} · {state.data ? `${so(state.data.TotalCount)} người` : "…"}</h3>
      <button type="button" className="btn-cancel" onClick={onClose}>Đóng danh sách</button>
    </div>
    <div className="bc-danh-sach-body">
      {state.loading && <p className="bc-danh-sach-message" role="status">Đang tải danh sách...</p>}
      {state.error && (
        <div className="bc-danh-sach-message bc-danh-sach-error" role="alert">
          <p>{state.error}</p>
          <button type="button" className="btn-cancel" onClick={() => setRetry((v) => v + 1)}>Thử lại</button>
        </div>
      )}
      {state.data && <>
        <div className="bc-table modern-table-card"><table className="custom-table"><thead><tr><th>Mã nhân viên</th><th>Họ tên</th><th>Đơn vị chính</th><th>Loại đối tượng</th><th>Chức danh</th><th>Chức vụ</th></tr></thead>
          <tbody>{state.data.Items.map((r) => <tr key={r.IdNhanVien}><td>{r.MaNhanVien}</td><td>{r.HoTen}</td><td>{r.TenDonVi}</td><td>{r.LoaiDoiTuongText}</td><td>{r.TenChucDanh || "—"}</td><td>{r.TenChucVu || "—"}</td></tr>)}</tbody></table></div>
        {!state.data.Items.length && <p className="bc-danh-sach-message">Không có người chưa lập phiếu trong trang này.</p>}
        <div className="bc-pagination">
          <button type="button" className="btn-cancel" disabled={page <= 1} onClick={() => setPage(page - 1)}>Trang trước</button>
          <span>Trang {page} / {Math.max(1, Math.ceil(state.data.TotalCount / 20))}</span>
          <button type="button" className="btn-cancel" disabled={page * 20 >= state.data.TotalCount} onClick={() => setPage(page + 1)}>Trang sau</button>
        </div>
      </>}
    </div>
  </section>;
}
