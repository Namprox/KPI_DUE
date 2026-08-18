import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../css/Pages.css";
import QL_DanhGiaSinhVienListing from "../../components/QuanLyKeHoach/QL_DanhGiaSinhVien/QL_DanhGiaSinhVienListing";
import QL_DanhGiaSinhVienForm from "../../components/QuanLyKeHoach/QL_DanhGiaSinhVien/QL_DanhGiaSinhVienForm";
import QL_DanhGiaSinhVienImportModal from "../../components/QuanLyKeHoach/QL_DanhGiaSinhVien/QL_DanhGiaSinhVienImportModal";
import QL_DanhGiaSinhVienChotModal from "../../components/QuanLyKeHoach/QL_DanhGiaSinhVien/QL_DanhGiaSinhVienChotModal";
import { useConfirmDeleteDialog } from "../../hooks/useConfirmDeleteDialog";
import { apiFetch } from "../../utils/api";
import SearchSelect from "../../components/Common/SearchSelect";

const KY_HOC_OPTIONS = [
  { value: "", label: "-- Tất cả Kỳ --" },
  { value: "1", label: "Kỳ 1" },
  { value: "2", label: "Kỳ 2" },
  { value: "3", label: "Kỳ Hè" },
];

const toTwoDigitYear = (raw) => {
  const num = parseInt(raw, 10);
  if (isNaN(num)) return raw;
  return num > 100 ? num % 100 : num;
};

const buildNamOptions = (list) =>
  list.map((item) => {
    const rawVal = item.IdNam || item.idNam || item.NamHoc || item.namHoc;
    const twoDigit = toTwoDigitYear(rawVal);
    const label =
      item.TenNam ||
      item.tenNam ||
      item.TenNamHoc ||
      item.tenNamHoc ||
      (rawVal ? `Năm ${rawVal}` : `Năm ${twoDigit}`);
    return { value: twoDigit, label };
  });

// Năm hiện hành nếu có trong danh mục, không thì lấy năm mới nhất
const pickDefaultNam = (options) => {
  if (!options.length) return "";
  const current = toTwoDigitYear(new Date().getFullYear());
  const matched = options.find((o) => String(o.value) === String(current));
  if (matched) return matched.value;
  const numeric = options
    .map((o) => parseInt(o.value, 10))
    .filter((n) => !isNaN(n));
  return numeric.length ? Math.max(...numeric) : options[0].value;
};

const QL_DanhGiaSinhVien = () => {
  const navigate = useNavigate();

  const initialForm = {
    Mssv: "",
    MaCanBo: "",
    HoTenGv: "",
    MaHocPhan: "",
    KhoaQuanLyHp: "",
    KyHoc: "",
    CauHoi: "",
    DanhGia: "",
  };

  const [data, setData] = useState([]);
  const [namList, setNamList] = useState([]);
  const [nhanVienList, setNhanVienList] = useState([]);
  const [donViList, setDonViList] = useState([]);

  // Filter states
  const [selectedDonVi, setSelectedDonVi] = useState("");
  const [searchHoTen, setSearchHoTen] = useState("");
  const [searchMaHocPhan, setSearchMaHocPhan] = useState("");
  const [searchNamHoc, setSearchNamHoc] = useState("");
  const [searchKyHoc, setSearchKyHoc] = useState("");

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isChotModalOpen, setIsChotModalOpen] = useState(false);
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
    const init = async () => {
      const list = await fetchNamList();
      const defaultNam = pickDefaultNam(buildNamOptions(list));
      setSearchNamHoc(defaultNam);
      fetchData(
        1,
        pageSize,
        selectedDonVi,
        searchHoTen,
        searchMaHocPhan,
        defaultNam,
        searchKyHoc,
      );
    };
    init();
    fetchNhanVienList();
    fetchDonViList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async (
    pageNumber = page,
    sizeNumber = pageSize,
    filterDonVi = selectedDonVi,
    filterHoTen = searchHoTen,
    filterMaHocPhan = searchMaHocPhan,
    filterNamHoc = searchNamHoc,
    filterKyHoc = searchKyHoc,
  ) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", pageNumber);
      params.append("pageSize", sizeNumber);

      if (filterDonVi) {
        params.append("idDonVi", filterDonVi);
      }
      if (filterHoTen?.trim()) {
        params.append("maCanBo", filterHoTen.trim());
      }
      if (filterMaHocPhan?.trim()) {
        params.append("maHocPhan", filterMaHocPhan.trim());
      }
      if (
        filterNamHoc !== "" &&
        filterNamHoc !== null &&
        filterNamHoc !== undefined
      ) {
        const namVal = parseInt(filterNamHoc, 10);
        if (!isNaN(namVal)) {
          params.append("namHoc", namVal);
        }
      }
      if (
        filterKyHoc !== "" &&
        filterKyHoc !== null &&
        filterKyHoc !== undefined
      ) {
        const kyStr = String(filterKyHoc).trim();
        let kyVal = parseInt(kyStr, 10);
        const namVal = parseInt(filterNamHoc, 10);
        if (!isNaN(kyVal)) {
          if (kyStr.length === 1) {
            // Kỳ 1 chữ số chỉ có nghĩa khi ghép với năm: 26 + 1 -> 261
            if (isNaN(namVal)) {
              kyVal = null;
            } else {
              kyVal = namVal * 10 + kyVal;
            }
          }
          if (kyVal !== null) {
            params.append("kyHoc", kyVal);
          }
        }
      }

      const response = await apiFetch(`phanhoisinhvien?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        const list = result.Items || (Array.isArray(result) ? result : []);
        const total =
          result.TotalCount !== undefined ? result.TotalCount : list.length;

        setData(list);
        setTotalCount(total);
        setPage(result.Page || pageNumber);
        setPageSize(result.PageSize || sizeNumber);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách phản hồi sinh viên:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNamList = async () => {
    try {
      const response = await apiFetch("namdanhgia");
      if (response.ok) {
        const result = await response.json();
        const list = result.Items || (Array.isArray(result) ? result : []);
        setNamList(list);
        return list;
      }
    } catch (error) {
      console.error("Lỗi tải danh sách năm đánh giá:", error);
    }
    return [];
  };

  const fetchNhanVienList = async () => {
    try {
      const response = await apiFetch("nhan-vien");
      if (response.ok) {
        const result = await response.json();
        setNhanVienList(result.Items || (Array.isArray(result) ? result : []));
      }
    } catch (error) {
      console.error("Lỗi tải danh sách nhân viên:", error);
    }
  };

  const fetchDonViList = async () => {
    try {
      const response = await apiFetch("donvi");
      if (response.ok) {
        const result = await response.json();
        setDonViList(result.Items || (Array.isArray(result) ? result : []));
      }
    } catch (error) {
      console.error("Lỗi tải danh sách đơn vị:", error);
    }
  };

  const namOptions = useMemo(() => buildNamOptions(namList), [namList]);

  const handleNamHocChange = (v) => {
    setSearchNamHoc(v);
    if (!v) setSearchKyHoc("");
  };

  // Filter Khoa (don vi where code starts with K_)
  const khoaList = donViList.filter((dv) => {
    const ma = dv.MaDonVi || dv.maDonVi || "";
    return ma.toUpperCase().startsWith("K_");
  });

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData(
      1,
      pageSize,
      selectedDonVi,
      searchHoTen,
      searchMaHocPhan,
      searchNamHoc,
      searchKyHoc,
    );
  };

  const handleResetFilters = () => {
    const defaultNam = pickDefaultNam(namOptions);
    setSelectedDonVi("");
    setSearchHoTen("");
    setSearchMaHocPhan("");
    setSearchNamHoc(defaultNam);
    setSearchKyHoc("");
    setPage(1);
    fetchData(1, pageSize, "", "", "", defaultNam, "");
  };

  const handlePageChange = (newPage, newPageSize) => {
    setPage(newPage);
    setPageSize(newPageSize);
    fetchData(
      newPage,
      newPageSize,
      selectedDonVi,
      searchHoTen,
      searchMaHocPhan,
      searchNamHoc,
      searchKyHoc,
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) {
      alert("Bạn không có quyền thực hiện chức năng này!");
      return;
    }

    const method = editId ? "PUT" : "POST";
    const endpoint = editId ? `phanhoisinhvien/${editId}` : "phanhoisinhvien";

    const payload = {
      Mssv: formData.Mssv,
      MaCanBo: formData.MaCanBo,
      HoTenGv: formData.HoTenGv || null,
      MaHocPhan: formData.MaHocPhan || null,
      KhoaQuanLyHp: formData.KhoaQuanLyHp || null,
      KyHoc: formData.KyHoc !== "" ? parseInt(formData.KyHoc, 10) : null,
      CauHoi: formData.CauHoi !== "" ? parseInt(formData.CauHoi, 10) : null,
      DanhGia: formData.DanhGia !== "" ? parseFloat(formData.DanhGia) : null,
    };

    if (editId) {
      payload.IdPhanHoi = editId;
    }

    try {
      const response = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        fetchData(
          page,
          pageSize,
          selectedDonVi,
          searchHoTen,
          searchMaHocPhan,
          searchNamHoc,
          searchKyHoc,
        );
        closeModal();
      } else {
        alert("Lưu thất bại! Vui lòng thử lại.");
      }
    } catch (error) {
      console.error("Lỗi khi lưu dữ liệu:", error);
      alert("Có lỗi xảy ra khi kết nối máy chủ!");
    }
  };

  const handleEdit = (item) => {
    if (!canManage) return;
    setEditId(item.IdPhanHoi || item.idPhanHoi);
    setFormData({
      Mssv: item.Mssv || item.mssv || "",
      MaCanBo: item.MaCanBo || item.maCanBo || "",
      HoTenGv: item.HoTenGv || item.hoTenGv || "",
      MaHocPhan: item.MaHocPhan || item.maHocPhan || "",
      KhoaQuanLyHp: item.KhoaQuanLyHp || item.khoaQuanLyHp || "",
      KyHoc: item.KyHoc ?? item.kyHoc ?? "",
      CauHoi: item.CauHoi ?? item.cauHoi ?? "",
      DanhGia: item.DanhGia ?? item.danhGia ?? "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (!canManage) return;
    confirmDeleteDialog({
      header: "Xác nhận xóa",
      message: "Bạn có chắc chắn muốn xóa đánh giá sinh viên này?",
      accept: async () => {
        try {
          const res = await apiFetch(`phanhoisinhvien/${id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            fetchData(
              page,
              pageSize,
              selectedDonVi,
              searchHoTen,
              searchMaHocPhan,
              searchNamHoc,
              searchKyHoc,
            );
          } else {
            alert("Xóa thất bại!");
          }
        } catch (error) {
          console.error("Lỗi khi xóa:", error);
          alert("Lỗi kết nối máy chủ!");
        }
      },
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialForm);
    setEditId(null);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-title">
          <h2>QUẢN LÝ ĐÁNH GIÁ SINH VIÊN</h2>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          marginBottom: "20px",
        }}
      >
        {canManage && (
          <>
            <button
              className="btn-add-new"
              onClick={() => setIsChotModalOpen(true)}
              style={{
                margin: 0,
                backgroundColor: "#2563eb",
                borderColor: "#2563eb",
              }}
            >
              <i className="fa-solid fa-calculator"></i> Chốt điểm
            </button>
            <button
              className="btn-add-new"
              onClick={() => setIsImportModalOpen(true)}
              style={{
                margin: 0,
                backgroundColor: "#10b981",
                borderColor: "#10b981",
              }}
            >
              <i className="fa-solid fa-file-import"></i> Import Excel
            </button>
            <button
              className="btn-add-new"
              onClick={() => navigate("/diem-trung-binh-danh-gia-sinh-vien")}
              style={{
                margin: 0,
                backgroundColor: "#6366f1",
                borderColor: "#6366f1",
              }}
            >
              <i className="fa-solid fa-chart-line"></i> Xem ĐTB đã chốt
            </button>
          </>
        )}
      </div>

      <div
        style={{
          backgroundColor: "#fff",
          padding: "15px 20px",
          borderRadius: "8px",
          marginBottom: "20px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        }}
      >
        <p className="sub-title" style={{ margin: "0 0 15px 0" }}>
          DANH SÁCH ĐÁNH GIÁ SINH VIÊN
        </p>
        <form onSubmit={handleFilterSubmit}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "15px",
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: "1 1 180px", minWidth: "150px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: "6px",
                  color: "#475569",
                }}
              >
                Khoa
              </label>
              <SearchSelect
                value={selectedDonVi}
                onChange={(v) => setSelectedDonVi(v)}
                options={[
                  { value: "", label: "-- Tất cả Khoa --" },
                  ...khoaList.map((dv) => ({
                    value: dv.IdDonVi || dv.idDonVi,
                    label: dv.TenDonVi || dv.tenDonVi,
                  })),
                ]}
                placeholder="-- Tất cả Khoa --"
              />
            </div>

            <div style={{ flex: "1 1 180px", minWidth: "150px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: "6px",
                  color: "#475569",
                }}
              >
                Họ tên / Mã cán bộ
              </label>
              <input
                type="text"
                placeholder="Nhập họ tên hoặc mã CB"
                className="form-input"
                style={{ width: "100%" }}
                value={searchHoTen}
                onChange={(e) => setSearchHoTen(e.target.value)}
              />
            </div>

            <div style={{ flex: "1 1 150px", minWidth: "130px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: "6px",
                  color: "#475569",
                }}
              >
                Mã học phần
              </label>
              <input
                type="text"
                placeholder="Nhập mã học phần"
                className="form-input"
                style={{ width: "100%" }}
                value={searchMaHocPhan}
                onChange={(e) => setSearchMaHocPhan(e.target.value)}
              />
            </div>

            <div style={{ flex: "1 1 150px", minWidth: "130px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: "6px",
                  color: "#475569",
                }}
              >
                Năm học
              </label>
              <SearchSelect
                value={searchNamHoc}
                onChange={handleNamHocChange}
                options={[
                  { value: "", label: "-- Tất cả Năm --" },
                  ...namOptions,
                ]}
                placeholder="-- Tất cả Năm --"
              />
            </div>

            <div style={{ flex: "1 1 130px", minWidth: "120px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "600",
                  marginBottom: "6px",
                  color: "#475569",
                }}
              >
                Kỳ học
              </label>
              <SearchSelect
                value={searchKyHoc}
                onChange={(v) => setSearchKyHoc(v)}
                options={KY_HOC_OPTIONS}
                placeholder={
                  searchNamHoc ? "-- Tất cả Kỳ --" : "-- Chọn Năm học trước --"
                }
                disabled={!searchNamHoc}
              />
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="submit"
                className="btn-add-new"
                style={{
                  margin: 0,
                  backgroundColor: "#2563eb",
                  borderColor: "#2563eb",
                }}
              >
                <i className="fa-solid fa-magnifying-glass"></i> Tìm kiếm
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={handleResetFilters}
                style={{ margin: 0 }}
              >
                <i className="fa-solid fa-rotate-right"></i> Đặt lại
              </button>
            </div>
          </div>
        </form>
      </div>

      <QL_DanhGiaSinhVienListing
        data={data}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
        canManage={canManage}
      />

      <QL_DanhGiaSinhVienForm
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        isEditing={!!editId}
        namList={namList}
        nhanVienList={nhanVienList}
      />

      <QL_DanhGiaSinhVienImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() =>
          fetchData(
            page,
            pageSize,
            selectedDonVi,
            searchHoTen,
            searchMaHocPhan,
            searchNamHoc,
            searchKyHoc,
          )
        }
        namList={namList}
        donViList={donViList}
      />

      <QL_DanhGiaSinhVienChotModal
        isOpen={isChotModalOpen}
        onClose={() => setIsChotModalOpen(false)}
        onSuccess={() =>
          fetchData(
            page,
            pageSize,
            selectedDonVi,
            searchHoTen,
            searchMaHocPhan,
            searchNamHoc,
            searchKyHoc,
          )
        }
        namList={namList}
      />
    </div>
  );
};

export default QL_DanhGiaSinhVien;
