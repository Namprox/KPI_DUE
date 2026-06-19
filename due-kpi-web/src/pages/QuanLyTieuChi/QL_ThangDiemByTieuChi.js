import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Paginator } from "primereact/paginator";
import { useConfirmDeleteDialog } from "../../hooks/useConfirmDeleteDialog";
import { apiFetch } from "../../utils/api";
import "../../css/Pages.css";
import "../../css/QuanLyTieuChi/QL_ThangDiem.css";

const QL_ThangDiemByTieuChi = () => {
  const { tieuChiId } = useParams();
  const navigate = useNavigate();
  const { confirmDeleteDialog } = useConfirmDeleteDialog();
  const { user } = useAuth();

  const currentUser = user || {};
  const roleCode = currentUser?.MaChucVu || '';
  const isAdmin = roleCode === 'Admin';
  const isManager = ['HT', 'PHT', 'TK', 'TBM'].includes(roleCode);
  const canManage = isAdmin || isManager;

  const initialForm = {
    GiaTriDiem: "",
    DieuKienDiem: "",
    ThuTuHienThi: 1,
  };

  const [tieuChi, setTieuChi] = useState(null);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [editId, setEditId] = useState(null);

  // Pagination
  const [first, setFirst] = useState(0);
  const rows = 15;

  useEffect(() => {
    if (tieuChiId) {
      fetchTieuChi();
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tieuChiId]);

  const fetchTieuChi = async () => {
    try {
      const response = await apiFetch("tieuchidanhgia");
      if (response.ok) {
        const res = await response.json();
        const list = res.Items || (Array.isArray(res) ? res : []);
        const found = list.find(
          (item) => item.IdTieuChi === parseInt(tieuChiId),
        );
        setTieuChi(found || null);
      }
    } catch (error) {
      console.error("Lỗi tải thông tin tiêu chí:", error);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch(`thangdiem?tieuChiId=${tieuChiId}`);
      if (response.ok) {
        const result = await response.json();
        const list = result.Items || (Array.isArray(result) ? result : []);
        // Filter client side as well for safety
        const filtered = list.filter(
          (item) => item.IdTieuChi === parseInt(tieuChiId),
        );
        // Sort by ThuTuHienThi
        filtered.sort((a, b) => (a.ThuTuHienThi || 0) - (b.ThuTuHienThi || 0));
        setData(filtered);
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu thang điểm:", error);
      alert("Không thể tải danh sách thang điểm. Vui lòng thử lại sau");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canManage) {
      alert("Bạn không có quyền thực hiện chức năng này!");
      return;
    }

    const method = editId ? "PUT" : "POST";
    const payload = {
      ...formData,
      IdTieuChi: parseInt(tieuChiId),
      GiaTriDiem: parseFloat(formData.GiaTriDiem),
      ThuTuHienThi: parseInt(formData.ThuTuHienThi) || 1,
    };
    if (editId) payload.IdThangDiem = editId;

    const response = await apiFetch("thangdiem", {
      method,
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const resData = await response.json();
      if (resData.status === "success" || !resData.status) {
        fetchData();
        closeModal();
      } else {
        alert(resData.message || "Lưu thất bại!");
      }
    } else {
      alert("Lỗi kết nối máy chủ!");
    }
  };

  const handleEdit = (item) => {
    if (!canManage) return;
    setEditId(item.IdThangDiem);
    setFormData({
      GiaTriDiem: item.GiaTriDiem,
      DieuKienDiem: item.DieuKienDiem,
      ThuTuHienThi: item.ThuTuHienThi,
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (!canManage) return;
    confirmDeleteDialog({
      header: "Xác nhận xóa",
      message: "Bạn có chắc chắn muốn xóa mức thang điểm này?",
      accept: async () => {
        const res = await apiFetch(`thang-diem?id=${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          const result = await res.json();
          if (result.status === "success" || !result.status) {
            fetchData();
          } else {
            alert(result.message || "Xóa thất bại!");
          }
        }
      },
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialForm);
    setEditId(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const getLoaiThangDiem = (loai) => {
    switch (loai) {
      case 1:
        return "Rời rạc";
      case 2:
        return "Liên tục";
      case 3:
        return "Có / Không";
      case 4:
        return "Công thức";
      default:
        return "---";
    }
  };

  const paginatedData = data.slice(first, first + rows);
  const onPageChange = (event) => setFirst(event.first);

  return (
    <div className="page-container">
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div className="header-title">
          <h2>CHI TIẾT THANG ĐIỂM TIÊU CHÍ</h2>
        </div>
        <button
          onClick={() => navigate("/quan-ly-tieu-chi")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#f1f5f9",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            padding: "8px 16px",
            fontSize: "14px",
            fontWeight: "600",
            color: "#475569",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#e2e8f0")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5f9")}
        >
          <i className="fa-solid fa-arrow-left"></i> Quay lại
        </button>
      </div>

      {/* Criteria Detail Card */}
      {tieuChi && (
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "8px",
            boxShadow:
              "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
            padding: "24px",
            marginBottom: "25px",
            border: "1px solid #e2e8f0",
            borderLeft: "5px solid #003399",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "16px",
            }}
          >
            <h3
              style={{
                margin: 0,
                color: "#1e293b",
                fontSize: "18px",
                fontWeight: "700",
                lineHeight: "1.5",
              }}
            >
              {tieuChi.TenTieuChi}
            </h3>
            <span
              style={{
                backgroundColor: "#e0f2fe",
                color: "#0369a1",
                padding: "4px 12px",
                borderRadius: "16px",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              Điểm tối đa: {tieuChi.DiemToiDa}đ
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              paddingTop: "16px",
              borderTop: "1px solid #f1f5f9",
              fontSize: "14px",
              color: "#475569",
            }}
          >
            <div style={{ gridColumn: "1 / -1" }}>
              <strong>Thuộc nhóm:</strong>{" "}
              <span style={{ color: "#0f172a" }}>
                {tieuChi.TenNhom || "---"}
              </span>
            </div>
            <div>
              <strong>Cấp đánh giá:</strong>{" "}
              <span style={{ color: "#0f172a" }}>
                {tieuChi.CapDanhGia === 1
                  ? "Trường"
                  : tieuChi.CapDanhGia === 2
                    ? "Khoa/Viện"
                    : tieuChi.CapDanhGia === 3
                      ? "Bộ môn"
                      : "---"}
              </span>
            </div>
            <div>
              <strong>Loại thang điểm:</strong>{" "}
              <span style={{ color: "#0f172a" }}>
                {getLoaiThangDiem(tieuChi.LoaiThangDiem)}
              </span>
            </div>
            <div>
              <strong>Minh chứng:</strong>{" "}
              <span
                style={{
                  color: tieuChi.BatBuocMinhChung ? "#ea580c" : "#64748b",
                  fontWeight: tieuChi.BatBuocMinhChung ? "600" : "normal",
                }}
              >
                {tieuChi.BatBuocMinhChung ? "Có bắt buộc" : "Không bắt buộc"}
              </span>
            </div>
            {tieuChi.CoTheDongBoScience && (
              <div style={{ gridColumn: "1 / -1" }}>
                <strong>Đồng bộ Science:</strong>{" "}
                <span style={{ color: "#0284c7", fontWeight: "600" }}>
                  {tieuChi.BangNguonScience || "Chưa cấu hình"}
                </span>
              </div>
            )}
            {tieuChi.MoTa && (
              <div style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
                <strong>Mô tả:</strong>{" "}
                <p
                  style={{
                    margin: "4px 0 0 0",
                    color: "#334155",
                    lineHeight: "1.6",
                  }}
                >
                  {tieuChi.MoTa}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* List and Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "15px",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "16px",
            color: "#334155",
            fontWeight: "700",
            textTransform: "uppercase",
          }}
        >
          Danh sách mức điểm
        </h3>
        {canManage && (
          <button
            className="btn-add-new"
            onClick={() => setIsModalOpen(true)}
            style={{ margin: 0 }}
          >
            <i className="fa-solid fa-plus"></i> Thêm mức điểm
          </button>
        )}
      </div>

      <div
        className="table-card thang-diem-table-container"
        style={{
          overflowX: "auto",
          background: "#fff",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          paddingBottom: "10px",
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "50px" }}>
            <i
              className="fa-solid fa-circle-notch fa-spin fa-2x"
              style={{ color: "#3498db", marginRight: "10px" }}
            ></i>
            <p style={{ marginTop: "10px", color: "#666" }}>
              Đang tải thang điểm
            </p>
          </div>
        ) : data.length === 0 ? (
          <div
            style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}
          >
            <i
              className="fa-solid fa-sliders"
              style={{
                fontSize: "60px",
                color: "#94a3b8",
                marginBottom: "15px",
              }}
            ></i>
            <h3 style={{ color: "#64748b", margin: "0 0 10px 0" }}>
              Chưa có mức điểm nào được cấu hình
            </h3>
            <p style={{ margin: 0, fontSize: "14px", color: "#94a3b8" }}>
              Vui lòng bấm nút "Thêm mức điểm" để cấu hình thang điểm cho tiêu
              chí này.
            </p>
          </div>
        ) : (
          <>
            <table className="custom-table thang-diem-table">
              <thead>
                <tr>
                  <th width="8%" style={{ textAlign: "center" }}>
                    STT
                  </th>
                  <th width="62%">ĐIỀU KIỆN ĐẠT ĐIỂM</th>
                  <th width="15%" style={{ textAlign: "center" }}>
                    MỨC ĐIỂM
                  </th>
                  <th width="15%" style={{ textAlign: "center" }}>
                    THAO TÁC
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item, index) => {
                  const actualIndex = first + index + 1;
                  return (
                    <tr key={item.IdThangDiem}>
                      <td style={{ textAlign: "center", fontWeight: "bold" }}>
                        {actualIndex}
                      </td>
                      <td
                        style={{
                          color: "#334155",
                          fontSize: "14px",
                          lineHeight: "1.5",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {item.DieuKienDiem || (
                          <span
                            style={{ fontStyle: "italic", color: "#94a3b8" }}
                          >
                            Không có mô tả điều kiện
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            backgroundColor: "#fef3c7",
                            color: "#d97706",
                            padding: "6px 14px",
                            borderRadius: "12px",
                            fontWeight: "bold",
                            fontSize: "14px",
                          }}
                        >
                          {item.GiaTriDiem} đ
                        </span>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: "15px",
                            justifyContent: "center",
                            opacity: canManage ? 1 : 0.4,
                            pointerEvents: canManage ? "auto" : "none",
                          }}
                        >
                          <div
                            className="action-btn edit-btn"
                            onClick={() => handleEdit(item)}
                            title="Chỉnh sửa"
                          >
                            <i className="fa-solid fa-pen"></i>
                          </div>
                          <div
                            className="action-btn delete-btn"
                            onClick={() => handleDelete(item.IdThangDiem)}
                            title="Xóa"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.length > rows && (
              <div
                style={{
                  marginTop: "15px",
                  borderTop: "1px solid #e9ecef",
                  paddingTop: "10px",
                }}
              >
                <Paginator
                  first={first}
                  rows={rows}
                  totalRecords={data.length}
                  onPageChange={onPageChange}
                  template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport"
                  style={{ background: "transparent", border: "none" }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Dialog Form */}
      {isModalOpen && (
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
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0, fontWeight: "600" }}>
                {editId ? "Cập nhật Mức điểm" : "Thêm Mức điểm mới"}
              </h3>
              <button
                className="close-btn"
                onClick={closeModal}
                style={{ fontSize: "26px", lineHeight: "1" }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body" style={{ padding: "25px" }}>
              <form id="thangDiemTieuChiForm" onSubmit={handleSubmit}>
                <div className="form-grid-2" style={{ marginBottom: "20px" }}>
                  <div className="form-group">
                    <label>
                      Mức điểm quy định <span className="text-red">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="GiaTriDiem"
                      className="form-input"
                      value={formData.GiaTriDiem || ""}
                      onChange={handleChange}
                      required
                      placeholder="VD: 10"
                    />
                  </div>
                  <div className="form-group">
                    <label>Thứ tự hiển thị</label>
                    <input
                      type="number"
                      name="ThuTuHienThi"
                      className="form-input"
                      value={formData.ThuTuHienThi || 1}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>
                    Mô tả / Điều kiện đạt mức điểm này{" "}
                    <span className="text-red">*</span>
                  </label>
                  <textarea
                    name="DieuKienDiem"
                    className="form-input"
                    value={formData.DieuKienDiem || ""}
                    onChange={handleChange}
                    required
                    rows="4"
                    placeholder="Nhập mô tả chi tiết điều kiện đạt được mức điểm..."
                  ></textarea>
                </div>
              </form>
            </div>
            <div
              className="modal-footer"
              style={{ display: "flex", gap: "10px" }}
            >
              <button type="button" className="btn-cancel" onClick={closeModal}>
                Hủy
              </button>
              <button
                type="submit"
                form="thangDiemTieuChiForm"
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
      )}
    </div>
  );
};

export default QL_ThangDiemByTieuChi;
