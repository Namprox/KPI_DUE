import React from "react";
import {
  CANH_BAO_META,
  LOAI_THANH_TICH_META,
  TRAN_DIEM_NHOM,
  formatDiem,
} from "../../utils/keKhaiThanhTichApi";

/**
 * Bảng tổng hợp điểm theo 4 tiêu chí của Nhóm II, kèm trần và cảnh báo.
 *
 * Đây là nơi DUY NHẤT trên màn hình nói đúng con số vào KPI. Tổng ở chân bảng kê
 * chỉ là `Σ SoLuong × DiemMuc`; con số đó SAI ngay khi có tiêu chí vượt trần hoặc
 * có khen thưởng trùng nội dung, nên panel phải nằm PHÍA TRÊN bảng để được đọc
 * trước.
 *
 * Ba con số dễ nhầm, thứ tự thị giác phải phản ánh đúng độ quan trọng:
 *   DiemKeKhai      - người dùng kê bao nhiêu
 *   DiemDuyet       - đơn vị phụ trách duyệt bao nhiêu
 *   DiemSauKhuTrung - sau khi khen thưởng trùng nội dung chỉ lấy mức cao nhất
 *   DiemDuocTinh    - min(DiemSauKhuTrung, TranDiem) → THẬT SỰ vào KPI
 *
 * ⚠️ Cảnh báo `VUOT_TRAN` và `KHEN_THUONG_TRUNG_NOI_DUNG` là THÔNG TIN, không
 * phải lỗi: server cố ý cho lưu vượt trần vì bảng KPI ghi "Điểm tối đa 30" chứ
 * không ghi "chỉ được kê 30". Tuyệt đối không tắt nút nào dựa trên chúng.
 *
 * @param {object[]} tongHop `TongHopTheoLoai` - server luôn trả đủ 4 dòng
 */
const TongHopLoaiPanel = ({ tongHop = [] }) => {
  if (!Array.isArray(tongHop) || tongHop.length === 0) return null;

  const tongDuocTinh = tongHop.reduce(
    (t, r) => t + (Number(r.DiemDuocTinh) || 0),
    0,
  );

  return (
    <>
      <div className="kkt-tran-grid">
        {tongHop.map((r) => {
          const meta = LOAI_THANH_TICH_META[r.LoaiThanhTich];
          const tran = Number(r.TranDiem) || 0;
          const sauKhuTrung = Number(r.DiemSauKhuTrung) || 0;
          const vuot = tran > 0 && sauKhuTrung > tran;
          const tiLe =
            tran > 0 ? Math.min((sauKhuTrung / tran) * 100, 100) : 0;
          const canhBao = r.MaCanhBao
            ? CANH_BAO_META[r.MaCanhBao]
            : null;

          return (
            <div className="kkt-tran-card" key={r.LoaiThanhTich}>
              <div className="kkt-tran-head">
                <div className="kkt-tran-ten">
                  {meta && (
                    <i
                      className={`fa-solid ${meta.icon}`}
                      style={{ marginRight: "6px", color: meta.color }}
                    ></i>
                  )}
                  {r.TenLoai || meta?.label || `Tiêu chí ${r.LoaiThanhTich}`}
                </div>
                {canhBao && (
                  <span
                    className="kkt-tran-chip"
                    style={{
                      background: canhBao.bg,
                      color: canhBao.color,
                      borderColor: canhBao.border,
                    }}
                    title={r.CanhBao || undefined}
                  >
                    <i className={`fa-solid ${canhBao.icon}`}></i>{" "}
                    {canhBao.label}
                  </span>
                )}
              </div>

              <div className="kkt-tran-track">
                <div
                  className={`kkt-tran-fill${vuot ? " kkt-tran-vuot" : ""}`}
                  style={{ width: `${tiLe}%` }}
                ></div>
              </div>

              <div className="kkt-tran-so">
                <span className="kkt-tran-tinh">
                  {formatDiem(r.DiemDuocTinh)}
                </span>
                <span className="kkt-tran-tran">
                  / {tran > 0 ? formatDiem(tran) : "—"} điểm
                </span>
              </div>

              <div className="kkt-tran-phu">
                Kê {formatDiem(r.DiemKeKhai)} · Duyệt {formatDiem(r.DiemDuyet)}
                {sauKhuTrung !== Number(r.DiemDuyet) && (
                  <> · Sau khử trùng {formatDiem(sauKhuTrung)}</>
                )}
                <br />
                {r.SoDong ?? 0} dòng, {r.SoDongDaDuyet ?? 0} đã duyệt
                {Number(r.SoDongTrungNoiDung) > 0 && (
                  <> · {r.SoDongTrungNoiDung} dòng trùng nội dung</>
                )}
              </div>

              {r.CanhBao && (
                <div className="kkt-tran-canh-bao">
                  <i className="fa-solid fa-circle-info"></i> {r.CanhBao}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="kkt-tran-tong">
        <span>
          <i className="fa-solid fa-calculator"></i> Tổng điểm thành tích vượt
          trội được tính: <b>{formatDiem(tongDuocTinh)}</b> điểm
        </span>
        {/* Trần nhóm KHÔNG được server thực thi (tổng trần 4 tiêu chí là 65 > 50,
            sp_phieu_danh_gia_tinh_tong_diem mới cộng chứ chưa cắt). Nói rõ ra để
            người dùng không đọc con số này như một giới hạn cứng. */}
        <span style={{ color: "#94a3b8", fontSize: "12.5px" }}>
          Trần cả nhóm theo bảng KPI là {TRAN_DIEM_NHOM} điểm — con số tham
          khảo, hệ thống hiện không tự cắt ở mức này.
        </span>
      </div>
    </>
  );
};

export default TongHopLoaiPanel;
