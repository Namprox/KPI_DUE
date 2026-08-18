import React from 'react';
import { formatDiem } from '../../utils/phieuApi';

/**
 * Ba ô điểm tổng trong `.cd-meta-grid` của header phiếu.
 *
 * Server chỉ ghi tong_diem_* vào hồ sơ ở bước Trưởng khoa chốt, nên trước đó cả
 * ba ô đều rỗng. Component nhận thêm bộ số tạm tính ở client (tinhTongDiemTamTinh)
 * và rơi về nó khi server chưa có gì, kèm nhãn "tạm tính" để không ai nhầm đây là
 * con số đã lưu.
 *
 * Trả về fragment, không có wrapper: bên gọi tự đặt trong lưới của mình cùng các
 * ô khác (xếp loại, ngày gửi...).
 */
const ODiem = ({ nhan, giaTri, laTamTinh, noiBat }) => (
  <div>
    <div className="cd-meta-label">
      {nhan}
      {/* Ô rỗng thì không gắn nhãn: "tạm tính" cạnh một dấu gạch chỉ gây khó hiểu. */}
      {laTamTinh && giaTri != null && (
        <span className="cd-tam-tinh">tạm tính</span>
      )}
    </div>
    <div
      className="cd-meta-value"
      style={noiBat ? { color: '#1d4ed8' } : undefined}
    >
      {formatDiem(giaTri)}
    </div>
  </div>
);

const TongDiemMeta = ({ phieu, tamTinh }) => {
  // Chỉ cần một cột của server có giá trị là coi như hồ sơ đã được chốt điểm:
  // ba cột luôn được ghi cùng lúc trong một transaction.
  const daCoTuServer = phieu?.TongDiemTichLuy != null;
  const nguon = daCoTuServer
    ? {
        coBan: phieu.TongDiemCoBan,
        vuotTroi: phieu.TongDiemVuotTroi,
        tichLuy: phieu.TongDiemTichLuy,
      }
    : {
        coBan: tamTinh?.coBan ?? null,
        vuotTroi: tamTinh?.vuotTroi ?? null,
        tichLuy: tamTinh?.tichLuy ?? null,
      };
  const laTamTinh = !daCoTuServer && tamTinh != null;

  return (
    <>
      <ODiem nhan="Tổng điểm cơ bản" giaTri={nguon.coBan} laTamTinh={laTamTinh} />
      <ODiem
        nhan="Tổng điểm vượt trội"
        giaTri={nguon.vuotTroi}
        laTamTinh={laTamTinh}
      />
      <ODiem
        nhan="Tổng điểm tích lũy"
        giaTri={nguon.tichLuy}
        laTamTinh={laTamTinh}
        noiBat
      />
    </>
  );
};

export default TongDiemMeta;
