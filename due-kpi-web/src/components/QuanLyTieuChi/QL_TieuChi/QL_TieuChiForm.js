import React from "react";
import SearchSelect from "../../Common/SearchSelect";

const LOAI_THANG_DIEM_OPTIONS = [
  { value: 1, label: "1 - Mức điểm rời rạc (VD: 2đ, 5đ, 10đ)" },
  { value: 2, label: "2 - Điểm liên tục (Tự nhập số)" },
  { value: 3, label: "3 - Chọn Có / Không" },
];

const QL_TieuChiForm = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  setFormData,
  isEditing,
  nhomTieuChiList = [],
  tieuChiList = [],
}) => {
  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
  };

  const handleSelect = (name) => (value) => {
    if (name === "IdNhom" && !isEditing) {
      const itemsInGroup = (tieuChiList || []).filter(
        (item) => String(item.IdNhom) === String(value),
      );
      const nextOrder =
        itemsInGroup.length > 0
          ? Math.max(
              ...itemsInGroup.map((item) => parseInt(item.ThuTuHienThi) || 0),
              0,
            ) + 1
          : 1;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        ThuTuHienThi: nextOrder,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddThangDiem = () => {
    const currentList = formData.ThangDiemList || [];
    const nextOrder =
      currentList.length > 0
        ? Math.max(
            ...currentList.map((item) => parseInt(item.ThuTuHienThi) || 0),
          ) + 1
        : 1;

    const newThangDiem = {
      GiaTriDiem: "",
      DieuKienDiem: "",
      ThuTuHienThi: nextOrder,
    };

    setFormData({
      ...formData,
      ThangDiemList: [...currentList, newThangDiem],
    });
  };

  const handleThangDiemChange = (index, field, value) => {
    const currentList = [...(formData.ThangDiemList || [])];
    currentList[index] = {
      ...currentList[index],
      [field]: value,
    };
    setFormData({
      ...formData,
      ThangDiemList: currentList,
    });
  };

  const handleRemoveThangDiem = (index) => {
    const currentList = [...(formData.ThangDiemList || [])];
    const removedItem = currentList[index];

    currentList.splice(index, 1);

    let deletedIds = [...(formData.DeletedThangDiemIds || [])];
    if (removedItem.IdThangDiem) {
      deletedIds.push(removedItem.IdThangDiem);
    }

    setFormData({
      ...formData,
      ThangDiemList: currentList,
      DeletedThangDiemIds: deletedIds,
    });
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-box form-modal-box"
        style={{ width: "90%", maxWidth: "850px" }}
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
            {isEditing
              ? "Cập nhật Tiêu chí Đánh giá"
              : "Thêm mới Tiêu chí Đánh giá"}
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
          <form id="tieuChiForm" onSubmit={onSubmit}>
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label>
                Thuộc Nhóm Tiêu Chí <span className="text-red">*</span>
              </label>
              <SearchSelect
                name="IdNhom"
                value={formData.IdNhom || ""}
                onChange={handleSelect("IdNhom")}
                options={nhomTieuChiList.map((nhom) => ({
                  value: nhom.IdNhom,
                  label: nhom.TenNhom,
                }))}
                placeholder="Chọn nhóm tiêu chí"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label>
                Tên Tiêu chí (Nội dung) <span className="text-red">*</span>
              </label>
              <textarea
                name="TenTieuChi"
                className="form-input"
                value={formData.TenTieuChi || ""}
                onChange={handleChange}
                required
                rows="2"
                placeholder="Nhập nội dung tiêu chí"
              ></textarea>
            </div>

            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label>Mô tả chi tiết (Hướng dẫn chấm điểm)</label>
              <textarea
                name="MoTa"
                className="form-input"
                value={formData.MoTa || ""}
                onChange={handleChange}
                rows="2"
                placeholder="Giải thích cách tính điểm hoặc yêu cầu chi tiết của tiêu chí"
              ></textarea>
            </div>

            <div className="form-grid-2" style={{ marginBottom: "20px" }}>
              <div className="form-group">
                <label>
                  Điểm Tối Đa <span className="text-red">*</span>
                </label>
                <input
                  type="number"
                  name="DiemToiDa"
                  className="form-input"
                  value={formData.DiemToiDa || ""}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  Loại Thang Điểm <span className="text-red">*</span>
                </label>
                <SearchSelect
                  name="LoaiThangDiem"
                  value={formData.LoaiThangDiem || 1}
                  onChange={handleSelect("LoaiThangDiem")}
                  options={LOAI_THANG_DIEM_OPTIONS}
                  required
                />
              </div>
            </div>

            {Number(formData.LoaiThangDiem) === 1 && (
              <div
                style={{
                  marginTop: "5px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "20px",
                  backgroundColor: "#f8fafc",
                  marginBottom: "25px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "15px",
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: "10px",
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      color: "#1e293b",
                      fontSize: "15px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Cấu hình Thang điểm Rời rạc
                  </h4>
                  <button
                    type="button"
                    className="btn-add-new"
                    onClick={handleAddThangDiem}
                    style={{
                      margin: 0,
                      padding: "6px 14px",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      borderRadius: "6px",
                      height: "32px",
                    }}
                  >
                    <i className="fa-solid fa-plus"></i> Thêm mức điểm
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {!formData.ThangDiemList ||
                  formData.ThangDiemList.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "30px 20px",
                        backgroundColor: "#fff",
                        borderRadius: "6px",
                        color: "#64748b",
                        fontSize: "13px",
                        border: "1px dashed #cbd5e1",
                      }}
                    >
                      <i
                        className="fa-solid fa-sliders"
                        style={{
                          fontSize: "24px",
                          color: "#94a3b8",
                          marginBottom: "8px",
                          display: "block",
                        }}
                      ></i>
                      Chưa có mức điểm nào được cấu hình. Hãy bấm nút "Thêm mức
                      điểm".
                    </div>
                  ) : (
                    formData.ThangDiemList.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          gap: "12px",
                          alignItems: "flex-start",
                          backgroundColor: "#fff",
                          padding: "12px",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                        }}
                      >
                        <div style={{ width: "110px" }}>
                          <label
                            style={{
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#475569",
                              marginBottom: "6px",
                              display: "block",
                            }}
                          >
                            Mức điểm *
                          </label>
                          <input
                            type="number"
                            className="form-input"
                            value={item.GiaTriDiem ?? ""}
                            onChange={(e) =>
                              handleThangDiemChange(
                                index,
                                "GiaTriDiem",
                                e.target.value,
                              )
                            }
                            required
                            style={{
                              padding: "6px 10px",
                              height: "36px",
                              borderColor: "#cbd5e1",
                            }}
                            placeholder="VD: 5"
                          />
                        </div>
                        <div style={{ width: "80px" }}>
                          <label
                            style={{
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#475569",
                              marginBottom: "6px",
                              display: "block",
                            }}
                          >
                            Thứ tự
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            value={item.ThuTuHienThi ?? ""}
                            onChange={(e) =>
                              handleThangDiemChange(
                                index,
                                "ThuTuHienThi",
                                e.target.value,
                              )
                            }
                            placeholder="VD: 1"
                            style={{
                              padding: "6px 10px",
                              height: "36px",
                              borderColor: "#cbd5e1",
                            }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label
                            style={{
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#475569",
                              marginBottom: "6px",
                              display: "block",
                            }}
                          >
                            Mô tả / Điều kiện đạt mức điểm *
                          </label>
                          <textarea
                            className="form-input"
                            value={item.DieuKienDiem ?? ""}
                            onChange={(e) =>
                              handleThangDiemChange(
                                index,
                                "DieuKienDiem",
                                e.target.value,
                              )
                            }
                            required
                            rows="1"
                            style={{
                              padding: "8px 10px",
                              minHeight: "36px",
                              height: "36px",
                              resize: "vertical",
                              borderColor: "#cbd5e1",
                              lineHeight: "1.4",
                            }}
                            placeholder="Mô tả chi tiết điều kiện..."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveThangDiem(index)}
                          style={{
                            background: "#ef4444",
                            color: "#fff",
                            border: "none",
                            width: "36px",
                            height: "36px",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            marginTop: "24px",
                            transition: "background 0.2s",
                            flexShrink: 0,
                          }}
                          title="Xóa mức điểm"
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="form-grid-2" style={{ marginBottom: "20px" }}>
              <div className="form-group">
                <label>Yêu cầu bổ sung</label>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    marginTop: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <input
                      type="checkbox"
                      name="BatBuocMinhChung"
                      id="bbMc"
                      checked={formData.BatBuocMinhChung || false}
                      onChange={handleChange}
                      style={{
                        width: "18px",
                        height: "18px",
                        marginRight: "10px",
                      }}
                    />
                    <label
                      htmlFor="bbMc"
                      style={{ margin: 0, cursor: "pointer" }}
                    >
                      Bắt buộc tải lên minh chứng
                    </label>
                  </div>
                  {/* <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <input type="checkbox" name="CoTheDongBoScience" id="syncSc" checked={formData.CoTheDongBoScience || false} onChange={handleChange} style={{ width: '18px', height: '18px', marginRight: '10px' }} />
                                        <label htmlFor="syncSc" style={{ margin: 0, cursor: 'pointer', color: '#2980b9', fontWeight: 'bold' }}>Tự động đồng bộ từ Hệ thống Science</label>
                                    </div> */}
                </div>
              </div>
              {/* <div className="form-group">
                                <label>Bảng nguồn Science {isSync && <span className="text-red">*</span>}</label>
                                <input
                                    type="text"
                                    name="BangNguonScience"
                                    className="form-input"
                                    value={formData.BangNguonScience || ''}
                                    onChange={handleChange}
                                    disabled={!isSync}
                                    required={isSync}
                                    placeholder={isSync ? "VD: Nckh_BaiBao" : "Chỉ mở khi bật Đồng bộ"}
                                    style={{ backgroundColor: !isSync ? '#f1f5f9' : '#fff', borderColor: isSync ? '#2980b9' : '#ccc' }}
                                />
                            </div> */}
            </div>

            <div
              className="form-grid-2"
              style={{
                marginBottom: "10px",
                borderTop: "1px solid #eee",
                paddingTop: "20px",
              }}
            >
              <div className="form-group">
                <label>Thứ tự hiển thị (Trên phiếu)</label>
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
                  alignItems: "flex-end",
                  paddingBottom: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    name="TrangThai"
                    id="ttTC"
                    checked={formData.TrangThai !== false}
                    onChange={handleChange}
                    style={{
                      width: "18px",
                      height: "18px",
                      marginRight: "10px",
                    }}
                  />
                  <label
                    htmlFor="ttTC"
                    style={{ margin: 0, cursor: "pointer", fontWeight: "500" }}
                  >
                    Kích hoạt tiêu chí này
                  </label>
                </div>
              </div>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={onClose}>
            <i className="fa-solid fa-times" style={{ marginRight: "5px" }}></i>{" "}
            Hủy
          </button>
          <button type="submit" form="tieuChiForm" className="btn-submit">
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

export default QL_TieuChiForm;
