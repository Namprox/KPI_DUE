import React, { useEffect, useState } from "react";

/**
 * Trả bản kê về cho giảng viên sửa (2 → 4).
 *
 * Lý do BẮT BUỘC - server trả 400 nếu bỏ trống - và được lưu vào `NhanXetDuyet`
 * của header nên giảng viên đọc được nguyên văn. Vì vậy ô này không phải thủ tục:
 * đây là toàn bộ thông tin người kê nhận được để biết phải sửa gì.
 *
 * Cảnh báo trong modal là có chủ đích: trả lại RESET toàn bộ trạng thái dòng về
 * "chờ duyệt" và xoá `SoLuongDuyet`/`GioDuyet`, nên mọi dòng đã xét trước đó sẽ
 * phải xét lại từ đầu sau khi giảng viên nộp lại.
 *
 * @param {boolean}  isOpen
 * @param {number}   soDongDaXet số dòng đã duyệt/từ chối sẽ bị xoá kết quả
 * @param {boolean}  dangGui
 * @param {Function} onClose
 * @param {Function} onSubmit (lyDo) => void
 */
const TraLaiKeKhaiModal = ({
  isOpen,
  soDongDaXet = 0,
  dangGui = false,
  onClose,
  onSubmit,
}) => {
  const [lyDo, setLyDo] = useState("");

  useEffect(() => {
    if (isOpen) setLyDo("");
  }, [isOpen]);

  if (!isOpen) return null;

  const hopLe = lyDo.trim().length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <i
              className="fa-solid fa-rotate-left"
              style={{ marginRight: "8px" }}
            ></i>
            Trả bản kê về cho giảng viên
          </h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {soDongDaXet > 0 && (
            <div className="cd-hint cd-hint-warn" style={{ marginTop: 0 }}>
              <i className="fa-solid fa-circle-exclamation"></i> {soDongDaXet}{" "}
              dòng bạn đã xét sẽ bị xoá kết quả duyệt. Sau khi giảng viên nộp
              lại, bạn phải duyệt lại từ đầu.
            </div>
          )}

          <div className="form-group" style={{ marginTop: "14px" }}>
            <label>
              Lý do trả lại <span className="text-red">*</span>
            </label>
            <textarea
              className="form-input cd-textarea"
              rows={4}
              maxLength={1000}
              value={lyDo}
              onChange={(e) => setLyDo(e.target.value)}
              placeholder="Ví dụ: Dòng hướng dẫn luận văn thiếu tên học viên; số lượng bài chấm chưa khớp minh chứng."
              disabled={dangGui}
            />
            <div className="cd-hint" style={{ marginTop: "6px" }}>
              Giảng viên sẽ đọc đúng nguyên văn nội dung này.
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={dangGui}>
            Huỷ
          </button>
          <button
            className="btn-submit"
            onClick={() => onSubmit(lyDo.trim())}
            disabled={!hopLe || dangGui}
          >
            <i
              className={`fa-solid ${dangGui ? "fa-spinner fa-spin" : "fa-paper-plane"}`}
            ></i>{" "}
            Trả lại
          </button>
        </div>
      </div>
    </div>
  );
};

export default TraLaiKeKhaiModal;
