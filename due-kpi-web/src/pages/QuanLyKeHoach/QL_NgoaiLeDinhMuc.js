import React, { useState, useEffect, useRef } from "react";
import { Toast } from "primereact/toast";
import { useAuth } from "../../context/AuthContext";
import "../../css/Pages.css";
import QL_NgoaiLeListing from "../../components/QuanLyKeHoach/QL_NgoaiLeDinhMuc/QL_NgoaiLeListing";
import QL_NgoaiLeForm from "../../components/QuanLyKeHoach/QL_NgoaiLeDinhMuc/QL_NgoaiLeForm";
import { useConfirmDeleteDialog } from "../../hooks/useConfirmDeleteDialog";
import { apiFetch } from "../../utils/api";

const initialForm = {
  IdNhanVien: "",
  IdNam: "",
  LoaiNgoaiLe: "",
  HeSoGiamGiang: "",
  SoGioGiamGiang: "",
  HeSoNckh: "",
  HeSoGiamNckh: "",
  SoGioThemNckh: "",
  HeSoGiamPvcd: "",
  MienNckh: false,
  TuNgay: "",
  DenNgay: "",
  LyDo: "",
  MinhChungUrl: "",
  TrangThai: true,
};

const QL_NgoaiLeDinhMuc = () => {
  const toast = useRef(null);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [namList, setNamList] = useState([]);
  const [nhanVienList, setNhanVienList] = useState([]);

  // Filters
  const [selectedNam, setSelectedNam] = useState("");
  const [selectedNhanVienFilter, setSelectedNhanVienFilter] = useState("");
  const [selectedLoaiFilter, setSelectedLoaiFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [editId, setEditId] = useState(null);

  const { confirmDeleteDialog } = useConfirmDeleteDialog();
  const { user } = useAuth();
  const currentUser = user || {};
  const roleCode = currentUser?.MaChucVu || "";
  const isAdmin = roleCode === "Admin";
  const isManager = ["HT", "PHT", "TK", "TBM"].includes(roleCode);
  const canManage = isAdmin || isManager;

  useEffect(() => {
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initData = async () => {
    setIsLoading(true);
    try {
      const [namRes, nvRes] = await Promise.all([
        apiFetch("namdanhgia"),
        apiFetch("nhan-vien"),
      ]);

      let years = [];
      let employees = [];

      if (namRes.ok) {
        const result = await namRes.json();
        const list = result.Items || (Array.isArray(result) ? result : []);
        years = list.sort((a, b) => b.IdNam - a.IdNam);
        setNamList(years);
      }

      if (nvRes.ok) {
        const result = await nvRes.json();
        employees = result.Items || (Array.isArray(result) ? result : []);
        setNhanVienList(employees);
      }

      const defaultYear =
        years.length > 0
          ? years[0].IdNam.toString()
          : new Date().getFullYear().toString();
      setSelectedNam(defaultYear);

      await loadNgoaiLeData(defaultYear, "", employees);
    } catch (error) {
      console.error("Lỗi khởi tạo dữ liệu:", error);
      showToast("error", "Lỗi", "Không thể khởi tạo dữ liệu");
    } finally {
      setIsLoading(false);
    }
  };

  const loadNgoaiLeData = async (
    yearId,
    nvId,
    employeesList = nhanVienList,
  ) => {
    setIsLoading(true);
    try {
      if (nvId) {
        // Fetch for specific employee & year
        const response = await apiFetch(
          `ngoai-le-dinh-muc/by-nhan-vien-nam/${nvId}/${yearId}`,
        );
        if (response.ok) {
          const result = await response.json();
          const list = result.Items || (Array.isArray(result) ? result : []);
          setData(list);
          applyFilters(list, searchQuery, selectedLoaiFilter);
        } else {
          setData([]);
          setFilteredData([]);
        }
      } else {
        // Fetch for all employees in selected year
        const targetEmployees =
          employeesList.length > 0 ? employeesList : nhanVienList;
        const requests = targetEmployees.map((nv) =>
          apiFetch(
            `ngoai-le-dinh-muc/by-nhan-vien-nam/${nv.IdNhanVien}/${yearId}`,
          )
            .then((res) => (res.ok ? res.json() : null))
            .catch(() => null),
        );

        const results = await Promise.all(requests);
        const allItems = [];
        results.forEach((res) => {
          if (res) {
            const items = res.Items || (Array.isArray(res) ? res : []);
            allItems.push(...items);
          }
        });

        setData(allItems);
        applyFilters(allItems, searchQuery, selectedLoaiFilter);
      }
    } catch (error) {
      console.error("Lỗi tải ngoại lệ định mức:", error);
      showToast("error", "Lỗi", "Lỗi khi tải dữ liệu ngoại lệ định mức");
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (severity, summary, detail) => {
    if (toast.current) {
      toast.current.show({ severity, summary, detail, life: 3000 });
    }
  };

  const applyFilters = (
    rawList = data,
    search = searchQuery,
    loaiFilter = selectedLoaiFilter,
  ) => {
    let result = [...rawList];

    if (loaiFilter) {
      const loaiInt = parseInt(loaiFilter, 10);
      result = result.filter(
        (item) => (item.LoaiNgoaiLe || item.loai_ngoai_le) === loaiInt,
      );
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((item) => {
        const nv = nhanVienList.find(
          (x) => x.IdNhanVien === (item.IdNhanVien || item.id_nhan_vien),
        );
        const nvName = (item.HoTen || nv?.HoTen || "").toLowerCase();
        const nvCode = (nv?.MaNhanVien || "").toLowerCase();
        const reason = (item.LyDo || item.ly_do || "").toLowerCase();
        return (
          nvName.includes(query) ||
          nvCode.includes(query) ||
          reason.includes(query)
        );
      });
    }

    setFilteredData(result);
  };

  const handleNamChange = (e) => {
    const yearId = e.target.value;
    setSelectedNam(yearId);
    if (yearId) {
      loadNgoaiLeData(yearId, selectedNhanVienFilter);
    }
  };

  const handleNhanVienFilterChange = (e) => {
    const nvId = e.target.value;
    setSelectedNhanVienFilter(nvId);
    if (selectedNam) {
      loadNgoaiLeData(selectedNam, nvId);
    }
  };

  const handleLoaiFilterChange = (e) => {
    const val = e.target.value;
    setSelectedLoaiFilter(val);
    applyFilters(data, searchQuery, val);
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    applyFilters(data, query, selectedLoaiFilter);
  };

  const handleOpenCreateModal = () => {
    setEditId(null);
    setFormData({
      ...initialForm,
      IdNam: selectedNam || (namList.length > 0 ? namList[0].IdNam : ""),
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditId(item.IdNgoaiLe || item.id_ngoai_le);
    setFormData({
      IdNhanVien: item.IdNhanVien || item.id_nhan_vien,
      IdNam: item.IdNam || item.id_nam,
      LoaiNgoaiLe: item.LoaiNgoaiLe || item.loai_ngoai_le,
      HeSoGiamGiang: item.HeSoGiamGiang ?? item.he_so_giam_giang ?? "",
      SoGioGiamGiang: item.SoGioGiamGiang ?? item.so_gio_giam_giang ?? "",
      HeSoNckh: item.HeSoNckh ?? item.he_so_nckh ?? "",
      HeSoGiamNckh: item.HeSoGiamNckh ?? item.he_so_giam_nckh ?? "",
      SoGioThemNckh: item.SoGioThemNckh ?? item.so_gio_them_nckh ?? "",
      HeSoGiamPvcd: item.HeSoGiamPvcd ?? item.he_so_giam_pvcd ?? "",
      MienNckh: item.MienNckh ?? item.mien_nckh ?? false,
      TuNgay: item.TuNgay || item.tu_ngay || "",
      DenNgay: item.DenNgay || item.den_ngay || "",
      LyDo: item.LyDo || item.ly_do || "",
      MinhChungUrl: item.MinhChungUrl || item.minh_chung_url || "",
      TrangThai:
        item.TrangThai !== undefined ? item.TrangThai : item.trang_thai === 1,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) return;

    if (!formData.TuNgay) {
      showToast("error", "Cảnh báo", "Vui lòng chọn ngày bắt đầu (Từ ngày)");
      return;
    }

    if (!formData.DenNgay) {
      showToast("error", "Cảnh báo", "Vui lòng chọn ngày kết thúc (Đến ngày)");
      return;
    }

    try {
      if (editId) {
        // PUT /api/ngoai-le-dinh-muc/{id}
        const updatePayload = {
          LyDo: formData.LyDo || null,
          MinhChungUrl: formData.MinhChungUrl || null,
          DenNgay: formData.DenNgay || null,
          TrangThai: formData.TrangThai,
        };

        const response = await apiFetch(`ngoai-le-dinh-muc/${editId}`, {
          method: "PUT",
          body: JSON.stringify(updatePayload),
        });

        if (response.ok) {
          showToast(
            "success",
            "Thành công",
            "Cập nhật ngoại lệ định mức thành công",
          );
          setIsModalOpen(false);
          loadNgoaiLeData(selectedNam, selectedNhanVienFilter);
        } else {
          const err = await response.json().catch(() => null);
          showToast("error", "Lỗi", err?.Message || "Cập nhật thất bại");
        }
      } else {
        // POST /api/ngoai-le-dinh-muc
        const createPayload = {
          IdNhanVien: parseInt(formData.IdNhanVien, 10),
          IdNam: parseInt(formData.IdNam, 10),
          LoaiNgoaiLe: parseInt(formData.LoaiNgoaiLe, 10),
          HeSoGiamGiang:
            formData.HeSoGiamGiang !== ""
              ? parseFloat(formData.HeSoGiamGiang)
              : null,
          SoGioGiamGiang:
            formData.SoGioGiamGiang !== ""
              ? parseFloat(formData.SoGioGiamGiang)
              : null,
          HeSoNckh:
            formData.HeSoNckh !== "" ? parseFloat(formData.HeSoNckh) : null,
          HeSoGiamNckh:
            formData.HeSoGiamNckh !== ""
              ? parseFloat(formData.HeSoGiamNckh)
              : null,
          SoGioThemNckh:
            formData.SoGioThemNckh !== ""
              ? parseFloat(formData.SoGioThemNckh)
              : null,
          HeSoGiamPvcd:
            formData.HeSoGiamPvcd !== ""
              ? parseFloat(formData.HeSoGiamPvcd)
              : null,
          MienNckh: !!formData.MienNckh,
          TuNgay: formData.TuNgay || null,
          DenNgay: formData.DenNgay || null,
          LyDo: formData.LyDo || null,
          MinhChungUrl: formData.MinhChungUrl || null,
        };

        const response = await apiFetch("ngoai-le-dinh-muc", {
          method: "POST",
          body: JSON.stringify(createPayload),
        });

        if (response.ok || response.status === 201) {
          showToast(
            "success",
            "Thành công",
            "Tạo mới ngoại lệ định mức thành công",
          );
          setIsModalOpen(false);
          loadNgoaiLeData(selectedNam, selectedNhanVienFilter);
        } else {
          const err = await response.json().catch(() => null);
          showToast("error", "Lỗi", err?.Message || "Tạo mới thất bại");
        }
      }
    } catch (error) {
      console.error("Lỗi khi lưu ngoại lệ:", error);
      showToast("error", "Lỗi", "Lỗi kết nối máy chủ");
    }
  };

  const handleDelete = (id) => {
    confirmDeleteDialog({
      header: "Xác nhận vô hiệu hóa",
      message:
        "Bạn có chắc chắn muốn vô hiệu hóa bản ghi ngoại lệ định mức này không?",
      acceptLabel: "Vô hiệu hóa",
      rejectLabel: "Hủy",
      accept: async () => {
        try {
          const res = await apiFetch(`ngoai-le-dinh-muc/${id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            showToast(
              "success",
              "Thành công",
              "Đã vô hiệu hóa ngoại lệ định mức",
            );
            loadNgoaiLeData(selectedNam, selectedNhanVienFilter);
          } else {
            const err = await res.json().catch(() => null);
            showToast(
              "error",
              "Lỗi",
              err?.Message || "Không thể vô hiệu hóa bản ghi",
            );
          }
        } catch (error) {
          console.error("Lỗi khi vô hiệu hóa ngoại lệ:", error);
          showToast("error", "Lỗi", "Lỗi kết nối máy chủ");
        }
      },
    });
  };

  return (
    <div className="page-container" style={{ padding: "20px" }}>
      <Toast ref={toast} />
      <div
        className="page-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              color: "#1e293b",
              fontSize: "22px",
              fontWeight: "700",
            }}
          >
            Quản lý Ngoại lệ Định mức
          </h2>
          <p
            style={{ margin: "5px 0 0 0", color: "#64748b", fontSize: "14px" }}
          >
            Quản lý chế độ ưu đãi, miễn giảm giờ giảng và giờ NCKH theo quy định
          </p>
        </div>

        {canManage && (
          <button
            className="btn-submit"
            onClick={handleOpenCreateModal}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              fontSize: "14px",
            }}
          >
            <i className="fa-solid fa-plus"></i> Thêm ngoại lệ mới
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div
        style={{
          background: "#fff",
          padding: "16px 20px",
          borderRadius: "8px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          marginBottom: "20px",
          display: "flex",
          gap: "15px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div style={{ minWidth: "160px", flex: "1 1 160px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "#475569",
              marginBottom: "6px",
            }}
          >
            Năm đánh giá
          </label>
          <select
            className="form-input"
            value={selectedNam}
            onChange={handleNamChange}
          >
            {namList.map((n) => (
              <option key={n.IdNam} value={n.IdNam}>
                Năm học {n.IdNam}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: "220px", flex: "2 1 220px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "#475569",
              marginBottom: "6px",
            }}
          >
            Giảng viên
          </label>
          <select
            className="form-input"
            value={selectedNhanVienFilter}
            onChange={handleNhanVienFilterChange}
          >
            <option value="">-- Tất cả giảng viên --</option>
            {nhanVienList.map((nv) => (
              <option key={nv.IdNhanVien} value={nv.IdNhanVien}>
                {nv.MaNhanVien ? nv.MaNhanVien + " - " : ""}
                {nv.HoTen}
              </option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: "200px", flex: "2 1 200px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "#475569",
              marginBottom: "6px",
            }}
          >
            Loại ngoại lệ
          </label>
          <select
            className="form-input"
            value={selectedLoaiFilter}
            onChange={handleLoaiFilterChange}
          >
            <option value="">-- Tất cả loại ngoại lệ --</option>
            <option value="1">1: Tập sự / Thử việc</option>
            <option value="2">2: Nghỉ BHXH / LĐ</option>
            <option value="3">3: Cử đi đào tạo TS</option>
            <option value="4">4: Nữ nuôi con 7-12 tháng</option>
            <option value="5">5: Nữ nuôi con 13-36 tháng</option>
            <option value="6">6: Quân nhân dự bị</option>
            <option value="7">7: Hệ số NCKH nữ</option>
            <option value="8">8: Khác</option>
          </select>
        </div>

        <div style={{ minWidth: "220px", flex: "2 1 220px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "#475569",
              marginBottom: "6px",
            }}
          >
            Tìm kiếm từ khóa
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              className="form-input"
              placeholder="Mã/Tên GV, lý do..."
              value={searchQuery}
              onChange={handleSearchChange}
              style={{ paddingRight: "30px" }}
            />
            <i
              className="fa-solid fa-magnifying-glass"
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            ></i>
          </div>
        </div>
      </div>

      {/* Listing Table */}
      <QL_NgoaiLeListing
        data={filteredData}
        nhanVienList={nhanVienList}
        onEdit={handleOpenEditModal}
        onDelete={handleDelete}
        isLoading={isLoading}
        canManage={canManage}
      />

      {/* Form Modal */}
      <QL_NgoaiLeForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        isEditing={!!editId}
        namList={namList}
        nhanVienList={nhanVienList}
      />
    </div>
  );
};

export default QL_NgoaiLeDinhMuc;
