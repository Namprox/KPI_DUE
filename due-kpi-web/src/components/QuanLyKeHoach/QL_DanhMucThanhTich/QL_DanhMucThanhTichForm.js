import React from "react";
import SearchSelect from "../../Common/SearchSelect";
import {
  LOAI_THANH_TICH_META,
  formatDiem,
} from "../../../utils/keKhaiThanhTichApi";

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  color: "#475569",
  marginBottom: "6px",
};
const hintStyle = { fontSize: "12px", color: "#64748b", marginTop: "5px" };

const LOAI_OPTIONS = Object.entries(LOAI_THANH_TICH_META).map(
  ([value, meta]) => ({
    value,
    label: `${value}. ${meta.label}`,
  }),
);

/**
 * Form thêm / sửa một mục danh mục thành tích.
 *
 * Cây chỉ có 2 CẤP nên chỉ có hai hình dạng: nút GỐC (tiêu chí, `IdCha = null`,
 * mang `TranDiem` và `LoaiThanhTich`) hoặc mức LÁ (`IdCha` trỏ tới gốc, mang
 * `DiemQuyDoi`). Form đổi hẳn tập trường theo lựa chọn đó thay vì hiện tất cả
 * rồi để admin đoán trường nào có tác dụng.
 *
 * Hai ràng buộc của server không sửa được sau khi tạo - `IdCha` và
 * `LoaiThanhTich` - nên khi `isEditing` thì hai ô đó bị khoá.
 */
const QL_DanhMucThanhTichForm = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isEditing,
  gocList,
  donViList,
  isSaving,
}) => {
  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelect = (name) => (value) =>
    setFormData({ ...formData, [name]: value });

  const handleCheck = (e) => {
    const { name, checked } = e.target;
    setFormData({ ...formData, [name]: checked });
  };

  /**
   * Đổi hình dạng nút = đổi hẳn tập trường có nghĩa, nên phải dọn các trường của
   * hình dạng cũ. Giữ lại sẽ gửi lên server những giá trị bị bỏ qua trong im lặng.
   */
  const handleDoiHinhDang = (laGoc) => {
    setFormData({
      ...formData,
      LaGoc: laGoc,
      IdCha: laGoc ? "" : formData.IdCha,
      LoaiThanhTich: laGoc ? formData.LoaiThanhTich : "",
      TranDiem: laGoc ? formData.TranDiem : "",
      LaLa: !laGoc,
      DiemQuyDoi: laGoc ? "" : formData.DiemQuyDoi,
    });
  };

  const laGoc = !!formData.LaGoc;
  const tenMucLen = (formData.TenMuc || "").length;
  const ghiChuLen = (formData.GhiChu || "").length;

  // Nút cha đang chọn - dùng để nhắc trần và tiêu chí mà mức lá sẽ kế thừa.
  const cha = gocList.find(
    (g) => String(g.IdMuc) === String(formData.IdCha),
  );

  const nhanGoc = (g) =>
    g.TranDiem != null
      ? `${g.MaMuc} — ${g.TenMuc} (trần ${formatDiem(g.TranDiem)} điểm)`
      : `${g.MaMuc} — ${g.TenMuc}`;

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div
        className="modal-box form-modal-box"
        style={{ width: "90%", maxWidth: "760px" }}
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
            {isEditing ? "Cập nhật mục danh mục" : "Thêm mục danh mục"} — Thành
            tích vượt trội
          </h3>
          <button
            className="close-btn"
            onClick={onClose}
            style={{ fontSize: "26px", lineHeight: "1", flexShrink: 0 }}
          >
            &times;
          </button>
        </div>

        <div
          className="modal-body"
          style={{ padding: "25px", maxHeight: "70vh", overflowY: "auto" }}
        >
          <form id="danhMucThanhTichForm" onSubmit={onSubmit}>
            {/* Hình dạng nút: quyết định toàn bộ tập trường phía dưới */}
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Loại nút</label>
              <div style={{ display: "flex", gap: "10px" }}>
                {[
                  {
                    goc: true,
                    icon: "fa-folder-tree",
                    ten: "Tiêu chí (nút gốc)",
                    mo: "Mang trần điểm",
                  },
                  {
                    goc: false,
                    icon: "fa-medal",
                    ten: "Mức quy đổi (nút lá)",
                    mo: "Kê khai được",
                  },
                ].map((o) => (
                  <button
                    key={String(o.goc)}
                    type="button"
                    onClick={() => handleDoiHinhDang(o.goc)}
                    disabled={isEditing}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "6px",
                      cursor: isEditing ? "not-allowed" : "pointer",
                      textAlign: "left",
                      background: laGoc === o.goc ? "#eff6ff" : "#fff",
                      border: `2px solid ${laGoc === o.goc ? "#3b82f6" : "#e2e8f0"}`,
                      opacity: isEditing && laGoc !== o.goc ? 0.5 : 1,
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "600",
                        color: "#1e293b",
                        fontSize: "14px",
                      }}
                    >
                      <i
                        className={`fa-solid ${o.icon}`}
                        style={{ marginRight: "8px", color: "#3b82f6" }}
                      ></i>
                      {o.ten}
                    </div>
                    <div style={{ ...hintStyle, marginTop: "3px" }}>{o.mo}</div>
                  </button>
                ))}
              </div>
              {isEditing && (
                <div style={hintStyle}>
                  Không đổi được loại nút sau khi tạo — máy chủ khoá cả `IdCha`
                  lẫn `LoaiThanhTich`.
                </div>
              )}
            </div>

            {laGoc ? (
              <div className="form-grid-2" style={{ marginBottom: "20px" }}>
                <div className="form-group">
                  <label style={labelStyle}>
                    Tiêu chí <span className="text-red">*</span>
                  </label>
                  <SearchSelect
                    name="LoaiThanhTich"
                    value={String(formData.LoaiThanhTich || "")}
                    onChange={handleSelect("LoaiThanhTich")}
                    options={LOAI_OPTIONS}
                    placeholder="-- Chọn tiêu chí --"
                    disabled={isEditing}
                    required
                  />
                  <div style={hintStyle}>
                    Khoá 1-1 với mã công thức TTVT_* phía máy chủ — chọn sai thì
                    dòng kê khai sẽ không bao giờ thành điểm.
                  </div>
                </div>
                <div className="form-group">
                  <label style={labelStyle}>Trần điểm của tiêu chí</label>
                  <input
                    type="number"
                    name="TranDiem"
                    className="form-input"
                    value={formData.TranDiem}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                  />
                  <div style={hintStyle}>
                    Phải bằng “Điểm tối đa” của tiêu chí tương ứng trong danh mục
                    tiêu chí đánh giá.
                  </div>
                </div>
              </div>
            ) : (
              <div className="form-grid-2" style={{ marginBottom: "20px" }}>
                <div className="form-group">
                  <label style={labelStyle}>
                    Thuộc tiêu chí <span className="text-red">*</span>
                  </label>
                  <SearchSelect
                    name="IdCha"
                    value={formData.IdCha || ""}
                    onChange={handleSelect("IdCha")}
                    options={gocList.map((g) => ({
                      value: g.IdMuc,
                      label: nhanGoc(g),
                    }))}
                    placeholder="-- Chọn tiêu chí cha --"
                    disabled={isEditing}
                    required
                  />
                  {cha && (
                    <div style={hintStyle}>
                      Kế thừa tiêu chí:{" "}
                      <b>
                        {LOAI_THANH_TICH_META[cha.LoaiThanhTich]?.label || "—"}
                      </b>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label style={labelStyle}>
                    Điểm quy đổi <span className="text-red">*</span>
                  </label>
                  <input
                    type="number"
                    name="DiemQuyDoi"
                    className="form-input"
                    value={formData.DiemQuyDoi}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    required
                  />
                  <div style={hintStyle}>
                    Điểm cho MỘT đơn vị. Sửa về sau không làm đổi các dòng đã kê —
                    mỗi dòng giữ ảnh chụp riêng.
                  </div>
                </div>
              </div>
            )}

            <div className="form-grid-2" style={{ marginBottom: "20px" }}>
              <div className="form-group">
                <label style={labelStyle}>
                  Mã mục <span className="text-red">*</span>
                </label>
                <input
                  type="text"
                  name="MaMuc"
                  className="form-input"
                  value={formData.MaMuc}
                  onChange={handleChange}
                  maxLength={50}
                  required
                />
              </div>
              <div className="form-group">
                <label style={labelStyle}>Thứ tự hiển thị</label>
                <input
                  type="number"
                  name="ThuTu"
                  className="form-input"
                  value={formData.ThuTu}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>
                Tên mục <span className="text-red">*</span>
              </label>
              <textarea
                name="TenMuc"
                className="form-input"
                value={formData.TenMuc}
                onChange={handleChange}
                rows="2"
                maxLength={500}
                required
              />
              <div style={{ ...hintStyle, textAlign: "right" }}>
                {tenMucLen}/500
              </div>
            </div>

            {/* Đơn vị phụ trách + quy ước kê khai: chỉ có nghĩa ở mức lá */}
            {!laGoc && (
              <>
                <div className="form-group" style={{ marginBottom: "20px" }}>
                  <label style={labelStyle}>Đơn vị phụ trách thẩm định</label>
                  <SearchSelect
                    name="IdDonViDuyet"
                    value={formData.IdDonViDuyet || ""}
                    onChange={handleSelect("IdDonViDuyet")}
                    options={[
                      { value: "", label: "— Đơn vị quản lý trực tiếp —" },
                      ...donViList.map((dv) => ({
                        value: dv.IdDonVi,
                        label: `${dv.MaDonVi} — ${dv.TenDonVi}`,
                      })),
                    ]}
                    placeholder="— Đơn vị quản lý trực tiếp —"
                    searchable
                  />
                  <div
                    style={{
                      ...hintStyle,
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "6px",
                      padding: "10px 12px",
                      color: "#92400e",
                    }}
                  >
                    <i
                      className="fa-solid fa-circle-info"
                      style={{ marginRight: "6px" }}
                    ></i>
                    Bỏ trống = trưởng đơn vị quản lý trực tiếp của nhân viên duyệt
                    dòng này. Với các mức do một phòng chuyên trách thẩm định
                    (khen thưởng → P.TCHC, sáng kiến → P.KHHTQT) thì{" "}
                    <b>phải gán ở đây</b>, nếu không phòng đó sẽ không thấy dòng
                    nào để duyệt.
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "20px",
                    flexWrap: "wrap",
                    marginBottom: "20px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="YeuCauMinhChung"
                      checked={!!formData.YeuCauMinhChung}
                      onChange={handleCheck}
                    />
                    <span style={{ fontSize: "14px", color: "#475569" }}>
                      Bắt buộc minh chứng PDF
                    </span>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="ChoPhepSoLuong"
                      checked={!!formData.ChoPhepSoLuong}
                      onChange={handleCheck}
                    />
                    <span style={{ fontSize: "14px", color: "#475569" }}>
                      Cho nhập số lượng
                    </span>
                  </label>
                </div>
                <div style={{ ...hintStyle, marginTop: "-12px" }}>
                  Bỏ “cho nhập số lượng” khi mỗi lần đạt được là một dòng riêng
                  (ví dụ mỗi quyết định khen thưởng) — máy chủ sẽ ép số lượng về 1.
                </div>
              </>
            )}

            <div className="form-group" style={{ marginTop: "20px" }}>
              <label style={labelStyle}>Ghi chú</label>
              <textarea
                name="GhiChu"
                className="form-input"
                value={formData.GhiChu || ""}
                onChange={handleChange}
                rows="2"
                maxLength={500}
              />
              <div style={{ ...hintStyle, textAlign: "right" }}>
                {ghiChuLen}/500
              </div>
            </div>

            {isEditing && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  marginTop: "10px",
                }}
              >
                <input
                  type="checkbox"
                  name="TrangThai"
                  checked={!!formData.TrangThai}
                  onChange={handleCheck}
                />
                <span style={{ fontSize: "14px", color: "#475569" }}>
                  Đang sử dụng
                </span>
              </label>
            )}
          </form>
        </div>

        <div className="modal-footer" style={{ display: "flex", gap: "10px" }}>
          <button type="button" className="btn-cancel" onClick={onClose}>
            <i className="fa-solid fa-times" style={{ marginRight: "5px" }}></i>{" "}
            Hủy
          </button>
          <button
            type="submit"
            form="danhMucThanhTichForm"
            className="btn-submit"
            disabled={isSaving}
          >
            <i
              className={`fa-solid ${isSaving ? "fa-circle-notch fa-spin" : "fa-floppy-disk"}`}
              style={{ marginRight: "5px" }}
            ></i>
            Lưu dữ liệu
          </button>
        </div>
      </div>
    </div>
  );
};

export default QL_DanhMucThanhTichForm;
