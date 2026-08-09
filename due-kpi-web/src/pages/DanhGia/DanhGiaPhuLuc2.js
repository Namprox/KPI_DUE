import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import "../../css/Pages.css";
import "../../css/DanhGia/DanhGiaPhuLuc2.css";
import DanhGiaPhuLuc2Form from "../../components/DanhGia/DanhGiaPhuLuc2/DanhGiaPhuLuc2Form";
import FilePreviewModal from "../../components/Common/FilePreviewModal";
import { Toast } from "primereact/toast";
import { confirmDialog } from "primereact/confirmdialog";
import { apiFetch } from "../../utils/api";
import { useMinhChungPhieuPreview } from "../../hooks/useMinhChungPhieuPreview";
import { locFilePdf } from "../../utils/minhChungPhieuApi";
import { formatNgay, huyNopPhieu } from "../../utils/phieuApi";
import SearchSelect from "../../components/Common/SearchSelect";

const parseNetDate = (dateString) => {
  if (!dateString) return null;
  if (typeof dateString === "string" && dateString.includes("/Date(")) {
    return new Date(parseInt(dateString.match(/\d+/)[0], 10));
  }
  return new Date(dateString);
};

// Flatten the template groups (Nhom -> NhomCon -> TieuChi) into a flat criteria list
const flattenTemplate = (itemDetail) => {
  const flatCriteria = [];
  if (itemDetail.Nhom && Array.isArray(itemDetail.Nhom)) {
    itemDetail.Nhom.forEach((nhomCha) => {
      if (nhomCha.TieuChi && Array.isArray(nhomCha.TieuChi)) {
        nhomCha.TieuChi.forEach((tc) => {
          flatCriteria.push({
            ...tc,
            TenNhom: nhomCha.TenNhom,
            CacThangDiem: tc.ThangDiem || [],
          });
        });
      }
      if (nhomCha.NhomCon && Array.isArray(nhomCha.NhomCon)) {
        nhomCha.NhomCon.forEach((nhomCon) => {
          if (nhomCon.TieuChi && Array.isArray(nhomCon.TieuChi)) {
            nhomCon.TieuChi.forEach((tc) => {
              flatCriteria.push({
                ...tc,
                TenNhom: nhomCon.TenNhom || nhomCha.TenNhom,
                CacThangDiem: tc.ThangDiem || [],
              });
            });
          }
        });
      }
    });
  }
  return flatCriteria;
};

const DanhGiaPhuLuc2 = () => {
  const [criteriaList, setCriteriaList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({});
  const [autoScores, setAutoScores] = useState({}); // IdTieuChi -> { DiemTuDong, ... }
  const [tongDiemCoBan, setTongDiemCoBan] = useState(0);

  const [trangThaiPhieu, setTrangThaiPhieu] = useState(0);
  const [lyDoTraVe, setLyDoTraVe] = useState("");
  // Đơn vị đã chấm ≥ 1 tiêu chí -> server từ chối hủy nộp (409 DA_CHAM), nên ẩn
  // nút thay vì để giảng viên bấm rồi nhận lỗi.
  const [khoaDaCham, setKhoaDaCham] = useState(false);

  const toast = useRef(null);

  // Giảng viên xem lại minh chứng đã tải lên của chính mình
  const { preview, openPreview, closePreview, downloadMinhChung } =
    useMinhChungPhieuPreview((message) =>
      toast.current?.show({
        severity: "error",
        summary: "Lỗi",
        detail: message,
        life: 4000,
      }),
    );

  // Refs holding the freshest values for async flows (create phieu / save draft / submit)
  const phieuRef = useRef(null); // { IdPhieu, RowVersion, TrangThai, IdMau, ChiTiet, ... }
  const idMauRef = useRef(null);
  const chiTietMapRef = useRef({}); // IdTieuChi -> IdChiTiet
  const formDataRef = useRef({});
  const autoScoresRef = useRef({});
  const dirtyRef = useRef(new Set()); // IdTieuChi with unsaved manual edits

  const { user } = useAuth();
  const currentUser = user || {};

  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const yearParam = queryParams.get("year");

  const [listYears, setListYears] = useState([]);
  const [yearDetails, setYearDetails] = useState([]);
  const [selectedYear, setSelectedYear] = useState(
    yearParam ? parseInt(yearParam) : new Date().getFullYear(),
  );

  // Keep refs in sync with state so unmount / async closures read the latest values
  const selectedYearRef = useRef(selectedYear);
  const idNhanVienRef = useRef(currentUser.IdNhanVien);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);
  useEffect(() => {
    autoScoresRef.current = autoScores;
  }, [autoScores]);
  useEffect(() => {
    selectedYearRef.current = selectedYear;
  }, [selectedYear]);
  useEffect(() => {
    idNhanVienRef.current = currentUser.IdNhanVien;
  }, [currentUser.IdNhanVien]);

  useEffect(() => {
    const fetchYears = async () => {
      const currentRealYear = new Date().getFullYear();
      try {
        const res = await apiFetch("namdanhgia");
        const result = await res.json();
        const listNam = result.Items || (Array.isArray(result) ? result : []);

        if (listNam.length > 0) {
          setYearDetails(listNam);
          const years = listNam
            .map((item) => item.IdNam || item.id_nam || item.NamHoc || item.nam)
            .filter((y) => y != null && !isNaN(y));
          const uniqueYears = [...new Set(years)].sort((a, b) => b - a);

          if (uniqueYears.length > 0) {
            setListYears(uniqueYears);

            if (!yearParam) {
              const defaultYear = uniqueYears.includes(currentRealYear) ? currentRealYear : uniqueYears[0];
              setSelectedYear(defaultYear);
              navigate(`/danh-gia-phu-luc-2?year=${defaultYear}`, {
                replace: true,
              });
            }
          } else {
            setListYears([currentRealYear]);
          }
        } else {
          setListYears([currentRealYear]);
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách năm:", err);
        setListYears([currentRealYear]);
      }
    };

    fetchYears();
  }, [navigate, yearParam]);

  useEffect(() => {
    const fetchScoringData = async () => {
      setIsLoading(true);

      // Reset all state + refs for the new year
      phieuRef.current = null;
      idMauRef.current = null;
      chiTietMapRef.current = {};
      dirtyRef.current = new Set();
      setFormData({});
      setAutoScores({});
      setTongDiemCoBan(0);
      setTrangThaiPhieu(0);
      setLyDoTraVe("");
      setKhoaDaCham(false);
      setCriteriaList([]);

      try {
        let phieu = null;
        let chiTiet = [];
        let idMau = null;

        // 1. Load the current user's phieu for this year (if any)
        try {
          const resPhieu = await apiFetch(`phieu/me/${selectedYear}`);
          if (resPhieu.ok) {
            const resultPhieu = await resPhieu.json();
            const isSuccess =
              resultPhieu.Success !== undefined
                ? resultPhieu.Success
                : resultPhieu.success;
            const itemPhieu =
              resultPhieu.Item || resultPhieu.data || resultPhieu.phieu;
            if (isSuccess && itemPhieu) {
              phieu = itemPhieu;
              idMau = phieu.IdMau;
              chiTiet = phieu.ChiTiet || phieu.chiTiet || [];
            }
          }
        } catch (e) {
          console.error("Lỗi khi tải phiếu cá nhân:", e);
        }

        // 2. No phieu yet -> resolve the template for this year (phieu is created lazily later)
        if (!idMau) {
          try {
            const resTemplates = await apiFetch(`maudanhgia?loaiDoiTuong=1`);
            if (resTemplates.ok) {
              const resultTemplates = await resTemplates.json();
              const templates =
                resultTemplates.Items ||
                resultTemplates.data ||
                (Array.isArray(resultTemplates) ? resultTemplates : []);
              const matchedTemplate =
                templates.find(
                  (t) => t.IdNam === selectedYear && t.TrangThai,
                ) || templates.find((t) => t.IdNam === selectedYear);
              if (matchedTemplate) {
                idMau = matchedTemplate.IdMau;
              }
            }
          } catch (e) {
            console.error("Lỗi khi tải mẫu đánh giá:", e);
          }
        }

        if (!idMau) {
          setIsLoading(false);
          return;
        }
        idMauRef.current = idMau;

        // 3. Template details -> display structure (groups, scales)
        const resDetail = await apiFetch(`maudanhgia/${idMau}/chi-tiet`);
        if (!resDetail.ok)
          throw new Error("Không thể lấy chi tiết mẫu đánh giá");
        const resultDetail = await resDetail.json();
        const itemDetail = resultDetail.Item || resultDetail.data || {};
        setCriteriaList(flattenTemplate(itemDetail));

        // 4. Auto-computed scores for LoaiNguonDiem = 2 criteria (read-only)
        const autoMap = {};
        try {
          const resAuto = await apiFetch(
            `maudanhgia/${idMau}/diem-tu-dong?idNhanVien=${currentUser.IdNhanVien}`,
          );
          if (resAuto.ok) {
            const resultAuto = await resAuto.json();
            const autoItems =
              resultAuto.Items ||
              resultAuto.items ||
              (Array.isArray(resultAuto) ? resultAuto : []);
            autoItems.forEach((it) => {
              if (it && it.IdTieuChi != null) autoMap[it.IdTieuChi] = it;
            });
          }
        } catch (e) {
          console.error("Lỗi khi tải điểm tự động:", e);
        }

        // Điểm TB phản hồi SV đã nằm trong MinhChung của lời gọi trên -> không gọi
        // thêm diem-tb-phan-hoi-sv (API đó trả cả danh sách GV và chặn quyền theo đơn vị).

        setAutoScores(autoMap);
        autoScoresRef.current = autoMap;

        // 5. Hydrate the form state from an existing phieu
        if (phieu) {
          phieuRef.current = phieu;
          setTrangThaiPhieu(phieu.TrangThai);
          setLyDoTraVe(phieu.NhanXetKhoa || phieu.LyDoTraVe || "");
          setKhoaDaCham((chiTiet || []).some((ct) => ct.DiemKhoa != null));

          const map = {};
          const initialFormData = {};
          (chiTiet || []).forEach((ct) => {
            if (ct.IdTieuChi == null) return;
            map[ct.IdTieuChi] = ct.IdChiTiet;

            // Auto-scored criteria are not editable -> keep them out of the form state
            if (autoMap[ct.IdTieuChi]) return;

            initialFormData[ct.IdTieuChi] = {
              IdTieuChi: ct.IdTieuChi,
              IdThangDiemChon: ct.IdThangDiemChon ?? null,
              DiemTuDanhGia: ct.DiemTuDanhGia ?? null,
              MoTaHoanThanh: ct.MoTaHoanThanh || ct.NhanXetTuDanhGia || "",
              DanhSachFile: (ct.MinhChung || []).map((mc) => ({
                idMinhChung: mc.IdMinhChung,
                fileName: mc.DuongDan,
                originalName: mc.TenHienThi || mc.TenFileGoc || mc.DuongDan,
                fileType: mc.LoaiFile,
                fileSizeKB: mc.KichThuocKb || mc.KichThuocKB || 0,
              })),
            };
          });
          chiTietMapRef.current = map;
          setFormData(initialFormData);
        }
      } catch (err) {
        console.error("Lỗi API Tải dữ liệu đánh giá:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (listYears.length > 0 && currentUser.IdNhanVien) {
      fetchScoringData();
    }
  }, [selectedYear, currentUser.IdNhanVien, listYears.length]);

  const activeYear = yearDetails.find((y) => y.IdNam === selectedYear);
  let isWithinTime = false;
  let timeMessage = "";

  if (activeYear) {
    const now = new Date().getTime();
    const start = activeYear.NgayMoTuDanhGia
      ? parseNetDate(activeYear.NgayMoTuDanhGia).getTime()
      : 0;
    const end = activeYear.NgayDongTuDanhGia
      ? parseNetDate(activeYear.NgayDongTuDanhGia).setHours(23, 59, 59, 999)
      : 0;

    if (!activeYear.NgayMoTuDanhGia || !activeYear.NgayDongTuDanhGia) {
      timeMessage = "Hệ thống chưa thiết lập lịch tự đánh giá cho năm này";
    } else if (now < start) {
      timeMessage = `Chưa đến thời gian mở hệ thống. Lịch tự đánh giá sẽ bắt đầu từ ${formatNgay(activeYear.NgayMoTuDanhGia)}`;
    } else if (now > end) {
      timeMessage = `Đã hết hạn tự đánh giá! Hệ thống đã đóng vào lúc 23:59 ngày ${formatNgay(activeYear.NgayDongTuDanhGia)}`;
    } else {
      isWithinTime = true;
    }
  }

  const displayTrangThai = !isWithinTime
    ? Math.max(trangThaiPhieu, 2.5)
    : trangThaiPhieu;

  const isReadOnly = displayTrangThai >= 2;

  // Recompute the running total: manual self-evaluated scores + system auto scores
  useEffect(() => {
    const manualTotal = Object.entries(formData).reduce(
      (sum, [idTieuChi, item]) =>
        autoScores[idTieuChi] ? sum : sum + (Number(item.DiemTuDanhGia) || 0),
      0,
    );
    const autoTotal = Object.values(autoScores).reduce(
      (sum, it) => sum + (Number(it.DiemTuDong) || 0),
      0,
    );
    setTongDiemCoBan(manualTotal + autoTotal);
  }, [formData, autoScores]);

  const handleYearChange = async (value) => {
    const newYear = parseInt(value);
    if (!isReadOnly && dirtyRef.current.size > 0) {
      try {
        await saveAllDrafts();
      } catch (err) {
        console.error("Lỗi lưu nháp khi đổi năm:", err);
      }
    }
    setSelectedYear(newYear);
    navigate(`/danh-gia-phu-luc-2?year=${newYear}`);
  };

  const markDirty = (idTieuChi) => {
    dirtyRef.current.add(idTieuChi);
  };

  const handleScoreChange = (idTieuChi, idThangDiem, score) => {
    if (isReadOnly || autoScores[idTieuChi]) return;

    setFormData((prev) => ({
      ...prev,
      [idTieuChi]: {
        ...prev[idTieuChi],
        IdTieuChi: idTieuChi,
        IdThangDiemChon: idThangDiem,
        DiemTuDanhGia: score,
      },
    }));
    markDirty(idTieuChi);
  };

  const handleTextChange = (idTieuChi, text) => {
    if (isReadOnly || autoScores[idTieuChi]) return;
    setFormData((prev) => ({
      ...prev,
      [idTieuChi]: {
        ...prev[idTieuChi],
        IdTieuChi: idTieuChi,
        MoTaHoanThanh: text,
      },
    }));
    markDirty(idTieuChi);
  };

  // Create the phieu on demand (POST /api/phieu) so chi_tiet rows / IdChiTiet exist
  const ensurePhieu = async () => {
    if (phieuRef.current) return phieuRef.current;

    const res = await apiFetch("phieu", {
      method: "POST",
      body: JSON.stringify({
        IdNam: selectedYearRef.current,
        IdNhanVien: idNhanVienRef.current,
        IdMau: idMauRef.current,
      }),
    });
    const result = await res.json();
    const isSuccess =
      result.Success !== undefined ? result.Success : result.success;
    const item = result.Item || result.data;
    if (!res.ok || !isSuccess || !item) {
      throw new Error(result.Message || result.message || "Không thể tạo phiếu đánh giá");
    }

    phieuRef.current = item;
    const map = { ...chiTietMapRef.current };
    (item.ChiTiet || item.chiTiet || []).forEach((ct) => {
      if (ct.IdTieuChi != null) map[ct.IdTieuChi] = ct.IdChiTiet;
    });
    chiTietMapRef.current = map;
    setTrangThaiPhieu(item.TrangThai ?? 1);
    return item;
  };

  // Persist every dirty manual criterion via PUT /api/chitiet/{id}/tu-danh-gia
  const saveAllDrafts = async () => {
    const dirty = Array.from(dirtyRef.current);
    if (dirty.length === 0) return;

    await ensurePhieu();
    const map = chiTietMapRef.current;
    const data = formDataRef.current;
    const auto = autoScoresRef.current;

    for (const idTieuChi of dirty) {
      if (auto[idTieuChi]) {
        dirtyRef.current.delete(idTieuChi);
        continue;
      }
      const idChiTiet = map[idTieuChi];
      if (!idChiTiet) continue;

      const item = data[idTieuChi] || {};
      const diem =
        item.DiemTuDanhGia === "" || item.DiemTuDanhGia == null
          ? null
          : Number(item.DiemTuDanhGia);
      const body = {
        Diem: diem,
        NhanXet: item.MoTaHoanThanh || null,
        IdThangDiemChon: item.IdThangDiemChon ?? null,
      };

      const res = await apiFetch(`chitiet/${idChiTiet}/tu-danh-gia`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      if (res.ok) dirtyRef.current.delete(idTieuChi);
    }
  };

  const refreshPhieu = async () => {
    try {
      const res = await apiFetch(`phieu/me/${selectedYearRef.current}`);
      if (res.ok) {
        const result = await res.json();
        const item = result.Item || result.data || result.phieu;
        if (item) {
          phieuRef.current = item;
          return item;
        }
      }
    } catch (err) {
      console.error("Lỗi làm mới phiếu:", err);
    }
    return phieuRef.current;
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    toast.current?.show({
      severity: "info",
      summary: "Đang lưu",
      detail: "Đang lưu bản nháp",
      sticky: true,
    });
    try {
      await saveAllDrafts();
      toast.current?.clear();
      toast.current?.show({
        severity: "success",
        summary: "Đã lưu nháp",
        detail: "Bản nháp đã được lưu",
        life: 3000,
      });
    } catch (err) {
      console.error("Lỗi lưu nháp:", err);
      toast.current?.clear();
      toast.current?.show({
        severity: "error",
        summary: "Lỗi",
        detail: "Không thể lưu bản nháp!",
        life: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = async (idTieuChi, newFilesArray) => {
    if (isReadOnly || autoScores[idTieuChi] || !newFilesArray || newFilesArray.length === 0)
      return;

    // Minh chứng phiếu chỉ nhận PDF; tệp sai định dạng bị loại trước khi tốn vòng upload
    const { hopLe, loi } = locFilePdf(newFilesArray);
    if (loi.length > 0) {
      toast.current?.show({
        severity: "warn",
        summary: "Tệp không hợp lệ",
        detail: loi.join(" • "),
        life: 6000,
      });
    }
    if (hopLe.length === 0) return;

    setIsSubmitting(true);
    toast.current?.show({
      severity: "info",
      summary: "Đang tải tệp",
      detail: "Đang tải tệp minh chứng lên",
      sticky: true,
    });
    try {
      await ensurePhieu();
      const idChiTiet = chiTietMapRef.current[idTieuChi];
      if (!idChiTiet) throw new Error("Không xác định được chi tiết phiếu");

      const uploaded = [];
      for (const file of hopLe) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("tenHienThi", file.name);

        const res = await apiFetch(`chitiet/${idChiTiet}/minh-chung/file`, {
          method: "POST",
          body: fd,
        });
        const result = await res.json();
        const isSuccess =
          result.Success !== undefined ? result.Success : result.success;
        const mc = result.Item || result.data;
        if (!res.ok || !isSuccess || !mc) {
          throw new Error(result.Message || result.message || "Tải tệp thất bại");
        }
        uploaded.push({
          idMinhChung: mc.IdMinhChung,
          fileName: mc.DuongDan,
          originalName: mc.TenHienThi || mc.TenFileGoc || file.name,
          fileType: mc.LoaiFile,
          fileSizeKB: mc.KichThuocKb || 0,
        });
      }

      setFormData((prev) => {
        const currentData = prev[idTieuChi] || {
          IdTieuChi: idTieuChi,
          DanhSachFile: [],
        };
        return {
          ...prev,
          [idTieuChi]: {
            ...currentData,
            IdTieuChi: idTieuChi,
            DanhSachFile: [...(currentData.DanhSachFile || []), ...uploaded],
          },
        };
      });

      toast.current?.clear();
      toast.current?.show({
        severity: "success",
        summary: "Thành công",
        detail: "Đã tải tệp minh chứng",
        life: 2500,
      });
    } catch (err) {
      console.error("Lỗi tải tệp minh chứng:", err);
      toast.current?.clear();
      toast.current?.show({
        severity: "error",
        summary: "Lỗi",
        detail: "Không thể tải tệp minh chứng lên!",
        life: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFile = async (idTieuChi, indexToRemove) => {
    if (isReadOnly) return;

    const currentData = formData[idTieuChi];
    if (!currentData || !currentData.DanhSachFile) return;
    const fileItem = currentData.DanhSachFile[indexToRemove];

    try {
      if (fileItem && fileItem.idMinhChung) {
        await apiFetch(`minhchung/${fileItem.idMinhChung}`, {
          method: "DELETE",
        });
      }
    } catch (err) {
      console.error("Lỗi xóa minh chứng:", err);
    }

    setFormData((prev) => {
      const cur = prev[idTieuChi];
      if (!cur || !cur.DanhSachFile) return prev;
      return {
        ...prev,
        [idTieuChi]: {
          ...cur,
          DanhSachFile: cur.DanhSachFile.filter((_, idx) => idx !== indexToRemove),
        },
      };
    });
  };

  const executeSubmit = async () => {
    setIsSubmitting(true);
    toast.current?.show({
      severity: "info",
      summary: "Đang xử lý",
      detail: "Đang lưu và nộp phiếu",
      sticky: true,
    });

    try {
      await ensurePhieu();
      await saveAllDrafts();
      const fresh = await refreshPhieu();
      const idPhieu = fresh?.IdPhieu;
      if (!idPhieu) throw new Error("Không xác định được phiếu để nộp");

      const res = await apiFetch(`phieu/${idPhieu}/submit`, {
        method: "POST",
        body: JSON.stringify({ RowVersion: fresh.RowVersion }),
      });

      toast.current?.clear();

      if (res.status === 422) {
        const validation = await res.json().catch(() => ({}));
        const missing = validation.missingItems || [];
        toast.current?.show({
          severity: "warn",
          summary: "Chưa thể nộp phiếu",
          detail:
            validation.message ||
            `Còn ${missing.length} tiêu chí thiếu điểm hoặc minh chứng bắt buộc`,
          life: 5000,
        });
        return;
      }

      const result = await res.json().catch(() => ({}));
      const isSuccess =
        result.Success !== undefined ? result.Success : result.success;

      if (res.ok && isSuccess) {
        toast.current?.show({
          severity: "success",
          summary: "Thành công",
          detail: result.Message || "Đã nộp phiếu",
          life: 3000,
        });
        setTrangThaiPhieu(2);
        phieuRef.current = result.Item || result.data || fresh;
      } else {
        toast.current?.show({
          severity: "error",
          summary: "Lỗi",
          detail: result.Message || result.message || "Lỗi nộp phiếu!",
          life: 4000,
        });
      }
    } catch (err) {
      console.error("Lỗi khi nộp phiếu:", err);
      toast.current?.clear();
      toast.current?.show({
        severity: "error",
        summary: "Lỗi",
        detail: "Quá trình nộp phiếu thất bại!",
        life: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Form buttons: status 1 = save draft, status 2 = submit
  const handleFormSubmit = (status) => {
    if (status !== 2) {
      handleSaveDraft();
      return;
    }

    const hasEvaluated =
      Object.values(formData).some(
        (item) =>
          item.IdThangDiemChon != null ||
          (item.DiemTuDanhGia != null && item.DiemTuDanhGia !== "") ||
          (item.MoTaHoanThanh && item.MoTaHoanThanh.trim() !== "") ||
          (item.DanhSachFile && item.DanhSachFile.length > 0),
      ) || Object.keys(autoScores).length > 0;

    if (!hasEvaluated) {
      toast.current?.show({
        severity: "error",
        summary: "Không thể nộp phiếu",
        detail:
          "Bạn chưa đánh giá tiêu chí nào! Vui lòng đánh giá ít nhất 1 tiêu chí trước khi nộp",
        life: 4000,
      });
      return;
    }

    confirmDialog({
      message: "Xác nhận nộp phiếu? Sau khi nộp sẽ không thể chỉnh sửa dữ liệu!",
      header: "Xác nhận nộp phiếu",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Nộp phiếu",
      rejectLabel: "Hủy bỏ",
      acceptClassName: "p-button-primary",
      rejectClassName: "p-button-secondary p-button-outlined",
      accept: () => executeSubmit(),
    });
  };

  /** Đồng bộ lại trạng thái phiếu từ server (dùng sau khi hủy nộp / khi 409). */
  const dongBoTrangThai = async () => {
    const moi = await refreshPhieu();
    if (!moi) return null;
    setTrangThaiPhieu(moi.TrangThai);
    setKhoaDaCham((moi.ChiTiet || []).some((ct) => ct.DiemKhoa != null));
    return moi;
  };

  // Rút phiếu đã nộp về lại trạng thái Nháp (POST phieu/{id}/huy-nop).
  // RowVersion phải lấy ngay trước khi gọi: bản đang giữ có thể đã cũ sau các
  // lần lưu nháp / tải tệp trước đó.
  const executeRecall = async () => {
    setIsSubmitting(true);
    toast.current?.show({
      severity: "info",
      summary: "Đang xử lý",
      detail: "Đang hủy nộp phiếu",
      sticky: true,
    });

    try {
      const fresh = await refreshPhieu();
      if (!fresh?.IdPhieu) throw new Error("Không xác định được phiếu để hủy nộp");

      await huyNopPhieu(fresh.IdPhieu, { rowVersion: fresh.RowVersion });
      await dongBoTrangThai();

      toast.current?.clear();
      toast.current?.show({
        severity: "success",
        summary: "Đã hủy nộp",
        detail:
          "Phiếu đã về trạng thái nháp. Bạn có thể chỉnh sửa và nộp lại trong hạn tự đánh giá.",
        life: 4000,
      });
    } catch (err) {
      console.error("Lỗi khi hủy nộp phiếu:", err);
      toast.current?.clear();

      // 409 = phiếu không còn ở trạng thái cho phép (đơn vị đã chấm / quá hạn /
      // người khác vừa đổi): tải lại để nút biến mất đúng theo thực tế.
      if (err.isConflict) await dongBoTrangThai();

      toast.current?.show({
        severity: err.isConflict ? "warn" : "error",
        summary: "Không hủy nộp được",
        detail: err.message || "Hủy nộp phiếu thất bại!",
        life: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecall = () => {
    confirmDialog({
      message:
        "Phiếu sẽ được đưa về trạng thái nháp để bạn chỉnh sửa và nộp lại. Chỉ thực hiện được khi đơn vị chưa chấm tiêu chí nào và còn trong hạn tự đánh giá.",
      header: "Xác nhận hủy nộp phiếu",
      icon: "pi pi-info-circle",
      acceptLabel: "Hủy nộp phiếu",
      rejectLabel: "Để nguyên",
      acceptClassName: "p-button-warning",
      rejectClassName: "p-button-secondary p-button-outlined",
      accept: () => executeRecall(),
    });
  };

  // Best-effort save draft when leaving the page ("khi thoát")
  useEffect(() => {
    return () => {
      if (dirtyRef.current.size > 0) {
        saveAllDrafts().catch((err) =>
          console.error("Lỗi lưu nháp khi thoát:", err),
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div
        className="page-container"
        style={{ textAlign: "center", paddingTop: "50px" }}
      >
        <i
          className="fa-solid fa-spinner fa-spin"
          style={{ fontSize: "30px", color: "#003399" }}
        ></i>
        <p style={{ marginTop: "15px" }}>Đang tải biểu mẫu đánh giá</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Toast ref={toast} position="top-right" />

      <div className="phu-luc-2-container">
        <div
          className="page-header"
          style={{
            marginBottom: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>ĐÁNH GIÁ PHỤ LỤC 2</h2>
            <span className="breadcrumb phu-luc-2-breadcrumb">
              Giảng viên: {currentUser.HoTen || "Người dùng"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label
              style={{ fontSize: "14px", color: "#475569", fontWeight: "bold" }}
            >
              Năm đánh giá:
            </label>
            <div style={{ width: "130px" }}>
              <SearchSelect
                value={selectedYear}
                onChange={handleYearChange}
                options={listYears.map((y) => ({ value: y, label: `Năm ${y}` }))}
                disabled={isLoading || listYears.length === 0}
              />
            </div>
          </div>
        </div>

        {!isWithinTime && timeMessage && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              color: "#991b1b",
              padding: "15px 20px",
              borderRadius: "8px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <i className="fa-solid fa-lock" style={{ fontSize: "20px" }}></i>
            <span style={{ fontWeight: "500" }}>
              {timeMessage} Hiện tại bạn không thể thao tác nộp hoặc chỉnh sửa
              phiếu
            </span>
          </div>
        )}

        <div className="phu-luc-2-content">
          <DanhGiaPhuLuc2Form
            criteriaList={criteriaList}
            formData={formData}
            autoScores={autoScores}
            tongDiemCoBan={tongDiemCoBan}
            isSubmitting={isSubmitting}
            trangThaiPhieu={displayTrangThai}
            lyDoTraVe={lyDoTraVe}
            onSubmit={handleFormSubmit}
            onRecall={khoaDaCham ? undefined : handleRecall}
            onScoreChange={handleScoreChange}
            onTextChange={handleTextChange}
            onFileChange={handleFileChange}
            onRemoveFile={handleRemoveFile}
            onXemMinhChung={openPreview}
          />
        </div>
      </div>

      <FilePreviewModal
        isOpen={preview.isOpen}
        fileName={preview.mc?.TenFileGoc || preview.mc?.TenHienThi}
        kieu={preview.kieu}
        url={preview.url}
        isLoading={preview.isLoading}
        error={preview.error}
        onClose={closePreview}
        onDownload={() => downloadMinhChung(preview.mc)}
      />
    </div>
  );
};

export default DanhGiaPhuLuc2;
