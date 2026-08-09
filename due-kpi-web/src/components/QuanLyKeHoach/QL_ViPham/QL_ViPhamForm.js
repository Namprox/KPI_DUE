import React, { useEffect, useRef } from "react";
import { Calendar } from "primereact/calendar";
import { addLocale, locale } from "primereact/api";
import {
  MAX_MINH_CHUNG_KB,
  formatKb,
  validatePdfFile,
} from "../../../utils/viPhamMinhChungApi";
import SearchSelect from "../../Common/SearchSelect";

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  color: "#475569",
  marginBottom: "6px",
};
const hintStyle = { fontSize: "13px", color: "#64748b", marginTop: "5px" };
const fileCardStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 14px",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
  background: "#f8fafc",
  flexWrap: "wrap",
};
const fileActionStyle = {
  background: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  padding: "6px 10px",
  fontSize: "12px",
  fontWeight: "600",
  color: "#334155",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const QL_ViPhamForm = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isEditing,
  isSaving,
  namList,
  nhanVienList,
  nhomList,
  loaiOptions,
  selectedLoai,
  lecturerKhoa,
  lecturerBlockReason,
  currentUser,
  onDownloadMinhChung,
  onFileError,
}) => {
  const fileInputRef = useRef(null);

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
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleDateChange = (name, dateValue) => {
    if (!dateValue) {
      setFormData({ ...formData, [name]: "" });
      return;
    }
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, "0");
    const day = String(dateValue.getDate()).padStart(2, "0");
    setFormData({ ...formData, [name]: `${year}-${month}-${day}` });
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

  const formatDateTime = (value) => {
    const date = parseDate(value);
    if (!date) return null;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const hh = String(date.getHours()).padStart(2, "0");
    const mi = String(date.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${date.getFullYear()} ${hh}:${mi}`;
  };

  /* --- Cascade: đổi cấp trên thì xóa cấp dưới --- */

  const handleNhanVienChange = (idNhanVien) => {
    setFormData({ ...formData, IdNhanVien: idNhanVien });
  };

  const handleNhomChange = (idNhom) => {
    setFormData({
      ...formData,
      IdNhomVp: idNhom,
      IdLoaiViPham: "",
      DiemTru: "",
    });
  };

  const handleLoaiChange = (idLoai) => {
    const loai = loaiOptions.find(
      (l) => String(l.IdLoaiViPham) === String(idLoai),
    );
    // Mô tả do người dùng tự nhập, không tự điền theo loại vi phạm
    setFormData({
      ...formData,
      IdLoaiViPham: idLoai,
      DiemTru: loai?.DiemTruMacDinh != null ? String(loai.DiemTruMacDinh) : "",
    });
  };

  const handleMoTaChange = (e) => {
    setFormData({ ...formData, MoTa: e.target.value });
  };

  /* --- Minh chứng PDF ---
     Mọi thao tác chỉ ghi vào formData; việc tải lên / xóa thật sự do trang cha
     thực hiện sau khi lưu bản ghi (endpoint minh-chung cần IdViPham đã tồn tại). */

  const handlePickFile = (e) => {
    const file = e.target.files?.[0];
    // Reset input để chọn lại đúng tệp vừa bỏ vẫn kích hoạt onChange
    e.target.value = "";
    if (!file) return;

    const loi = validatePdfFile(file);
    if (loi) {
      if (onFileError) onFileError(loi);
      return;
    }
    // Chọn tệp mới thì bỏ luôn cờ xóa: tải lên sẽ ghi đè tệp cũ
    setFormData({ ...formData, MinhChungFile: file, XoaMinhChung: false });
  };

  const handleBoFileMoi = () => {
    setFormData({ ...formData, MinhChungFile: null });
  };

  const handleXoaMinhChung = () => {
    setFormData({ ...formData, MinhChungFile: null, XoaMinhChung: true });
  };

  const handleHoanXoaMinhChung = () => {
    setFormData({ ...formData, XoaMinhChung: false });
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const filteredLoai = (loaiOptions || []).filter(
    (l) =>
      !formData.IdNhomVp || String(l.IdNhomVp) === String(formData.IdNhomVp),
  );

  const hoSoBatBuoc = !!(selectedLoai && selectedLoai.HoSoKemTheo);
  const loaiBiChan = !!(selectedLoai && selectedLoai._allowed === false);
  const moTaLen = (formData.MoTa || "").length;

  const fileMoi = formData.MinhChungFile || null;
  // Minh chứng đang có trên máy chủ, chưa bị đánh dấu xóa và chưa bị thay bằng tệp mới
  const minhChungHienCo =
    !fileMoi && !formData.XoaMinhChung ? formData.MinhChung || null : null;
  const minhChungSeXoa = !!(
    formData.XoaMinhChung &&
    formData.MinhChung &&
    !fileMoi
  );
  // Chặn ngay ở client những trường hợp server chắc chắn trả 403
  const biChan = loaiBiChan || !!lecturerBlockReason;

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
            {isEditing ? "Cập nhật ghi nhận vi phạm" : "Ghi nhận vi phạm mới"}
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
          <form id="viPhamForm" onSubmit={onSubmit}>
            {isEditing && formData.IdLoaiViPham === "" && (
              <div
                style={{
                  background: "#fffbe6",
                  border: "1px solid #fde68a",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "18px",
                  fontSize: "13px",
                  color: "#92400e",
                }}
              >
                <i
                  className="fa-solid fa-triangle-exclamation"
                  style={{ marginRight: "6px" }}
                ></i>
                Bản ghi cũ chưa gán loại vi phạm — vui lòng chọn loại để cập
                nhật.
              </div>
            )}

            <div className="form-grid-2" style={{ marginBottom: "20px" }}>
              <div className="form-group">
                <label style={labelStyle}>
                  Năm đánh giá <span className="text-red">*</span>
                </label>
                <SearchSelect
                  name="IdNam"
                  value={formData.IdNam || ""}
                  onChange={(v) => setFormData({ ...formData, IdNam: v })}
                  options={namList.map((n) => ({
                    value: n.IdNam,
                    label: `Năm học ${n.IdNam}`,
                  }))}
                  placeholder="-- Chọn năm học --"
                  required
                />
              </div>

              <div className="form-group">
                <label style={labelStyle}>
                  Giảng viên vi phạm <span className="text-red">*</span>
                </label>
                <SearchSelect
                  name="IdNhanVien"
                  value={formData.IdNhanVien || ""}
                  onChange={handleNhanVienChange}
                  options={nhanVienList.map((nv) => ({
                    value: nv.IdNhanVien,
                    label: `${nv.MaNhanVien} - ${nv.HoTen}${nv.MaDonVi ? ` (${nv.MaDonVi})` : ""}`,
                  }))}
                  placeholder="-- Chọn giảng viên --"
                  searchable
                  searchPlaceholder="Tìm theo mã hoặc tên..."
                  required
                />
                {formData.IdNhanVien && lecturerBlockReason && (
                  <div style={{ ...hintStyle, color: "#b91c1c" }}>
                    <i
                      className="fa-solid fa-triangle-exclamation"
                      style={{ marginRight: "5px" }}
                    ></i>
                    {lecturerBlockReason}
                  </div>
                )}
                {formData.IdNhanVien &&
                  !lecturerBlockReason &&
                  lecturerKhoa && (
                    <div style={hintStyle}>
                      <i
                        className="fa-solid fa-building-columns"
                        style={{ marginRight: "5px" }}
                      ></i>
                      Khoa chủ quản: {lecturerKhoa.TenDonVi}
                    </div>
                  )}
              </div>
            </div>

            <div className="form-grid-2" style={{ marginBottom: "20px" }}>
              <div className="form-group">
                <label style={labelStyle}>Nhóm vi phạm</label>
                <SearchSelect
                  name="IdNhomVp"
                  value={formData.IdNhomVp || ""}
                  onChange={handleNhomChange}
                  placeholder="-- Tất cả nhóm --"
                  options={[
                    { value: "", label: "-- Tất cả nhóm --" },
                    ...nhomList.map((n) => ({
                      value: n.IdNhomVp,
                      label: n.TenNhom,
                    })),
                  ]}
                />
                <div style={hintStyle}>
                  Chỉ dùng để lọc nhanh danh sách loại vi phạm.
                </div>
              </div>

              <div className="form-group">
                <label style={labelStyle}>
                  Loại vi phạm <span className="text-red">*</span>
                </label>
                <SearchSelect
                  className="select-multiline"
                  name="IdLoaiViPham"
                  value={formData.IdLoaiViPham || ""}
                  onChange={handleLoaiChange}
                  placeholder="-- Chọn loại vi phạm --"
                  options={filteredLoai.map((l) => ({
                    value: l.IdLoaiViPham,
                    label: l.NoiDung,
                    disabled: l._allowed === false,
                    note: l._allowed === false ? "(không có quyền)" : "",
                  }))}
                />
              </div>
            </div>

            {loaiBiChan && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  marginBottom: "20px",
                  fontSize: "13px",
                  color: "#b91c1c",
                }}
              >
                <i
                  className="fa-solid fa-ban"
                  style={{ marginRight: "6px" }}
                ></i>
                {selectedLoai._reason}
              </div>
            )}

            <div className="form-grid-2" style={{ marginBottom: "20px" }}>
              <div className="form-group">
                <label style={labelStyle}>Điểm trừ</label>
                <input
                  type="number"
                  name="DiemTru"
                  className="form-input"
                  value={formData.DiemTru ?? ""}
                  onChange={handleChange}
                  step="0.5"
                  min="0"
                  max="15"
                  placeholder="Để trống = lấy mặc định của loại"
                />
                <div style={hintStyle}>
                  {selectedLoai?.DiemTruMacDinh != null
                    ? `Mặc định của loại: ${Number(selectedLoai.DiemTruMacDinh).toFixed(2)}đ.`
                    : "Để trống để máy chủ tự lấy điểm trừ mặc định."}
                  {selectedLoai?.DiemTruMacDinh != null && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          DiemTru: String(selectedLoai.DiemTruMacDinh),
                        })
                      }
                      style={{
                        marginLeft: "8px",
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        cursor: "pointer",
                        padding: 0,
                        fontSize: "12px",
                        textDecoration: "underline",
                      }}
                    >
                      Đặt lại mặc định
                    </button>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label style={labelStyle}>Ngày vi phạm</label>
                <Calendar
                  value={parseDate(formData.NgayViPham)}
                  onChange={(e) => handleDateChange("NgayViPham", e.value)}
                  dateFormat="dd/mm/yy"
                  showIcon
                  showButtonBar
                  maxDate={new Date()}
                  placeholder="Không bắt buộc"
                  inputClassName="form-input"
                  style={{ width: "100%" }}
                  appendTo={document.body}
                />
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <div className="form-group">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <input
                    type="checkbox"
                    id="BiKyLuat"
                    name="BiKyLuat"
                    checked={!!formData.BiKyLuat}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        BiKyLuat: e.target.checked,
                      })
                    }
                    style={{ width: "20px", height: "20px", cursor: "pointer" }}
                  />
                  <label
                    htmlFor="BiKyLuat"
                    style={{ margin: 0, cursor: "pointer", fontWeight: "600" }}
                  >
                    Bị xử lý kỷ luật
                  </label>
                </div>
                <div style={hintStyle}>
                  Sẽ được xét không hoàn thành nhiệm vụ của năm vi phạm.
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>Mô tả chi tiết</label>
              <textarea
                name="MoTa"
                className="form-input"
                value={formData.MoTa || ""}
                onChange={handleMoTaChange}
                rows="3"
                maxLength={500}
                placeholder="Mô tả cụ thể sự việc (không bắt buộc)"
              />
              <div style={{ ...hintStyle, textAlign: "right" }}>
                {moTaLen}/500
              </div>
            </div>

            {/* Minh chứng PDF — thay cho trường "Số hiệu hồ sơ" nhập tay trước đây */}
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>
                Biên bản / Hồ sơ (PDF){" "}
                {hoSoBatBuoc && <span className="text-red">*</span>}
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handlePickFile}
                style={{ display: "none" }}
              />

              {minhChungHienCo ? (
                <div style={fileCardStyle}>
                  <i
                    className="fa-solid fa-file-pdf"
                    style={{ fontSize: "26px", color: "#dc2626" }}
                  ></i>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: "600",
                        color: "#1e293b",
                        fontSize: "14px",
                        wordBreak: "break-all",
                      }}
                    >
                      {minhChungHienCo.TenFileGoc || "Minh chứng.pdf"}
                    </div>
                    <div style={{ ...hintStyle, marginTop: "3px" }}>
                      {formatKb(minhChungHienCo.KichThuocKb)}
                      {minhChungHienCo.HoTenNguoiTaiLen
                        ? ` • ${minhChungHienCo.HoTenNguoiTaiLen}`
                        : ""}
                      {formatDateTime(minhChungHienCo.NgayTaiLen)
                        ? ` • ${formatDateTime(minhChungHienCo.NgayTaiLen)}`
                        : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button
                      type="button"
                      style={fileActionStyle}
                      onClick={() =>
                        onDownloadMinhChung && onDownloadMinhChung()
                      }
                      title="Tải tệp về máy"
                    >
                      <i className="fa-solid fa-download"></i> Tải về
                    </button>
                    <button
                      type="button"
                      style={fileActionStyle}
                      onClick={openFilePicker}
                      title="Chọn tệp PDF khác (ghi đè tệp hiện tại)"
                    >
                      <i className="fa-solid fa-arrows-rotate"></i> Thay thế
                    </button>
                    <button
                      type="button"
                      style={{ ...fileActionStyle, color: "#b91c1c" }}
                      onClick={handleXoaMinhChung}
                      title="Gỡ tệp minh chứng"
                    >
                      <i className="fa-solid fa-trash"></i> Gỡ
                    </button>
                  </div>
                </div>
              ) : fileMoi ? (
                <div
                  style={{
                    ...fileCardStyle,
                    background: "#f0fdf4",
                    borderColor: "#bbf7d0",
                  }}
                >
                  <i
                    className="fa-solid fa-file-pdf"
                    style={{ fontSize: "26px", color: "#dc2626" }}
                  ></i>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: "600",
                        color: "#1e293b",
                        fontSize: "14px",
                        wordBreak: "break-all",
                      }}
                    >
                      {fileMoi.name}
                    </div>
                    <div
                      style={{
                        ...hintStyle,
                        marginTop: "3px",
                        color: "#15803d",
                      }}
                    >
                      {formatKb(Math.ceil(fileMoi.size / 1024))} • Sẽ được tải
                      lên khi bấm “Lưu dữ liệu”
                      {formData.MinhChung ? " (ghi đè tệp hiện tại)" : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                    <button
                      type="button"
                      style={fileActionStyle}
                      onClick={openFilePicker}
                    >
                      <i className="fa-solid fa-arrows-rotate"></i> Chọn lại
                    </button>
                    <button
                      type="button"
                      style={{ ...fileActionStyle, color: "#b91c1c" }}
                      onClick={handleBoFileMoi}
                    >
                      <i className="fa-solid fa-xmark"></i> Bỏ
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openFilePicker}
                  style={{
                    width: "100%",
                    padding: "18px",
                    border: `1px dashed ${hoSoBatBuoc ? "#fca5a5" : "#cbd5e1"}`,
                    borderRadius: "8px",
                    background: hoSoBatBuoc ? "#fef2f2" : "#f8fafc",
                    color: "#475569",
                    cursor: "pointer",
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                >
                  <i
                    className="fa-solid fa-cloud-arrow-up"
                    style={{ marginRight: "8px", color: "#2563eb" }}
                  ></i>
                  Chọn tệp PDF biên bản / hồ sơ
                </button>
              )}

              {minhChungSeXoa && (
                <div style={{ ...hintStyle, color: "#b91c1c" }}>
                  <i
                    className="fa-solid fa-triangle-exclamation"
                    style={{ marginRight: "5px" }}
                  ></i>
                  Tệp “{formData.MinhChung.TenFileGoc}” sẽ bị gỡ khi lưu.
                  <button
                    type="button"
                    onClick={handleHoanXoaMinhChung}
                    style={{
                      marginLeft: "8px",
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: "12px",
                      textDecoration: "underline",
                    }}
                  >
                    Hoàn tác
                  </button>
                </div>
              )}

              {hoSoBatBuoc && (
                <div style={{ ...hintStyle, color: "#1d4ed8" }}>
                  <i
                    className="fa-solid fa-paperclip"
                    style={{ marginRight: "5px" }}
                  ></i>
                  Loại vi phạm này yêu cầu hồ sơ kèm theo:{" "}
                  {selectedLoai.HoSoKemTheo}
                </div>
              )}

              <div style={hintStyle}>
                Chỉ nhận tệp PDF, tối đa {formatKb(MAX_MINH_CHUNG_KB)}. Mỗi ghi
                nhận giữ một tệp — tải tệp mới sẽ ghi đè tệp cũ.
              </div>
            </div>

            <div
              style={{
                fontSize: "13px",
                color: "#64748b",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "10px 14px",
              }}
            >
              <i
                className="fa-solid fa-user-check"
                style={{ marginRight: "6px" }}
              ></i>
              Người ghi nhận: <strong>{currentUser?.HoTen || "---"}</strong> —
              tự động lấy từ phiên đăng nhập.
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
            form="viPhamForm"
            className="btn-submit"
            disabled={isSaving || biChan}
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

export default QL_ViPhamForm;
