import React, { useState, useEffect, useRef, useMemo } from "react";
import { Toast } from "primereact/toast";
import { useAuth } from "../../context/AuthContext";
import "../../css/Pages.css";
import QL_ViPhamNhanVienListing from "../../components/QuanLyKeHoach/QL_ViPhamNhanVien/QL_ViPhamNhanVienListing";
import QL_ViPhamNhanVienForm from "../../components/QuanLyKeHoach/QL_ViPhamNhanVien/QL_ViPhamNhanVienForm";
import { useConfirmDeleteDialog } from "../../hooks/useConfirmDeleteDialog";
import { apiFetch } from "../../utils/api";
import { readApiError } from "../../utils/apiError";
import { fetchAllNhanVien } from "../../utils/nhanVienApi";
import {
  uploadViPhamMinhChung,
  deleteViPhamMinhChung,
  validatePdfFile,
} from "../../utils/viPhamMinhChungApi";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import SearchSelect from "../../components/Common/SearchSelect";
import { useViPhamMinhChungPreview } from "../../hooks/useViPhamMinhChungPreview";
import {
  canRecordViPham,
  canSuaXoaViPham,
  canGhiNhanLoai,
  buildDonViIndex,
  resolveKhoaCuaNhanVien,
  CAP_KHOA_PHONG,
} from "../../utils/viPhamPermissions";
import {
  LOAI_DOI_TUONG_VIEN_CHUC,
  laVienChuc,
  getVienChucBlockReason,
  getLoaiBlockReasonNhanVien,
  validateDiemTru,
  buildDiemTruPayload,
} from "../../utils/viPhamNhanVienPermissions";

/**
 * Ghi nhận vi phạm của VIÊN CHỨC / NGƯỜI LAO ĐỘNG (LoaiDoiTuong = 2).
 *
 * Máy chủ dùng CHUNG bộ endpoint api/viphamgiangday với vi phạm giảng viên, nên
 * màn hình này chỉ khác trang /quan-ly-vi-pham ở ba điểm:
 *   - danh mục nhóm / loại lấy theo loaiDoiTuong=2;
 *   - danh sách trả về gồm cả hai đối tượng nên phải lọc LoaiDoiTuong = 2 ở client;
 *   - mức điểm trừ chịu ràng buộc CheDoDiemTru (tự do / cố định / tối thiểu).
 */

const initialForm = {
  IdNhanVien: "",
  IdNam: "",
  IdNhomVp: "", // chỉ dùng cho cascade trên UI, không gửi lên server
  IdLoaiViPham: "",
  MoTa: "",
  DiemTru: "",
  LyDoDieuChinh: "",
  BiKyLuat: false,
  NgayViPham: "",
  // Minh chứng PDF - chỉ là trạng thái UI, không nằm trong body POST/PUT
  MinhChung: null, // metadata tệp đang có trên máy chủ (khi sửa)
  MinhChungFile: null, // tệp mới người dùng chọn, tải lên sau khi lưu bản ghi
  XoaMinhChung: false, // yêu cầu gỡ tệp hiện tại khi lưu
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  color: "#475569",
  marginBottom: "6px",
};

const GhiNhanViPhamNhanVien = () => {
  const toast = useRef(null);
  const { user } = useAuth();
  // useMemo để object rỗng không bị tạo mới mỗi render, tránh làm loaiOptions tính lại liên tục
  const currentUser = useMemo(() => user || {}, [user]);
  const canManage = canRecordViPham(currentUser);

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [namList, setNamList] = useState([]);
  const [nhanVienList, setNhanVienList] = useState([]);
  const [donViList, setDonViList] = useState([]);
  const [nhomList, setNhomList] = useState([]);
  const [loaiList, setLoaiList] = useState([]);

  // Bộ lọc gọi server
  const [selectedNam, setSelectedNam] = useState("");
  const [selectedDonViFilter, setSelectedDonViFilter] = useState("");
  const [selectedNhanVienFilter, setSelectedNhanVienFilter] = useState("");
  // Bộ lọc client-side
  const [filterNhom, setFilterNhom] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState(initialForm);
  const [editId, setEditId] = useState(null);

  // Xem trước minh chứng PDF (tự quản lý object URL và hủy lượt tải đã thay thế)
  const { preview, openPreview, closePreview, downloadMinhChung } =
    useViPhamMinhChungPreview((message) => showToast("error", "Lỗi", message));

  const { confirmDeleteDialog } = useConfirmDeleteDialog();

  const donViIndex = useMemo(() => buildDonViIndex(donViList), [donViList]);

  /**
   * Đơn vị chủ quản của viên chức là Khoa HOẶC Phòng cấp 2 - khác giảng viên
   * (chỉ Khoa), nên bộ lọc liệt kê mọi đơn vị cấp 2.
   */
  const donViChuQuanList = useMemo(
    () => donViList.filter((dv) => dv?.CapDonVi === CAP_KHOA_PHONG),
    [donViList],
  );

  /** Chỉ ngạch viên chức / NLĐ mới ghi nhận được ở màn hình này. */
  const vienChucList = useMemo(
    () => nhanVienList.filter(laVienChuc),
    [nhanVienList],
  );

  const selectedNhanVien = useMemo(
    () =>
      nhanVienList.find(
        (nv) => String(nv.IdNhanVien) === String(formData.IdNhanVien),
      ) || null,
    [nhanVienList, formData.IdNhanVien],
  );

  const nhanVienDonVi = useMemo(
    () =>
      selectedNhanVien
        ? resolveKhoaCuaNhanVien(selectedNhanVien.IdDonVi, donViIndex)
        : null,
    [selectedNhanVien, donViIndex],
  );

  /**
   * Bản ghi cũ có thể trỏ tới người đã đổi chức danh - vẫn giữ lại trong danh
   * sách khi đang sửa, nếu không select sẽ mất value và ghi đè mất dữ liệu.
   */
  const nhanVienChoForm = useMemo(() => {
    if (
      selectedNhanVien &&
      !vienChucList.some(
        (nv) => String(nv.IdNhanVien) === String(selectedNhanVien.IdNhanVien),
      )
    ) {
      return [selectedNhanVien, ...vienChucList];
    }
    return vienChucList;
  }, [vienChucList, selectedNhanVien]);

  /** Lý do đối tượng đang chọn không hợp lệ (null = hợp lệ). */
  const nhanVienBlockReason = useMemo(
    () => getVienChucBlockReason(selectedNhanVien),
    [selectedNhanVien],
  );

  /** Loại vi phạm kèm cờ quyền ghi nhận, tính client-side. */
  const loaiOptions = useMemo(
    () =>
      loaiList.map((l) => ({
        ...l,
        _allowed: canGhiNhanLoai(l, currentUser, selectedNhanVien, donViIndex),
        _reason: getLoaiBlockReasonNhanVien(
          l,
          currentUser,
          selectedNhanVien,
          donViIndex,
        ),
      })),
    [loaiList, currentUser, selectedNhanVien, donViIndex],
  );

  const selectedLoai = useMemo(
    () =>
      loaiOptions.find(
        (l) => String(l.IdLoaiViPham) === String(formData.IdLoaiViPham),
      ) || null,
    [loaiOptions, formData.IdLoaiViPham],
  );

  /** Nhóm của loại đang chọn - dùng để bày trần điểm trừ 70/30 trong form. */
  const selectedNhom = useMemo(
    () =>
      nhomList.find(
        (n) => String(n.IdNhomVp) === String(selectedLoai?.IdNhomVp ?? ""),
      ) || null,
    [nhomList, selectedLoai],
  );

  useEffect(() => {
    initData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (severity, summary, detail) => {
    if (toast.current)
      toast.current.show({ severity, summary, detail, life: 3000 });
  };

  const initData = async () => {
    setIsLoading(true);
    try {
      // Nạp nhân viên song song với các lookup khác (endpoint này phân trang nên tốn nhiều vòng)
      const nhanVienPromise = fetchAllNhanVien({ trangThai: true });

      const [namRes, nhomRes, loaiRes, donViRes] = await Promise.all([
        apiFetch("namdanhgia"),
        apiFetch(`nhom-vi-pham?loaiDoiTuong=${LOAI_DOI_TUONG_VIEN_CHUC}`),
        apiFetch(
          `loai-vi-pham?trangThai=true&loaiDoiTuong=${LOAI_DOI_TUONG_VIEN_CHUC}`,
        ),
        apiFetch("donvi"),
      ]);

      let years = [];
      if (namRes.ok) {
        const result = await namRes.json();
        const list = result.Items || (Array.isArray(result) ? result : []);
        years = [...list].sort((a, b) => b.IdNam - a.IdNam);
        setNamList(years);
      }

      if (nhomRes.ok) {
        const result = await nhomRes.json();
        // Endpoint này trả list dưới key "Nhom", không phải "Items"
        const list =
          result.Nhom || result.Items || (Array.isArray(result) ? result : []);
        setNhomList(
          [...list].sort(
            (a, b) => (a.ThuTuHienThi || 0) - (b.ThuTuHienThi || 0),
          ),
        );
      }

      if (loaiRes.ok) {
        const result = await loaiRes.json();
        setLoaiList(result.Items || (Array.isArray(result) ? result : []));
      }

      if (donViRes.ok) {
        const result = await donViRes.json();
        setDonViList(result.Items || (Array.isArray(result) ? result : []));
      }

      const employees = await nhanVienPromise;
      setNhanVienList(employees);

      const currentYear = new Date().getFullYear();
      const matched = years.find((y) => y.IdNam === currentYear);
      const defaultYear = matched
        ? String(matched.IdNam)
        : years.length > 0
          ? String(years[0].IdNam)
          : String(currentYear);
      setSelectedNam(defaultYear);

      await loadViPhamData(defaultYear, "");
    } catch (error) {
      console.error("Lỗi khởi tạo dữ liệu vi phạm nhân viên:", error);
      showToast("error", "Lỗi", "Không thể khởi tạo dữ liệu");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Chỉ gửi idNam + idNhanVien lên server.
   *
   * KHÔNG gửi idDonVi: tham số này so khớp CHÍNH XÁC đơn vị chủ quản của người
   * bị ghi nhận, nên lọc theo id của Khoa sẽ rụng hết người nằm ở đơn vị con.
   * Lọc theo đơn vị được làm ở client bằng cách roll-up đơn vị của từng dòng.
   * Phạm vi dữ liệu vẫn do token quyết định: TK/TKL/TP nhận đơn vị mình + đơn vị
   * con, HT/ADMIN nhận toàn trường.
   */
  const loadViPhamData = async (idNam, idNhanVien) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (idNam) params.set("idNam", idNam);
      if (idNhanVien) params.set("idNhanVien", idNhanVien);
      const qs = params.toString();

      // Lưu ý: route này KHÔNG có dấu gạch ngang (khác api/vi-pham/...)
      const response = await apiFetch(`viphamgiangday${qs ? `?${qs}` : ""}`);
      if (response.ok) {
        const result = await response.json();
        const list = result.Items || (Array.isArray(result) ? result : []);
        // Endpoint dùng chung cho cả hai đối tượng; dòng LoaiDoiTuong = null là
        // dữ liệu cũ của giảng viên (tạo trước khi có danh mục) nên cũng bị loại.
        const cuaVienChuc = list.filter(
          (item) => Number(item.LoaiDoiTuong) === LOAI_DOI_TUONG_VIEN_CHUC,
        );
        setData(cuaVienChuc);
        applyFilters(
          cuaVienChuc,
          searchQuery,
          filterNhom,
          selectedDonViFilter,
        );
      } else {
        const err = await readApiError(
          response,
          "Không tải được danh sách vi phạm",
        );
        showToast("error", "Lỗi", err.message);
        setData([]);
        setFilteredData([]);
      }
    } catch (error) {
      console.error("Lỗi tải danh sách vi phạm nhân viên:", error);
      showToast("error", "Lỗi", "Lỗi kết nối máy chủ");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (
    rawList = data,
    search = searchQuery,
    nhomFilter = filterNhom,
    donViFilter = selectedDonViFilter,
  ) => {
    let result = [...rawList];

    // Roll-up đơn vị con → Khoa/Phòng: dòng vi phạm mang đơn vị chính của người
    // bị ghi nhận, có thể là đơn vị cấp 3 nên không so trực tiếp với id cấp 2.
    if (donViFilter) {
      result = result.filter((item) => {
        const chuQuan = resolveKhoaCuaNhanVien(item.IdDonVi, donViIndex);
        return chuQuan && String(chuQuan.IdDonVi) === String(donViFilter);
      });
    }

    if (nhomFilter) {
      result = result.filter(
        (item) => String(item.IdNhomVp) === String(nhomFilter),
      );
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter((item) =>
        [
          item.MaNhanVien,
          item.HoTenNhanVien,
          item.MoTa,
          item.NoiDung,
          item.MaLoaiViPham,
          item.MinhChung?.TenFileGoc,
          item.TenDonVi,
        ]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(query)),
      );
    }

    setFilteredData(result);
  };

  const handleNamChange = (val) => {
    setSelectedNam(val);
    loadViPhamData(val, selectedNhanVienFilter);
  };

  const handleDonViFilterChange = (val) => {
    setSelectedDonViFilter(val);
    applyFilters(data, searchQuery, filterNhom, val);
  };

  const handleNhanVienFilterChange = (val) => {
    setSelectedNhanVienFilter(val);
    loadViPhamData(selectedNam, val);
  };

  const handleNhomFilterChange = (val) => {
    setFilterNhom(val);
    applyFilters(data, searchQuery, val);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    applyFilters(data, val, filterNhom);
  };

  const handleOpenCreateModal = () => {
    setEditId(null);
    setFormData({ ...initialForm, IdNam: selectedNam || "" });
    setIsModalOpen(true);
  };

  /** Sửa/xóa chỉ dành cho đơn vị đã ghi nhận hoặc ADMIN - khớp PUT/DELETE của server. */
  const canSuaXoa = (item) => canSuaXoaViPham(item, currentUser);

  const handleEdit = (item) => {
    if (!canSuaXoa(item)) {
      showToast(
        "warn",
        "Không có quyền",
        `Ghi nhận này do ${item.TenDonViGhiNhan || "đơn vị khác"} lập - chỉ đơn vị đó hoặc Admin được sửa.`,
      );
      return;
    }
    const loai = loaiList.find((l) => l.IdLoaiViPham === item.IdLoaiViPham);
    setEditId(item.IdViPham);
    setFormData({
      IdNhanVien: item.IdNhanVien ?? "",
      IdNam: item.IdNam ?? "",
      IdNhomVp: loai?.IdNhomVp ?? item.IdNhomVp ?? "",
      IdLoaiViPham: item.IdLoaiViPham ?? "",
      MoTa: item.MoTa || "",
      DiemTru: item.DiemTru != null ? String(item.DiemTru) : "",
      LyDoDieuChinh: item.LyDoDieuChinh || "",
      BiKyLuat: !!item.BiKyLuat,
      NgayViPham: formatDateForInput(item.NgayViPham),
      MinhChung: item.MinhChung || null,
      MinhChungFile: null,
      XoaMinhChung: false,
    });
    setIsModalOpen(true);
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return "";
    let date;
    if (typeof dateString === "string" && dateString.includes("/Date(")) {
      const timestamp = parseInt(dateString.match(/\d+/)[0], 10);
      date = new Date(timestamp);
    } else {
      date = new Date(dateString);
    }
    if (isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialForm);
    setEditId(null);
  };

  const validate = () => {
    if (!formData.IdNam) return "Vui lòng chọn năm đánh giá";
    if (!formData.IdNhanVien) return "Vui lòng chọn nhân viên";
    if (nhanVienBlockReason) return nhanVienBlockReason;
    if (!formData.IdLoaiViPham) return "Vui lòng chọn loại vi phạm";
    if (selectedLoai && selectedLoai._allowed === false) {
      return (
        selectedLoai._reason ||
        "Bạn không được phân quyền ghi nhận loại vi phạm này"
      );
    }
    if ((formData.MoTa || "").length > 500) return "Mô tả tối đa 500 ký tự";

    // Ràng buộc mức trừ theo CheDoDiemTru của danh mục (chặn trước 400 của server)
    const loiDiem = validateDiemTru(selectedLoai, formData);
    if (loiDiem) return loiDiem;

    if (formData.MinhChungFile) {
      const loiFile = validatePdfFile(formData.MinhChungFile);
      if (loiFile) return loiFile;
    }
    // Loại vi phạm có "Hồ sơ kèm theo" thì buộc phải có tệp PDF minh chứng
    const coMinhChung =
      !!formData.MinhChungFile ||
      (!!formData.MinhChung && !formData.XoaMinhChung);
    if (selectedLoai?.HoSoKemTheo && !coMinhChung) {
      return `Loại vi phạm này yêu cầu hồ sơ kèm theo (${selectedLoai.HoSoKemTheo}) - vui lòng tải lên tệp PDF biên bản/hồ sơ`;
    }
    return null;
  };

  /**
   * Đồng bộ minh chứng sau khi bản ghi vi phạm đã tồn tại (endpoint minh-chung cần IdViPham).
   * @returns {Promise<string|null>} cảnh báo nếu bản ghi lưu xong nhưng tệp thất bại
   */
  const syncMinhChung = async (idViPham) => {
    try {
      if (formData.MinhChungFile) {
        // POST ghi đè tệp cũ nên không cần DELETE trước
        await uploadViPhamMinhChung(idViPham, formData.MinhChungFile);
      } else if (formData.XoaMinhChung && formData.MinhChung) {
        await deleteViPhamMinhChung(idViPham);
      }
      return null;
    } catch (error) {
      console.error("Lỗi đồng bộ minh chứng vi phạm:", error);
      return error.message || "Không xử lý được tệp minh chứng";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) {
      showToast(
        "error",
        "Không có quyền",
        "Chỉ trưởng đơn vị (TK/TKL/TP) hoặc Admin mới được ghi nhận vi phạm",
      );
      return;
    }

    const error = validate();
    if (error) {
      showToast("warn", "Thiếu thông tin", error);
      return;
    }

    // Người/đơn vị ghi nhận LUÔN lấy từ token - tuyệt đối không gửi IdNguoiGhiNhan/IdDonViGhiNhan
    const payload = {
      IdNhanVien: parseInt(formData.IdNhanVien, 10),
      IdNam: parseInt(formData.IdNam, 10),
      IdLoaiViPham: parseInt(formData.IdLoaiViPham, 10),
      MoTa: (formData.MoTa || "").trim() || null,
      // DiemTru / LyDoDieuChinh phụ thuộc CheDoDiemTru của danh mục
      ...buildDiemTruPayload(selectedLoai, formData),
      BiKyLuat: !!formData.BiKyLuat,
      NgayViPham: formData.NgayViPham || null, // đã là 'YYYY-MM-DD', không đổi sang ISO để tránh lệch múi giờ
    };

    setIsSaving(true);
    try {
      const response = await apiFetch(
        editId ? `viphamgiangday/${editId}` : "viphamgiangday",
        {
          method: editId ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );

      if (response.ok || response.status === 201) {
        const result = await response.json().catch(() => null);
        // POST trả về bản ghi vừa tạo - cần IdViPham để tải tệp minh chứng lên
        const idViPham = editId || result?.Item?.IdViPham || null;

        let canhBaoFile = null;
        if (idViPham) {
          canhBaoFile = await syncMinhChung(idViPham);
        } else if (formData.MinhChungFile) {
          canhBaoFile =
            "Máy chủ không trả về mã vi phạm nên chưa tải tệp lên được";
        }

        if (canhBaoFile) {
          showToast(
            "warn",
            editId
              ? "Đã lưu, nhưng tệp thất bại"
              : "Đã ghi nhận, nhưng tệp thất bại",
            `${canhBaoFile}. Vui lòng mở lại ghi nhận này để tải tệp minh chứng.`,
          );
        } else {
          showToast(
            "success",
            "Thành công",
            editId
              ? "Cập nhật vi phạm thành công"
              : "Ghi nhận vi phạm thành công",
          );
        }
        closeModal();
        loadViPhamData(selectedNam, selectedNhanVienFilter);
      } else {
        const err = await readApiError(response, "Lưu thất bại");
        showToast("error", "Lỗi", err.message);
        // Giữ modal mở để người dùng sửa lại
      }
    } catch (error) {
      console.error("Lỗi khi lưu vi phạm nhân viên:", error);
      showToast("error", "Lỗi", "Lỗi kết nối máy chủ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (item) => {
    if (!canSuaXoa(item)) {
      showToast(
        "warn",
        "Không có quyền",
        `Ghi nhận này do ${item.TenDonViGhiNhan || "đơn vị khác"} lập - chỉ đơn vị đó hoặc Admin được xóa.`,
      );
      return;
    }
    const id = item.IdViPham;
    confirmDeleteDialog({
      header: "Xác nhận xóa",
      message: "Bạn có chắc chắn muốn xóa ghi nhận vi phạm này không?",
      accept: async () => {
        try {
          const response = await apiFetch(`viphamgiangday/${id}`, {
            method: "DELETE",
          });
          if (response.ok) {
            showToast("success", "Thành công", "Đã xóa ghi nhận vi phạm");
            loadViPhamData(selectedNam, selectedNhanVienFilter);
          } else {
            const err = await readApiError(response, "Xóa thất bại");
            showToast("error", "Lỗi", err.message);
          }
        } catch (error) {
          console.error("Lỗi khi xóa vi phạm nhân viên:", error);
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
            Ghi nhận vi phạm nhân viên
          </h2>
          <p
            style={{ margin: "5px 0 0 0", color: "#64748b", fontSize: "14px" }}
          >
            Ghi nhận các việc chưa tuân thủ của viên chức / người lao động thuộc
            các Phòng/Ban để tính điểm trừ KPI
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
            <i className="fa-solid fa-plus"></i> Thêm ghi nhận
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
        <div style={{ minWidth: "150px", flex: "1 1 150px" }}>
          <label style={labelStyle}>Năm đánh giá</label>
          <SearchSelect
            value={selectedNam}
            onChange={handleNamChange}
            options={namList.map((n) => ({
              value: n.IdNam,
              label: `Năm học ${n.IdNam}`,
            }))}
          />
        </div>

        <div style={{ minWidth: "180px", flex: "2 1 180px" }}>
          <label style={labelStyle}>Đơn vị chủ quản</label>
          <SearchSelect
            value={selectedDonViFilter}
            onChange={handleDonViFilterChange}
            options={[
              { value: "", label: "-- Tất cả đơn vị --" },
              ...donViChuQuanList.map((dv) => ({
                value: dv.IdDonVi,
                label: `${dv.MaDonVi} - ${dv.TenDonVi}`,
              })),
            ]}
            placeholder="-- Tất cả đơn vị --"
            searchable
            searchPlaceholder="Tìm theo mã hoặc tên..."
          />
        </div>

        <div style={{ minWidth: "200px", flex: "2 1 200px" }}>
          <label style={labelStyle}>Nhân viên</label>
          <SearchSelect
            value={selectedNhanVienFilter}
            onChange={handleNhanVienFilterChange}
            options={[
              { value: "", label: "-- Tất cả nhân viên --" },
              ...vienChucList.map((nv) => ({
                value: nv.IdNhanVien,
                label: `${nv.MaNhanVien ? nv.MaNhanVien + " - " : ""}${nv.HoTen}`,
              })),
            ]}
            placeholder="-- Tất cả nhân viên --"
            searchable
            searchPlaceholder="Tìm theo mã hoặc tên..."
          />
        </div>

        <div style={{ minWidth: "200px", flex: "2 1 200px" }}>
          <label style={labelStyle}>Nhóm vi phạm</label>
          <SearchSelect
            value={filterNhom}
            onChange={handleNhomFilterChange}
            options={[
              { value: "", label: "-- Tất cả nhóm --" },
              ...nhomList.map((n) => ({
                value: n.IdNhomVp,
                label: n.TenNhom,
              })),
            ]}
            placeholder="-- Tất cả nhóm --"
          />
        </div>

        <div style={{ minWidth: "200px", flex: "2 1 200px" }}>
          <label style={labelStyle}>Tìm kiếm từ khóa</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              className="form-input"
              placeholder="Mã / Tên nhân viên"
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

      <QL_ViPhamNhanVienListing
        data={filteredData}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={isLoading}
        canManage={canManage}
        canSuaXoa={canSuaXoa}
        selectedNam={selectedNam}
        onPreviewMinhChung={openPreview}
      />

      <FilePreviewModal
        isOpen={preview.isOpen}
        fileName={preview.item?.MinhChung?.TenFileGoc}
        url={preview.url}
        isLoading={preview.isLoading}
        error={preview.error}
        onClose={closePreview}
        onDownload={() => downloadMinhChung(preview.item)}
      />

      <QL_ViPhamNhanVienForm
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        isEditing={!!editId}
        isSaving={isSaving}
        namList={namList}
        nhanVienList={nhanVienChoForm}
        nhomList={nhomList}
        loaiOptions={loaiOptions}
        selectedLoai={selectedLoai}
        selectedNhom={selectedNhom}
        nhanVienDonVi={nhanVienDonVi}
        nhanVienBlockReason={nhanVienBlockReason}
        currentUser={currentUser}
        onDownloadMinhChung={() =>
          downloadMinhChung({ IdViPham: editId, MinhChung: formData.MinhChung })
        }
        onFileError={(msg) => showToast("warn", "Tệp không hợp lệ", msg)}
      />
    </div>
  );
};

export default GhiNhanViPhamNhanVien;
