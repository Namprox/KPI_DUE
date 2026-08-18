import React from 'react';
import '../../css/QuanLyChamDiem.css';

/**
 * Checklist "còn thiếu gì" của một phiếu.
 *
 * Dùng chung cho BA nguồn vì cả ba trả đúng một kiểu phần tử
 * (PhieuSubmitMissingItemDto):
 *   - `ThieuMinhChung[]` của GET /api/phieu/{id}/kiem-tra-hop-le;
 *   - `missingItems[]` của 422 POST /api/phieu/{id}/submit;
 *   - `missingItems[]` của 422 POST /api/phieu/{id}/nop-lai.
 *
 * ⚠️ Phần tử dùng camelCase, khác phần còn lại của nhóm API phiếu vốn
 * PascalCase — xem chú thích ở fetchKiemTraHopLe.
 *
 * @param {object[]} items    danh sách tiêu chí còn thiếu
 * @param {function} [onMo]   có truyền thì mỗi dòng có nút mở tới tiêu chí đó
 * @param {string}   [nhanMo] nhãn của nút đó
 */
const ThieuTieuChiChecklist = ({ items = [], onMo, nhanMo = 'Bổ sung' }) => {
  if (items.length === 0) return null;

  return (
    <>
      {items.map((item) => (
        <div className="cd-mc-row" key={item.idChiTiet ?? item.idTieuChi}>
          <i
            className="fa-solid fa-circle-exclamation cd-mc-icon"
            style={{ color: '#f59e0b' }}
          ></i>
          <div className="cd-mc-main">
            <div
              className="cd-mc-name"
              style={{ color: '#0f172a', cursor: 'default' }}
            >
              {item.tenTieuChi || `Tiêu chí #${item.idTieuChi}`}
            </div>
            <div className="cd-tc-tags" style={{ marginTop: '4px' }}>
              {item.missingDiemTuDanhGia && (
                <span
                  className="cd-tc-tag"
                  style={{
                    background: '#fef2f2',
                    color: '#b91c1c',
                    borderColor: '#fecaca',
                  }}
                >
                  Chưa chấm điểm
                </span>
              )}
              {item.missingMinhChung && (
                <span
                  className="cd-tc-tag"
                  style={{
                    background: '#fffbeb',
                    color: '#b45309',
                    borderColor: '#fde68a',
                  }}
                >
                  Thiếu minh chứng
                </span>
              )}
            </div>
          </div>
          {onMo && (
            <button
              type="button"
              className="cd-mc-act"
              onClick={() => onMo(item)}
            >
              <i className="fa-solid fa-arrow-right"></i> {nhanMo}
            </button>
          )}
        </div>
      ))}
    </>
  );
};

export default ThieuTieuChiChecklist;
