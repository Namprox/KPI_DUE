import React from 'react';
import {
  TEN_NGUON_TRA_VE,
  TRANG_THAI_DONG_META,
  TRANG_THAI_META,
  XEP_LOAI_META,
} from '../../utils/phieuApi';
import { TRANG_THAI_TO_TRINH_META } from '../../utils/toTrinhApi';
import { TRANG_THAI_CHUA_LAP, TRANG_THAI_CHUA_LAP_META } from '../../utils/chuaLapPhieu';

/** Khung badge dùng chung — mọi bảng lấy màu từ cùng một chỗ nên không lệch nhau. */
const Badge = ({ meta }) => {
  if (!meta) {
    return (
      <span
        className="cd-status-badge"
        style={{ background: '#f1f5f9', color: '#64748b', borderColor: '#e2e8f0' }}
      >
        Không xác định
      </span>
    );
  }
  return (
    <span
      className="cd-status-badge"
      style={{ background: meta.bg, color: meta.color, borderColor: meta.border }}
    >
      <i className={`fa-solid ${meta.icon}`}></i> {meta.label}
    </span>
  );
};

/**
 * Trạng thái HỒ SƠ (phieu_danh_gia.trang_thai).
 *
 * Nhận thêm sentinel TRANG_THAI_CHUA_LAP (0) của các bảng có ghép người chưa lập
 * phiếu: giá trị đó không nằm trong DB nên TRANG_THAI_META không có, để rơi vào
 * nhánh mặc định sẽ hiện "Không xác định" — sai hẳn nghĩa.
 */
export const TrangThaiBadge = ({ trangThai }) => (
  <Badge
    meta={
      trangThai != null && Number(trangThai) === TRANG_THAI_CHUA_LAP
        ? TRANG_THAI_CHUA_LAP_META
        : TRANG_THAI_META[trangThai]
    }
  />
);

/**
 * Trạng thái TỪNG DÒNG tiêu chí (chi_tiet_danh_gia.trang_thai_dong).
 * Khác trục với TrangThaiBadge — một hồ sơ "Đang thẩm định" hoàn toàn có thể
 * chứa dòng đã chốt lẫn dòng đang chờ giảng viên bổ sung.
 */
export const TrangThaiDongBadge = ({ trangThaiDong }) => (
  <Badge meta={TRANG_THAI_DONG_META[trangThaiDong]} />
);

/** Trạng thái GÓI KPI Khoa (to_trinh_kpi_khoa.trang_thai). */
export const TrangThaiToTrinhBadge = ({ trangThai }) => (
  <Badge meta={TRANG_THAI_TO_TRINH_META[trangThai]} />
);

/**
 * Xếp loại CUỐI CÙNG — chỉ có giá trị sau khi tờ trình Khoa được đóng gói.
 * Trước đó cột này rỗng dù Trưởng khoa đã chọn xếp loại, vì mức 4 còn phụ thuộc
 * hạn ngạch của cả Khoa.
 */
export const XepLoaiBadge = ({ xepLoai }) => {
  const meta = XEP_LOAI_META[xepLoai];
  if (!meta) return <span style={{ color: '#94a3b8' }}>—</span>;
  return <span className={`rating-badge ${meta.className}`}>{meta.label}</span>;
};

/**
 * Mức Trưởng khoa chọn tay (1–3). Hiện riêng để người xem phân biệt được
 * "Khoa đề nghị" với kết quả cuối cùng sau khi áp hạn ngạch.
 */
export const XepLoaiKhoaBadge = ({ xepLoaiKhoa }) => {
  const meta = XEP_LOAI_META[xepLoaiKhoa];
  if (!meta) return <span style={{ color: '#94a3b8' }}>—</span>;
  return (
    <span className={`rating-badge ${meta.className}`} title="Mức Trưởng khoa chọn">
      {meta.label}
    </span>
  );
};

/** Ai đã trả dòng này về — hai chiều trả về có ý nghĩa hoàn toàn khác nhau. */
export const NguonTraVeBadge = ({ nguonTraVe }) => {
  const nhan = TEN_NGUON_TRA_VE[nguonTraVe];
  if (!nhan) return null;
  const laTruongKhoa = Number(nguonTraVe) === 3;
  return (
    <span
      className="cd-status-badge"
      style={
        laTruongKhoa
          ? { background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' }
          : { background: '#fff7ed', color: '#c2410c', borderColor: '#fed7aa' }
      }
    >
      <i className="fa-solid fa-rotate-left"></i> {nhan}
    </span>
  );
};

export default TrangThaiBadge;
