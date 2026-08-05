import React from 'react';
import { TRANG_THAI_META, XEP_LOAI_META } from '../../utils/phieuApi';

/** Badge trạng thái phiếu — dùng chung mọi bảng để màu không lệch nhau. */
export const TrangThaiBadge = ({ trangThai }) => {
  const meta = TRANG_THAI_META[trangThai];
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

/** Xếp loại cuối năm; chỉ có giá trị sau khi phiếu được chốt. */
export const XepLoaiBadge = ({ xepLoai }) => {
  const meta = XEP_LOAI_META[xepLoai];
  if (!meta) return <span style={{ color: '#94a3b8' }}>—</span>;
  return <span className={`rating-badge ${meta.className}`}>{meta.label}</span>;
};

export default TrangThaiBadge;
