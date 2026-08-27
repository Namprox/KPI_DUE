import React, { useMemo, useState } from "react";
import { formatDiem, XEP_LOAI_META } from "../../../utils/phieuApi";
import SearchSelect from "../../Common/SearchSelect";
import {
  MO_TA_XEP_LOAI_PHONG,
  NGUONG_XEP_LOAI_PHONG,
  XEP_LOAI_PHONG_CHON,
  tinhXepLoaiPhongTrungTam,
} from "../../../utils/phieuPhongApi";

/**
 * Hộp thoại CHỐT phiếu KPI Phòng / Trung tâm (trạng thái 4 → 5).
 *
 * Không dùng LyDoModal được vì bước này cần thêm ô chọn xếp loại và hai cảnh báo
 * riêng của luồng Phòng/TT:
 *
 *  - Bỏ trống xếp loại thì BLL tự tính theo tổng tích lũy, trần là mức 3.
 *  - Mức 4 phải chọn TAY: nó đòi cả điểm > 80 LẪN nằm trong top 20% các phòng/TT
 *    hoàn thành tốt có điểm cao nhất. Hạn ngạch đó là của toàn trường, chỉ xác
 *    định được khi đã biết điểm của mọi phòng/TT, nên không hệ thống nào tính
 *    tự động - `sp_phieu_dv_chot` chỉ kiểm được vế điểm và trả DIEM_KHONG_DU.
 *
 * Chốt cũng đòi MỌI dòng phải có điểm hiệu lực ở cấp Trường; `dongThieuDiem`
 * truyền từ ngoài vào để chặn trước thay vì để người dùng ăn lỗi của server.
 */
const ChotPhieuPhongModal = ({
  tongDiem,
  dongThieuDiem = [],
  dangGui,
  onDong,
  onXacNhan,
}) => {
  const [xepLoai, setXepLoai] = useState("");
  const [ghiChuXepLoai, setGhiChuXepLoai] = useState("");
  const [nhanXet, setNhanXet] = useState("");
  const [loi, setLoi] = useState("");

  const deXuat = useMemo(() => tinhXepLoaiPhongTrungTam(tongDiem), [tongDiem]);
  const chonMuc4 = Number(xepLoai) === 4;
  const duDiemMuc4 = Number(tongDiem) > NGUONG_XEP_LOAI_PHONG.XUAT_SAC;
  const conThieuDiem = dongThieuDiem.length > 0;

  const handleXacNhan = () => {
    if (conThieuDiem) {
      setLoi("Còn tiêu chí chưa có điểm - không chốt được phiếu.");
      return;
    }
    if (chonMuc4 && !ghiChuXepLoai.trim()) {
      setLoi(
        "Chọn mức Hoàn thành xuất sắc thì phải ghi chú căn cứ - hạn ngạch top 20% không được hệ thống kiểm.",
      );
      return;
    }
    setLoi("");
    onXacNhan({
      xepLoai: xepLoai || null,
      ghiChuXepLoai: ghiChuXepLoai.trim(),
      nhanXet: nhanXet.trim(),
    });
  };

  return (
    <div className="modal-overlay" onClick={dangGui ? undefined : onDong}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Chốt phiếu KPI Phòng / Trung tâm</h3>
          <button className="close-btn" onClick={onDong} disabled={dangGui}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <p style={{ marginTop: 0, fontSize: "14px", color: "#475569" }}>
            Bước chốt tính lại toàn bộ tổng điểm, ghi điểm chính thức cho từng
            tiêu chí và snapshot lịch sử. Sau khi chốt, phiếu chỉ đọc - muốn sửa
            thì phải mở lại.
          </p>

          {conThieuDiem && (
            <div
              className="cd-hint cd-hint-error"
              style={{ marginBottom: "14px" }}
            >
              <i className="fa-solid fa-circle-xmark"></i>
              <div>
                Còn <b>{dongThieuDiem.length}</b> tiêu chí chưa có điểm hiệu
                lực: {dongThieuDiem.map((ct) => ct.TenTieuChi).join("; ")}. Hãy
                chấm đủ trước khi chốt.
              </div>
            </div>
          )}

          <div className="phong-chot-tong">
            <span className="phong-chot-tong-nhan">Tổng điểm tích lũy</span>
            <span className="phong-chot-tong-so">{formatDiem(tongDiem)}đ</span>
            {deXuat != null && (
              <span className="phong-chot-tong-de-xuat">
                Hệ thống đề xuất: <b>{XEP_LOAI_META[deXuat]?.label}</b>
              </span>
            )}
          </div>

          <div className="form-group">
            <label>Xếp loại</label>
            <SearchSelect
              value={xepLoai}
              disabled={dangGui}
              onChange={(v) => setXepLoai(v)}
              portal
              options={[
                {
                  value: "",
                  label: `Để hệ thống tự tính${deXuat != null ? ` (${XEP_LOAI_META[deXuat]?.label})` : ""}`,
                },
                ...XEP_LOAI_PHONG_CHON.map((muc) => ({
                  value: muc,
                  label: `Mức ${muc} - ${XEP_LOAI_META[muc]?.label}`,
                })),
              ]}
            />
            {xepLoai && (
              <small
                style={{ color: "#64748b", display: "block", marginTop: "6px" }}
              >
                {MO_TA_XEP_LOAI_PHONG[Number(xepLoai)]}
              </small>
            )}
          </div>

          {chonMuc4 && (
            <div
              className="cd-hint cd-hint-warn"
              style={{ marginBottom: "14px" }}
            >
              <i className="fa-solid fa-triangle-exclamation"></i>
              <div>
                Mức <b>Hoàn thành xuất sắc</b> đòi đơn vị nằm trong{" "}
                <b>top 20%</b> các phòng/TT hoàn thành tốt có điểm cao nhất. Hạn
                ngạch này chưa được tính tự động ở bất kỳ đâu - hệ thống chỉ
                kiểm được vế điểm &gt; {NGUONG_XEP_LOAI_PHONG.XUAT_SAC}, vế hạn
                ngạch do người chốt chịu trách nhiệm.
                {!duDiemMuc4 && (
                  <>
                    {" "}
                    Tổng điểm hiện tại là {formatDiem(tongDiem)}đ, chưa vượt
                    ngưỡng - gửi lên sẽ bị trả về <code>DIEM_KHONG_DU</code>.
                  </>
                )}
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Ghi chú xếp loại{chonMuc4 ? " (bắt buộc)" : ""}</label>
            <textarea
              className="cd-textarea"
              rows={2}
              value={ghiChuXepLoai}
              disabled={dangGui}
              placeholder="Căn cứ của mức xếp loại (nếu có)..."
              onChange={(e) => setGhiChuXepLoai(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Nhận xét khi chốt</label>
            <textarea
              className="cd-textarea"
              rows={2}
              value={nhanXet}
              disabled={dangGui}
              placeholder="Nhận xét chung về kết quả của đơn vị (nếu có)..."
              onChange={(e) => setNhanXet(e.target.value)}
            />
          </div>

          {loi && (
            <div className="cd-hint cd-hint-error">
              <i className="fa-solid fa-circle-exclamation"></i> {loi}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onDong} disabled={dangGui}>
            Hủy
          </button>
          <button
            className="btn-submit"
            onClick={handleXacNhan}
            disabled={dangGui || conThieuDiem}
          >
            <i
              className={`fa-solid ${dangGui ? "fa-spinner fa-spin" : "fa-lock"}`}
            ></i>{" "}
            {dangGui ? "Đang chốt..." : "Chốt phiếu"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChotPhieuPhongModal;
