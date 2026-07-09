import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "../../css/Pages.css";
import { apiFetch } from "../../utils/api";

const QL_NhanVienChiTiet = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUser = user || {};
  const roleCode = currentUser?.MaChucVu || "";
  const isHRAdmin = roleCode === "Admin" || roleCode === "HR";
  const canManage =
    roleCode === "Admin" || ["HT", "PHT", "TK", "TBM"].includes(roleCode);

  const isEditing = !!id;

  // Tabs state: 'account' | 'title' | 'position'
  const [activeTab, setActiveTab] = useState("account");

  const initialForm = {
    MaNhanVien: "",
    MatKhau: "",
    HoTen: "",
    Email: "",
    IdDonVi: "",
    IdChucVu: "",
    IdQuanLyTrucTiep: "",
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

  // Block B: Concurrent Positions
  const [chucVuConcurrent, setChucVuConcurrent] = useState([]);
  const [isLoadingChucVu, setIsLoadingChucVu] = useState(false);
  const [isAddingChucVu, setIsAddingChucVu] = useState(false);

  // Form inputs for Adding Concurrent Position
  const [newChucVuId, setNewChucVuId] = useState("");
  const [newChucVuFromDate, setNewChucVuFromDate] = useState("");
  const [newChucVuToDate, setNewChucVuToDate] = useState("");
  const [newChucVuNote, setNewChucVuNote] = useState("");
  const [isCurrentChucVu, setIsCurrentChucVu] = useState(true);

  // Inline edit states for concurrent position row
  const [editingChucVuId, setEditingChucVuId] = useState(null);
  const [editChucVuToDate, setEditChucVuToDate] = useState("");
  const [editChucVuNote, setEditChucVuNote] = useState("");

  // Helper to check if basic form fields differ from original/initial state
  const isFormDirty = JSON.stringify(formData) !== JSON.stringify(isEditing ? originalFormData : initialForm);

  // Check if there are unsaved drafts in title change panel
  const isTitleDraftDirty = isChangingTitle && (
    newTitleId !== "" ||
    newTitleFromDate !== "" ||
    newTitleNote !== ""
  );

  // Check if there are unsaved drafts in position adding panel
  const isChucVuDraftDirty = isAddingChucVu && (
    newChucVuId !== "" ||
    newChucVuFromDate !== "" ||
    newChucVuNote !== ""
  );

  // Check if there are active inline edits
  const isInlineEditDirty = editingTitleId !== null || editingChucVuId !== null;

  // In Create Mode, any items in title/position history arrays count as unsaved changes
  const isCreateHistoryDirty = !isEditing && (chucDanhHistory.length > 0 || chucVuConcurrent.length > 0);

  const isDirty = isFormDirty || isTitleDraftDirty || isChucVuDraftDirty || isInlineEditDirty || isCreateHistoryDirty;

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty && !isSavingRef.current) {
        e.preventDefault();
        e.returnValue = "Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn rời khỏi trang?";
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
      const confirmLeave = window.confirm("Bạn có thay đổi chưa lưu. Bạn có chắc chắn muốn rời khỏi trang?");
      if (!confirmLeave) return;
    }
    navigate("/quan-ly-nguoi-dung");
  };

  const handleCancelChanges = () => {
    if (window.confirm("Bạn có chắc chắn muốn hủy bỏ tất cả thay đổi chưa lưu trên form?")) {
      setFormData(originalFormData);
      setErrors({});
    }
  };

  useEffect(() => {
    fetchDropdownData();
    if (isEditing) {
      fetchEmployeeDetail();
      fetchChucDanhHistory();
      fetchChucVuConcurrent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchDropdownData = async () => {
    try {
      const [dvRes, cvRes, cdRes, nvRes] = await Promise.all([
        apiFetch("donvi"),
        apiFetch("chucvu"),
        apiFetch("chuc-danh-nghe-nghiep"),
        apiFetch("nhan-vien"),
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
          .filter((item) => {
            const name = item.ten_chuc_danh || item.TenChucDanh || "";
            return !name.toLowerCase().includes("không có chức danh");
          })
          .sort((a, b) => {
            const idA = a.id_chuc_danh || a.IdChucDanh || 0;
            const idB = b.id_chuc_danh || b.IdChucDanh || 0;
            return idA - idB;
          });
        setChucDanhList(processedList);
      }
      if (nvRes.ok) {
        const res = await nvRes.json();
        const list = res.Items || (Array.isArray(res) ? res : []);
        setQuanLyList(list);
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu dropdown:", error);
    }
  };

  const fetchEmployeeDetail = async () => {
    setIsLoading(true);
    try {
      const response = await apiFetch("nhan-vien");
      if (response.ok) {
        const result = await response.json();
        const list = result.Items || (Array.isArray(result) ? result : []);
        const found = list.find((item) => item.IdNhanVien === parseInt(id));
        if (found) {
          const detail = {
            ...found,
            IdDonVi: found.IdDonVi || "",
            IdChucVu: found.IdChucVu || "",
            IdChucDanh: found.IdChucDanh || "",
            IdQuanLyTrucTiep: found.IdQuanLyTrucTiep || "",
            MatKhau: "", // empty by default when editing
          };
          setFormData(detail);
          setOriginalFormData(detail);
        } else {
          alert("Không tìm thấy nhân viên này!");
          navigate("/quan-ly-nguoi-dung");
        }
      }
    } catch (error) {
      console.error("Lỗi tải chi tiết nhân viên:", error);
    } finally {
      setIsLoading(false);
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
      const todayStr = new Date().toLocaleDateString("sv");
      const res = await apiFetch(
        `nhan-vien-chuc-vu/by-nhan-vien/${id}?atDate=${todayStr}`,
      );
      if (res.ok) {
        const data = await res.json();
        setChucVuConcurrent(data.Items || []);
      }
    } catch (err) {
      console.error("Lỗi khi tải chức vụ:", err);
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

  // Actions for Block B (Chức vụ)
  const resetAddChucVuForm = () => {
    setNewChucVuId("");
    setNewChucVuFromDate("");
    setNewChucVuToDate("");
    setNewChucVuNote("");
    setIsCurrentChucVu(true);
    setIsAddingChucVu(false);
  };

  const handleSubmitAddChucVu = async () => {
    if (!newChucVuId) {
      alert("Vui lòng chọn chức vụ.");
      return;
    }
    if (!validateDates(newChucVuFromDate, newChucVuToDate)) return;
    if (!validateNote(newChucVuNote)) return;

    if (isEditing) {
      try {
        const res = await apiFetch("nhan-vien-chuc-vu", {
          method: "POST",
          body: JSON.stringify({
            IdNhanVien: parseInt(id),
            IdChucVu: parseInt(newChucVuId),
            TuNgay: newChucVuFromDate,
            DenNgay: newChucVuToDate || null,
            GhiChu: newChucVuNote || null,
          }),
        });
        const resData = await res.json();
        if (res.ok && resData.Success) {
          resetAddChucVuForm();
          fetchChucVuConcurrent();
        } else {
          alert(resData.Message || "Thêm chức vụ thất bại!");
        }
      } catch (err) {
        alert("Có lỗi xảy ra: " + err.message);
      }
    } else {
      const selectedCV = chucVuList.find(
        (cv) => (cv.id_chuc_vu || cv.IdChucVu || 0) === parseInt(newChucVuId),
      );
      const cvName = selectedCV
        ? selectedCV.ten_chuc_vu || selectedCV.TenChucVu
        : "";
      const cvRate = selectedCV
        ? selectedCV.ty_le_dinh_muc_giang || selectedCV.TyLeDinhMucGiang
        : null;
      const newItem = {
        IdNvChucVu: Date.now(),
        IdChucVu: parseInt(newChucVuId),
        TenChucVu: cvName,
        TyLeDinhMucGiang: cvRate,
        TuNgay: newChucVuFromDate,
        DenNgay: newChucVuToDate || null,
        GhiChu: newChucVuNote || null,
      };
      const newConcurrent = [...chucVuConcurrent, newItem];
      setChucVuConcurrent(newConcurrent);
      resetAddChucVuForm();
    }
  };

  const startEditChucVu = (item) => {
    setEditingChucVuId(item.IdNvChucVu);
    setEditChucVuToDate(item.DenNgay || new Date().toLocaleDateString("sv"));
    setEditChucVuNote(item.GhiChu || "");
  };

  const handleSubmitEditChucVu = async (item) => {
    if (editChucVuToDate && editChucVuToDate < item.TuNgay) {
      alert(
        "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu (" +
          item.TuNgay +
          ").",
      );
      return;
    }
    if (!validateNote(editChucVuNote)) return;

    if (isEditing) {
      try {
        const res = await apiFetch(`nhan-vien-chuc-vu/${item.IdNvChucVu}`, {
          method: "PUT",
          body: JSON.stringify({
            DenNgay: editChucVuToDate || null,
            GhiChu: editChucVuNote || null,
          }),
        });
        const resData = await res.json();
        if (res.ok && resData.Success) {
          setEditingChucVuId(null);
          fetchChucVuConcurrent();
        } else {
          alert(resData.Message || "Cập nhật chức vụ thất bại!");
        }
      } catch (err) {
        alert("Có lỗi xảy ra: " + err.message);
      }
    } else {
      const newConcurrent = chucVuConcurrent.map((c) => {
        if (c.IdNvChucVu === item.IdNvChucVu) {
          return {
            ...c,
            DenNgay: editChucVuToDate || null,
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
    if (!window.confirm("Bạn có chắc chắn muốn xóa chức vụ này?")) return;
    if (isEditing) {
      try {
        const res = await apiFetch(`nhan-vien-chuc-vu/${idNvChucVu}`, {
          method: "DELETE",
        });
        const resData = await res.json();
        if (res.ok && resData.Success) {
          fetchChucVuConcurrent();
        } else {
          alert(resData.Message || "Xóa chức vụ thất bại!");
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
    } else if (name === "IdDonVi" && !value) {
      errorMsg = "Vui lòng chọn đơn vị trực thuộc.";
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

  const handleGlobalSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!canManage) return alert("Bạn không có quyền thực hiện chức năng này!");

    // Validate basic form
    const errMa = !formData.MaNhanVien ? "Mã nhân viên là bắt buộc." : "";
    const errTen = !formData.HoTen ? "Họ và tên là bắt buộc." : "";
    const errDV = !formData.IdDonVi ? "Vui lòng chọn đơn vị trực thuộc." : "";
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

    if (errMa || errTen || errDV || errPass || errEmail) {
      setErrors({
        MaNhanVien: errMa,
        HoTen: errTen,
        IdDonVi: errDV,
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

    setIsLoading(true);

    const method = isEditing ? "PUT" : "POST";
    const payload = {
      ...formData,
      IdDonVi: formData.IdDonVi ? parseInt(formData.IdDonVi) : null,
      IdChucVu: formData.IdChucVu ? parseInt(formData.IdChucVu) : null,
      IdChucDanh: currentTitle ? parseInt(currentTitle.IdChucDanh) : null, // Set main title from the active history item
      IdQuanLyTrucTiep: formData.IdQuanLyTrucTiep
        ? parseInt(formData.IdQuanLyTrucTiep)
        : null,
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

          // Save Concurrent Positions
          for (const pos of chucVuConcurrent) {
            await apiFetch("nhan-vien-chuc-vu", {
              method: "POST",
              body: JSON.stringify({
                IdNhanVien: createdId,
                IdChucVu: pos.IdChucVu,
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
        <div className="header-title" style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#0f172a" }}>
            {isEditing
              ? "THÔNG TIN CHI TIẾT NHÂN VIÊN"
              : "THÊM NHÂN VIÊN MỚI"}
          </h2>
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
          Lịch sử Chức danh{" "}
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
            className="fa-solid fa-briefcase"
            style={{ marginRight: "8px" }}
          ></i>{" "}
          Lịch sử Chức vụ{" "}
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
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
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
                          borderColor: errors.MaNhanVien ? "#ef4444" : "#cbd5e1",
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
                      <span style={{ fontSize: "11.5px", color: "#475569", marginTop: "4px", display: "block" }}>
                        <i className="fa-solid fa-circle-info" style={{ marginRight: "4px" }}></i>
                        Mã nhân viên không thể chỉnh sửa sau khi tạo.
                      </span>
                    )}
                    {errors.MaNhanVien && (
                      <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
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
                      <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                        {errors.HoTen}
                      </span>
                    )}
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginTop: "15px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>
                      Đơn vị trực thuộc <span className="text-red">*</span>
                    </label>
                    <select
                      name="IdDonVi"
                      className="form-input"
                      value={formData.IdDonVi || ""}
                      onChange={handleChange}
                      required
                      style={{
                        margin: 0,
                        borderColor: errors.IdDonVi ? "#ef4444" : "#cbd5e1",
                      }}
                    >
                      <option value="">Chọn đơn vị</option>
                      {donViList.map((dv) => (
                        <option
                          key={dv.id_don_vi || dv.IdDonVi}
                          value={dv.id_don_vi || dv.IdDonVi}
                        >
                          {dv.ten_don_vi || dv.TenDonVi}
                        </option>
                      ))}
                    </select>
                    {errors.IdDonVi && (
                      <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
                        {errors.IdDonVi}
                      </span>
                    )}
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Người quản lý trực tiếp</label>
                    <select
                      name="IdQuanLyTrucTiep"
                      className="form-input"
                      value={formData.IdQuanLyTrucTiep || ""}
                      onChange={handleChange}
                      style={{ margin: 0 }}
                    >
                      <option value="">Không có</option>
                      {quanLyList
                        .filter((nv) => nv.IdNhanVien !== parseInt(id))
                        .map((nv) => (
                          <option key={nv.IdNhanVien} value={nv.IdNhanVien}>
                            {nv.MaNhanVien} - {nv.HoTen}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid-2" style={{ marginTop: "15px" }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Email liên hệ</label>
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
                      <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
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
                      <span style={{ color: "#ef4444", fontSize: "12px", marginTop: "4px", display: "block" }}>
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
                  {isHRAdmin && !isChangingTitle && (
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
                            <select
                              className="form-input"
                              value={newTitleId}
                              onChange={(e) => setNewTitleId(e.target.value)}
                              style={{ padding: "8px" }}
                            >
                              <option value="">Chọn chức danh</option>
                              {chucDanhList.map((cd) => (
                                <option
                                  key={cd.id_chuc_danh || cd.IdChucDanh}
                                  value={cd.id_chuc_danh || cd.IdChucDanh}
                                >
                                  {cd.ten_chuc_danh || cd.TenChucDanh}
                                </option>
                              ))}
                            </select>
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
                                <i className="fa-solid fa-circle-check" style={{ marginRight: "6px" }}></i>
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
                            {isHRAdmin && (
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
                                colSpan={isHRAdmin ? 5 : 4}
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
                                        <i className="fa-solid fa-circle-check" style={{ marginRight: "4px", fontSize: "10px" }}></i>
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
                                      item.GhiChu || "—"
                                    )}
                                  </td>
                                  {isHRAdmin && (
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
                                            <i className="fa-solid fa-check" style={{ fontSize: "13px" }}></i>
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
                                            <i className="fa-solid fa-times" style={{ fontSize: "13px" }}></i>
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
                                            <i className="fa-solid fa-pencil" style={{ fontSize: "13px" }}></i>
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
                                            <i className="fa-solid fa-trash" style={{ fontSize: "13px" }}></i>
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

            {/* TAB 3: LỊCH SỬ CHỨC VỤ */}
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
                      className="fa-solid fa-briefcase"
                      style={{ color: "#0056b3" }}
                    ></i>
                    Chức vụ
                  </h3>
                  {isHRAdmin && !isAddingChucVu && (
                    <button
                      type="button"
                      className="btn-add-new"
                      onClick={() => setIsAddingChucVu(true)}
                      style={{
                        margin: 0,
                        padding: "8px 14px",
                        fontSize: "13px",
                      }}
                    >
                      <i className="fa-solid fa-plus"></i> Thêm chức vụ mới
                    </button>
                  )}
                </div>

                {isLoadingChucVu ? (
                  <div style={{ padding: "10px 0", color: "#666" }}>
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Đang
                    tải dữ liệu chức vụ...
                  </div>
                ) : (
                  <>
                    {/* Form: Add Concurrent Position */}
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
                          Thêm chức vụ mới
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
                              Chức vụ <span className="text-red">*</span>
                            </label>
                            <select
                              className="form-input"
                              value={newChucVuId}
                              onChange={(e) => setNewChucVuId(e.target.value)}
                              style={{ padding: "8px" }}
                            >
                              <option value="">Chọn chức vụ</option>
                              {chucVuList.map((cv) => (
                                <option
                                  key={cv.id_chuc_vu || cv.IdChucVu}
                                  value={cv.id_chuc_vu || cv.IdChucVu}
                                >
                                  {cv.ten_chuc_vu || cv.TenChucVu}
                                </option>
                              ))}
                            </select>
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
                              value={newChucVuFromDate}
                              onChange={(e) =>
                                setNewChucVuFromDate(e.target.value)
                              }
                              style={{ padding: "8px" }}
                            />
                          </div>
                        </div>
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
                              style={{
                                fontSize: "12px",
                                marginBottom: "5px",
                                color: isCurrentChucVu ? "#475569" : "inherit",
                              }}
                            >
                              Đến ngày
                            </label>
                            {isCurrentChucVu ? (
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
                                <i className="fa-solid fa-circle-check" style={{ marginRight: "6px" }}></i>
                                Đang giữ
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
                                Đây là chức vụ hiện tại
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
                              value={newChucVuNote}
                              onChange={(e) => setNewChucVuNote(e.target.value)}
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

                    {/* Table Chuc Vu History */}
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
                                width: "25%",
                              }}
                            >
                              CHỨC VỤ
                            </th>
                            <th
                              style={{
                                padding: "10px",
                                textAlign: "right",
                                borderBottom: "1px solid #e2e8f0",
                                width: "160px",
                              }}
                            >
                              ĐỊNH MỨC GIỜ GIẢNG
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
                                width: "20%",
                              }}
                            >
                              GHI CHÚ
                            </th>
                            {isHRAdmin && (
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
                          {chucVuConcurrent.length === 0 ? (
                            <tr>
                              <td
                                colSpan={isHRAdmin ? 6 : 5}
                                style={{
                                  padding: "15px",
                                  textAlign: "center",
                                  color: "#475569",
                                  fontStyle: "italic",
                                }}
                              >
                                Chưa có dữ liệu chức vụ
                              </td>
                            </tr>
                          ) : (
                            chucVuConcurrent.map((item) => {
                              const isEditingRow =
                                editingChucVuId === item.IdNvChucVu;
                              return (
                                <tr
                                  key={item.IdNvChucVu}
                                  style={{ borderBottom: "1px solid #f1f5f9" }}
                                >
                                  <td
                                    style={{
                                      padding: "10px",
                                      fontWeight: "500",
                                      color: "#334155",
                                    }}
                                  >
                                    {item.TenChucVu}
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
                                      textAlign: "right",
                                    }}
                                  >
                                    {item.TyLeDinhMucGiang != null
                                      ? `${(item.TyLeDinhMucGiang * 100).toFixed(0)}%`
                                      : "—"}
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
                                        value={editChucVuToDate}
                                        onChange={(e) =>
                                          setEditChucVuToDate(e.target.value)
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
                                        <i className="fa-solid fa-circle-check" style={{ marginRight: "4px", fontSize: "10px" }}></i>
                                        Đang giữ
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
                                        value={editChucVuNote}
                                        onChange={(e) =>
                                          setEditChucVuNote(e.target.value)
                                        }
                                        maxLength={500}
                                        style={{
                                          padding: "4px 8px",
                                          fontSize: "13px",
                                          margin: 0,
                                        }}
                                      />
                                    ) : (
                                      item.GhiChu || "—"
                                    )}
                                  </td>
                                  {isHRAdmin && (
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
                                              handleSubmitEditChucVu(item)
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
                                            <i className="fa-solid fa-check" style={{ fontSize: "13px" }}></i>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditingChucVuId(null)
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
                                            <i className="fa-solid fa-times" style={{ fontSize: "13px" }}></i>
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
                                            onClick={() =>
                                              startEditChucVu(item)
                                            }
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
                                            <i className="fa-solid fa-pencil" style={{ fontSize: "13px" }}></i>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteChucVu(
                                                item.IdNvChucVu,
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
                                            <i className="fa-solid fa-trash" style={{ fontSize: "13px" }}></i>
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
          {/* Ghost style "Quay lại" button */}
          <button
            type="button"
            className="btn-cancel"
            onClick={handleBack}
            style={{
              margin: 0,
              background: "transparent",
              color: "#475569",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "10px 20px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            title="Quay lại danh sách nhân viên"
          >
            <i className="fa-solid fa-arrow-left"></i> Quay lại
          </button>

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
                border: !isFormDirty ? "1px solid #e2e8f0" : "1px solid #cbd5e1",
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
