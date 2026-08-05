import React from 'react';

/**
 * Thanh tiến độ "đã chấm x/y tiêu chí chấm tay".
 * Tiêu chí chấm tự động (loai_nguon_diem = 2) KHÔNG nằm trong mẫu số vì không ai chấm chúng.
 */
const TienDoCham = ({ xong = 0, tong = 0, nhan = 'Tiến độ chấm', ghiChu }) => {
  const phanTram = tong > 0 ? Math.round((xong / tong) * 100) : 0;
  const hoanTat = tong > 0 && xong >= tong;

  return (
    <div className="cd-progress">
      <div className="cd-progress-head">
        <span>{nhan}</span>
        <b>
          {xong}/{tong}
          {tong > 0 ? ` (${phanTram}%)` : ''}
        </b>
      </div>
      <div className="cd-progress-track">
        <div
          className={`cd-progress-fill${hoanTat ? ' cd-done' : ''}`}
          style={{ width: `${phanTram}%` }}
        />
      </div>
      {ghiChu && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{ghiChu}</div>}
    </div>
  );
};

export default TienDoCham;
