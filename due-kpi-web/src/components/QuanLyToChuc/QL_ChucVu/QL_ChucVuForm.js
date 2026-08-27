import React from "react";

const QL_ChucVuForm = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isEditing,
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
          <form id="cvForm" onSubmit={onSubmit}>
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label>
                Mã chức vụ <span className="text-red">*</span>
              </label>
              <input
                type="text"
                name="MaChucVu"
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
                name="TenChucVu"
                className="form-input"
                value={formData.TenChucVu || ""}
                onChange={handleChange}
                required
                placeholder="Bí thư chi bộ, ..."
              />
            </div>
            <div className="form-grid-2">
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label>Định mức giảng dạy (0.0 - 1.0)</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  name="TyLeDinhMucGiang"
                  className="form-input"
                  value={
                    formData.TyLeDinhMucGiang !== null &&
                    formData.TyLeDinhMucGiang !== undefined
                      ? formData.TyLeDinhMucGiang
                      : ""
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      TyLeDinhMucGiang:
                        e.target.value === ""
                          ? null
                          : parseFloat(e.target.value),
                    })
                  }
                  placeholder="Ví dụ: 0.85"
                />
              </div>
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label>Định mức NCKH (0.0 - 1.0)</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  name="ty_le_dinh_muc_nckh"
                  className="form-input"
                  value={
                    formData.ty_le_dinh_muc_nckh !== null &&
                    formData.ty_le_dinh_muc_nckh !== undefined
                      ? formData.ty_le_dinh_muc_nckh
                      : ""
                  }
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ty_le_dinh_muc_nckh:
                        e.target.value === ""
                          ? null
                          : parseFloat(e.target.value),
                    })
                  }
                  placeholder="Ví dụ: 0.85"
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label>Điều kiện áp dụng / Ghi chú</label>
              <textarea
                name="GhiChuDieuKien"
                className="form-input"
                value={formData.GhiChuDieuKien || ""}
                onChange={handleChange}
                rows="2"
                placeholder="Ví dụ: Bí thư chi bộ - Bảng 2.1 mục 12 QĐ 3237"
              ></textarea>
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
          </form>
        </div>
        <div
          className="modal-footer"
          style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}
        >
          <button type="button" className="btn-cancel" onClick={onClose}>
            <i className="fa-solid fa-times" style={{ marginRight: "5px" }}></i>{" "}
            Hủy
          </button>
          <button type="submit" form="cvForm" className="btn-submit">
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
