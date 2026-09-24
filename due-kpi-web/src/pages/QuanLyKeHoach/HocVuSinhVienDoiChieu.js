import React, { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../utils/api";

const PAGE_SIZE = 20;
const number = (value) => Number(value ?? 0).toLocaleString("vi-VN");
const display = (value) => value == null || value === "" ? "—" : value;

const statusLabel = (loai, status) => ({
  1: loai === "tot-nghiep" ? "Có số hiệu văn bằng" : "Bị cảnh báo",
  2: loai === "tot-nghiep" ? "Chưa có số hiệu văn bằng" : "Không bị cảnh báo",
  3: "Thôi học",
})[status] || "—";

export default function HocVuSinhVienDoiChieu({ idNam, tyLe, initialSelection, reload }) {
  const [loai, setLoai] = useState(initialSelection?.loai || "tot-nghiep");
  const [idDonVi, setIdDonVi] = useState(initialSelection?.idDonVi == null ? "" : String(initialSelection.idDonVi));
  const [trangThai, setTrangThai] = useState(0);
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);

  const khoaList = useMemo(() => tyLe?.XemTatCa ? (tyLe.Items || []) : [], [tyLe]);
  const currentKhoa = tyLe?.XemTatCa && !idDonVi ? null : (tyLe?.Items || []).find((item) =>
    String(item.IdDonVi) === String(idDonVi || tyLe?.Items?.[0]?.IdDonVi)
  );

  useEffect(() => {
    if (!idNam) return undefined;
    const controller = new AbortController();
    const params = new URLSearchParams({ idNam: String(idNam), loai, page: String(page), pageSize: String(PAGE_SIZE) });
    if (tyLe?.XemTatCa && idDonVi) params.set("idDonVi", idDonVi);
    if (trangThai) params.set("trangThai", String(trangThai));
    if (keyword) params.set("keyword", keyword);

    setLoading(true);
    setError("");
    setResult(null);
    apiFetch(`hoc-vu/sinh-vien?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body.Success === false) throw new Error(body.Message || "Không tải được danh sách sinh viên.");
        return body;
      })
      .then((body) => { if (!controller.signal.aborted) setResult(body); })
      .catch((reason) => { if (!controller.signal.aborted) setError(reason.message || "Không kết nối được máy chủ."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [idNam, loai, idDonVi, trangThai, keyword, page, retry, reload, tyLe?.XemTatCa]);

  const counts = [result?.SoTrangThai1 ?? 0, result?.SoTrangThai2 ?? 0, result?.SoTrangThai3 ?? 0];
  const denominator = counts[0] + counts[1];
  const matchingRate = currentKhoa && !keyword
    ? (loai === "tot-nghiep" ? currentKhoa.TyLeTotNghiepDungHan : currentKhoa.TyLeCanhBaoHocVu)
    : null;
  const setFilter = (setter, value) => { setter(value); setPage(1); };

  return (
    <div className="modern-table-card hoc-vu-detail">
      <div className="hoc-vu-table-header">
        <div className="hoc-vu-table-title-area">
          <h3>Đối chiếu sinh viên năm {idNam}</h3>
          <span className="hoc-vu-table-subtitle">
            {tyLe?.XemTatCa ? "Chọn Khoa để đối chiếu từng tỷ lệ." : `Dữ liệu ${tyLe?.Items?.[0]?.TenDonVi || "Khoa của bạn"} theo quyền truy cập.`}
          </span>
        </div>
      </div>

      <div className="hoc-vu-detail-controls">
        <div className="hoc-vu-detail-segmented" role="tablist" aria-label="Loại tỷ lệ">
          <button
            type="button"
            className={`hoc-vu-segmented-btn ${loai === "tot-nghiep" ? "active" : ""}`}
            aria-pressed={loai === "tot-nghiep"}
            onClick={() => setFilter(setLoai, "tot-nghiep")}
          >
            <i className="fa-solid fa-graduation-cap" aria-hidden="true" />
            <span>Tốt nghiệp đúng hạn</span>
          </button>
          <button
            type="button"
            className={`hoc-vu-segmented-btn ${loai === "canh-bao" ? "active" : ""}`}
            aria-pressed={loai === "canh-bao"}
            onClick={() => setFilter(setLoai, "canh-bao")}
          >
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            <span>Cảnh báo học vụ</span>
          </button>
        </div>

        <div className="hoc-vu-detail-filters">
          {tyLe?.XemTatCa && (
            <label className="hoc-vu-detail-khoa" htmlFor="hoc-vu-khoa-select">
              <i className="fa-solid fa-building-columns" aria-hidden="true" />
              <span>Khoa</span>
              <select
                id="hoc-vu-khoa-select"
                aria-label="Khoa"
                className="form-input hoc-vu-detail-select"
                value={idDonVi}
                onChange={(event) => setFilter(setIdDonVi, event.target.value)}
              >
                <option value="">Tất cả Khoa</option>
                {khoaList.map((item) => (
                  <option key={item.IdDonVi} value={item.IdDonVi}>
                    {item.TenDonVi}
                  </option>
                ))}
              </select>
            </label>
          )}

          <form
            className="hoc-vu-detail-search"
            onSubmit={(event) => {
              event.preventDefault();
              setFilter(setKeyword, keywordInput.trim());
            }}
          >
            <div className="hoc-vu-search-input-wrap">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                id="hoc-vu-student-keyword"
                className="form-input hoc-vu-detail-input"
                value={keywordInput}
                maxLength={100}
                aria-label="Tìm sinh viên"
                placeholder="Mã SV, họ tên, lớp..."
                onChange={(event) => setKeywordInput(event.target.value)}
              />
            </div>
            <button type="submit" className="hoc-vu-detail-button hoc-vu-btn-primary">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <span>Tìm</span>
            </button>
            {keyword && (
              <button
                type="button"
                className="hoc-vu-detail-button hoc-vu-btn-secondary"
                onClick={() => {
                  setKeywordInput("");
                  setFilter(setKeyword, "");
                }}
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
                <span>Xóa</span>
              </button>
            )}
          </form>
        </div>
      </div>

      {result && (
        <div className="hoc-vu-detail-summary">
          <span>Tử số <strong>{number(counts[0])}</strong> / mẫu số <strong>{number(denominator)}</strong></span>
          <span>Tỷ lệ <strong>{denominator ? `${(counts[0] * 100 / denominator).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : "—"}</strong></span>
          {matchingRate != null && <span>Tỷ lệ trên bảng Khoa <strong>{Number(matchingRate).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%</strong></span>}
          {keyword && <span>Đang lọc theo từ khóa “{keyword}”</span>}
        </div>
      )}

      <div className="hoc-vu-detail-status" role="group" aria-label="Trạng thái sinh viên">
        {[
          [0, "Tất cả", counts[0] + counts[1] + counts[2]],
          [1, statusLabel(loai, 1), counts[0]],
          [2, statusLabel(loai, 2), counts[1]],
          [3, "Thôi học", counts[2]],
        ].map(([value, label, count]) => (
          <button key={value} type="button" className={`hoc-vu-chip-btn ${trangThai === value ? "active" : ""}`}
            aria-pressed={trangThai === value} onClick={() => setFilter(setTrangThai, value)}>
            {label} <strong>{number(count)}</strong>
          </button>
        ))}
      </div>

      {error && <div className="hoc-vu-banner error" role="alert">{error}
        <button type="button" className="hoc-vu-detail-button" onClick={() => setRetry((value) => value + 1)}>Thử lại</button>
      </div>}
      {loading && <div className="hoc-vu-empty-state" role="status"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /><p>Đang tải danh sách sinh viên...</p></div>}
      {!loading && !error && result && (
        <>
          <div className="table-scroll">
            <table className="custom-table hoc-vu-table hoc-vu-student-table">
              <thead><tr>
                <th>STT</th><th>Sinh viên</th><th>Lớp / khóa</th>
                {tyLe?.XemTatCa && <th>Khoa</th>}
                <th>Trạng thái</th><th>{loai === "tot-nghiep" ? "Văn bằng" : "Chi tiết cảnh báo"}</th>
              </tr></thead>
              <tbody>
                {(result.Items || []).map((item, index) => <tr key={`${item.MaSinhVien}-${index}`}>
                  <td>{(result.Page - 1) * result.PageSize + index + 1}</td>
                  <td><div className="table-person-name">{display(item.HoVaTen)}</div><div className="table-person-code">{display(item.MaSinhVien)}</div></td>
                  <td>{display(item.Lop)}<div className="table-person-code">Nhập học {display(item.NamNhapHoc)}{item.MaKhoaHoc ? ` · Khóa ${item.MaKhoaHoc}` : ""}</div></td>
                  {tyLe?.XemTatCa && <td>{display(item.TenDonVi)}<div className="table-person-code">{display(item.MaKhoa)}</div></td>}
                  <td><span className={`status-pill ${item.TrangThai === 1 ? "pill-blue" : item.TrangThai === 3 ? "pill-amber" : "pill-green"}`}>
                    {statusLabel(loai, item.TrangThai)}
                  </span></td>
                  <td>{loai === "tot-nghiep" ? <>
                    {display(item.SoHieuVanBang)}
                    {item.NamTotNghiep != null && <div className="table-person-code">Năm {item.NamTotNghiep}</div>}
                  </> : <>
                    <span className="hoc-vu-warning-detail">{display(item.ChiTietCanhBao)}</span>
                    {item.SoDongCanhBao > 0 && <div className="table-person-code">{number(item.SoDongCanhBao)} dòng cảnh báo</div>}
                  </>}</td>
                </tr>)}
                {(result.Items || []).length === 0 && <tr><td colSpan={tyLe?.XemTatCa ? 6 : 5}>
                  <div className="hoc-vu-empty-state"><i className="fa-solid fa-user-graduate" aria-hidden="true" /><h4>Không có sinh viên phù hợp</h4></div>
                </td></tr>}
              </tbody>
            </table>
          </div>
          <div className="table-foot hoc-vu-detail-footer">
            <span>{number(result.TotalCount)} sinh viên · Trang {number(result.Page)} / {number(Math.max(result.TotalPages, 1))}</span>
            <div className="hoc-vu-detail-pagination">
              <button type="button" className="hoc-vu-detail-button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Trước</button>
              <button type="button" className="hoc-vu-detail-button" disabled={page >= result.TotalPages} onClick={() => setPage((value) => value + 1)}>Sau</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
