import React from "react";

const QL_ChucVuForm = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isEditing,
  saving = false,
  error,
}) => {
  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let finalValue = type === "checkbox" ? checked : value;
    setFormData({ ...formData, [name]: finalValue });
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-box form-modal-box"
        style={{ width: "90%", maxWidth: "600px" }}
      >
        <div
          className="modal-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <h3 style={{ margin: 0, paddingRight: "20px", lineHeight: "1.4" }}>
            {isEditing ? "Cập nhật Chức vụ" : "Thêm Chức vụ mới"}
          </h3>
          <button
            className="close-btn"
            onClick={onClose} disabled={saving}
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
          {error && <p role="alert">{error}</p>}
          <form id="cvForm" onSubmit={onSubmit}>
            <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0 }}>
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label>
                Mã chức vụ <span className="text-red">*</span>
              </label>
              <input
                type="text"
                name="MaChucVu" aria-label="Mã chức vụ"
                className="form-input"
                value={formData.MaChucVu || ""}
                onChange={handleChange}
                required
                placeholder="BTCB, BTDU, ..."
              />
            </div>
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label>
                Tên chức vụ <span className="text-red">*</span>
              </label>
              <input
                type="text"
                name="TenChucVu" aria-label="Tên chức vụ"
                className="form-input"
                value={formData.TenChucVu || ""}
                onChange={handleChange}
                required
                placeholder="Bí thư chi bộ, ..."
              />
            </div>
            <div
              className="form-group"
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "15px",
              }}
            >
              <input
                type="checkbox"
                name="TrangThai"
                id="ttChucVu"
                checked={formData.TrangThai !== false}
                onChange={handleChange}
                style={{ width: "18px", height: "18px", marginRight: "10px" }}
              />
              <label
                htmlFor="ttChucVu"
                style={{ margin: 0, cursor: "pointer", fontWeight: "500" }}
              >
                Đang hoạt động
              </label>
            </div>
          </fieldset>
          </form>
        </div>
        <div
          className="modal-footer"
          style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}
        >
          <button type="button" className="btn-cancel" onClick={onClose} disabled={saving}>
            <i className="fa-solid fa-times" style={{ marginRight: "5px" }}></i>{" "}
            Hủy
          </button>
          <button type="submit" form="cvForm" className="btn-submit" disabled={saving}>
            <i
              className="fa-solid fa-floppy-disk"
              style={{ marginRight: "5px" }}
            ></i>{" "}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

export default QL_ChucVuForm;
