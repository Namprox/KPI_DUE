import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import "../../css/Pages.css";
import "../../css/DanhGia/DanhGiaPhuLuc2.css";
import DanhGiaPhuLuc2Form from "../../components/DanhGia/DanhGiaPhuLuc2/DanhGiaPhuLuc2Form";
import { Toast } from "primereact/toast";
import { confirmDialog } from "primereact/confirmdialog";
import { apiFetch } from "../../utils/api";

const parseNetDate = (dateString) => {
  if (!dateString) return null;
  if (typeof dateString === "string" && dateString.includes("/Date(")) {
    return new Date(parseInt(dateString.match(/\d+/)[0], 10));
  }
  return new Date(dateString);
};

const DanhGiaNhanVien = () => {
  const [criteriaList, setCriteriaList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({});
  const [tongDiemCoBan, setTongDiemCoBan] = useState(0);

  const [trangThaiPhieu, setTrangThaiPhieu] = useState(0);
  const [lyDoTraVe, setLyDoTraVe] = useState("");


  const toast = useRef(null);

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
              navigate(`/danh-gia-kpi-nhan-vien?year=${defaultYear}`, {
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
      try {
        // 1. Fetch user's phieu for this year
        let phieu = null;
        let chiTiet = [];
        let idMau = null;

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

        // 2. If phieu doesn't exist, search for template matching selectedYear (loaiDoiTuong = 2 for Staff)
        if (!idMau) {
          try {
            const resTemplates = await apiFetch(`maudanhgia?loaiDoiTuong=2`);
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

        setFormData({});
        setTongDiemCoBan(0);
        setTrangThaiPhieu(0);
        setLyDoTraVe("");
        setCriteriaList([]);

        if (!idMau) {
          setIsLoading(false);
          return;
        }

        // 3. Fetch template details
        const resDetail = await apiFetch(`maudanhgia/${idMau}/chi-tiet`);
        if (!resDetail.ok)
          throw new Error("Không thể lấy chi tiết mẫu đánh giá");
        const resultDetail = await resDetail.json();

        const itemDetail = resultDetail.Item || resultDetail.data || {};

        // Flat map nested groups (Nhom -> NhomCon -> TieuChi)
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

        setCriteriaList(flatCriteria);

        // 4. If phieu exists, populate form state
        if (phieu) {
          setTrangThaiPhieu(phieu.TrangThai);
          setLyDoTraVe(phieu.LyDoTraVe || phieu.NhanXetKhoa || "");
          setTongDiemCoBan(phieu.TongDiemCoBan || 0);

          if (chiTiet && chiTiet.length > 0) {
            const initialFormData = {};
            chiTiet.forEach((item) => {
              if (!initialFormData[item.IdTieuChi]) {
                initialFormData[item.IdTieuChi] = {
                  IdTieuChi: item.IdTieuChi,
                  IdThangDiemChon: item.IdThangDiemChon,
                  DiemTuDanhGia: item.DiemTuDanhGia,
                  MoTaHoanThanh:
                    item.MoTaHoanThanh || item.NhanXetTuDanhGia || "",
                  DanhSachFile: [],
                  DanhSachNCKH: [],
                };
              }

              // Load MinhChung
              if (item.MinhChung && Array.isArray(item.MinhChung)) {
                item.MinhChung.forEach((mc) => {
                  initialFormData[item.IdTieuChi].DanhSachFile.push({
                    idMinhChung: mc.IdMinhChung,
                    fileName: mc.DuongDan,
                    originalName: mc.TenFileGoc || mc.TenHienThi || mc.DuongDan,
                    fileType: mc.LoaiFile,
                    fileSizeKB: mc.KichThuocKb || mc.KichThuocKB || 0,
                  });
                });
              }

              if (item.TenFile) {
                initialFormData[item.IdTieuChi].DanhSachFile.push({
                  fileName: item.TenFile,
                  originalName: item.TenFileGoc || item.TenFile,
                  fileType: item.LoaiFile,
                  fileSizeKB: item.KichThuocKB || 0,
                });
              }

              if (item.ScienceRecordId) {
                initialFormData[item.IdTieuChi].DanhSachNCKH.push({
                  ScienceRecordId: item.ScienceRecordId,
                  BangNguon: item.BangNguon || "ScientificArticles",
                  MoTa: item.MoTaNckh || "",
                  QRanking: item.QRanking || "NCKH",
                  JournalScore: item.JournalScore,
                  BonusCoefficient: item.BonusCoefficient,
                  TotalAuthors: item.TotalAuthors,
                  PrimaryAuthors: item.PrimaryAuthors,
                  MembersJSON: item.MembersJSON,
                });
              }
            });
            setFormData(initialFormData);
          }
        }
      } catch (err) {
        console.error("Lỗi API Tải dữ liệu đánh giá:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (listYears.length > 0) {
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
      timeMessage = `Chưa đến thời gian mở hệ thống. Lịch tự đánh giá sẽ bắt đầu từ ${parseNetDate(activeYear.NgayMoTuDanhGia).toLocaleDateString("vi-VN")}`;
    } else if (now > end) {
      timeMessage = `Đã hết hạn tự đánh giá! Hệ thống đã đóng vào lúc 23:59 ngày ${parseNetDate(activeYear.NgayDongTuDanhGia).toLocaleDateString("vi-VN")}`;
    } else {
      isWithinTime = true;
    }
  }

  const displayTrangThai = !isWithinTime
    ? Math.max(trangThaiPhieu, 2.5)
    : trangThaiPhieu;



  const handleYearChange = (e) => {
    const newYear = parseInt(e.target.value);
    setSelectedYear(newYear);
    navigate(`/danh-gia-kpi-nhan-vien?year=${newYear}`);
  };

  useEffect(() => {
    const total = Object.values(formData).reduce(
      (sum, item) => sum + (item.DiemTuDanhGia || 0),
      0,
    );
    setTongDiemCoBan(total);
  }, [formData]);

  const handleScoreChange = (idTieuChi, idThangDiem, score) => {
    if (displayTrangThai >= 2) return;

    setFormData((prev) => ({
      ...prev,
      [idTieuChi]: {
        ...prev[idTieuChi],
        IdTieuChi: idTieuChi,
        IdThangDiemChon: idThangDiem,
        DiemTuDanhGia: score,
      },
    }));
  };

  const handleTextChange = (idTieuChi, text) => {
    if (displayTrangThai >= 2) return;
    setFormData((prev) => ({
      ...prev,
      [idTieuChi]: {
        ...prev[idTieuChi],
        IdTieuChi: idTieuChi,
        MoTaHoanThanh: text,
      },
    }));
  };

  const handleFileChange = (idTieuChi, newFilesArray) => {
    if (displayTrangThai >= 2 || !newFilesArray || newFilesArray.length === 0)
      return;

    setFormData((prev) => {
      const currentData = prev[idTieuChi] || {
        IdTieuChi: idTieuChi,
        DanhSachFile: [],
        DanhSachNCKH: [],
      };
      const currentFiles = currentData.DanhSachFile || [];

      return {
        ...prev,
        [idTieuChi]: {
          ...currentData,
          DanhSachFile: [...currentFiles, ...newFilesArray],
        },
      };
    });
  };

  const handleRemoveFile = (idTieuChi, indexToRemove) => {
    if (displayTrangThai >= 2) return;

    setFormData((prev) => {
      const currentData = prev[idTieuChi];
      if (!currentData || !currentData.DanhSachFile) return prev;

      const newFilesList = currentData.DanhSachFile.filter(
        (_, idx) => idx !== indexToRemove,
      );

      return {
        ...prev,
        [idTieuChi]: {
          ...currentData,
          DanhSachFile: newFilesList,
        },
      };
    });
  };

  const handleNckhChange = (idTieuChi, articleObj) => {
    if (displayTrangThai >= 2) return;

    setFormData((prev) => {
      const currentData = prev[idTieuChi] || {
        IdTieuChi: idTieuChi,
        DanhSachFile: [],
        DanhSachNCKH: [],
      };
      const currentNckh = currentData.DanhSachNCKH || [];

      if (
        currentNckh.some(
          (item) => item.ScienceRecordId === articleObj.ScienceRecordId,
        )
      ) {
        return prev;
      }

      const newList = [...currentNckh, articleObj];
      return {
        ...prev,
        [idTieuChi]: {
          ...currentData,
          DanhSachNCKH: newList,
        },
      };
    });
  };

  const handleRemoveNckh = (idTieuChi, indexToRemove) => {
    if (displayTrangThai >= 2) return;

    setFormData((prev) => {
      const currentData = prev[idTieuChi];
      if (!currentData || !currentData.DanhSachNCKH) return prev;

      const newNckhList = currentData.DanhSachNCKH.filter(
        (_, idx) => idx !== indexToRemove,
      );

      return {
        ...prev,
        [idTieuChi]: {
          ...currentData,
          DanhSachNCKH: newNckhList,
        },
      };
    });
  };

  const executeSubmit = async (status) => {
    setIsSubmitting(true);
    toast.current.show({
      style: { marginTop: "80px" },
      severity: "info",
      summary: "Đang xử lý",
      detail: "Đang tải tệp tin và lưu dữ liệu",
      sticky: true,
    });

    try {
      const finalChiTiet = [];

      for (const item of Object.values(formData)) {
        const uploadedFilesList = [];
        const filesToProcess = item.DanhSachFile || [];

        for (const fileItem of filesToProcess) {
          if (fileItem instanceof File) {
            const resUpload = await apiFetch(
              `upload?fileName=${encodeURIComponent(fileItem.name)}`,
              {
                method: "POST",
                headers: {
                  "Content-Type": undefined,
                },
                body: fileItem,
              },
            );

            if (!resUpload.ok) throw new Error("Upload file thất bại");

            const uploadResult = await resUpload.json();
            if (uploadResult.success) {
              uploadedFilesList.push({
                fileName: uploadResult.fileName,
                originalName: uploadResult.originalName,
                fileType: uploadResult.fileType,
                fileSizeKB: uploadResult.fileSizeKB,
              });
            } else {
              throw new Error(uploadResult.message);
            }
          } else {
            uploadedFilesList.push(fileItem);
          }
        }

        finalChiTiet.push({
          ...item,
          DiemTuDanhGia: Number(item.DiemTuDanhGia) || 0,
          DanhSachFile: uploadedFilesList,
          DanhSachNCKH: item.DanhSachNCKH || [],
        });
      }

      const payload = {
        Action: "SUBMIT",
        IdNam: selectedYear,
        IdNhanVien: currentUser.IdNhanVien,
        IdDonVi: currentUser.IdDonVi,
        TrangThai: status,
        TongDiemCoBan: tongDiemCoBan,
        TongDiemTichLuy: tongDiemCoBan,
        ChiTiet: finalChiTiet,
      };

      const res = await apiFetch("scoring", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      toast.current.clear();

      if (result.status === "success") {
        toast.current.show({
          style: { marginTop: "80px" },
          severity: "success",
          summary: "Thành công",
          detail: result.message,
          life: 3000,
        });
        setTrangThaiPhieu(status);
      } else {
        toast.current.show({
          style: { marginTop: "80px" },
          severity: "error",
          summary: "Lỗi",
          detail: result.message || "Lỗi lưu phiếu!",
          life: 4000,
        });
      }
    } catch (err) {
      console.error("Lỗi khi nộp phiếu/upload file:", err);
      toast.current.clear();
      toast.current.show({
        style: { marginTop: "80px" },
        severity: "error",
        summary: "Lỗi",
        detail: "Quá trình tải tệp tin hoặc lưu phiếu thất bại!",
        life: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (status) => {
    if (status === 2) {
      const hasEvaluated = Object.values(formData).some(
        (item) =>
          item.IdThangDiemChon != null ||
          (item.MoTaHoanThanh && item.MoTaHoanThanh.trim() !== "") ||
          (item.DanhSachFile && item.DanhSachFile.length > 0) ||
          (item.DanhSachNCKH && item.DanhSachNCKH.length > 0),
      );

      if (!hasEvaluated) {
        toast.current.show({
          style: { marginTop: "80px" },
          severity: "error",
          summary: "Không thể nộp phiếu",
          detail:
            "Bạn chưa chọn mục đánh giá hoặc tải file nào! Vui lòng đánh giá ít nhất 1 tiêu chí trước khi nộp",
          life: 4000,
        });
        return;
      }

      confirmDialog({
        message:
          "Xác nhận nộp phiếu? Sau khi nộp sẽ không thể chỉnh sửa dữ liệu!",
        header: "Xác nhận nộp phiếu",
        icon: "pi pi-exclamation-triangle",
        acceptLabel: "Nộp phiếu",
        rejectLabel: "Hủy bỏ",
        acceptClassName: "p-button-primary",
        rejectClassName: "p-button-secondary p-button-outlined",
        accept: () => executeSubmit(2),
      });
    } else {
      executeSubmit(status);
    }
  };

  const executeRecall = async () => {
    setIsSubmitting(true);
    const payload = {
      Action: "RECALL",
      IdNam: selectedYear,
      IdNhanVien: currentUser.IdNhanVien,
    };

    try {
      const res = await apiFetch("scoring", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (result.status === "success") {
        toast.current.show({
          style: { marginTop: "80px" },
          severity: "success",
          summary: "Thành công",
          detail: result.message,
          life: 3000,
        });
        setTrangThaiPhieu(1);
      } else {
        toast.current.show({
          style: { marginTop: "80px" },
          severity: "error",
          summary: "Lỗi",
          detail: result.message || "Lỗi thu hồi phiếu!",
          life: 4000,
        });
      }
    } catch (err) {
      console.error("Lỗi khi thu hồi phiếu:", err);
      toast.current.show({
        style: { marginTop: "80px" },
        severity: "error",
        summary: "Lỗi kết nối",
        detail: "Không thể kết nối đến máy chủ!",
        life: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecall = () => {
    confirmDialog({
      message: "Bạn có chắc chắn muốn thu hồi phiếu để chỉnh sửa lại?",
      header: "Xác nhận thu hồi",
      icon: "pi pi-info-circle",
      acceptLabel: "Thu hồi phiếu",
      rejectLabel: "Hủy bỏ",
      acceptClassName: "p-button-danger",
      rejectClassName: "p-button-secondary p-button-outlined",
      accept: () => executeRecall(),
    });
  };

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
            <h2 style={{ margin: 0 }}>ĐÁNH GIÁ KPI NHÂN VIÊN</h2>
            <span className="breadcrumb phu-luc-2-breadcrumb">
              Nhân viên: {currentUser.HoTen || "Người dùng"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label
              style={{ fontSize: "14px", color: "#475569", fontWeight: "bold" }}
            >
              Năm đánh giá:
            </label>
            <select
              className="form-input"
              value={selectedYear}
              onChange={handleYearChange}
              disabled={isLoading || listYears.length === 0}
              style={{
                width: "130px",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                cursor: "pointer",
                background: "#fff",
                fontSize: "14px",
              }}
            >
              {listYears.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
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
            tongDiemCoBan={tongDiemCoBan}
            isSubmitting={isSubmitting}
            trangThaiPhieu={displayTrangThai}
            lyDoTraVe={lyDoTraVe}
            onSubmit={handleSubmit}
            onScoreChange={handleScoreChange}
            onTextChange={handleTextChange}
            onFileChange={handleFileChange}
            onRemoveFile={handleRemoveFile}
            onNckhChange={handleNckhChange}
            onRemoveNckh={handleRemoveNckh}
            onRecall={handleRecall}
          />
        </div>
      </div>
    </div>
  );
};

export default DanhGiaNhanVien;
