import React, { useEffect, useState } from "react";

/**
 * Modal xem trước PDF bằng viewer sẵn có của trình duyệt (<iframe> + blob URL).
 * Không dùng thư viện ngoài: file đã được tải về dạng Blob qua apiFetch nên chỉ
 * cần createObjectURL là Chrome/Edge/Firefox tự dựng toolbar zoom / phân trang / in.
 *
 * @param {boolean}  isOpen
 * @param {string}   fileName   tên hiển thị trên tiêu đề
 * @param {string}   url        object URL của PDF (null khi đang tải)
 * @param {boolean}  isLoading  đang tải file từ máy chủ
 * @param {string}   error      thông điệp lỗi nếu tải thất bại
 * @param {Function} onClose
 * @param {Function} onDownload tùy chọn — hiện nút "Tải về" ở chân modal
 */
const PdfPreviewModal = ({
  isOpen,
  fileName,
  url,
  isLoading,
  error,
  onClose,
  onDownload,
}) => {
  // Trình duyệt cũ / thiết bị di động không nhúng được PDF: iframe sẽ trắng trơn
  // nên sau vài giây chưa có sự kiện load thì gợi ý mở tab mới.
  const [iframeLoaded, setIframeLoaded] = useState(false);

  useEffect(() => {
    setIframeLoaded(false);
  }, [url]);

  // Đóng bằng phím Esc cho khớp thói quen của các modal khác trong hệ thống
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 10050 }} onClick={onClose}>
      <div
        className="modal-box"
        style={{
          width: "92%",
          maxWidth: "1000px",
          height: "90vh",
          maxHeight: "90vh",
        }}
        // Chặn nổi bọt để bấm bên trong modal không đóng nhầm
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              minWidth: 0,
            }}
          >
            <i className="fa-solid fa-file-pdf" style={{ flexShrink: 0 }}></i>
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {fileName || "Minh chứng.pdf"}
            </span>
          </h3>
          <button className="close-btn" onClick={onClose} title="Đóng (Esc)">
            &times;
          </button>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            background: "#f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isLoading ? (
            <div style={{ textAlign: "center", color: "#64748b" }}>
              <i
                className="fa-solid fa-circle-notch fa-spin fa-2x"
                style={{ color: "#3498db" }}
              ></i>
              <p style={{ marginTop: "12px" }}>Đang tải tệp minh chứng...</p>
            </div>
          ) : error ? (
            <div
              style={{
                textAlign: "center",
                color: "#b91c1c",
                padding: "30px 20px",
              }}
            >
              <i
                className="fa-solid fa-triangle-exclamation fa-2x"
                style={{ marginBottom: "12px" }}
              ></i>
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          ) : url ? (
            <div style={{ width: "100%", height: "100%", position: "relative" }}>
              <iframe
                src={url}
                title={fileName || "Xem trước minh chứng"}
                onLoad={() => setIframeLoaded(true)}
                style={{ width: "100%", height: "100%", border: "none" }}
              />
              {!iframeLoaded && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "12px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(15,23,42,0.85)",
                    color: "#fff",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontSize: "13px",
                  }}
                >
                  Nếu không hiển thị được, hãy{" "}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#93c5fd" }}
                  >
                    mở trong tab mới
                  </a>
                  .
                </div>
              )}
            </div>
          ) : null}
        </div>

        <div
          className="modal-footer"
          style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}
        >
          {onDownload && (
            <button
              type="button"
              className="btn-submit"
              onClick={onDownload}
              disabled={isLoading || !!error}
            >
              <i
                className="fa-solid fa-download"
                style={{ marginRight: "5px" }}
              ></i>
              Tải về
            </button>
          )}
          <button type="button" className="btn-cancel" onClick={onClose}>
            <i className="fa-solid fa-times" style={{ marginRight: "5px" }}></i>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default PdfPreviewModal;
