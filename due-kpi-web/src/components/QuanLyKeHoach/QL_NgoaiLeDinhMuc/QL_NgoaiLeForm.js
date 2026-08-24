import React, { useEffect } from "react";
import { Calendar } from "primereact/calendar";
import { addLocale, locale } from "primereact/api";
import { LOAI_NGOAI_LE_MAP } from "./QL_NgoaiLeListing";
import SearchSelect from "../../Common/SearchSelect";

const QL_NgoaiLeForm = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isEditing,
  namList,
  nhanVienList,
}) => {
  useEffect(() => {
    addLocale("vi", {
      firstDayOfWeek: 1,
      dayNames: [
        "Chủ nhật",
        "Thứ hai",
        "Thứ ba",
        "Thứ tư",
        "Thứ năm",
        "Thứ sáu",
        "Thứ bảy",
      ],
      dayNamesShort: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
      dayNamesMin: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
      monthNames: [
        "Tháng 1",
        "Tháng 2",
        "Tháng 3",
        "Tháng 4",
        "Tháng 5",
        "Tháng 6",
        "Tháng 7",
        "Tháng 8",
        "Tháng 9",
        "Tháng 10",
        "Tháng 11",
        "Tháng 12",
      ],
      monthNamesShort: [
        "Th1",
        "Th2",
        "Th3",
        "Th4",
        "Th5",
        "Th6",
        "Th7",
        "Th8",
        "Th9",
        "Th10",
        "Th11",
        "Th12",
      ],
      today: "Hôm nay",
      clear: "Xóa",
    });
    locale("vi");
  }, []);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleSelect = (name) => (value) =>
    setFormData((prev) => ({ ...prev, [name]: value }));

  const handleLoaiNgoaiLeChange = (value) => {
    const loai = parseInt(value, 10);
    if (!loai) {
      setFormData((prev) => ({ ...prev, LoaiNgoaiLe: "" }));
      return;
    }

    let updated = {
      ...formData,
      LoaiNgoaiLe: loai,
      MienNckh: false,
      SoGioGiamGiang: "",
      HeSoGiamGiang: "",
      SoGioThemNckh: "",
      HeSoNckh: "",
      HeSoGiamNckh: "",
      HeSoGiamPvcd: "",
    };

    if (loai === 1) {
      updated.MienNckh = true;
    } else if (loai === 4) {
      updated.SoGioGiamGiang = 40;
    } else if (loai === 5) {
      updated.HeSoGiamGiang = 0.1;
    } else if (loai === 7) {
      updated.HeSoNckh = 1.2;
    }

    setFormData(updated);
  };

  const handleDateChange = (name, dateValue) => {
    if (!dateValue) {
      setFormData((prev) => ({ ...prev, [name]: "" }));
      return;
    }
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");
    setFormData((prev) => ({ ...prev, [name]: `${year}-${month}-${day}` }));
  };

  const parseDate = (dateString) => {
    if (!dateString) return null;
    let date;
    if (typeof dateString === "string" && dateString.includes("/Date(")) {
      const timestamp = parseInt(dateString.match(/\d+/)[0], 10);
      date = new Date(timestamp);
    } else {
      date = new Date(dateString);
    }
    return isNaN(date.getTime()) ? null : date;
  };

  const selectedLoai = parseInt(formData.LoaiNgoaiLe, 10);

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
              ? "Cập nhật ngoại lệ định mức"
              : "Thêm mới ngoại lệ định mức"}
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
        <div
          className="modal-body"
          style={{ padding: "25px", maxHeight: "75vh", overflowY: "auto" }}
        >
          <form id="ngoaiLeForm" onSubmit={onSubmit}>
            <div className="form-grid-2" style={{ marginBottom: "20px" }}>
              <div className="form-group">
                <label>
                  Năm đánh giá <span className="text-red">*</span>
                </label>
                <SearchSelect
                  name="IdNam"
                  value={formData.IdNam || ""}
                  onChange={handleSelect("IdNam")}
                  options={namList.map((n) => ({
                    value: n.IdNam,
                    label: String(n.IdNam),
                  }))}
                  placeholder="-- Chọn năm học --"
                  disabled={isEditing}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Giảng viên / Nhân viên <span className="text-red">*</span>
                </label>
                <SearchSelect
                  name="IdNhanVien"
                  value={formData.IdNhanVien || ""}
                  onChange={handleSelect("IdNhanVien")}
                  options={nhanVienList.map((nv) => ({
                    value: nv.IdNhanVien,
                    label: `${nv.MaNhanVien ? nv.MaNhanVien + " - " : ""}${nv.HoTen}`,
                  }))}
                  placeholder="-- Chọn giảng viên --"
                  searchable
                  searchPlaceholder="Tìm theo mã hoặc tên..."
                  disabled={isEditing}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label>
                Loại ngoại lệ <span className="text-red">*</span>
              </label>
              <SearchSelect
                name="LoaiNgoaiLe"
                value={formData.LoaiNgoaiLe || ""}
                onChange={handleLoaiNgoaiLeChange}
                options={Object.entries(LOAI_NGOAI_LE_MAP).map(
                  ([key, val]) => ({ value: key, label: val }),
                )}
                placeholder="-- Chọn loại ngoại lệ --"
                disabled={isEditing}
                required
              />
            </div>

            {/* Additional fields depending on LoaiNgoaiLe (only when creating) */}
            {!isEditing && selectedLoai > 0 && (
              <div
                style={{
                  background: "#f8fafc",
                  padding: "15px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  marginBottom: "20px",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: "14px",
                    color: "#334155",
                  }}
                >
                  <i
                    className="fa-solid fa-sliders"
                    style={{ marginRight: "6px" }}
                  ></i>{" "}
                  Thiết lập thông số giảm/tăng định mức
                </h4>

                {selectedLoai === 1 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <input
                      type="checkbox"
                      id="MienNckh"
                      name="MienNckh"
                      checked={!!formData.MienNckh}
                      onChange={handleChange}
                      style={{
                        width: "18px",
                        height: "18px",
                        cursor: "pointer",
                      }}
                    />
                    <label
                      htmlFor="MienNckh"
                      style={{
                        margin: 0,
                        cursor: "pointer",
                        fontWeight: "600",
                        color: "#1e293b",
                      }}
                    >
                      Miễn điều kiện đủ NCKH khi xếp loại (Tập sự / thử việc)
                    </label>
                  </div>
                )}

                {selectedLoai === 4 && (
                  <div className="form-group">
                    <label>Số giờ giảng giảm (giờ chuẩn)</label>
                    <input
                      type="number"
                      name="SoGioGiamGiang"
                      className="form-input"
                      value={formData.SoGioGiamGiang ?? 40}
                      onChange={handleChange}
                      placeholder="Default: 40 giờ"
                    />
                  </div>
                )}

                {selectedLoai === 5 && (
                  <div className="form-group">
                    <label>Tỷ lệ giảm giờ giảng (0.00 - 1.00)</label>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      name="HeSoGiamGiang"
                      className="form-input"
                      value={formData.HeSoGiamGiang ?? 0.1}
                      onChange={handleChange}
                      placeholder="Default: 0.10 (10%)"
                    />
                  </div>
                )}

                {selectedLoai === 6 && (
                  <div className="form-group">
                    <label>Số giờ NCKH cộng thêm vào thực tế</label>
                    <input
                      type="number"
                      name="SoGioThemNckh"
                      className="form-input"
                      value={formData.SoGioThemNckh || ""}
                      onChange={handleChange}
                      placeholder="Nhập số giờ NCKH cộng thêm"
                    />
                  </div>
                )}

                {selectedLoai === 7 && (
                  <div className="form-group">
                    <label>Hệ số NCKH nhân thêm</label>
                    <input
                      type="number"
                      name="HeSoNckh"
                      className="form-input"
                      value={formData.HeSoNckh ?? 1.2}
                      onChange={handleChange}
                      placeholder="Default: 1.20"
                    />
                  </div>
                )}

                {(selectedLoai === 2 ||
                  selectedLoai === 3 ||
                  selectedLoai === 8) && (
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Tỷ lệ giảm giờ giảng (0 - 1)</label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        name="HeSoGiamGiang"
                        className="form-input"
                        value={formData.HeSoGiamGiang || ""}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label>Tỷ lệ giảm NCKH (0 - 1)</label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        name="HeSoGiamNckh"
                        className="form-input"
                        value={formData.HeSoGiamNckh || ""}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="form-grid-2" style={{ marginBottom: "20px" }}>
              <div className="form-group">
                <label>
                  Từ ngày <span className="text-red">*</span>
                </label>
                <Calendar
                  value={parseDate(formData.TuNgay)}
                  onChange={(e) => handleDateChange("TuNgay", e.value)}
                  dateFormat="dd/mm/yy"
                  showIcon
                  showButtonBar
                  disabled={isEditing}
                  placeholder="Định dạng dd/mm/yyyy"
                  inputClassName="form-input"
                  style={{ width: "100%" }}
                  appendTo={document.body}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  Đến ngày <span className="text-red">*</span>
                </label>
                <Calendar
                  value={parseDate(formData.DenNgay)}
                  onChange={(e) => handleDateChange("DenNgay", e.value)}
                  dateFormat="dd/mm/yy"
                  showIcon
                  showButtonBar
                  placeholder="Định dạng dd/mm/yyyy"
                  inputClassName="form-input"
                  style={{ width: "100%" }}
                  appendTo={document.body}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label>
                Lý do ngoại lệ{" "}
                {selectedLoai === 8 && (
                  <span className="text-red">* (Bắt buộc đối với loại 8)</span>
                )}
              </label>
              <textarea
                name="LyDo"
                className="form-input"
                value={formData.LyDo || ""}
                onChange={handleChange}
                rows="3"
                placeholder="Nhập lý do hoặc thông tin quyết định kèm theo..."
                required={selectedLoai === 8}
              />
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label>Đường dẫn Minh chứng / Quyết định (URL)</label>
              <input
                type="url"
                name="MinhChungUrl"
                className="form-input"
                value={formData.MinhChungUrl || ""}
                onChange={handleChange}
                placeholder="https://example.com/quyet-dinh.pdf"
              />
            </div>

            {isEditing && (
              <div
                className="form-group"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >
                <input
                  type="checkbox"
                  id="TrangThai"
                  name="TrangThai"
                  checked={formData.TrangThai !== false}
                  onChange={handleChange}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <label
                  htmlFor="TrangThai"
                  style={{ margin: 0, cursor: "pointer", fontWeight: "600" }}
                >
                  Trạng thái hoạt động (Hiệu lực)
                </label>
              </div>
            )}
          </form>
        </div>
        <div className="modal-footer" style={{ display: "flex", gap: "10px" }}>
          <button type="button" className="btn-cancel" onClick={onClose}>
            <i className="fa-solid fa-times" style={{ marginRight: "5px" }}></i>{" "}
            Hủy
          </button>
          <button type="submit" form="ngoaiLeForm" className="btn-submit">
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

export default QL_NgoaiLeForm;
