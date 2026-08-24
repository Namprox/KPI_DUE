import React, { useState } from "react";
import SearchSelect from "../../Common/SearchSelect";

const QL_DanhGiaSinhVienForm = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isEditing,
  nhanVienList,
}) => {
  const [nhanVienDaChon, setNhanVienDaChon] = useState("");

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]:
        value === ""
          ? ""
          : name === "DanhGia"
            ? parseFloat(value)
            : parseInt(value, 10),
    });
  };

  const handleNhanVienChange = (value) => {
    setNhanVienDaChon(value);
    const idNv = String(value || "");
    if (!idNv) return;
    const nv = nhanVienList.find(
      (x) =>
        x.IdNhanVien?.toString() === idNv || x.idNhanVien?.toString() === idNv,
    );
    if (nv) {
      setFormData({
        ...formData,
        MaCanBo: nv.MaNhanVien || nv.maNhanVien || formData.MaCanBo,
        HoTenGv: nv.HoTen || nv.hoTen || formData.HoTenGv,
      });
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div
        className="modal-box form-modal-box"
        style={{ width: "90%", maxWidth: "700px" }}
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
            {isEditing
              ? "Cập nhật đánh giá sinh viên"
              : "Thêm mới đánh giá sinh viên"}
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
          <form id="danhGiaSinhVienForm" onSubmit={onSubmit}>
            <div className="form-group" style={{ marginBottom: "15px" }}>
              <label>Lấy thông tin từ Nhân viên (Tùy chọn)</label>
              <SearchSelect
                value={nhanVienDaChon}
                onChange={handleNhanVienChange}
                options={nhanVienList.map((nv) => ({
                  value: nv.IdNhanVien || nv.idNhanVien,
                  label: `${nv.MaNhanVien || nv.maNhanVien} - ${nv.HoTen || nv.hoTen}`,
                }))}
                placeholder="-- Chọn nhân viên để điền nhanh --"
                searchable
                searchPlaceholder="Tìm theo mã hoặc tên..."
              />
            </div>
            <div className="form-grid-2" style={{ marginBottom: "20px" }}>
              <div className="form-group">
                <label>
                  Mã cán bộ <span className="text-red">*</span>
                </label>
                <input
                  type="text"
                  name="MaCanBo"
                  className="form-input"
                  value={formData.MaCanBo || ""}
                  onChange={handleChange}
                  placeholder="Ví dụ: GV001"
                  required
                />
              </div>
              <div className="form-group">
                <label>Họ tên giảng viên</label>
                <input
                  type="text"
                  name="HoTenGv"
                  className="form-input"
                  value={formData.HoTenGv || ""}
                  onChange={handleChange}
                  placeholder="Ví dụ: Nguyễn Văn A"
                />
              </div>
            </div>

            <div className="form-grid-2" style={{ marginBottom: "20px" }}>
              <div className="form-group">
                <label>Mã số sinh viên (MSSV)</label>
                <input
                  type="text"
                  name="Mssv"
                  className="form-input"
                  value={formData.Mssv || ""}
                  onChange={handleChange}
                  placeholder="Ví dụ: 231121012345"
                />
              </div>
              <div className="form-group">
                <label>Mã học phần</label>
                <input
                  type="text"
                  name="MaHocPhan"
                  className="form-input"
                  value={formData.MaHocPhan || ""}
                  onChange={handleChange}
                  placeholder="Ví dụ: LAW1001"
                />
              </div>
            </div>

            <div className="form-grid-2" style={{ marginBottom: "20px" }}>
              <div className="form-group">
                <label>
                  Kỳ học <span className="text-red">*</span>
                </label>
                <input
                  type="number"
                  name="KyHoc"
                  className="form-input"
                  value={
                    formData.KyHoc !== undefined && formData.KyHoc !== null
                      ? formData.KyHoc
                      : ""
                  }
                  onChange={handleNumberChange}
                  placeholder="Ví dụ: 261 (Năm 26, Kỳ 1)"
                  required
                />
              </div>
              <div className="form-group">
                <label>Khoa quản lý</label>
                <input
                  type="text"
                  name="KhoaQuanLyHp"
                  className="form-input"
                  value={formData.KhoaQuanLyHp || ""}
                  onChange={handleChange}
                  placeholder="Ví dụ: Khoa Luật"
                />
              </div>
            </div>

            <div className="form-grid-2" style={{ marginBottom: "20px" }}>
              <div className="form-group">
                <label>Câu hỏi</label>
                <input
                  type="number"
                  name="CauHoi"
                  className="form-input"
                  value={
                    formData.CauHoi !== undefined && formData.CauHoi !== null
                      ? formData.CauHoi
                      : ""
                  }
                  onChange={handleNumberChange}
                  min="1"
                  max="12"
                  placeholder="1..12"
                />
              </div>
              <div className="form-group">
                <label>
                  Điểm đánh giá <span className="text-red">*</span>
                </label>
                <input
                  type="number"
                  name="DanhGia"
                  className="form-input"
                  value={
                    formData.DanhGia !== undefined && formData.DanhGia !== null
                      ? formData.DanhGia
                      : ""
                  }
                  onChange={handleNumberChange}
                  min="1"
                  max="5"
                  placeholder="Ví dụ: 4.5"
                  required
                />
              </div>
            </div>
          </form>
        </div>
        <div className="modal-footer" style={{ display: "flex", gap: "10px" }}>
          <button type="button" className="btn-cancel" onClick={onClose}>
            <i className="fa-solid fa-times" style={{ marginRight: "5px" }}></i>{" "}
            Hủy
          </button>
          <button
            type="submit"
            form="danhGiaSinhVienForm"
            className="btn-submit"
          >
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

export default QL_DanhGiaSinhVienForm;
