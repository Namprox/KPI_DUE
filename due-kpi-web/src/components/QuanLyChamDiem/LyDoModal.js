import React, { useState } from "react";

/**
 * Hộp thoại "nhập lý do rồi xác nhận" — dùng chung cho mọi thao tác trả về /
 * mở lại của quy trình 4 giai đoạn:
 *
 *   - trả một dòng về cho giảng viên      (chitiet/{id}/tham-dinh/tra-ve)
 *   - Trưởng khoa trả dòng về đơn vị       (chitiet/{id}/khoa/tra-tham-dinh)
 *   - Hiệu trưởng trả hồ sơ trong gói      (to-trinh-khoa/{id}/ht-tra-lai)
 *   - Hiệu trưởng mở lại phiếu đã hoàn tất (phieu/{id}/mo-lai)
 *
 * Tất cả đều bắt buộc lý do ở phía server, nên mặc định `batBuocLyDo` là true;
 * đặt false cho các thao tác chỉ cần ghi chú (duyệt, trình, chốt gói).
 *
 * `canhBao` hiện trong khung đỏ — dành cho thao tác có tác dụng phụ không hoàn
 * tác được, ví dụ trả dòng về đơn vị thẩm định sẽ xóa cả nhóm xếp loại.
 */
const LyDoModal = ({
  tieuDe,
  moTa,
  canhBao,
  nhanLyDo = "Lý do",
  goiYLyDo = "",
  batBuocLyDo = true,
  hienNhanXet = false,
  nhanXacNhan = "Xác nhận",
  iconXacNhan = "fa-rotate-left",
  dangGui,
  onDong,
  onXacNhan,
  children,
}) => {
  const [lyDo, setLyDo] = useState("");
  const [nhanXet, setNhanXet] = useState("");
  const [loi, setLoi] = useState("");

  const handleXacNhan = () => {
    if (batBuocLyDo && !lyDo.trim()) {
      setLoi(
        `Vui lòng nhập ${nhanLyDo.toLowerCase()} — người nhận cần biết phải xử lý gì.`,
      );
      return;
    }
    setLoi("");
    onXacNhan({ lyDo: lyDo.trim(), nhanXet: nhanXet.trim() });
  };

  return (
    <div className="modal-overlay" onClick={dangGui ? undefined : onDong}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{tieuDe}</h3>
          <button className="close-btn" onClick={onDong} disabled={dangGui}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {moTa && (
            <p style={{ marginTop: 0, fontSize: "14px", color: "#475569" }}>
              {moTa}
            </p>
          )}

          {canhBao && (
            <div
              className="cd-hint cd-hint-error"
              style={{ marginBottom: "15px" }}
            >
              <i className="fa-solid fa-triangle-exclamation"></i> {canhBao}
            </div>
          )}

          {children}

          <div
            className="form-group"
            style={{
              marginTop: "10px",
              marginBottom: hienNhanXet ? "15px" : 0,
            }}
          >
            <label>
              {nhanLyDo} {batBuocLyDo && <span className="text-red">*</span>}
            </label>
            <textarea
              className="cd-textarea"
              rows={3}
              value={lyDo}
              disabled={dangGui}
              placeholder={goiYLyDo}
              onChange={(e) => {
                setLyDo(e.target.value);
                if (loi) setLoi("");
              }}
            />
          </div>

          {hienNhanXet && (
            <div className="form-group">
              <label>Nhận xét thêm (không bắt buộc)</label>
              <textarea
                className="cd-textarea"
                rows={2}
                value={nhanXet}
                disabled={dangGui}
                onChange={(e) => setNhanXet(e.target.value)}
              />
            </div>
          )}

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
            disabled={dangGui}
          >
            {dangGui ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Đang gửi...
              </>
            ) : (
              <>
                <i className={`fa-solid ${iconXacNhan}`}></i> {nhanXacNhan}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LyDoModal;
