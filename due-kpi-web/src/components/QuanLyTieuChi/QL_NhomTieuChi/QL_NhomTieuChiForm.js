import React from "react";
import SearchSelect from "../../Common/SearchSelect";

const LOAI_NHOM_OPTIONS = [
  { value: 1, label: "1 - Tiêu chí cơ bản (Nhóm A)" },
  { value: 2, label: "2 - Thành tích vượt trội (Nhóm B)" },
];

const QL_NhomTieuChiForm = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isEditing,
  nhomChaList = [],
  showLoaiNhom = true,
}) => {
  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleSelect = (name) => (value) =>
    setFormData({ ...formData, [name]: value });

  return (
    <div className="modal-overlay">
      <div
        className="modal-box form-modal-box"
        style={{ width: "90%", maxWidth: "650px" }}
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
            {isEditing ? "Cập nhật Nhóm tiêu chí" : "Thêm mới Nhóm tiêu chí"}
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
          <form id="nhomTieuChiForm" onSubmit={onSubmit}>
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label>
                Tên Nhóm tiêu chí <span className="text-red">*</span>
              </label>
              <input
                type="text"
                name="TenNhom"
                className="form-input"
                value={formData.TenNhom || ""}
                onChange={handleChange}
                required
                placeholder="VD: I. Đào tạo - Giảng dạy"
              />
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label>Trực thuộc (Cấp cha)</label>
              <SearchSelect
                name="IdNhomCha"
                value={formData.IdNhomCha || ""}
                onChange={handleSelect("IdNhomCha")}
                options={[
                  { value: "", label: "Thuộc cấp cao nhất" },
                  ...nhomChaList
                    .filter((n) => n.IdNhom !== formData.IdNhom)
                    .map((n) => ({ value: n.IdNhom, label: n.TenNhom })),
                ]}
                placeholder="Thuộc cấp cao nhất"
              />
            </div>

            {showLoaiNhom ? (
              <div className="form-grid-2" style={{ marginBottom: "20px" }}>
                <div className="form-group">
                  <label>
                    Loại Nhóm <span className="text-red">*</span>
                  </label>
                  <SearchSelect
                    name="LoaiNhom"
                    value={formData.LoaiNhom || 1}
                    onChange={handleSelect("LoaiNhom")}
                    options={LOAI_NHOM_OPTIONS}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Điểm tối đa (Nếu có)</label>
                  <input
                    type="number"
                    name="DiemToiDa"
                    className="form-input"
                    value={formData.DiemToiDa || ""}
                    onChange={handleChange}
                    placeholder="VD: 100"
                  />
                </div>
              </div>
            ) : (
              <div className="form-group" style={{ marginBottom: "20px" }}>
                <label>Điểm tối đa (Nếu có)</label>
                <input
                  type="number"
                  name="DiemToiDa"
                  className="form-input"
                  value={formData.DiemToiDa || ""}
                  onChange={handleChange}
                  placeholder="VD: 100"
                />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label>Thứ tự hiển thị</label>
              <input
                type="text"
                name="ThuTuHienThi"
                className="form-input"
                value={formData.ThuTuHienThi ?? ""}
                onChange={handleChange}
                placeholder="VD: 1"
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
                id="ttNTC"
                checked={formData.TrangThai !== false}
                onChange={handleChange}
                style={{ width: "18px", height: "18px", marginRight: "10px" }}
              />
              <label
                htmlFor="ttNTC"
                style={{ margin: 0, cursor: "pointer", fontWeight: "500" }}
              >
                Kích hoạt nhóm này
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
          <button type="submit" form="nhomTieuChiForm" className="btn-submit">
            <i
              className="fa-solid fa-floppy-disk"
              style={{ marginRight: "5px" }}
            ></i>{" "}
            Lưu dữ liệu
          </button>
        </div>
      </div>
    </div>
  );
};

export default QL_NhomTieuChiForm;
