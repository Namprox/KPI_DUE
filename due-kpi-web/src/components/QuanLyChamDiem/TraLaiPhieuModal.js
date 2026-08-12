import React, { useState } from "react";

/**
 * Trả phiếu về cho GV sửa lại (POST api/phieu/{id}/khoa/tra-lai).
 * LyDo là bắt buộc — server từ chối khi rỗng, và GV cần biết phải sửa gì.
 */
const TraLaiPhieuModal = ({ hoTen, dangGui, onDong, onXacNhan }) => {
  const [lyDo, setLyDo] = useState("");
  const [nhanXet, setNhanXet] = useState("");
  const [loi, setLoi] = useState("");

  const handleXacNhan = () => {
    if (!lyDo.trim()) {
      setLoi(
        "Vui lòng nhập lý do trả lại — giảng viên cần biết phải sửa nội dung nào.",
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
          <h3>Trả phiếu về cho giảng viên</h3>
          <button className="close-btn" onClick={onDong} disabled={dangGui}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          <p style={{ marginTop: 0, fontSize: "14px", color: "#475569" }}>
            Phiếu của <b>{hoTen}</b> sẽ quay lại trạng thái <b>GV đang nhập</b>.
            Điểm đơn vị đã chấm được giữ nguyên trong lịch sử, nhưng giảng viên
            có thể sửa lại phần tự đánh giá và phải gửi lên lại.
          </p>

          <div className="form-group" style={{ marginBottom: "15px" }}>
            <label>
              Lý do trả lại <span className="text-red">*</span>
            </label>
            <textarea
              className="cd-textarea"
              rows={3}
              value={lyDo}
              disabled={dangGui}
              placeholder="VD: Thiếu minh chứng cho tiêu chí 2.1, mô tả hoàn thành chưa rõ..."
              onChange={(e) => {
                setLyDo(e.target.value);
                if (loi) setLoi("");
              }}
            />
          </div>

          <div className="form-group">
            <label>Nhận xét chung (không bắt buộc)</label>
            <textarea
              className="cd-textarea"
              rows={3}
              value={nhanXet}
              disabled={dangGui}
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
            disabled={dangGui}
          >
            {dangGui ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Đang gửi...
              </>
            ) : (
              <>
                <i className="fa-solid fa-rotate-left"></i> Trả lại phiếu
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TraLaiPhieuModal;
