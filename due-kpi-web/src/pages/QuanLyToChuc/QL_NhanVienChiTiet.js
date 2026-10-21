import { hienThiGiamTru } from '../../utils/chucVuGiamTruApi';
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../css/Pages.css";
import { apiFetch } from "../../utils/api";
import { fetchAllNhanVien } from "../../utils/nhanVienApi";
import SearchSelect from "../../components/Common/SearchSelect";
import { hasRole, ROLE_SETS } from "../../utils/roles";
import { useQuyenChucVu } from "../../context/NhanVienChucVuContext";
import { laChucVuAdmin, thongBaoLoiChucVu } from "../../utils/nhanVienChucVuApi";

const QL_NhanVienChiTiet = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUser = user || {};
  const canManage = hasRole(ROLE_SETS.QUAN_LY_NGUOI_DUNG, currentUser);

  const isEditing = !!id;

  // Khối "Đơn vị & Chức vụ" KHÔNG dùng canManage: từ đợt 2026-10-20 quyền kê
  // khai chức vụ do server trả (GET api/nhan-vien-chuc-vu/quyen) vì nó cộng cả
  // chức vụ kiêm nhiệm và ủy quyền của P_TCHC - không đọc ra từ token.
  const { quyen: quyenChucVu, loading: dangTaiQuyenChucVu } = useQuyenChucVu();
  const duocNhapChucVu = quyenChucVu?.DuocNhap === true;
  const laAdminChucVu = quyenChucVu?.LaAdmin === true;
  // Ủy quyền còn nhưng người này đã rời P_TCHC -> quyền tự mất, không cần thu hồi.
  const uyQuyenHetHieuLuc = quyenChucVu?.DuocUyQuyen === true && !duocNhapChucVu;
  // Người không phải ADMIN không được thêm / sửa / xóa dòng chức vụ của CHÍNH MÌNH
  // (403 TU_SUA), áp cả HT / PHT.
  const laChinhMinh = isEditing && Number(id) === Number(currentUser.IdNhanVien);
  const duocSuaChucVu = duocNhapChucVu && (laAdminChucVu || !laChinhMinh);

  // Tabs state: 'account' | 'title' | 'position'
  const [activeTab, setActiveTab] = useState("account");

  const initialForm = {
    MaNhanVien: "",
    MatKhau: "",
    HoTen: "",
    Email: "",
    IdChucDanh: "",
    TrangThai: true,
  };

  const [formData, setFormData] = useState(initialForm);
  const [originalFormData, setOriginalFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const isSavingRef = useRef(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Dropdowns data
  const [donViList, setDonViList] = useState([]);
  const [chucVuList, setChucVuList] = useState([]);
  const [chucDanhList, setChucDanhList] = useState([]);
  const [quanLyList, setQuanLyList] = useState([]);
  // Bảng "Đơn vị & Chức vụ" theo canvas thiết kế (Claude Design, 2026-10-20).
  // 43px = --select-height của SearchSelect: trong panel sửa có cả dropdown lẫn
  // input, lệch chiều cao là nhìn thấy ngay.
  const oNhapTrongBang = {
    height: "43px",
    padding: "0 10px",
    fontSize: "14px",
    margin: 0,
    width: "100%",
    boxSizing: "border-box",
  };
  const oNhanTruong = {
    display: "block",
    marginBottom: "5px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#475569",
  };
  // Tiêu đề cột cố ý NHẸ hơn dữ liệu - bản cũ để 13px/700 màu đen nên header
  // nặng hơn chính nội dung nó gán nhãn.
  const oTieuDeCot = {
    padding: "9px 14px",
    background: "#fafbfc",
    borderBottom: "1px solid #eef1f6",
    fontSize: "11px",
    fontWeight: "600",
    color: "#5b6675",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    textAlign: "left",
  };
  const oODuLieu = { padding: "14px", verticalAlign: "top" };
  const oNutIcon = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "34px",
    height: "34px",
    border: "1px solid #cbd5e1",
    borderRadius: "7px",
    background: "#fff",
    cursor: "pointer",
  };
  const oNutPhu = {
    height: "38px",
    padding: "0 16px",
    border: "1px solid #ccd3dd",
    borderRadius: "7px",
    background: "#fff",
    color: "#334155",
    fontFamily: "inherit",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  };
  const oNutChinh = {
    ...oNutPhu,
    padding: "0 18px",
    border: "1px solid #0056b3",
    background: "#0056b3",
    color: "#fff",
  };
  // Chỉ ADMIN được gán chức vụ ADMIN (403 CHUC_VU_ADMIN) - ẩn hẳn khỏi dropdown.
  const chucVuChonDuoc = laAdminChucVu
    ? chucVuList
    : chucVuList.filter((cv) => !laChucVuAdmin(cv));
  // Vì sao khối này chỉ xem - nói rõ thay vì để người dùng đi tìm nút đã bị ẩn.
  const lyDoKhongKeKhai = uyQuyenHetHieuLuc
    ? "Bạn đã rời Phòng Tổ chức – Hành chính, ủy quyền kê khai chức vụ không còn hiệu lực."
    : !duocNhapChucVu
      ? "Bạn không có quyền kê khai chức vụ - liên hệ Phòng Tổ chức – Hành chính."
      : !duocSuaChucVu
        ? "Không tự kê khai chức vụ cho chính mình - nhờ người khác có quyền."
        : "";

  // Block A: Title History
  const [chucDanhHistory, setChucDanhHistory] = useState([]);
  const [isLoadingChucDanh, setIsLoadingChucDanh] = useState(false);
  const [isChangingTitle, setIsChangingTitle] = useState(false);

  // Form inputs for Changing Title
  const [newTitleId, setNewTitleId] = useState("");
  const [newTitleFromDate, setNewTitleFromDate] = useState("");
  const [newTitleToDate, setNewTitleToDate] = useState("");
  const [newTitleNote, setNewTitleNote] = useState("");
  const [isCurrentTitle, setIsCurrentTitle] = useState(true);

  // Inline edit states for title history row
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [editTitleToDate, setEditTitleToDate] = useState("");
  const [editTitleNote, setEditTitleNote] = useState("");

  // Block B: Concurrent Positions & Units (Đơn vị & Chức vụ)
  const [chucVuConcurrent, setChucVuConcurrent] = useState([]);
  const [isLoadingChucVu, setIsLoadingChucVu] = useState(false);
  const [isAddingChucVu, setIsAddingChucVu] = useState(false);

  // Form inputs for Adding Unit & Position
  const [newDonViId, setNewDonViId] = useState("");
  const [newChucVuId, setNewChucVuId] = useState("");
  const [newLaChinh, setNewLaChinh] = useState(false);
  const [newChucVuFromDate, setNewChucVuFromDate] = useState("");
  const [newChucVuToDate, setNewChucVuToDate] = useState("");
  const [newChucVuNote, setNewChucVuNote] = useState("");
  const [isCurrentChucVu, setIsCurrentChucVu] = useState(true);

  // Inline edit states for concurrent position / unit row
  const [editingChucVuId, setEditingChucVuId] = useState(null);
  const [editDonViId, setEditDonViId] = useState("");
  const [editChucVuId, setEditChucVuId] = useState("");
  const [editLaChinh, setEditLaChinh] = useState(false);
  const [editChucVuFromDate, setEditChucVuFromDate] = useState("");
  const [editChucVuToDate, setEditChucVuToDate] = useState("");
  const [editChucVuNote, setEditChucVuNote] = useState("");

  // Helper to check if basic form fields differ from original/initial state
  const isFormDirty =
    JSON.stringify(formData) !==
    JSON.stringify(isEditing ? originalFormData : initialForm);

  // Check if there are unsaved drafts in title change panel
  const isTitleDraftDirty =
    isChangingTitle &&
    (newTitleId !== "" || newTitleFromDate !== "" || newTitleNote !== "");

  // Check if there are unsaved drafts in position adding panel
  const isChucVuDraftDirty =
    isAddingChucVu &&
    (newDonViId !== "" ||
      newChucVuId !== "" ||
      newChucVuFromDate !== "" ||
      newChucVuNote !== "");

  // Check if there are active inline edits
  const isInlineEditDirty = editingTitleId !== null || editingChucVuId !== null;

  // In Create Mode, any items in title/position history arrays count as unsaved changes
  const isCreateHistoryDirty =
    !isEditing && (chucDanhHistory.length > 0 || chucVuConcurrent.length > 0);

  const isDirty =
    isFormDirty ||
    isTitleDraftDirty ||
    isChucVuDraftDirty ||
    isInlineEditDirty ||
    isCreateHistoryDirty;

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !isSavingRef.current) {
        e.preventDefault();
        e.returnValue =
          "Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn rời khỏi trang?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  const handleBack = () => {
    if (isDirty) {
      const confirmLeave = window.confirm(
        "Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn rời khỏi trang?",
      );
      if (!confirmLeave) return;
    }
    navigate("/quan-ly-nguoi-dung");
  };

  const handleCancelChanges = () => {
    if (
      window.confirm(
        "Bạn có chắc chắn muốn hủy bỏ tất cả thay đổi chưa lưu trên form?",
      )
    ) {
      setFormData(originalFormData);
      setErrors({});
    }
  };

  useEffect(() => {
    fetchDropdownData();
    fetchNhanVienList();
    if (isEditing) {
      fetchChucDanhHistory();
      fetchChucVuConcurrent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchDropdownData = async () => {
    try {
      const [dvRes, cvRes, cdRes] = await Promise.all([
        apiFetch("donvi"),
        apiFetch("chucvu"),
        apiFetch("chuc-danh-nghe-nghiep"),
      ]);

      if (dvRes.ok) {
        const res = await dvRes.json();
        setDonViList(res.Items || (Array.isArray(res) ? res : []));
      }
      if (cvRes.ok) {
        const res = await cvRes.json();
        setChucVuList(res.Items || (Array.isArray(res) ? res : []));
      }
      if (cdRes.ok) {
        const res = await cdRes.json();
        const list = res.Items || (Array.isArray(res) ? res : []);
        const processedList = list
          .filter((item) => item.TrangThai === true)
          .sort((a, b) => {
            const idA = a.id_chuc_danh || a.IdChucDanh || 0;
            const idB = b.id_chuc_danh || b.IdChucDanh || 0;
            return idA - idB;
          });
        setChucDanhList(processedList);
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu dropdown:", error);
    }
  };

  const fetchNhanVienList = async () => {
    if (isEditing) setIsLoading(true);
    try {
      const list = await fetchAllNhanVien({ trangThai: null });
      setQuanLyList(list);
      if (!isEditing) return;

      const found = list.find((item) => item.IdNhanVien === parseInt(id));
      if (found) {
        const detail = {
          ...found,
          IdChucDanh: found.IdChucDanh || "",
          MatKhau: "", // empty by default when editing
        };
        setFormData(detail);
        setOriginalFormData(detail);
      } else {
        alert("Không tìm thấy nhân viên này!");
        navigate("/quan-ly-nguoi-dung");
      }
    } catch (error) {
      console.error("Lỗi tải chi tiết nhân viên:", error);
    } finally {
      if (isEditing) setIsLoading(false);
    }
  };

  const fetchChucDanhHistory = async () => {
    if (!id) return;
    setIsLoadingChucDanh(true);
    try {
      const res = await apiFetch(`nhan-vien-chuc-danh/by-nhan-vien/${id}`);
      if (res.ok) {
        const data = await res.json();
        setChucDanhHistory(data.Items || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải lịch sử chức danh:", err);
    } finally {
      setIsLoadingChucDanh(false);
    }
  };

  const fetchChucVuConcurrent = async () => {
    if (!id) return;
    setIsLoadingChucVu(true);
    try {
      const res = await apiFetch(`nhan-vien-chuc-vu/by-nhan-vien/${id}`);
      if (res.ok) {
        const data = await res.json();
        setChucVuConcurrent(data.Items || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải đơn vị & chức vụ:", err);
    } finally {
      setIsLoadingChucVu(false);
    }
  };

  const subtractOneDay = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString("sv");
  };

  // API trả kiểu DATE, nhưng input[type="date"] chỉ nhận yyyy-MM-dd: cắt phần
  // giờ nếu có để ô ngày không rỗng khi mở panel sửa.
  const chiNgay = (value) => (value ? String(value).slice(0, 10) : "");

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const validateDates = (fromDate, toDate) => {
    if (!fromDate) {
      alert("Ngày bắt đầu là bắt buộc.");
      return false;
    }
    if (toDate && toDate < fromDate) {
      alert("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.");
      return false;
    }
    return true;
  };

  const validateNote = (note) => {
    if (note && note.length > 500) {
      alert("Ghi chú tối đa 500 ký tự.");
      return false;
    }
    return true;
  };

  // Actions for Block A (Chức danh)
  const resetChangeTitleForm = () => {
    setNewTitleId("");
    setNewTitleFromDate("");
    setNewTitleToDate("");
    setNewTitleNote("");
    setIsCurrentTitle(true);
    setIsChangingTitle(false);
  };

  const handleSubmitChangeTitle = async () => {
    if (!newTitleId) {
      alert("Vui lòng chọn chức danh mới.");
      return;
    }
    if (!validateDates(newTitleFromDate, newTitleToDate)) return;
    if (!validateNote(newTitleNote)) return;

    if (isEditing) {
      try {
        const res = await apiFetch("nhan-vien-chuc-danh", {
          method: "POST",
          body: JSON.stringify({
            IdNhanVien: parseInt(id),
            IdChucDanh: parseInt(newTitleId),
            TuNgay: newTitleFromDate,
            DenNgay: newTitleToDate || null,
            GhiChu: newTitleNote || null,
          }),
        });
        const resData = await res.json();
        if (res.ok && resData.Success) {
          resetChangeTitleForm();
          fetchChucDanhHistory();
        } else {
          alert(resData.Message || "Đổi chức danh thất bại!");
        }
      } catch (err) {
        alert("Có lỗi xảy ra: " + err.message);
      }
    } else {
      const selectedCD = chucDanhList.find(
        (cd) =>
          (cd.id_chuc_danh || cd.IdChucDanh || 0) === parseInt(newTitleId),
      );
      const titleName = selectedCD
        ? selectedCD.ten_chuc_danh || selectedCD.TenChucDanh
        : "";
      const titleCode = selectedCD
        ? selectedCD.ma_chuc_danh || selectedCD.MaChucDanh
        : "";
      const newItem = {
        IdNvChucDanh: Date.now(),
        IdChucDanh: parseInt(newTitleId),
        TenChucDanh: titleName,
        MaChucDanh: titleCode,
        TuNgay: newTitleFromDate,
        DenNgay: newTitleToDate || null,
        GhiChu: newTitleNote || null,
      };
      const newHistory = chucDanhHistory.map((item) => {
        if (!item.DenNgay) {
          return { ...item, DenNgay: subtractOneDay(newTitleFromDate) };
        }
        return item;
      });
      newHistory.unshift(newItem);
      setChucDanhHistory(newHistory);
      resetChangeTitleForm();
    }
  };

  const startEditTitle = (item) => {
    setEditingTitleId(item.IdNvChucDanh);
    setEditTitleToDate(item.DenNgay || "");
    setEditTitleNote(item.GhiChu || "");
  };

  const handleSubmitEditTitle = async (item) => {
    if (editTitleToDate && editTitleToDate < item.TuNgay) {
      alert(
        "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu (" +
        item.TuNgay +
        ").",
      );
      return;
    }
    if (!validateNote(editTitleNote)) return;

    if (isEditing) {
      try {
        const res = await apiFetch(`nhan-vien-chuc-danh/${item.IdNvChucDanh}`, {
          method: "PUT",
          body: JSON.stringify({
            DenNgay: editTitleToDate || null,
            GhiChu: editTitleNote || null,
          }),
        });
        const resData = await res.json();
        if (res.ok && resData.Success) {
          setEditingTitleId(null);
          fetchChucDanhHistory();
        } else {
          alert(resData.Message || "Cập nhật chức danh thất bại!");
        }
      } catch (err) {
        alert("Có lỗi xảy ra: " + err.message);
      }
    } else {
      const newHistory = chucDanhHistory.map((h) => {
        if (h.IdNvChucDanh === item.IdNvChucDanh) {
          return {
            ...h,
            DenNgay: editTitleToDate || null,
            GhiChu: editTitleNote || null,
          };
        }
        return h;
      });
      setChucDanhHistory(newHistory);
      setEditingTitleId(null);
    }
  };

  const handleDeleteTitle = async (idNvChucDanh) => {
    if (
      !window.confirm("Bạn có chắc chắn muốn xóa chức danh này khỏi lịch sử?")
    )
      return;
    if (isEditing) {
      try {
        const res = await apiFetch(`nhan-vien-chuc-danh/${idNvChucDanh}`, {
          method: "DELETE",
        });
        const resData = await res.json();
        if (res.ok && resData.Success) {
          fetchChucDanhHistory();
        } else {
          alert(resData.Message || "Xóa chức danh thất bại!");
        }
      } catch (err) {
        alert("Có lỗi xảy ra: " + err.message);
      }
    } else {
      const newHistory = chucDanhHistory.filter(
        (item) => item.IdNvChucDanh !== idNvChucDanh,
      );
      setChucDanhHistory(newHistory);
    }
  };

  // Actions for Block B (Đơn vị & Chức vụ)
  const resetAddChucVuForm = () => {
    setNewDonViId("");
    setNewChucVuId("");
    setNewLaChinh(false);
    setNewChucVuFromDate("");
    setNewChucVuToDate("");
    setNewChucVuNote("");
    setIsCurrentChucVu(true);
    setIsAddingChucVu(false);
  };

  const handleSubmitAddChucVu = async () => {
    if (!newDonViId) {
      alert("Vui lòng chọn đơn vị công tác.");
      return;
    }
    if (
      !validateDates(
        newChucVuFromDate,
        newLaChinh ? null : isCurrentChucVu ? null : newChucVuToDate,
      )
    )
      return;
    if (!validateNote(newChucVuNote)) return;

    if (isEditing) {
      try {
        const res = await apiFetch("nhan-vien-chuc-vu", {
          method: "POST",
          body: JSON.stringify({
            IdNhanVien: parseInt(id),
            IdDonVi: parseInt(newDonViId),
            IdChucVu: newChucVuId ? parseInt(newChucVuId) : null,
            LaChinh: duocNhapChucVu ? !!newLaChinh : false,
            TuNgay: newChucVuFromDate,
            DenNgay: newLaChinh
              ? null
              : isCurrentChucVu
                ? null
                : newChucVuToDate || null,
            GhiChu: newChucVuNote || null,
          }),
        });
        const resData = await res.json().catch(() => ({}));
        if (res.ok && resData.Success) {
          resetAddChucVuForm();
          fetchChucVuConcurrent();
        } else {
          alert(thongBaoLoiChucVu(resData, "Thêm đơn vị / chức vụ công tác thất bại!"));
        }
      } catch (err) {
        alert("Có lỗi xảy ra: " + err.message);
      }
    } else {
      const selectedDV = donViList.find(
        (dv) => (dv.id_don_vi || dv.IdDonVi || 0) === parseInt(newDonViId),
      );
      const selectedCV = chucVuList.find(
        (cv) => (cv.id_chuc_vu || cv.IdChucVu || 0) === parseInt(newChucVuId),
      );
      const dvName = selectedDV
        ? selectedDV.ten_don_vi || selectedDV.TenDonVi
        : "";
      const cvName = selectedCV
        ? selectedCV.ten_chuc_vu || selectedCV.TenChucVu
        : null;
      const newItem = {
        IdNvChucVu: Date.now(),
        IdDonVi: parseInt(newDonViId),
        TenDonVi: dvName,
        IdChucVu: newChucVuId ? parseInt(newChucVuId) : null,
        TenChucVu: cvName,
        LaChinh: duocNhapChucVu ? !!newLaChinh : false,
        CauHinhChoLuu: true,
        TuNgay: newChucVuFromDate,
        DenNgay: newLaChinh
          ? null
          : isCurrentChucVu
            ? null
            : newChucVuToDate || null,
        GhiChu: newChucVuNote || null,
      };
      const newConcurrent = [...chucVuConcurrent, newItem];
      setChucVuConcurrent(newConcurrent);
      resetAddChucVuForm();
    }
  };

  const startEditChucVu = (item) => {
    setEditingChucVuId(item.IdNvChucVu);
    setEditDonViId(item.IdDonVi ? String(item.IdDonVi) : "");
    setEditChucVuId(item.IdChucVu ? String(item.IdChucVu) : "");
    setEditLaChinh(!!item.LaChinh);
    setEditChucVuFromDate(chiNgay(item.TuNgay));
    setEditChucVuToDate(chiNgay(item.DenNgay));
    setEditChucVuNote(item.GhiChu || "");
  };

  const handleSubmitEditChucVu = async (item) => {
    // Từ ngày sửa được từ đợt 2026-10-20, nên cặp ngày kiểm trên giá trị SẼ ghi
    // (đơn vị chính luôn ghi DenNgay = NULL) chứ không trên TuNgay đang lưu.
    if (!validateDates(editChucVuFromDate, editLaChinh ? null : editChucVuToDate))
      return;
    if (!validateNote(editChucVuNote)) return;

    // Lùi / tiến Từ ngày làm đổi chức vụ áp dụng, định mức và giảm trừ giờ giảng
    // ở MỌI năm mà khoảng ngày cũ / mới đi qua, kể cả năm đã đánh giá.
    const tuNgayCu = chiNgay(item.TuNgay);
    if (isEditing && editChucVuFromDate !== tuNgayCu) {
      const [dauKhoang, cuoiKhoang] = [tuNgayCu, editChucVuFromDate].sort();
      const dongY = window.confirm(
        `Đổi Từ ngày từ ${formatDate(tuNgayCu)} sang ${formatDate(editChucVuFromDate)}` +
        ` sẽ thay đổi chức vụ áp dụng và giảm trừ giờ giảng của ${formData.HoTen || "nhân viên này"}` +
        ` trong khoảng ${formatDate(dauKhoang)} – ${formatDate(cuoiKhoang)}, kể cả các năm đã đánh giá.` +
        ` Tiếp tục?`,
      );
      if (!dongY) return;
    }

    if (isEditing) {
      try {
        const payload = {
          TuNgay: editChucVuFromDate,
          DenNgay: editLaChinh ? null : editChucVuToDate || null,
          GhiChu: editChucVuNote || null,
        };
        // Đổi đơn vị / đơn vị chính trước chỉ ADMIN; từ đợt 2026-10-20 mọi
        // người DuocNhap đều được (backend chặn riêng dòng của người giữ ADMIN).
        if (duocNhapChucVu) {
          payload.IdDonVi = editDonViId ? parseInt(editDonViId) : item.IdDonVi;
          payload.IdChucVu = editChucVuId ? parseInt(editChucVuId) : null;
          payload.LaChinh = !!editLaChinh;
        }
        const res = await apiFetch(`nhan-vien-chuc-vu/${item.IdNvChucVu}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        const resData = await res.json().catch(() => ({}));
        if (res.ok && resData.Success) {
          setEditingChucVuId(null);
          fetchChucVuConcurrent();
        } else {
          alert(thongBaoLoiChucVu(resData, "Cập nhật đơn vị / chức vụ thất bại!"));
        }
      } catch (err) {
        alert("Có lỗi xảy ra: " + err.message);
      }
    } else {
      const selectedDV = donViList.find(
        (dv) => (dv.id_don_vi || dv.IdDonVi || 0) === parseInt(editDonViId),
      );
      const selectedCV = chucVuList.find(
        (cv) => (cv.id_chuc_vu || cv.IdChucVu || 0) === parseInt(editChucVuId),
      );
      const newConcurrent = chucVuConcurrent.map((c) => {
        if (c.IdNvChucVu === item.IdNvChucVu) {
          return {
            ...c,
            IdDonVi: duocNhapChucVu && editDonViId ? parseInt(editDonViId) : c.IdDonVi,
            TenDonVi:
              duocNhapChucVu && selectedDV
                ? selectedDV.ten_don_vi || selectedDV.TenDonVi
                : c.TenDonVi,
            IdChucVu: duocNhapChucVu
              ? editChucVuId
                ? parseInt(editChucVuId)
                : null
              : c.IdChucVu,
            TenChucVu: duocNhapChucVu
              ? selectedCV
                ? selectedCV.ten_chuc_vu || selectedCV.TenChucVu
                : null
              : c.TenChucVu,
            LaChinh: duocNhapChucVu ? !!editLaChinh : c.LaChinh,
            TuNgay: editChucVuFromDate || c.TuNgay,
            DenNgay: editLaChinh ? null : editChucVuToDate || null,
            GhiChu: editChucVuNote || null,
          };
        }
        return c;
      });
      setChucVuConcurrent(newConcurrent);
      setEditingChucVuId(null);
    }
  };

  const handleDeleteChucVu = async (idNvChucVu) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa dòng công tác đơn vị này?"))
      return;
    if (isEditing) {
      try {
        const res = await apiFetch(`nhan-vien-chuc-vu/${idNvChucVu}`, {
          method: "DELETE",
        });
        const resData = await res.json().catch(() => ({}));
        if (res.ok && resData.Success) {
          fetchChucVuConcurrent();
        } else {
          alert(thongBaoLoiChucVu(resData, "Xóa công tác thất bại (không thể xóa đơn vị chính cuối cùng)!"));
        }
      } catch (err) {
        alert("Có lỗi xảy ra: " + err.message);
      }
    } else {
      const newConcurrent = chucVuConcurrent.filter(
        (item) => item.IdNvChucVu !== idNvChucVu,
      );
      setChucVuConcurrent(newConcurrent);
    }
  };

  const validateField = (name, value) => {
    let errorMsg = "";
    if (name === "MaNhanVien" && !value) {
      errorMsg = "Mã nhân viên là bắt buộc.";
    } else if (name === "HoTen" && !value) {
      errorMsg = "Họ và tên là bắt buộc.";
    } else if (name === "Email" && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        errorMsg = "Email không đúng định dạng (ví dụ: user@example.com).";
      }
    } else if (name === "MatKhau" && !isEditing && !value) {
      errorMsg = "Mật khẩu là bắt buộc khi thêm mới.";
    }
    setErrors((prev) => ({ ...prev, [name]: errorMsg }));
    return errorMsg;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setFormData((prev) => ({
      ...prev,
      [name]: val,
    }));
    validateField(name, val);
  };

  const handleSelect = (name) => (value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    validateField(name, value);
  };

  const handleGlobalSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!canManage) return alert("Bạn không có quyền thực hiện chức năng này!");

    // Validate basic form
    const errMa = !formData.MaNhanVien ? "Mã nhân viên là bắt buộc." : "";
    const errTen = !formData.HoTen ? "Họ và tên là bắt buộc." : "";
    let errPass = "";
    if (!isEditing && !formData.MatKhau) {
      errPass = "Mật khẩu là bắt buộc khi thêm mới.";
    }
    let errEmail = "";
    if (formData.Email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.Email)) {
        errEmail = "Email không đúng định dạng (ví dụ: user@example.com).";
      }
    }

    if (errMa || errTen || errPass || errEmail) {
      setErrors({
        MaNhanVien: errMa,
        HoTen: errTen,
        MatKhau: errPass,
        Email: errEmail,
      });
      setActiveTab("account");
      alert("Vui lòng nhập đầy đủ các trường bắt buộc thông tin tài khoản!");
      return;
    }

    // Validate Title requirement (Chức danh is mandatory)
    const currentTitle = chucDanhHistory.find((item) => !item.DenNgay);
    if (!currentTitle) {
      setActiveTab("title");
      alert(
        "Vui lòng thiết lập chức danh nghề nghiệp hiện hành trước khi lưu nhân viên!",
      );
      return;
    }

    // Validate Unit requirement (Đơn vị is mandatory)
    const currentUnit = chucVuConcurrent.find((item) => !item.DenNgay);
    if (!currentUnit) {
      setActiveTab("position");
      alert(
        "Vui lòng thiết lập ít nhất một đơn vị công tác hiện hành trước khi lưu nhân viên!",
      );
      return;
    }

    setIsLoading(true);

    const method = isEditing ? "PUT" : "POST";
    const payload = {
      ...formData,
      IdChucDanh: currentTitle ? parseInt(currentTitle.IdChucDanh) : null, // Set main title from the active history item
      TrangThai: !!formData.TrangThai,
    };

    if (isEditing) payload.IdNhanVien = parseInt(id);

    try {
      const response = await apiFetch("nhan-vien", {
        method,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const resData = await response.json();
        const createdId = resData.Item?.IdNhanVien;

        if (!isEditing && createdId) {
          // Save Title History items
          for (const title of chucDanhHistory) {
            await apiFetch("nhan-vien-chuc-danh", {
              method: "POST",
              body: JSON.stringify({
                IdNhanVien: createdId,
                IdChucDanh: title.IdChucDanh,
                TuNgay: title.TuNgay,
                DenNgay: title.DenNgay,
                GhiChu: title.GhiChu,
              }),
            });
          }

          // Save Concurrent Positions & Units
          for (const pos of chucVuConcurrent) {
            await apiFetch("nhan-vien-chuc-vu", {
              method: "POST",
              body: JSON.stringify({
                IdNhanVien: createdId,
                IdDonVi: pos.IdDonVi,
                IdChucVu: pos.IdChucVu || null,
                LaChinh: !!pos.LaChinh,
                TuNgay: pos.TuNgay,
                DenNgay: pos.DenNgay,
                GhiChu: pos.GhiChu,
              }),
            });
          }
        }

        isSavingRef.current = true;
        alert("Lưu dữ liệu thành công!");
        navigate("/quan-ly-nguoi-dung");
      } else {
        const resData = await response.json().catch(() => ({}));
        alert(resData.Message || "Lưu thất bại! Vui lòng kiểm tra lại dữ liệu");
      }
    } catch (error) {
      console.error("Lỗi khi lưu dữ liệu nhân viên:", error);
      alert("Có lỗi xảy ra khi kết nối server!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div
        className="page-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "15px",
          marginBottom: "25px",
        }}
      >
        <button
          className="btn-cancel"
          onClick={handleBack}
          style={{
            padding: "8px 14px",
            margin: 0,
            background: "transparent",
            color: "#475569",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "none",
            transition: "all 0.2s ease",
          }}
          title="Quay lại danh sách"
        >
          <i className="fa-solid fa-arrow-left"></i> Quay lại
        </button>
        <div
          className="header-title"
          style={{ display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: "700",
              color: "#0f172a",
            }}
          >
            {isEditing ? "THÔNG TIN CHI TIẾT NHÂN VIÊN" : "THÊM NHÂN VIÊN MỚI"}
          </h2>
          {isEditing && (formData.HoTen || formData.MaNhanVien) && (
            <span style={{ fontSize: "14px", color: "#475569" }}>
              <strong style={{ fontWeight: "600", color: "#0f172a" }}>
                {formData.HoTen}
              </strong>
              {formData.MaNhanVien ? ` · ${formData.MaNhanVien}` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Custom Tabs */}
      <div
        className="tabs-container"
        style={{
          display: "flex",
          gap: "5px",
          marginBottom: "25px",
          borderBottom: "2px solid #e2e8f0",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("account")}
          style={{
            padding: "12px 20px",
            border: "none",
            borderBottom:
              activeTab === "account"
                ? "3px solid #0056b3"
                : "3px solid transparent",
            background: "none",
            fontWeight: "bold",
            fontSize: "15px",
            color: activeTab === "account" ? "#0056b3" : "#475569",
            cursor: "pointer",
            transition: "all 0.2s",
            outline: "none",
          }}
        >
          <i
            className="fa-solid fa-user-gear"
            style={{ marginRight: "8px" }}
          ></i>{" "}
          Thông tin tài khoản
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("title")}
          style={{
            padding: "12px 20px",
            border: "none",
            borderBottom:
              activeTab === "title"
                ? "3px solid #0056b3"
                : "3px solid transparent",
            background: "none",
            fontWeight: "bold",
            fontSize: "15px",
            color: activeTab === "title" ? "#0056b3" : "#475569",
            cursor: "pointer",
            transition: "all 0.2s",
            outline: "none",
          }}
        >
          <i
            className="fa-solid fa-graduation-cap"
            style={{ marginRight: "8px" }}
          ></i>{" "}
          Chức danh{" "}
          {chucDanhHistory.length > 0 ? `(${chucDanhHistory.length})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("position")}
          style={{
            padding: "12px 20px",
            border: "none",
            borderBottom:
              activeTab === "position"
                ? "3px solid #0056b3"
                : "3px solid transparent",
            background: "none",
            fontWeight: "bold",
            fontSize: "15px",
            color: activeTab === "position" ? "#0056b3" : "#475569",
            cursor: "pointer",
            transition: "all 0.2s",
            outline: "none",
          }}
        >
          <i
            className="fa-solid fa-building-user"
            style={{ marginRight: "8px" }}
          ></i>{" "}
          Đơn vị & Chức vụ{" "}
          {chucVuConcurrent.length > 0 ? `(${chucVuConcurrent.length})` : ""}
        </button>
      </div>

      <div
        style={{
          backgroundColor: "#fff",
          padding: "25px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          boxShadow:
            "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.06)",
          marginBottom: "30px",
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "50px" }}>
            <i
              className="fa-solid fa-circle-notch fa-spin fa-2x"
              style={{ color: "#0056b3", marginRight: "10px" }}
            ></i>
            <p style={{ marginTop: "10px", color: "#666" }}>
              Đang tải dữ liệu nhân viên...
            </p>
          </div>
        ) : (
          <>
            {/* TAB 1: THÔNG TIN TÀI KHOẢN */}
            {activeTab === "account" && (
              <form id="nhanVienGlobalForm" onSubmit={handleGlobalSubmit}>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>
                      Mã nhân viên <span className="text-red">*</span>
                    </label>
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="text"
                        name="MaNhanVien"
                        className="form-input"
                        value={formData.MaNhanVien || ""}
                        onChange={handleChange}
                        required
                        disabled={isEditing}
                        style={{
                          width: "100%",
                          paddingRight: isEditing ? "40px" : "12px",
                          backgroundColor: isEditing ? "#f8fafc" : "inherit",
                          color: isEditing ? "#475569" : "inherit",
                          cursor: isEditing ? "not-allowed" : "text",
                          borderColor: errors.MaNhanVien
                            ? "#ef4444"
                            : "#cbd5e1",
                          margin: 0,
                        }}
                      />
                      {isEditing && (
                        <i
                          className="fa-solid fa-lock"
                          style={{
                            position: "absolute",
                            right: "12px",
                            color: "#94a3b8",
                          }}
                          title="Không chỉnh sửa được"
                        ></i>
                      )}
                    </div>
                    {isEditing && (
                      <span
                        style={{
                          fontSize: "11.5px",
                          color: "#475569",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        <i
                          className="fa-solid fa-circle-info"
                          style={{ marginRight: "4px" }}
                        ></i>
                        Mã nhân viên không thể chỉnh sửa sau khi tạo.
                      </span>
                    )}
                    {errors.MaNhanVien && (
                      <span
                        style={{
                          color: "#ef4444",
                          fontSize: "12px",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        {errors.MaNhanVien}
                      </span>
                    )}
                  </div>
                  <div className="form-group">
                    <label>
                      Họ và Tên <span className="text-red">*</span>
                    </label>
                    <input
                      type="text"
                      name="HoTen"
                      className="form-input"
                      value={formData.HoTen || ""}
                      onChange={handleChange}
                      required
                      style={{
                        borderColor: errors.HoTen ? "#ef4444" : "#cbd5e1",
                        margin: 0,
                      }}
                    />
                    {errors.HoTen && (
                      <span
                        style={{
                          color: "#ef4444",
                          fontSize: "12px",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        {errors.HoTen}
                      </span>
                    )}
                  </div>
                </div>



                <div className="form-grid-2" style={{ marginTop: "15px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Email</label>
                    <input
                      type="email"
                      name="Email"
                      className="form-input"
                      value={formData.Email || ""}
                      onChange={handleChange}
                      style={{
                        margin: 0,
                        borderColor: errors.Email ? "#ef4444" : "#cbd5e1",
                      }}
                    />
                    {errors.Email && (
                      <span
                        style={{
                          color: "#ef4444",
                          fontSize: "12px",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        {errors.Email}
                      </span>
                    )}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>
                      Mật khẩu đăng nhập{" "}
                      {!isEditing && <span className="text-red">*</span>}
                    </label>
                    <div
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type={showPassword ? "text" : "password"}
                        name="MatKhau"
                        className="form-input"
                        value={formData.MatKhau || ""}
                        onChange={handleChange}
                        required={!isEditing}
                        placeholder={
                          isEditing
                            ? "Bỏ trống nếu không đổi mật khẩu"
                            : "Nhập mật khẩu đăng nhập"
                        }
                        style={{
                          width: "100%",
                          paddingRight: "40px",
                          margin: 0,
                          borderColor: errors.MatKhau ? "#ef4444" : "#cbd5e1",
                        }}
                      />
                      <i
                        className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                        style={{
                          position: "absolute",
                          right: "12px",
                          cursor: "pointer",
                          color: "#64748b",
                        }}
                        onClick={() => setShowPassword(!showPassword)}
                      ></i>
                    </div>
                    {errors.MatKhau && (
                      <span
                        style={{
                          color: "#ef4444",
                          fontSize: "12px",
                          marginTop: "4px",
                          display: "block",
                        }}
                      >
                        {errors.MatKhau}
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="form-group"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginTop: "20px",
                  }}
                >
                  <input
                    type="checkbox"
                    name="TrangThai"
                    id="trangThaiCheck"
                    checked={formData.TrangThai !== false}
                    onChange={handleChange}
                    style={{
                      width: "18px",
                      height: "18px",
                      marginRight: "10px",
                      cursor: "pointer",
                    }}
                  />
                  <label
                    htmlFor="trangThaiCheck"
                    style={{
                      margin: 0,
                      cursor: "pointer",
                      fontWeight: "500",
                      color: "#334155",
                    }}
                  >
                    Cho phép tài khoản hoạt động
                  </label>
                </div>
              </form>
            )}

            {/* TAB 2: LỊCH SỬ CHỨC DANH */}
            {activeTab === "title" && (
              <div className="title-chuc-danh-block">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "16px",
                      fontWeight: "bold",
                      color: "#0f172a",
                      margin: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      textTransform: "uppercase",
                    }}
                  >
                    <i
                      className="fa-solid fa-graduation-cap"
                      style={{ color: "#0056b3" }}
                    ></i>
                    Chức danh nghề nghiệp
                  </h3>
                  {canManage && !isChangingTitle && (
                    <button
                      type="button"
                      className="btn-add-new"
                      onClick={() => setIsChangingTitle(true)}
                      style={{
                        margin: 0,
                        padding: "8px 14px",
                        fontSize: "13px",
                      }}
                    >
                      <i className="fa-solid fa-plus"></i> Thêm chức danh mới
                    </button>
                  )}
                </div>

                {isLoadingChucDanh ? (
                  <div style={{ padding: "10px 0", color: "#666" }}>
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Đang
                    tải dữ liệu chức danh...
                  </div>
                ) : (
                  <>
                    {/* Form: Add/Change Title Panel */}
                    {isChangingTitle && (
                      <div
                        style={{
                          padding: "20px",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          marginBottom: "20px",
                          backgroundColor: "#f8fafc",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        }}
                      >
                        <h4
                          style={{
                            margin: "0 0 15px 0",
                            fontSize: "14px",
                            color: "#1e3a8a",
                            fontWeight: "bold",
                          }}
                        >
                          Thêm chức danh mới
                        </h4>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "15px",
                            marginBottom: "12px",
                          }}
                        >
                          <div
                            className="form-group"
                            style={{ marginBottom: 0 }}
                          >
                            <label
                              style={{ fontSize: "12px", marginBottom: "5px" }}
                            >
                              Chức danh <span className="text-red">*</span>
                            </label>
                            <SearchSelect
                              value={newTitleId}
                              onChange={(v) => setNewTitleId(v)}
                              options={chucDanhList.map((cd) => ({
                                value: cd.id_chuc_danh || cd.IdChucDanh,
                                label: cd.ten_chuc_danh || cd.TenChucDanh,
                              }))}
                              placeholder="Chọn chức danh"
                            />
                          </div>
                          <div
                            className="form-group"
                            style={{ marginBottom: 0 }}
                          >
                            <label
                              style={{ fontSize: "12px", marginBottom: "5px" }}
                            >
                              Từ ngày <span className="text-red">*</span>
                            </label>
                            <input
                              type="date"
                              className="form-input"
                              value={newTitleFromDate}
                              onChange={(e) =>
                                setNewTitleFromDate(e.target.value)
                              }
                              style={{ padding: "8px" }}
                            />
                          </div>
                          <div
                            className="form-group"
                            style={{ marginBottom: 0 }}
                          >
                            <label
                              style={{
                                fontSize: "12px",
                                marginBottom: "5px",
                                color: isCurrentTitle ? "#475569" : "inherit",
                              }}
                            >
                              Đến ngày
                            </label>
                            {isCurrentTitle ? (
                              <div
                                style={{
                                  padding: "8px 12px",
                                  backgroundColor: "#dcfce7",
                                  color: "#166534",
                                  border: "1px solid #bbf7d0",
                                  borderRadius: "4px",
                                  fontWeight: "600",
                                  fontSize: "14px",
                                  height: "38px",
                                  boxSizing: "border-box",
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <i
                                  className="fa-solid fa-circle-check"
                                  style={{ marginRight: "6px" }}
                                ></i>
                                Hiện hành
                              </div>
                            ) : (
                              <input
                                type="date"
                                className="form-input"
                                value={newTitleToDate}
                                onChange={(e) =>
                                  setNewTitleToDate(e.target.value)
                                }
                                style={{
                                  padding: "8px",
                                  backgroundColor: "inherit",
                                  cursor: "default",
                                }}
                              />
                            )}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                marginTop: "6px",
                              }}
                            >
                              <input
                                type="checkbox"
                                id="isCurrentTitleCheck"
                                checked={isCurrentTitle}
                                onChange={(e) => {
                                  setIsCurrentTitle(e.target.checked);
                                  if (e.target.checked) {
                                    setNewTitleToDate("");
                                  }
                                }}
                                style={{
                                  cursor: "pointer",
                                  marginRight: "6px",
                                  width: "15px",
                                  height: "15px",
                                }}
                              />
                              <label
                                htmlFor="isCurrentTitleCheck"
                                style={{
                                  margin: 0,
                                  fontSize: "12.5px",
                                  cursor: "pointer",
                                  fontWeight: "500",
                                  color: "#475569",
                                }}
                              >
                                Đây là chức danh hiện tại
                              </label>
                            </div>
                          </div>
                          <div
                            className="form-group"
                            style={{ marginBottom: 0 }}
                          >
                            <label
                              style={{ fontSize: "12px", marginBottom: "5px" }}
                            >
                              Ghi chú
                            </label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="Tối đa 500 ký tự"
                              value={newTitleNote}
                              onChange={(e) => setNewTitleNote(e.target.value)}
                              maxLength={500}
                              style={{ padding: "8px" }}
                            />
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            justifyContent: "flex-end",
                            marginTop: "15px",
                          }}
                        >
                          <button
                            type="button"
                            className="btn-cancel"
                            onClick={resetChangeTitleForm}
                            style={{ padding: "6px 12px", fontSize: "13px" }}
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            className="btn-submit"
                            onClick={handleSubmitChangeTitle}
                            style={{ padding: "6px 12px", fontSize: "13px" }}
                          >
                            Áp dụng vào danh sách
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Table Title History */}
                    <div
                      style={{
                        overflowX: "auto",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                      }}
                    >
                      <table
                        className="custom-table"
                        style={{
                          width: "100%",
                          fontSize: "13px",
                          background: "#fff",
                        }}
                      >
                        <thead>
                          <tr style={{ background: "#f8fafc" }}>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                borderBottom: "1px solid #e2e8f0",
                                width: "30%",
                              }}
                            >
                              CHỨC DANH
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                borderBottom: "1px solid #e2e8f0",
                                width: "130px",
                              }}
                            >
                              TỪ NGÀY
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                borderBottom: "1px solid #e2e8f0",
                                width: "130px",
                              }}
                            >
                              ĐẾN NGÀY
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "left",
                                borderBottom: "1px solid #e2e8f0",
                                width: "25%",
                              }}
                            >
                              GHI CHÚ
                            </th>
                            {canManage && (
                              <th
                                style={{
                                  padding: "10px",
                                  textAlign: "center",
                                  borderBottom: "1px solid #e2e8f0",
                                  width: "130px",
                                }}
                              >
                                THAO TÁC
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {chucDanhHistory.length === 0 ? (
                            <tr>
                              <td
                                colSpan={canManage ? 5 : 4}
                                style={{
                                  padding: "15px",
                                  textAlign: "center",
                                  color: "#475569",
                                  fontStyle: "italic",
                                }}
                              >
                                Chưa có dữ liệu lịch sử chức danh
                              </td>
                            </tr>
                          ) : (
                            chucDanhHistory.map((item) => {
                              const isEditingRow =
                                editingTitleId === item.IdNvChucDanh;
                              return (
                                <tr
                                  key={item.IdNvChucDanh}
                                  style={{ borderBottom: "1px solid #f1f5f9" }}
                                >
                                  <td
                                    style={{
                                      padding: "10px",
                                      fontWeight: "500",
                                      color: "#334155",
                                    }}
                                  >
                                    {item.TenChucDanh} ({item.MaChucDanh})
                                    {!isEditing && (
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          padding: "2px 8px",
                                          borderRadius: "10px",
                                          fontSize: "11px",
                                          fontWeight: "600",
                                          backgroundColor: "#ffedd5",
                                          color: "#c2410c",
                                          border: "1px solid #fed7aa",
                                          marginLeft: "8px",
                                        }}
                                      >
                                        Chưa lưu
                                      </span>
                                    )}
                                  </td>
                                  <td
                                    style={{
                                      padding: "10px",
                                      color: "#475569",
                                    }}
                                  >
                                    {formatDate(item.TuNgay)}
                                  </td>
                                  <td style={{ padding: "10px" }}>
                                    {isEditingRow ? (
                                      <input
                                        type="date"
                                        className="form-input"
                                        value={editTitleToDate}
                                        onChange={(e) =>
                                          setEditTitleToDate(e.target.value)
                                        }
                                        style={{
                                          padding: "4px 8px",
                                          fontSize: "13px",
                                          margin: 0,
                                        }}
                                      />
                                    ) : !item.DenNgay ? (
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          padding: "3px 8px",
                                          borderRadius: "12px",
                                          fontSize: "12px",
                                          fontWeight: "600",
                                          backgroundColor: "#dcfce7",
                                          color: "#166534",
                                          border: "1px solid #bbf7d0",
                                        }}
                                      >
                                        <i
                                          className="fa-solid fa-circle-check"
                                          style={{
                                            marginRight: "4px",
                                            fontSize: "10px",
                                          }}
                                        ></i>
                                        Hiện hành
                                      </span>
                                    ) : (
                                      formatDate(item.DenNgay)
                                    )}
                                  </td>
                                  <td
                                    style={{
                                      padding: "10px",
                                      color: "#475569",
                                    }}
                                  >
                                    {isEditingRow ? (
                                      <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Ghi chú"
                                        value={editTitleNote}
                                        onChange={(e) =>
                                          setEditTitleNote(e.target.value)
                                        }
                                        maxLength={500}
                                        style={{
                                          padding: "4px 8px",
                                          fontSize: "13px",
                                          margin: 0,
                                        }}
                                      />
                                    ) : (
                                      item.GhiChu || "-"
                                    )}
                                  </td>
                                  {canManage && (
                                    <td
                                      style={{
                                        padding: "10px",
                                        textAlign: "center",
                                      }}
                                    >
                                      {isEditingRow ? (
                                        <div
                                          style={{
                                            display: "flex",
                                            gap: "12px",
                                            justifyContent: "center",
                                          }}
                                        >
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleSubmitEditTitle(item)
                                            }
                                            style={{
                                              background: "#22c55e",
                                              color: "#fff",
                                              border: "none",
                                              width: "32px",
                                              height: "32px",
                                              borderRadius: "4px",
                                              cursor: "pointer",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                            }}
                                            title="Lưu thay đổi"
                                          >
                                            <i
                                              className="fa-solid fa-check"
                                              style={{ fontSize: "13px" }}
                                            ></i>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditingTitleId(null)
                                            }
                                            style={{
                                              background: "#64748b",
                                              color: "#fff",
                                              border: "none",
                                              width: "32px",
                                              height: "32px",
                                              borderRadius: "4px",
                                              cursor: "pointer",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                            }}
                                            title="Hủy bỏ"
                                          >
                                            <i
                                              className="fa-solid fa-times"
                                              style={{ fontSize: "13px" }}
                                            ></i>
                                          </button>
                                        </div>
                                      ) : (
                                        <div
                                          style={{
                                            display: "flex",
                                            gap: "12px",
                                            justifyContent: "center",
                                          }}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => startEditTitle(item)}
                                            style={{
                                              background: "#f59e0b",
                                              color: "#fff",
                                              border: "none",
                                              width: "32px",
                                              height: "32px",
                                              borderRadius: "4px",
                                              cursor: "pointer",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                            }}
                                            title="Chỉnh sửa"
                                          >
                                            <i
                                              className="fa-solid fa-pencil"
                                              style={{ fontSize: "13px" }}
                                            ></i>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteTitle(
                                                item.IdNvChucDanh,
                                              )
                                            }
                                            style={{
                                              background: "#ef4444",
                                              color: "#fff",
                                              border: "none",
                                              width: "32px",
                                              height: "32px",
                                              borderRadius: "4px",
                                              cursor: "pointer",
                                              display: "inline-flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                            }}
                                            title="Xóa"
                                          >
                                            <i
                                              className="fa-solid fa-trash"
                                              style={{ fontSize: "13px" }}
                                            ></i>
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TAB 3: ĐƠN VỊ & CHỨC VỤ CÔNG TÁC */}
            {activeTab === "position" && (
              <div className="title-chuc-vu-concurrent-block">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "20px",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: "15px",
                        fontWeight: "600",
                        color: "#0f172a",
                        margin: "0 0 3px 0",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <i
                        className="fa-solid fa-building-user"
                        style={{ color: "#0056b3", fontSize: "14px" }}
                        aria-hidden="true"
                      ></i>
                      Đơn vị &amp; chức vụ công tác
                    </h3>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>
                      Các đơn vị đang công tác và chức vụ kiêm nhiệm
                    </span>
                  </div>
                  {duocSuaChucVu && !isAddingChucVu && (
                    <button
                      type="button"
                      onClick={() => setIsAddingChucVu(true)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "7px",
                        height: "38px",
                        margin: 0,
                        padding: "0 14px",
                        border: "1px solid #0056b3",
                        borderRadius: "7px",
                        background: "#0056b3",
                        color: "#fff",
                        fontFamily: "inherit",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      <i className="fa-solid fa-plus" aria-hidden="true"></i>
                      Thêm đơn vị / chức vụ
                    </button>
                  )}
                </div>

                {!dangTaiQuyenChucVu && lyDoKhongKeKhai && (
                  <div
                    role="status"
                    style={{
                      marginBottom: "15px",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      background: "#fff8e9",
                      border: "1px solid #f3e2bd",
                      color: "#92611d",
                      fontSize: "13px",
                      lineHeight: 1.6,
                    }}
                  >
                    <i
                      className="fa-solid fa-circle-info"
                      style={{ marginRight: "6px" }}
                    ></i>
                    {lyDoKhongKeKhai}
                  </div>
                )}

                {isLoadingChucVu ? (
                  <div style={{ padding: "10px 0", color: "#666" }}>
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Đang
                    tải dữ liệu đơn vị & chức vụ...
                  </div>
                ) : (
                  <>
                    {/* Form: Add Concurrent Position / Unit */}
                    {isAddingChucVu && (
                      <div
                        style={{
                          padding: "20px",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          marginBottom: "20px",
                          backgroundColor: "#f8fafc",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        }}
                      >
                        <h4
                          style={{
                            margin: "0 0 15px 0",
                            fontSize: "14px",
                            color: "#1e3a8a",
                            fontWeight: "bold",
                          }}
                        >
                          Thêm đơn vị / chức vụ công tác
                        </h4>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "15px",
                            marginBottom: "12px",
                          }}
                        >
                          <div
                            className="form-group"
                            style={{ marginBottom: 0 }}
                          >
                            <label
                              style={{ fontSize: "12px", marginBottom: "5px" }}
                            >
                              Đơn vị công tác{" "}
                              <span className="text-red">*</span>
                            </label>
                            <SearchSelect
                              value={newDonViId}
                              onChange={(v) => setNewDonViId(v)}
                              options={donViList.map((dv) => ({
                                value: dv.id_don_vi || dv.IdDonVi,
                                label: dv.ten_don_vi || dv.TenDonVi,
                              }))}
                              placeholder="Chọn đơn vị công tác"
                            />
                          </div>

                          <div
                            className="form-group"
                            style={{ marginBottom: 0 }}
                          >
                            <label
                              style={{ fontSize: "12px", marginBottom: "5px" }}
                            >
                              Chức vụ (tuỳ chọn)
                            </label>
                            <SearchSelect
                              value={newChucVuId}
                              onChange={(v) => setNewChucVuId(v)}
                              options={[
                                {
                                  value: "",
                                  label: "(Không giữ chức vụ quản lý)",
                                },
                                ...chucVuChonDuoc.map((cv) => ({
                                  value: cv.id_chuc_vu || cv.IdChucVu,
                                  label: cv.ten_chuc_vu || cv.TenChucVu,
                                })),
                              ]}
                              placeholder="Chọn chức vụ hoặc để trống"
                            />
                          </div>
                        </div>

                        {duocNhapChucVu && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              marginBottom: "12px",
                              padding: "8px 12px",
                              backgroundColor: "#f0fdf4",
                              border: "1px solid #bbf7d0",
                              borderRadius: "6px",
                            }}
                          >
                            <input
                              type="checkbox"
                              id="newLaChinhCheck"
                              checked={newLaChinh}
                              onChange={(e) => {
                                setNewLaChinh(e.target.checked);
                                if (e.target.checked) {
                                  setIsCurrentChucVu(true);
                                  setNewChucVuToDate("");
                                }
                              }}
                              style={{
                                cursor: "pointer",
                                marginRight: "8px",
                                width: "16px",
                                height: "16px",
                              }}
                            />
                            <label
                              htmlFor="newLaChinhCheck"
                              style={{
                                margin: 0,
                                fontSize: "13px",
                                fontWeight: "600",
                                color: "#166534",
                                cursor: "pointer",
                              }}
                            >
                              Đặt làm Đơn vị chính của nhân viên (LaChinh =
                              true)
                            </label>
                          </div>
                        )}

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "15px",
                            marginBottom: "12px",
                          }}
                        >
                          <div
                            className="form-group"
                            style={{ marginBottom: 0 }}
                          >
                            <label
                              style={{ fontSize: "12px", marginBottom: "5px" }}
                            >
                              Từ ngày <span className="text-red">*</span>
                            </label>
                            <input
                              type="date"
                              className="form-input"
                              value={newChucVuFromDate}
                              onChange={(e) =>
                                setNewChucVuFromDate(e.target.value)
                              }
                              style={{ padding: "8px" }}
                            />
                          </div>

                          <div
                            className="form-group"
                            style={{ marginBottom: 0 }}
                          >
                            <label
                              style={{
                                fontSize: "12px",
                                marginBottom: "5px",
                                color:
                                  newLaChinh || isCurrentChucVu
                                    ? "#475569"
                                    : "inherit",
                              }}
                            >
                              Đến ngày
                            </label>
                            {newLaChinh ? (
                              <div
                                style={{
                                  padding: "8px 12px",
                                  backgroundColor: "#e0f2fe",
                                  color: "#0369a1",
                                  border: "1px solid #bae6fd",
                                  borderRadius: "4px",
                                  fontWeight: "600",
                                  fontSize: "13px",
                                  height: "38px",
                                  boxSizing: "border-box",
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <i
                                  className="fa-solid fa-star"
                                  style={{ marginRight: "6px" }}
                                ></i>
                                Đơn vị chính (Không giới hạn kết thúc)
                              </div>
                            ) : isCurrentChucVu ? (
                              <div
                                style={{
                                  padding: "8px 12px",
                                  backgroundColor: "#dcfce7",
                                  color: "#166534",
                                  border: "1px solid #bbf7d0",
                                  borderRadius: "4px",
                                  fontWeight: "600",
                                  fontSize: "14px",
                                  height: "38px",
                                  boxSizing: "border-box",
                                  display: "flex",
                                  alignItems: "center",
                                }}
                              >
                                <i
                                  className="fa-solid fa-circle-check"
                                  style={{ marginRight: "6px" }}
                                ></i>
                                Đang công tác
                              </div>
                            ) : (
                              <input
                                type="date"
                                className="form-input"
                                value={newChucVuToDate}
                                onChange={(e) =>
                                  setNewChucVuToDate(e.target.value)
                                }
                                style={{
                                  padding: "8px",
                                  backgroundColor: "inherit",
                                  cursor: "default",
                                }}
                              />
                            )}
                            {!newLaChinh && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  marginTop: "6px",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  id="isCurrentChucVuCheck"
                                  checked={isCurrentChucVu}
                                  onChange={(e) => {
                                    setIsCurrentChucVu(e.target.checked);
                                    if (e.target.checked) {
                                      setNewChucVuToDate("");
                                    }
                                  }}
                                  style={{
                                    cursor: "pointer",
                                    marginRight: "6px",
                                    width: "15px",
                                    height: "15px",
                                  }}
                                />
                                <label
                                  htmlFor="isCurrentChucVuCheck"
                                  style={{
                                    margin: 0,
                                    fontSize: "12.5px",
                                    cursor: "pointer",
                                    fontWeight: "500",
                                    color: "#475569",
                                  }}
                                >
                                  Đang công tác tại đơn vị này
                                </label>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label
                            style={{ fontSize: "12px", marginBottom: "5px" }}
                          >
                            Ghi chú
                          </label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Tối đa 500 ký tự"
                            value={newChucVuNote}
                            onChange={(e) => setNewChucVuNote(e.target.value)}
                            maxLength={500}
                            style={{ padding: "8px" }}
                          />
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            justifyContent: "flex-end",
                            marginTop: "15px",
                          }}
                        >
                          <button
                            type="button"
                            className="btn-cancel"
                            onClick={resetAddChucVuForm}
                            style={{ padding: "6px 12px", fontSize: "13px" }}
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            className="btn-submit"
                            onClick={handleSubmitAddChucVu}
                            style={{ padding: "6px 12px", fontSize: "13px" }}
                          >
                            Áp dụng vào danh sách
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bảng theo canvas thiết kế (Claude Design, 2026-10-20):
                        tiêu đề cột nhẹ hơn dữ liệu, thao tác là nút viền thay vì
                        ô màu đặc, trạng thái là chấm + chữ thay vì pill. Dòng đang
                        sửa mở thành panel biểu mẫu - nhét control vào từng ô là
                        nguồn gốc của mọi vụ lệch chiều cao trước đây. */}
                    <div
                      style={{
                        overflowX: "auto",
                        border: "1px solid #e3e7ee",
                        borderRadius: "10px",
                      }}
                    >
                      <table
                        className="custom-table"
                        style={{ width: "100%", background: "#fff" }}
                      >
                        <thead>
                          <tr>
                            <th style={{ ...oTieuDeCot, width: "27%" }}>
                              Đơn vị
                            </th>
                            <th style={{ ...oTieuDeCot, width: "20%" }}>
                              Chức vụ
                            </th>
                            <th style={{ ...oTieuDeCot, width: "190px" }}>
                              Nhiệm kỳ
                            </th>
                            <th style={{ ...oTieuDeCot, width: "23%" }}>
                              Ghi chú
                            </th>
                            {duocSuaChucVu && (
                              <th
                                style={{
                                  ...oTieuDeCot,
                                  width: "104px",
                                  textAlign: "right",
                                }}
                              >
                                Thao tác
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {chucVuConcurrent.length === 0 ? (
                            <tr>
                              <td
                                colSpan={duocSuaChucVu ? 5 : 4}
                                style={{
                                  padding: "34px 14px 38px",
                                  textAlign: "center",
                                }}
                              >
                                <div
                                  style={{ fontSize: "14px", color: "#475569" }}
                                >
                                  Chưa có đơn vị công tác nào
                                </div>
                                <div
                                  style={{
                                    marginTop: "5px",
                                    fontSize: "13px",
                                    color: "#64748b",
                                  }}
                                >
                                  Mỗi nhân viên cần ít nhất một đơn vị chính đang
                                  hiệu lực trước khi lưu.
                                </div>
                              </td>
                            </tr>
                          ) : (
                            chucVuConcurrent.map((item) => {
                              const isEditingRow =
                                editingChucVuId === item.IdNvChucVu;
                              const tenDonVi =
                                item.TenDonVi ||
                                item.ten_don_vi ||
                                `Đơn vị #${item.IdDonVi}`;
                              const tenChucVu =
                                item.TenChucVu || item.ten_chuc_vu || "";
                              // Giảm trừ là thuộc tính CỦA chức vụ nên đi kèm ngay
                              // dưới tên chức vụ, không chiếm một cột rỗng với mọi
                              // dòng không giữ chức vụ.
                              const giamTruRaw = item.CauHinhChoLuu
                                ? "Xác định sau khi lưu"
                                : hienThiGiamTru(item);
                              const giamTru =
                                giamTruRaw === "—" ? "" : giamTruRaw;
                              const daKetThuc = !!item.DenNgay;

                              if (isEditingRow) {
                                return (
                                  <tr key={item.IdNvChucVu}>
                                    <td
                                      colSpan={duocSuaChucVu ? 5 : 4}
                                      style={{
                                        padding: "18px 14px 20px",
                                        background: "#f7f9fc",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "8px",
                                          marginBottom: "14px",
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            color: "#0f172a",
                                          }}
                                        >
                                          Đang sửa: {tenDonVi}
                                        </span>
                                      </div>

                                      <div
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns:
                                            "repeat(2, minmax(0, 1fr))",
                                          gap: "14px 20px",
                                        }}
                                      >
                                        {duocNhapChucVu && (
                                          <div>
                                            <span style={oNhanTruong}>
                                              Đơn vị công tác
                                            </span>
                                            <SearchSelect
                                              ariaLabel="Đơn vị công tác"
                                              value={editDonViId}
                                              onChange={(v) => setEditDonViId(v)}
                                              options={donViList.map((dv) => ({
                                                value:
                                                  dv.id_don_vi || dv.IdDonVi,
                                                label:
                                                  dv.ten_don_vi || dv.TenDonVi,
                                              }))}
                                              placeholder="Chọn đơn vị"
                                            />
                                          </div>
                                        )}
                                        {duocNhapChucVu && (
                                          <div>
                                            <span style={oNhanTruong}>
                                              Chức vụ
                                            </span>
                                            <SearchSelect
                                              ariaLabel="Chức vụ"
                                              value={editChucVuId}
                                              onChange={(v) =>
                                                setEditChucVuId(v)
                                              }
                                              options={[
                                                {
                                                  value: "",
                                                  label:
                                                    "(Không giữ chức vụ quản lý)",
                                                },
                                                ...chucVuChonDuoc.map((cv) => ({
                                                  value:
                                                    cv.id_chuc_vu || cv.IdChucVu,
                                                  label:
                                                    cv.ten_chuc_vu ||
                                                    cv.TenChucVu,
                                                })),
                                              ]}
                                              placeholder="Chọn chức vụ"
                                            />
                                          </div>
                                        )}
                                        <div>
                                          <label
                                            htmlFor={`cv-tu-ngay-${item.IdNvChucVu}`}
                                            style={oNhanTruong}
                                          >
                                            Từ ngày
                                          </label>
                                          <input
                                            id={`cv-tu-ngay-${item.IdNvChucVu}`}
                                            type="date"
                                            className="form-input"
                                            value={editChucVuFromDate}
                                            onChange={(e) =>
                                              setEditChucVuFromDate(
                                                e.target.value,
                                              )
                                            }
                                            style={oNhapTrongBang}
                                          />
                                          <p
                                            style={{
                                              margin: "5px 0 0",
                                              fontSize: "12px",
                                              color:
                                                editChucVuFromDate !==
                                                chiNgay(item.TuNgay)
                                                  ? "#b45309"
                                                  : "#64748b",
                                            }}
                                          >
                                            {editChucVuFromDate !==
                                            chiNgay(item.TuNgay)
                                              ? "Đổi ngày bắt đầu sẽ tính lại giảm trừ giờ giảng của các năm liên quan."
                                              : "Ngày bắt đầu giữ chức vụ tại đơn vị này."}
                                          </p>
                                        </div>
                                        <div>
                                          <label
                                            htmlFor={`cv-den-ngay-${item.IdNvChucVu}`}
                                            style={oNhanTruong}
                                          >
                                            Đến ngày
                                          </label>
                                          <input
                                            id={`cv-den-ngay-${item.IdNvChucVu}`}
                                            type="date"
                                            className="form-input"
                                            disabled={editLaChinh}
                                            value={editChucVuToDate}
                                            onChange={(e) =>
                                              setEditChucVuToDate(e.target.value)
                                            }
                                            style={oNhapTrongBang}
                                          />
                                          <p
                                            style={{
                                              margin: "5px 0 0",
                                              fontSize: "12px",
                                              color: "#64748b",
                                            }}
                                          >
                                            {editLaChinh
                                              ? "Đơn vị chính không đặt ngày kết thúc."
                                              : "Để trống nếu vẫn đang công tác."}
                                          </p>
                                        </div>
                                        <div style={{ gridColumn: "1 / -1" }}>
                                          <label
                                            htmlFor={`cv-ghi-chu-${item.IdNvChucVu}`}
                                            style={oNhanTruong}
                                          >
                                            Ghi chú
                                          </label>
                                          <input
                                            id={`cv-ghi-chu-${item.IdNvChucVu}`}
                                            type="text"
                                            className="form-input"
                                            placeholder="Tối đa 500 ký tự"
                                            value={editChucVuNote}
                                            onChange={(e) =>
                                              setEditChucVuNote(e.target.value)
                                            }
                                            maxLength={500}
                                            style={oNhapTrongBang}
                                          />
                                        </div>
                                      </div>

                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "12px",
                                          marginTop: "16px",
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        {duocNhapChucVu && (
                                          <label
                                            style={{
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: "8px",
                                              fontSize: "13px",
                                              color: "#334155",
                                              cursor: "pointer",
                                            }}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={editLaChinh}
                                              onChange={(e) => {
                                                setEditLaChinh(e.target.checked);
                                                if (e.target.checked)
                                                  setEditChucVuToDate("");
                                              }}
                                              style={{
                                                width: "16px",
                                                height: "16px",
                                                accentColor: "#0056b3",
                                                cursor: "pointer",
                                              }}
                                            />
                                            Đặt làm đơn vị chính
                                          </label>
                                        )}
                                        <div style={{ flex: 1 }}></div>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setEditingChucVuId(null)
                                          }
                                          style={oNutPhu}
                                        >
                                          Hủy
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleSubmitEditChucVu(item)
                                          }
                                          style={oNutChinh}
                                        >
                                          Lưu thay đổi
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              return (
                                <tr
                                  key={item.IdNvChucVu}
                                  style={
                                    daKetThuc ? { background: "#fcfcfd" } : undefined
                                  }
                                >
                                  <td style={oODuLieu}>
                                    <div
                                      style={{
                                        fontSize: "15px",
                                        fontWeight: "600",
                                        lineHeight: 1.35,
                                        color: daKetThuc ? "#475569" : "#0f172a",
                                      }}
                                    >
                                      {tenDonVi}
                                    </div>
                                    {item.LaChinh && (
                                      <div
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: "5px",
                                          marginTop: "3px",
                                          fontSize: "12px",
                                          fontWeight: "600",
                                          color: "#0369a1",
                                        }}
                                      >
                                        <i
                                          className="fa-solid fa-star"
                                          style={{ fontSize: "10px" }}
                                          aria-hidden="true"
                                        ></i>
                                        Đơn vị chính
                                      </div>
                                    )}
                                    {!isEditing && (
                                      <div
                                        style={{
                                          marginTop: "3px",
                                          fontSize: "12px",
                                          fontWeight: "600",
                                          color: "#b45309",
                                        }}
                                      >
                                        Chưa lưu
                                      </div>
                                    )}
                                  </td>

                                  <td style={oODuLieu}>
                                    {tenChucVu ? (
                                      <>
                                        <div
                                          style={{
                                            fontSize: "14px",
                                            color: daKetThuc
                                              ? "#475569"
                                              : "#1e293b",
                                          }}
                                        >
                                          {tenChucVu}
                                        </div>
                                        {giamTru && (
                                          <div
                                            style={{
                                              marginTop: "2px",
                                              fontSize: "12px",
                                              color: "#64748b",
                                            }}
                                          >
                                            {giamTru}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <span
                                        style={{
                                          fontSize: "14px",
                                          color: "#8a93a2",
                                          fontStyle: "italic",
                                        }}
                                      >
                                        Không giữ chức vụ
                                      </span>
                                    )}
                                  </td>

                                  <td style={oODuLieu}>
                                    <div
                                      style={{
                                        fontSize: "13px",
                                        whiteSpace: "nowrap",
                                        color: daKetThuc ? "#475569" : "#334155",
                                      }}
                                    >
                                      {formatDate(item.TuNgay)} →{" "}
                                      {daKetThuc
                                        ? formatDate(item.DenNgay)
                                        : "nay"}
                                    </div>
                                    <div
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        marginTop: "3px",
                                        fontSize: "12px",
                                        color: daKetThuc ? "#64748b" : "#15803d",
                                      }}
                                    >
                                      <span
                                        style={{
                                          width: "6px",
                                          height: "6px",
                                          borderRadius: "50%",
                                          background: daKetThuc
                                            ? "#94a3b8"
                                            : "#16a34a",
                                        }}
                                      ></span>
                                      {daKetThuc
                                        ? "Đã kết thúc"
                                        : "Đang công tác"}
                                    </div>
                                  </td>

                                  <td
                                    style={{
                                      ...oODuLieu,
                                      fontSize: "13px",
                                      color: "#64748b",
                                      lineHeight: 1.45,
                                    }}
                                  >
                                    {item.GhiChu || ""}
                                  </td>

                                  {duocSuaChucVu && (
                                    <td
                                      style={{
                                        ...oODuLieu,
                                        textAlign: "right",
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          gap: "6px",
                                          justifyContent: "flex-end",
                                        }}
                                      >
                                        <button
                                          type="button"
                                          title="Chỉnh sửa"
                                          aria-label={`Sửa dòng ${tenDonVi}`}
                                          onClick={() => startEditChucVu(item)}
                                          style={{
                                            ...oNutIcon,
                                            color: "#0056b3",
                                          }}
                                        >
                                          <i
                                            className="fa-solid fa-pen-to-square"
                                            style={{ fontSize: "14px" }}
                                            aria-hidden="true"
                                          ></i>
                                        </button>
                                        <button
                                          type="button"
                                          title="Xóa"
                                          aria-label={`Xóa dòng ${tenDonVi}`}
                                          onClick={() =>
                                            handleDeleteChucVu(item.IdNvChucVu)
                                          }
                                          style={{
                                            ...oNutIcon,
                                            color: "#b42318",
                                          }}
                                        >
                                          <i
                                            className="fa-solid fa-trash"
                                            style={{ fontSize: "14px" }}
                                            aria-hidden="true"
                                          ></i>
                                        </button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky/Fixed footer for Save / Cancel operations */}
      {!isLoading && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "15px",
            justifyContent: "flex-end",
            background: "#f8fafc",
            padding: "15px 25px",
            borderRadius: "8px",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          {isEditing ? (
            /* Edit Mode: "Hủy thay đổi" button */
            <button
              type="button"
              className="btn-cancel"
              onClick={handleCancelChanges}
              disabled={!isFormDirty}
              style={{
                margin: 0,
                background: !isFormDirty ? "#f8fafc" : "#f1f5f9",
                color: !isFormDirty ? "#94a3b8" : "#334155",
                border: !isFormDirty
                  ? "1px solid #e2e8f0"
                  : "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "10px 20px",
                fontWeight: "600",
                cursor: !isFormDirty ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
              }}
              title="Hủy tất cả các thay đổi chưa lưu trên form"
            >
              <i className="fa-solid fa-rotate-left"></i> Hủy thay đổi
            </button>
          ) : (
            /* Create Mode: "Hủy" button */
            <button
              type="button"
              className="btn-cancel"
              onClick={handleBack}
              style={{
                margin: 0,
                background: "#f1f5f9",
                color: "#334155",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                padding: "10px 20px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              title="Hủy thêm mới và quay lại"
            >
              <i className="fa-solid fa-times"></i> Hủy
            </button>
          )}

          {canManage && (
            <button
              type="submit"
              form="nhanVienGlobalForm"
              onClick={activeTab !== "account" ? handleGlobalSubmit : undefined}
              className="btn-submit"
              style={{
                margin: 0,
                background: "#0056b3",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                padding: "10px 20px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <i className="fa-solid fa-floppy-disk"></i> Lưu dữ liệu
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default QL_NhanVienChiTiet;
