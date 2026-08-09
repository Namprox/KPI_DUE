import React, { useState, useEffect } from "react";
import { apiFetch } from "../../../utils/api";
import SearchSelect from "../../Common/SearchSelect";

const QL_DanhGiaSinhVienChotModal = ({
  isOpen,
  onClose,
  onSuccess,
  namList,
}) => {
  const [idNam, setIdNam] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (isOpen) {
      setMessage({ type: "", text: "" });
      if (namList && namList.length > 0) {
        setIdNam(namList[0].IdNam || namList[0].id_nam || "");
      }
    }
  }, [isOpen, namList]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!idNam) {
      setMessage({ type: "error", text: "Vui lòng chọn năm đánh giá!" });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiFetch("diem-tb-phan-hoi-sv/chot", {
        method: "POST",
        body: JSON.stringify({ IdNam: parseInt(idNam, 10) }),
      });

      const result = await response.json();
      const isSuccess = response.ok && result.Success !== false;

      if (isSuccess) {
        let msg = result.Message || "Chốt điểm trung bình thành công!";
        if (result.SoGiangVien !== undefined) {
          msg += ` (Tổng số giảng viên: ${result.SoGiangVien}`;
          if (result.SoMaKhongKhop) {
            msg += `, Mã không khớp: ${result.SoMaKhongKhop}`;
          }
          msg += `)`;
        }
        setMessage({ type: "success", text: msg });
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1800);
      } else {
        setMessage({
          type: "error",
          text:
            result.Message ||
            result.message ||
            "Chốt điểm thất bại! Bạn có thể không có quyền thực hiện hoặc năm không hợp lệ.",
        });
      }
    } catch (error) {
      console.error("Lỗi khi chốt điểm trung bình:", error);
      setMessage({
        type: "error",
        text: "Có lỗi xảy ra khi kết nối tới máy chủ!",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div
        className="modal-box form-modal-box"
        style={{ width: "90%", maxWidth: "550px" }}
      >
        <div
          className="modal-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, paddingRight: "20px", lineHeight: "1.4" }}>
            <i className="fa-solid fa-calculator" style={{ marginRight: "8px" }}></i>
            Chốt điểm trung bình đánh giá sinh viên
          </h3>
          <button
            className="close-btn"
            onClick={onClose}
            style={{
              fontSize: "26px",
              lineHeight: "1",
              flexShrink: 0,
              marginTop: "-2px",
            }}
          >
            &times;
          </button>
        </div>

        <div className="modal-body" style={{ padding: "25px" }}>
          {message.text && (
            <div
              style={{
                padding: "12px 15px",
                borderRadius: "6px",
                marginBottom: "20px",
                backgroundColor:
                  message.type === "success" ? "#d1fae5" : "#fee2e2",
                color: message.type === "success" ? "#065f46" : "#991b1b",
                border: `1px solid ${
                  message.type === "success" ? "#a7f3d0" : "#fca5a5"
                }`,
                fontSize: "14px",
              }}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label style={{ fontWeight: "600", marginBottom: "8px", display: "block" }}>
                Năm đánh giá <span className="text-red">*</span>
              </label>
              <SearchSelect
                value={idNam}
                onChange={(v) => setIdNam(v)}
                options={(namList || []).map((y) => {
                  const val = y.IdNam || y.id_nam;
                  return { value: val, label: `Năm ${val}` };
                })}
                placeholder="-- Chọn năm đánh giá --"
                required
                disabled={isLoading}
              />
            </div>

            <div
              style={{
                backgroundColor: "#f8fafc",
                borderLeft: "4px solid #3b82f6",
                padding: "12px 15px",
                borderRadius: "4px",
                fontSize: "13px",
                color: "#475569",
                marginBottom: "25px",
                lineHeight: "1.5",
              }}
            >
              <i className="fa-solid fa-circle-info" style={{ color: "#3b82f6", marginRight: "6px" }}></i>
              Thao tác này sẽ gộp dữ liệu phản hồi sinh viên trong năm học được chọn và tính điểm trung bình cho toàn bộ giảng viên. Mỗi năm chỉ giữ 1 kết quả chốt duy nhất, nếu năm học này đã được chốt trước đó hệ thống sẽ <strong>GHI ĐÈ</strong> kết quả cũ.
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
              }}
            >
              <button
                type="button"
                className="btn-cancel"
                onClick={onClose}
                disabled={isLoading}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn-submit"
                style={{
                  backgroundColor: "#2563eb",
                  borderColor: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Đang chốt điểm...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i> Chốt điểm
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default QL_DanhGiaSinhVienChotModal;
