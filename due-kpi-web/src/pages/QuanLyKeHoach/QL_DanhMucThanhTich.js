import React, { useState, useEffect, useRef, useMemo } from "react";
import { Toast } from "primereact/toast";
import { confirmDialog } from "primereact/confirmdialog";
import { useAuth } from "../../context/AuthContext";
import "../../css/Pages.css";
import QL_DanhMucThanhTichListing from "../../components/QuanLyKeHoach/QL_DanhMucThanhTich/QL_DanhMucThanhTichListing";
import QL_DanhMucThanhTichForm from "../../components/QuanLyKeHoach/QL_DanhMucThanhTich/QL_DanhMucThanhTichForm";
import { useConfirmDeleteDialog } from "../../hooks/useConfirmDeleteDialog";
import { fetchDonViList } from "../../utils/donViApi";
import { isAdminRole, CAP_KHOA_PHONG } from "../../utils/viPhamPermissions";
import SearchSelect from "../../components/Common/SearchSelect";
import {
  LOAI_THANH_TICH_META,
  layCayThanhTich,
  taoMucThanhTich,
  capNhatMucThanhTich,
  xoaMucThanhTich,
} from "../../utils/keKhaiThanhTichApi";

const TRANG_THAI_FILTER_OPTIONS = [
  { value: "", label: "-- Tất cả --" },
  { value: "true", label: "Đang sử dụng" },
  { value: "false", label: "Ngừng sử dụng" },
];

const LOAI_FILTER_OPTIONS = [
  { value: "", label: "-- Tất cả tiêu chí --" },
  ...Object.entries(LOAI_THANH_TICH_META).map(([value, meta]) => ({
    value,
    label: `${value}. ${meta.label}`,
  })),
];

const initialForm = {
  // Cờ chỉ của giao diện: quyết định form hiện tập trường nào. Không gửi lên server.
  LaGoc: false,
  IdCha: "",
  LoaiThanhTich: "",
  MaMuc: "",
  TenMuc: "",
  LaLa: true,
  DiemQuyDoi: "",
  TranDiem: "",
  ChoPhepSoLuong: false,
  IdDonViDuyet: "",
  YeuCauMinhChung: true,
  GhiChu: "",
  ThuTu: "0",
  TrangThai: true,
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  color: "#475569",
  marginBottom: "6px",
};

/**
 * Quản trị danh mục "Thành tích vượt trội" (Nhóm II - bảng KPI viên chức / NLĐ).
 *
 * Cây 2 CẤP: gốc = tiêu chí (mang trần điểm), lá = mức quy đổi (mang điểm quy
 * đổi). Chỉ ADMIN vào được - đây là cấu hình toàn hệ thống.
 *
 * Việc QUAN TRỌNG NHẤT của màn hình không phải thêm mục mà là gán `IdDonViDuyet`
 * cho các mức lá: danh mục được seed toàn NULL vì id của P.TCHC / P.KHHTQT khác
 * nhau theo từng lần triển khai. Chưa gán thì mọi dòng kê khai rơi về trưởng đơn
 * vị quản lý trực tiếp, và luồng duyệt hai tầng không hoạt động.
 *
 * Bộ lọc chạy hoàn toàn ở SERVER (endpoint nhận `loai` / `trangThai`); riêng ô
 * từ khoá lọc ở client vì API không có tham số tương ứng.
 */
const QL_DanhMucThanhTich = () => {
  const toast = useRef(null);
  const { user } = useAuth();
  const currentUser = user || {};
  const isAdmin = isAdminRole(currentUser);

  const [donViList, setDonViList] = useState([]);
  const [data, setData] = useState([]);
  // Toàn bộ nút gốc, KHÔNG chịu bộ lọc - form cần chúng để chọn tiêu chí cha.
  const [gocFull, setGocFull] = useState([]);

  const [filterLoai, setFilterLoai] = useState("");
  const [filterTrangThai, setFilterTrangThai] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [editId, setEditId] = useState(null);

  const { confirmDeleteDialog } = useConfirmDeleteDialog();

  const showToast = (severity, summary, detail) => {
    if (toast.current)
      toast.current.show({ severity, summary, detail, life: 4000 });
  };

  useEffect(() => {
    if (isAdmin) initData();
    else setIsLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const initData = async () => {
    try {
      const list = await fetchDonViList();
      setDonViList(
        list
          .filter((dv) => dv.CapDonVi === CAP_KHOA_PHONG)
          .sort((a, b) =>
            String(a.MaDonVi || "").localeCompare(String(b.MaDonVi || "")),
          ),
      );
    } catch (error) {
      console.error("Lỗi tải danh mục đơn vị:", error);
    }
    await Promise.all([loadDanhMuc("", ""), taiGocFull()]);
  };

  /**
   * Nạp lại danh sách nút gốc không lọc. Gọi sau mỗi lần ghi vì thêm / sửa /
   * ngừng dùng một tiêu chí đều làm danh sách này đổi.
   */
  const taiGocFull = async () => {
    try {
      const list = await layCayThanhTich({});
      setGocFull(list.filter((m) => m.IdCha == null));
    } catch (error) {
      console.error("Lỗi tải danh sách tiêu chí gốc:", error);
    }
  };

  const loadDanhMuc = async (
    loaiFilter = filterLoai,
    trangThaiFilter = filterTrangThai,
  ) => {
    setIsLoading(true);
    try {
      const list = await layCayThanhTich({
        loai: loaiFilter || undefined,
        // Chỉ gửi được cờ "đang hoạt động"; muốn xem riêng mục đã ngừng thì lấy
        // hết rồi lọc ở client - endpoint không có tham số cho trường hợp đó.
        chiHoatDong: trangThaiFilter === "true",
      });
      setData(
        trangThaiFilter === "false"
          ? list.filter((m) => m.TrangThai === false)
          : list,
      );
    } catch (error) {
      console.error("Lỗi tải danh mục thành tích:", error);
      showToast("error", "Lỗi", error.message);
      setData([]);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Nút GỐC dùng cho ô "Thuộc tiêu chí" của form (cây tối đa 2 cấp).
   *
   * CỐ Ý lấy từ `gocFull` chứ không lọc lại `data`: `data` chịu bộ lọc tiêu chí
   * / trạng thái, nên khi đang lọc "Ngừng sử dụng" hoặc lọc đúng một tiêu chí,
   * suy từ nó sẽ cho ra danh sách cha rỗng hoặc thiếu - mở "Thêm mục" lúc đó là
   * bế tắc.
   */
  const gocList = gocFull;

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((item) =>
      [item.MaMuc, item.TenMuc, item.GhiChu, item.TenDonVi]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q)),
    );
  }, [data, searchQuery]);

  const handleLoaiFilterChange = (val) => {
    setFilterLoai(val);
    loadDanhMuc(val, filterTrangThai);
  };

  const handleTrangThaiFilterChange = (val) => {
    setFilterTrangThai(val);
    loadDanhMuc(filterLoai, val);
  };

  const handleOpenCreateModal = () => {
    setEditId(null);
    setFormData({ ...initialForm });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    const laGoc = item.IdCha == null;
    setEditId(item.IdMuc);
    setFormData({
      LaGoc: laGoc,
      IdCha: item.IdCha ?? "",
      LoaiThanhTich: item.LoaiThanhTich != null ? String(item.LoaiThanhTich) : "",
      MaMuc: item.MaMuc || "",
      TenMuc: item.TenMuc || "",
      LaLa: !!item.LaLa,
      DiemQuyDoi: item.DiemQuyDoi != null ? String(item.DiemQuyDoi) : "",
      TranDiem: item.TranDiem != null ? String(item.TranDiem) : "",
      ChoPhepSoLuong: !!item.ChoPhepSoLuong,
      IdDonViDuyet: item.IdDonViDuyet ?? "",
      YeuCauMinhChung: !!item.YeuCauMinhChung,
      GhiChu: item.GhiChu || "",
      ThuTu: item.ThuTu != null ? String(item.ThuTu) : "0",
      TrangThai: item.TrangThai !== false,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialForm);
    setEditId(null);
  };

  const soHoacNull = (v) => {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  /**
   * Dựng body cho POST / PUT.
   *
   * Nút gốc và mức lá gửi hai tập trường khác hẳn nhau: gửi `DiemQuyDoi` cho nút
   * gốc hay `TranDiem` cho mức lá đều bị server bỏ qua trong im lặng, nên tách
   * hẳn ở đây cho rõ ý.
   */
  const buildPayload = () => {
    const laGoc = !!formData.LaGoc;
    const chung = {
      MaMuc: (formData.MaMuc || "").trim(),
      TenMuc: (formData.TenMuc || "").trim(),
      GhiChu: (formData.GhiChu || "").trim() || null,
      ThuTu: parseInt(formData.ThuTu, 10) || 0,
    };

    if (laGoc) {
      return {
        ...chung,
        IdCha: null,
        // Bắt buộc khi IdCha = null; server khoá luôn sau khi tạo.
        LoaiThanhTich: soHoacNull(formData.LoaiThanhTich),
        LaLa: false,
        DiemQuyDoi: null,
        TranDiem: soHoacNull(formData.TranDiem),
        ChoPhepSoLuong: null,
        IdDonViDuyet: null,
        YeuCauMinhChung: null,
      };
    }

    return {
      ...chung,
      IdCha: soHoacNull(formData.IdCha),
      // Nút con luôn kế thừa tiêu chí từ cha - gửi lên cũng bị bỏ qua.
      LoaiThanhTich: null,
      LaLa: true,
      DiemQuyDoi: soHoacNull(formData.DiemQuyDoi),
      TranDiem: null,
      ChoPhepSoLuong: !!formData.ChoPhepSoLuong,
      IdDonViDuyet: soHoacNull(formData.IdDonViDuyet),
      YeuCauMinhChung: !!formData.YeuCauMinhChung,
    };
  };

  const validate = () => {
    const laGoc = !!formData.LaGoc;
    if (!(formData.MaMuc || "").trim()) return "Vui lòng nhập mã mục";
    if ((formData.MaMuc || "").trim().length > 50)
      return "Mã mục tối đa 50 ký tự";
    if (!(formData.TenMuc || "").trim()) return "Vui lòng nhập tên mục";
    if ((formData.TenMuc || "").trim().length > 500)
      return "Tên mục tối đa 500 ký tự";

    if (laGoc) {
      if (!formData.LoaiThanhTich) return "Vui lòng chọn tiêu chí";
      const tran = soHoacNull(formData.TranDiem);
      if (tran != null && tran <= 0) return "Trần điểm phải lớn hơn 0";
    } else {
      if (!formData.IdCha) return "Vui lòng chọn tiêu chí cha";
      const diem = soHoacNull(formData.DiemQuyDoi);
      if (diem == null) return "Vui lòng nhập điểm quy đổi cho mức này";
      if (diem < 0) return "Điểm quy đổi phải là số không âm";
    }

    if ((formData.GhiChu || "").length > 500) return "Ghi chú tối đa 500 ký tự";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    const error = validate();
    if (error) {
      showToast("warn", "Thiếu thông tin", error);
      return;
    }

    setIsSaving(true);
    try {
      const payload = buildPayload();
      if (editId) {
        // PUT không nhận IdCha / LoaiThanhTich, và có thêm TrangThai (null = giữ nguyên)
        const { IdCha, LoaiThanhTich, ...rest } = payload;
        await capNhatMucThanhTich(editId, {
          ...rest,
          TrangThai: !!formData.TrangThai,
        });
      } else {
        await taoMucThanhTich(payload);
      }
      showToast(
        "success",
        "Thành công",
        editId ? "Cập nhật mục thành công" : "Thêm mục thành công",
      );
      closeModal();
      loadDanhMuc();
      taiGocFull();
    } catch (error) {
      console.error("Lỗi khi lưu mục danh mục thành tích:", error);
      showToast("error", "Lỗi", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  /** Ngừng sử dụng qua PUT - lối thoát khi DELETE bị chặn vì còn con hoạt động. */
  const deactivateMuc = async (item) => {
    try {
      await capNhatMucThanhTich(item.IdMuc, {
        MaMuc: item.MaMuc,
        TenMuc: item.TenMuc,
        LaLa: !!item.LaLa,
        DiemQuyDoi: item.DiemQuyDoi ?? null,
        TranDiem: item.TranDiem ?? null,
        ChoPhepSoLuong: item.ChoPhepSoLuong ?? null,
        IdDonViDuyet: item.IdDonViDuyet ?? null,
        YeuCauMinhChung: item.YeuCauMinhChung ?? null,
        GhiChu: item.GhiChu || null,
        ThuTu: item.ThuTu || 0,
        TrangThai: false,
      });
      showToast("success", "Thành công", "Đã chuyển mục sang ngừng sử dụng");
      loadDanhMuc();
      taiGocFull();
    } catch (error) {
      console.error("Lỗi khi ngừng sử dụng mục:", error);
      showToast("error", "Lỗi", error.message);
    }
  };

  const handleDelete = (item) => {
    confirmDeleteDialog({
      header: "Xác nhận ngừng sử dụng",
      message: `Bạn có chắc chắn muốn ngừng sử dụng mục "${item.MaMuc}" không? Các dòng đã kê khai vẫn được giữ nguyên.`,
      accept: async () => {
        try {
          await xoaMucThanhTich(item.IdMuc);
          showToast("success", "Thành công", "Đã ngừng sử dụng mục");
          loadDanhMuc();
          taiGocFull();
        } catch (error) {
          // 409 CO_CON_HOAT_DONG: gợi ý lối thoát thay vì bắt admin tự mò
          if (error.status === 409) {
            confirmDialog({
              header: "Không thể ngừng sử dụng",
              message: `${error.message}. Bạn có muốn chuyển mục này sang trạng thái "Ngừng sử dụng" bằng cách cập nhật trực tiếp không?`,
              icon: "pi pi-exclamation-triangle",
              acceptLabel: "Ngừng sử dụng",
              rejectLabel: "Đóng",
              accept: () => deactivateMuc(item),
            });
          } else {
            console.error("Lỗi khi ngừng sử dụng mục:", error);
            showToast("error", "Lỗi", error.message);
          }
        }
      },
    });
  };

  if (!isAdmin) {
    return (
      <div className="page-container" style={{ padding: "20px" }}>
        <Toast ref={toast} />
        <div
          className="modern-table-card"
          style={{ textAlign: "center", padding: "70px 20px", color: "#666" }}
        >
          <i
            className="fa-solid fa-lock"
            style={{ fontSize: "58px", color: "#cbd5e1", marginBottom: "18px" }}
          ></i>
          <h3 style={{ color: "#475569", margin: "0 0 8px 0" }}>
            Chức năng chỉ dành cho Quản trị hệ thống
          </h3>
          <p style={{ margin: 0, fontSize: "14px" }}>
            Danh mục thành tích vượt trội là cấu hình toàn hệ thống nên chỉ tài
            khoản Admin mới được truy cập.
          </p>
        </div>
      </div>
    );
  }

  // Nhắc việc: mức lá chưa gán đơn vị phụ trách sẽ rơi về trưởng đơn vị quản lý
  // trực tiếp, nên phòng chuyên trách không thấy dòng nào để duyệt.
  const soLaChuaGan = data.filter(
    (m) => m.LaLa && m.IdDonViDuyet == null && m.TrangThai !== false,
  ).length;

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
            Danh mục thành tích vượt trội
          </h2>
          <p style={{ margin: "5px 0 0 0", color: "#64748b", fontSize: "14px" }}>
            Cấu hình 4 tiêu chí Nhóm II, các mức quy đổi điểm và đơn vị phụ trách
            thẩm định
          </p>
        </div>

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
          <i className="fa-solid fa-plus"></i> Thêm mục
        </button>
      </div>

      {soLaChuaGan > 0 && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: "8px",
            padding: "14px 18px",
            marginBottom: "20px",
            color: "#92400e",
            fontSize: "14px",
          }}
        >
          <i
            className="fa-solid fa-triangle-exclamation"
            style={{ marginRight: "8px" }}
          ></i>
          <b>{soLaChuaGan}</b> mức đang hoạt động chưa gán đơn vị phụ trách. Các
          dòng kê khai trỏ vào chúng sẽ rơi về trưởng đơn vị quản lý trực tiếp —
          nếu mức thuộc một phòng chuyên trách (khen thưởng → P.TCHC, sáng kiến →
          P.KHHTQT) thì phòng đó sẽ không thấy dòng nào để duyệt.
        </div>
      )}

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
        <div style={{ minWidth: "240px", flex: "2 1 240px" }}>
          <label style={labelStyle}>Tiêu chí</label>
          <SearchSelect
            value={filterLoai}
            onChange={handleLoaiFilterChange}
            options={LOAI_FILTER_OPTIONS}
            placeholder="-- Tất cả tiêu chí --"
          />
        </div>

        <div style={{ minWidth: "160px", flex: "1 1 160px" }}>
          <label style={labelStyle}>Trạng thái</label>
          <SearchSelect
            value={filterTrangThai}
            onChange={handleTrangThaiFilterChange}
            options={TRANG_THAI_FILTER_OPTIONS}
            placeholder="-- Tất cả --"
          />
        </div>

        <div style={{ minWidth: "220px", flex: "2 1 220px" }}>
          <label style={labelStyle}>Tìm kiếm từ khóa</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              className="form-input"
              placeholder="Mã, tên mục, đơn vị..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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

      <QL_DanhMucThanhTichListing
        data={filteredData}
        onEdit={handleOpenEditModal}
        onDelete={handleDelete}
        isLoading={isLoading}
      />

      <QL_DanhMucThanhTichForm
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        isEditing={!!editId}
        gocList={gocList}
        donViList={donViList}
        isSaving={isSaving}
      />
    </div>
  );
};

export default QL_DanhMucThanhTich;
