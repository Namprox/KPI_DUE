import React, { useState, useEffect, useRef, useMemo } from "react";
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
import {
  fetchKiemTraHopLe,
  fetchLichSuChamDiemPhieu,
  gomLichSuTheoChiTiet,
  huyNopPhieu,
  laDongBiTraVe,
  locDongChoBoSung,
  moTaHanNop,
  nopLaiPhieu,
  suaDuocDong,
  TEN_NGUON_TRA_VE,
  tenTrangThaiDong,
  tinhCuaSoTuDanhGia,
  TRANG_THAI,
  TRANG_THAI_DONG,
} from "../../utils/phieuApi";
import SearchSelect from "../../components/Common/SearchSelect";
import ThieuTieuChiChecklist from "../../components/DanhGia/ThieuTieuChiChecklist";

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
            TenNhomCha: nhomCha.TenNhom,
            IdNhomCha: nhomCha.IdNhom,
            LoaiNhom: nhomCha.LoaiNhom,
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
                TenNhomCha: nhomCha.TenNhom,
                IdNhomCha: nhomCha.IdNhom,
                LoaiNhom: nhomCon.LoaiNhom || nhomCha.LoaiNhom,
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

/**
 * Bảng tra DÒNG chi tiết theo IdTieuChi.
 *
 * Giữ nguyên cả bản ghi chứ không rút gọn: quyền sửa, banner trả về và bộ đếm
 * "chờ bổ sung" đều tính theo TỪNG DÒNG nên cần đủ TrangThaiDong / NguonTraVe /
 * LoaiNguonDiem, và `suaDuocDong` của phieuApi nhận thẳng ChiTietDanhGiaDto.
 *
 * Chi tiết trả về từ POST /api/phieu (lúc vừa tạo) chưa có TrangThaiDong - coi
 * như KE_KHAI, đúng với thực tế phiếu mới tạo.
 */
const docChiTietTheoTieuChi = (chiTiet = []) => {
  const map = {};
  chiTiet.forEach((ct) => {
    if (ct.IdTieuChi == null) return;
    map[ct.IdTieuChi] = {
      ...ct,
      TrangThaiDong: Number(ct.TrangThaiDong) || TRANG_THAI_DONG.KE_KHAI,
    };
  });
  return map;
};

const docCoDongChot = (chiTiet = []) =>
  chiTiet.some((ct) => Number(ct.TrangThaiDong) === TRANG_THAI_DONG.DA_CHOT);

/**
 * Màn hình TỰ ĐÁNH GIÁ của chủ phiếu - dùng chung cho cả hai ngạch.
 *
 * Giảng viên (Phụ lục 2, loaiDoiTuong = 1) và viên chức / người lao động
 * (loaiDoiTuong = 2) đi CÙNG một quy trình 4 giai đoạn trên cùng bảng
 * phieu_danh_gia; chỉ khác mẫu đánh giá được chọn và nhãn hiển thị. Trước đây
 * hai trang là hai bản cài đặt riêng và trang nhân viên còn gọi bộ API đời đầu
 * (`POST scoring`) không còn tồn tại - gộp về một chỗ để luật nghiệp vụ chỉ có
 * một bản.
 *
 * Khác biệt duy nhất giữa hai ngạch nằm ở ba props dưới đây.
 *
 * @param {number} loaiDoiTuong 1 = giảng viên, 2 = viên chức / NLĐ
 * @param {string} duongDan     route của chính trang này (dùng khi đổi năm)
 * @param {string} tieuDe       tiêu đề hiển thị
 */
const PhieuTuDanhGia = ({ loaiDoiTuong, duongDan, tieuDe }) => {
  const [criteriaList, setCriteriaList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({});
  const [autoScores, setAutoScores] = useState({}); // IdTieuChi -> { DiemTuDong, ... }
  const [tongDiemCoBan, setTongDiemCoBan] = useState(0);

  const [trangThaiPhieu, setTrangThaiPhieu] = useState(0);
  const [lyDoTraVe, setLyDoTraVe] = useState("");
  // Đã có dòng nào CHỐT chưa -> server từ chối hủy nộp (409 DA_CHAM), nên ẩn nút
  // thay vì để giảng viên bấm rồi nhận lỗi. Đếm theo TrangThaiDong chứ không
  // theo DiemKhoa: dòng bị trả về vẫn còn điểm của vòng trước.
  const [daCoDongChot, setDaCoDongChot] = useState(false);
  // Dòng chi tiết theo IdTieuChi. Đây là nguồn sự thật cho việc mở hay khóa ô
  // nhập - trạng thái phiếu chỉ quyết định nút nào hiện ở header.
  const [chiTietMap, setChiTietMap] = useState({});
  // PhieuKiemTraHopLeDto: nguồn sự thật DUY NHẤT cho hạn (HanNop / QuaHan) và
  // cho SoTieuChiThieu. Hạn được server chọn theo GIAI ĐOẠN nên giá trị đổi khi
  // phiếu chuyển 1 -> 2 - phải tải lại sau mỗi thao tác ghi, không được cache.
  const [kiemTra, setKiemTra] = useState(null);
  // Checklist "còn thiếu gì" của 422 (submit và nop-lai dùng chung schema).
  const [thieuTieuChi, setThieuTieuChi] = useState([]);
  // Chỉ hiện các tiêu chí đang chờ bổ sung. Mẫu Phụ lục 2 dài vài chục dòng nên
  // sau một lần bị trả về, tìm đúng dòng phải sửa là việc mất công nhất.
  const [locCanBoSung, setLocCanBoSung] = useState(false);
  // Lịch sử chấm của cả phiếu, đã gom theo IdChiTiet. Dòng bị trả về cần thấy
  // vòng trước bị chấm bao nhiêu, ai chấm và nhận xét gì thì mới biết sửa gì.
  const [lichSuTheoChiTiet, setLichSuTheoChiTiet] = useState(new Map());
  const [dangTaiLichSu, setDangTaiLichSu] = useState(false);

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
  const taoPhieuRef = useRef(null); // Promise tạo phiếu đang bay, để gộp lời gọi trùng
  const idMauRef = useRef(null);
  const chiTietMapRef = useRef({}); // IdTieuChi -> IdChiTiet
  const formDataRef = useRef({});
  const autoScoresRef = useRef({});
  const dirtyRef = useRef(new Set()); // IdTieuChi with unsaved manual edits

  const { user } = useAuth();
  const currentUser = useMemo(() => user || {}, [user]);

  const donViList = useMemo(() => {
    if (Array.isArray(currentUser?.DonVi) && currentUser.DonVi.length > 0) {
      return currentUser.DonVi;
    }
    if (currentUser?.IdDonVi) {
      return [
        {
          IdDonVi: currentUser.IdDonVi,
          MaDonVi: currentUser.MaDonVi,
          TenDonVi: currentUser.TenDonVi,
          IdChucVu: currentUser.IdChucVu,
          MaChucVu: currentUser.MaChucVu,
          TenChucVu: currentUser.TenChucVu,
          LaChinh: true,
        },
      ];
    }
    return [];
  }, [currentUser]);

  const defaultDonViId = useMemo(() => {
    // Tự động tìm đơn vị phù hợp với loại đối tượng (giảng viên/nhân viên)
    const matchedDonVi = donViList.find((dv) => {
      const isKhoa = String(dv.MaDonVi).startsWith("K_");
      const hasChucDanh = !!currentUser?.IdChucDanh;
      const type = isKhoa && hasChucDanh ? 1 : 2;
      return type === loaiDoiTuong;
    });

    if (matchedDonVi) {
      return matchedDonVi.IdDonVi;
    }

    const primary = donViList.find((d) => d.LaChinh);
    return primary ? primary.IdDonVi : donViList[0]?.IdDonVi || null;
  }, [donViList, loaiDoiTuong, currentUser?.IdChucDanh]);

  const [selectedDonViId, setSelectedDonViId] = useState(defaultDonViId);

  useEffect(() => {
    setSelectedDonViId(defaultDonViId);
  }, [defaultDonViId]);

  const selectedDonVi = useMemo(() => {
    return (
      donViList.find((d) => Number(d.IdDonVi) === Number(selectedDonViId)) ||
      donViList[0] ||
      null
    );
  }, [donViList, selectedDonViId]);

  // LoaiDoiTuong giờ suy từ ĐƠN VỊ CỦA PHIẾU:
  // - MaDonVi bắt đầu bằng K_ VÀ người có chức danh nghề nghiệp => 1 (mẫu Giảng viên)
  // - mọi trường hợp còn lại (Phòng, Trung tâm...) => 2 (mẫu Viên chức/NLĐ)
  const activeLoaiDoiTuong = useMemo(() => {
    if (selectedDonVi?.MaDonVi) {
      const isKhoa = String(selectedDonVi.MaDonVi).startsWith("K_");
      const hasChucDanh = !!currentUser?.IdChucDanh;
      return isKhoa && hasChucDanh ? 1 : 2;
    }
    return loaiDoiTuong || 1;
  }, [selectedDonVi, currentUser?.IdChucDanh, loaiDoiTuong]);

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
  const selectedDonViRef = useRef(selectedDonVi);
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
    selectedDonViRef.current = selectedDonVi;
  }, [selectedDonVi]);

  /**
   * Tải lại PhieuKiemTraHopLeDto - hạn hiệu lực, QuaHan, SoTieuChiThieu.
   *
   * Gọi sau MỌI thao tác ghi: hạn đổi khi phiếu chuyển giai đoạn, còn
   * SoTieuChiThieu đổi sau mỗi lần lưu nháp / thêm bớt minh chứng, và nó là điều
   * kiện bật nút Nộp lại. Hỏng thì để null và chỉ mất phần hiển thị hạn - server
   * vẫn là chốt chặn cuối, không tự khóa form vì một lời gọi phụ thất bại.
   */
  /**
   * Lịch sử chấm của CẢ phiếu, lấy một lần rồi phát xuống từng dòng.
   *
   * Chỉ có dữ liệu sau khi phiếu đã nộp lần đầu, nên không gọi ở trạng thái Nhập.
   * Hỏng thì chỉ mất khối tham khảo trong thẻ, không chặn việc kê khai.
   */
  const taiLichSu = async (idPhieu, trangThai) => {
    if (!idPhieu || Number(trangThai) < TRANG_THAI.THAM_DINH) {
      setLichSuTheoChiTiet(new Map());
      return;
    }
    setDangTaiLichSu(true);
    try {
      const items = await fetchLichSuChamDiemPhieu(idPhieu);
      setLichSuTheoChiTiet(gomLichSuTheoChiTiet(items));
    } catch (err) {
      console.error("Lỗi tải lịch sử chấm điểm:", err);
      setLichSuTheoChiTiet(new Map());
    } finally {
      setDangTaiLichSu(false);
    }
  };

  const taiKiemTra = async (idPhieu) => {
    if (!idPhieu) return null;
    try {
      const item = await fetchKiemTraHopLe(idPhieu);
      setKiemTra(item);
      return item;
    } catch (err) {
      console.error("Lỗi kiểm tra điều kiện nộp phiếu:", err);
      return null;
    }
  };

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
              const defaultYear = uniqueYears.includes(currentRealYear)
                ? currentRealYear
                : uniqueYears[0];
              setSelectedYear(defaultYear);
              navigate(`${duongDan}?year=${defaultYear}`, {
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
  }, [navigate, yearParam, duongDan]);

  useEffect(() => {
    const fetchScoringData = async () => {
      setIsLoading(true);

      // Reset all state + refs for the new year / unit
      phieuRef.current = null;
      taoPhieuRef.current = null;
      idMauRef.current = null;
      chiTietMapRef.current = {};
      dirtyRef.current = new Set();
      setFormData({});
      setAutoScores({});
      setTongDiemCoBan(0);
      setTrangThaiPhieu(0);
      setLyDoTraVe("");
      setDaCoDongChot(false);
      setChiTietMap({});
      setKiemTra(null);
      setThieuTieuChi([]);
      setLocCanBoSung(false);
      setLichSuTheoChiTiet(new Map());
      setCriteriaList([]);

      try {
        let phieu = null;
        let chiTiet = [];
        let idMau = null;

        // 1. Load the current user's phieu for this year & selected unit (if any)
        try {
          const idDv = selectedDonVi?.IdDonVi;
          const qs = idDv
            ? `?kemLichSu=true&idDonVi=${idDv}`
            : "?kemLichSu=true";
          const resPhieu = await apiFetch(`phieu/me/${selectedYear}${qs}`);
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

        // 2. No phieu yet -> resolve the template for this year and LoaiDoiTuong
        if (!idMau) {
          try {
            const resTemplates = await apiFetch(
              `maudanhgia?loaiDoiTuong=${activeLoaiDoiTuong}`,
            );
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

        setAutoScores(autoMap);
        autoScoresRef.current = autoMap;

        // 5. Hydrate the form state from an existing phieu
        if (phieu) {
          phieuRef.current = phieu;
          setTrangThaiPhieu(phieu.TrangThai);
          setLyDoTraVe(phieu.NhanXetKhoa || "");
          setDaCoDongChot(docCoDongChot(chiTiet));
          setChiTietMap(docChiTietTheoTieuChi(chiTiet));
          taiKiemTra(phieu.IdPhieu);
          taiLichSu(phieu.IdPhieu, phieu.TrangThai);

          const map = {};
          const initialFormData = {};
          (chiTiet || []).forEach((ct) => {
            if (ct.IdTieuChi == null) return;
            map[ct.IdTieuChi] = ct.IdChiTiet;

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
  }, [
    selectedYear,
    currentUser.IdNhanVien,
    listYears.length,
    activeLoaiDoiTuong,
    selectedDonVi?.IdDonVi,
  ]);

  const activeYear = yearDetails.find((y) => y.IdNam === selectedYear);

  /**
   * Cửa sổ tự đánh giá tính từ cấu hình NĂM - CHỈ dùng khi chưa có phiếu.
   *
   * Chưa có phiếu thì chưa có IdPhieu để hỏi kiem-tra-hop-le, mà để form mở toang
   * rồi mới 409 lúc lưu là tệ hơn. Có phiếu rồi thì bỏ hẳn nhánh này: hạn hiệu
   * lực do server chọn theo giai đoạn, giai đoạn thẩm định chạy SAU khi hạn tự
   * đánh giá đóng nên tính lại ở client sẽ khóa nhầm người đang bổ sung dòng bị
   * trả về.
   */
  const cuaSoNam = tinhCuaSoTuDanhGia(activeYear);

  // Nguồn sự thật về hạn: kiem-tra-hop-le khi đã có phiếu, cấu hình năm khi chưa.
  const quaHan = kiemTra
    ? Boolean(kiemTra.QuaHan)
    : cuaSoNam.trangThai !== "dang-mo";

  // Câu mô tả hạn hiệu lực; nhãn tự đổi theo giai đoạn ("hạn tự đánh giá" khi
  // phiếu ở trạng thái 1, "hạn bổ sung theo yêu cầu thẩm định" khi ở trạng thái 2).
  const thongDiepHan = kiemTra ? moTaHanNop(kiemTra) : cuaSoNam.thongDiep;

  /**
   * Ngữ cảnh quyền của chủ phiếu, đúng shape mà `suaDuocDong` nhận.
   *
   * Chưa có phiếu thì chưa có LaChuPhieu từ server - người đang mở form chính là
   * người sẽ đứng tên phiếu (phiếu tạo lười theo IdNhanVien của phiên đăng nhập)
   * nên coi như true.
   */
  const ctxQuyen = kiemTra || { LaChuPhieu: true, QuaHan: quaHan };

  /**
   * Một tiêu chí có sửa được không - tính theo TỪNG DÒNG.
   *
   * Đây là chỗ thay cho pseudo-status 2.5 của luồng cũ: trước đây cả phiếu khóa
   * hay mở cùng lúc, nay một phiếu ở trạng thái 2 có thể chứa đồng thời dòng
   * đang bổ sung, dòng chờ thẩm định và dòng đã chốt.
   */
  const dongMoNhapTheoId = (idTieuChi) => {
    if (autoScores[idTieuChi]) return false;
    const dong = chiTietMap[idTieuChi];
    // Chưa có phiếu (chưa kê khai lần nào) thì mọi dòng đều mở, trừ khi đã hết
    // cửa sổ tự đánh giá của năm.
    if (!dong) return !quaHan;
    return suaDuocDong(dong, ctxQuyen);
  };

  const laDongMoNhap = (tc) => dongMoNhapTheoId(tc.IdTieuChi);

  const thongTinDong = (tc) => {
    const dong = chiTietMap[tc.IdTieuChi];
    // Chưa nộp lần nào thì badge trạng thái dòng chỉ là nhiễu.
    if (!dong || trangThaiPhieu <= TRANG_THAI.NHAP) return null;
    const biTraVe = laDongBiTraVe(dong);
    return {
      trangThaiDong: dong.TrangThaiDong,
      // Dòng đang chờ chủ phiếu xử lý - form dựa vào cờ này để mở khối lịch sử
      // vòng trước, thay vì tự suy lại từ trạng thái dòng.
      canBoSung:
        dong.TrangThaiDong === TRANG_THAI_DONG.KE_KHAI &&
        !autoScores[tc.IdTieuChi],
      // Chỉ coi là "bị trả về" khi yêu cầu còn MỞ; nộp lại xong server xóa
      // NguonTraVe nên banner tự biến mất.
      nguonTraVe: biTraVe ? dong.NguonTraVe : null,
      lyDoTraVe: biTraVe ? dong.LyDoTraVe || "" : "",
      ngayTraVe: biTraVe ? dong.NgayTraVe || null : null,
      // Cộng dồn cả vòng đời, KHÔNG reset khi nộp lại - chỉ là nhãn lịch sử.
      soLanTraVe: dong.SoLanTraVe || 0,
      nhan: biTraVe
        ? TEN_NGUON_TRA_VE[dong.NguonTraVe]
        : tenTrangThaiDong(dong.TrangThaiDong),
    };
  };

  /** Các dòng đang chờ chủ phiếu bổ sung - mẫu số của nút "Nộp lại". */
  const dongCanBoSung = locDongChoBoSung(
    criteriaList.map((tc) => chiTietMap[tc.IdTieuChi]).filter(Boolean),
  );

  /** Các dòng có yêu cầu trả về ĐANG MỞ - nguồn dữ liệu cho banner. */
  const dongBiTraVe = dongCanBoSung.filter(laDongBiTraVe);

  const chuaNop = trangThaiPhieu <= TRANG_THAI.NHAP;
  const dangThamDinh = trangThaiPhieu === TRANG_THAI.THAM_DINH;

  // Ba nút loại trừ nhau. API chưa trả cờ CoTheNopLai (SP có tính nhưng DAL
  // không đọc) nên phải tự suy từ số dòng đang chờ bổ sung.
  const hienNutNopLai = dangThamDinh && dongCanBoSung.length > 0;
  // SoTieuChiThieu là ảnh chụp phía SERVER nên nó chưa thấy các ô vừa gõ mà chưa
  // lưu - còn sửa dở thì vẫn cho bấm, executeResubmit lưu nháp trước rồi mới nộp
  // lại, và nếu thực sự còn thiếu thì server trả 422 kèm checklist. Đọc ref ngay
  // trong render là an toàn vì mỗi lần gõ đều setFormData nên có re-render.
  const conSuaDo = dirtyRef.current.size > 0;
  const batNutNopLai =
    hienNutNopLai &&
    !quaHan &&
    (conSuaDo || Number(kiemTra?.SoTieuChiThieu ?? 0) === 0);
  // "Hủy nộp" CỐ Ý không nhìn `quaHan`: POST /huy-nop luôn gate bằng hạn TỰ ĐÁNH
  // GIÁ, còn QuaHan ở trạng thái 2 phản ánh hạn THẨM ĐỊNH. Cứ hiện nút rồi bắt
  // 409 QUA_HAN và hiện nguyên văn Message của server.
  const hienNutHuyNop =
    dangThamDinh && dongCanBoSung.length === 0 && !daCoDongChot;

  /**
   * Chủ phiếu còn việc phải làm không.
   *
   * Chỉ khi đó mới hiện dải hạn. Nộp lại KHÔNG đưa phiếu ra khỏi trạng thái 2
   * (đúng thiết kế - không phải vòng đánh giá mới), nên `HanNop` vẫn là hạn thẩm
   * định và vẫn còn nguyên giá trị; nhưng lúc đó bóng đã sang chân đơn vị thẩm
   * định, để dải "Hạn bổ sung theo yêu cầu thẩm định" nằm đó chỉ khiến người
   * dùng tưởng mình còn phải nộp gì nữa.
   */
  const conViecCuaChuPhieu = chuaNop || dongCanBoSung.length > 0;

  // Giữ cờ tổng cho các handler cũ: khóa toàn bộ khi hết hạn, hoặc khi hồ sơ đã
  // qua bước thẩm định mà không còn dòng nào được trả về.
  const isReadOnly = quaHan || (!chuaNop && dongCanBoSung.length === 0);

  /**
   * Danh sách tiêu chí đem đi render.
   *
   * Bộ lọc chỉ có nghĩa khi đang trong vòng lặp trả về; ràng buộc thêm
   * `hienNutNopLai` để sau khi nộp lại xong không còn dòng nào chờ mà form vẫn
   * trống trơn vì cờ lọc kẹt lại từ trước.
   */
  /**
   * Lịch sử chấm của một tiêu chí, tra theo IdChiTiet.
   * Trả mảng rỗng khi chưa có phiếu / chưa nộp lần nào.
   */
  const lichSuDong = (tc) => {
    const idChiTiet = chiTietMap[tc.IdTieuChi]?.IdChiTiet;
    if (idChiTiet == null) return [];
    return lichSuTheoChiTiet.get(Number(idChiTiet)) || [];
  };

  const dangLoc = locCanBoSung && hienNutNopLai;
  const criteriaHienThi = dangLoc
    ? criteriaList.filter((tc) =>
        dongCanBoSung.some((ct) => ct.IdTieuChi === tc.IdTieuChi),
      )
    : criteriaList;

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
    navigate(`${duongDan}?year=${newYear}`);
  };

  const markDirty = (idTieuChi) => {
    dirtyRef.current.add(idTieuChi);
  };

  const handleScoreChange = (idTieuChi, idThangDiem, score) => {
    if (!dongMoNhapTheoId(idTieuChi)) return;

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
    if (!dongMoNhapTheoId(idTieuChi)) return;
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

  // Ghi nhận phiếu mới nhất từ server, kèm map IdTieuChi -> IdChiTiet mà các thao
  // tác sau (lưu nháp, tải minh chứng) cần để biết đính vào dòng chi tiết nào.
  const apDungPhieu = (item) => {
    phieuRef.current = item;
    const map = { ...chiTietMapRef.current };
    (item.ChiTiet || item.chiTiet || []).forEach((ct) => {
      if (ct.IdTieuChi != null) map[ct.IdTieuChi] = ct.IdChiTiet;
    });
    chiTietMapRef.current = map;
    return item;
  };

  const refreshPhieu = async () => {
    try {
      const idDv = selectedDonViRef.current?.IdDonVi;
      const qs = idDv ? `?kemLichSu=true&idDonVi=${idDv}` : "?kemLichSu=true";
      const res = await apiFetch(`phieu/me/${selectedYearRef.current}${qs}`);
      if (res.ok) {
        const result = await res.json();
        const item = result.Item || result.data || result.phieu;
        if (item) return apDungPhieu(item);
      }
    } catch (err) {
      console.error("Lỗi làm mới phiếu:", err);
    }
    return phieuRef.current;
  };

  // Create the phieu on demand (POST /api/phieu) so chi_tiet rows / IdChiTiet exist
  const taoPhieu = async () => {
    const res = await apiFetch("phieu", {
      method: "POST",
      body: JSON.stringify({
        IdNam: selectedYearRef.current,
        IdNhanVien: idNhanVienRef.current,
        IdMau: idMauRef.current,
        IdDonVi: selectedDonViRef.current?.IdDonVi || null,
      }),
    });
    const result = await res.json().catch(() => ({}));
    const isSuccess =
      result.Success !== undefined ? result.Success : result.success;
    const item = result.Item || result.data;

    if (res.ok && isSuccess && item) {
      apDungPhieu(item);
      setTrangThaiPhieu(item.TrangThai ?? 1);
      setChiTietMap(docChiTietTheoTieuChi(item.ChiTiet || item.chiTiet || []));
      // Từ đây đã có IdPhieu nên chuyển hẳn sang hạn do server chọn.
      taiKiemTra(item.IdPhieu);
      return item;
    }

    // "Phiếu đã tồn tại" KHÔNG phải hỏng: điều kiện để đi tiếp (đã có phiếu) thực
    // ra đã thỏa. Xảy ra khi GET phieu/me lúc mở trang lỗi/hết phiên, hoặc phiếu
    // vừa được tạo ở tab khác. Lấy lại phiếu sẵn có thay vì hủy cả thao tác.
    const daCo = await refreshPhieu();
    if (daCo) {
      setTrangThaiPhieu(daCo.TrangThai ?? 1);
      setChiTietMap(docChiTietTheoTieuChi(daCo.ChiTiet || []));
      taiKiemTra(daCo.IdPhieu);
      return daCo;
    }

    throw new Error(
      result.Message || result.message || "Không thể tạo phiếu đánh giá",
    );
  };

  /**
   * Bảo đảm đã có phiếu trước khi lưu nháp / tải minh chứng.
   *
   * Gộp mọi lời gọi trùng vào MỘT request: ô chọn tệp của từng tiêu chí không bị
   * khóa trong lúc tải, nên hai thao tác chạy song song (tải tệp ở hai tiêu chí,
   * hoặc bấm Lưu nháp xen vào) đều thấy phieuRef rỗng và cùng POST /api/phieu -
   * lần thứ hai bị server trả "Phiếu đã tồn tại".
   */
  const ensurePhieu = async () => {
    if (phieuRef.current) return phieuRef.current;
    if (!taoPhieuRef.current) {
      taoPhieuRef.current = taoPhieu().finally(() => {
        taoPhieuRef.current = null;
      });
    }
    return taoPhieuRef.current;
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
      // SoTieuChiThieu vừa đổi → nút "Nộp lại" phải bật/tắt lại theo bản mới.
      await taiKiemTra(phieuRef.current?.IdPhieu);
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
        detail: err.message || "Không thể lưu bản nháp!",
        life: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = async (idTieuChi, newFilesArray) => {
    if (
      !dongMoNhapTheoId(idTieuChi) ||
      !newFilesArray ||
      newFilesArray.length === 0
    )
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
          throw new Error(
            result.Message || result.message || "Tải tệp thất bại",
          );
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

      await taiKiemTra(phieuRef.current?.IdPhieu);

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
        detail: err.message || "Không thể tải tệp minh chứng lên!",
        life: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveFile = async (idTieuChi, indexToRemove) => {
    if (!dongMoNhapTheoId(idTieuChi)) return;

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
          DanhSachFile: cur.DanhSachFile.filter(
            (_, idx) => idx !== indexToRemove,
          ),
        },
      };
    });

    // Xóa minh chứng có thể làm tiêu chí quay lại diện "còn thiếu".
    await taiKiemTra(phieuRef.current?.IdPhieu);
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

      // 422 dùng chung schema PhieuSubmitValidationResponse với /nop-lai nên
      // checklist bên dưới cũng là một component dùng chung.
      if (res.status === 422) {
        const validation = await res.json().catch(() => ({}));
        const missing = validation.missingItems || [];
        setThieuTieuChi(missing);
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
      setThieuTieuChi([]);

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
        phieuRef.current = result.Item || result.data || fresh;
        // Sau khi nộp, mọi dòng chấm tay sang CHO_THAM_DINH còn dòng chấm tự động
        // chốt luôn. Đọc lại từ server thay vì tự suy để không lệch.
        await dongBoTrangThai();
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
      message:
        "Xác nhận nộp phiếu? Sau khi nộp sẽ không thể chỉnh sửa dữ liệu!",
      header: "Xác nhận nộp phiếu",
      icon: "pi pi-exclamation-triangle",
      acceptLabel: "Nộp phiếu",
      rejectLabel: "Hủy bỏ",
      acceptClassName: "p-button-primary",
      rejectClassName: "p-button-secondary p-button-outlined",
      accept: () => executeSubmit(),
    });
  };

  /**
   * Đồng bộ lại trạng thái phiếu VÀ trạng thái từng dòng từ server.
   * Dùng sau mọi thao tác đổi trạng thái (nộp / nộp lại / hủy nộp) và khi gặp 409.
   *
   * Bắt buộc kéo lại cả kiem-tra-hop-le: hạn hiệu lực đổi theo giai đoạn nên một
   * phiếu vừa chuyển 1 → 2 có HanNop khác hẳn bản đang giữ. Chi tiết dòng cũng
   * phải đọc lại vì nộp lại xong server xóa NguonTraVe / LyDoTraVe - banner lý do
   * trả về chỉ biến mất khi ta refetch.
   */
  const dongBoTrangThai = async () => {
    const moi = await refreshPhieu();
    if (!moi) return null;
    const chiTiet = moi.ChiTiet || [];
    setTrangThaiPhieu(moi.TrangThai);
    setDaCoDongChot(docCoDongChot(chiTiet));
    setChiTietMap(docChiTietTheoTieuChi(chiTiet));
    await taiKiemTra(moi.IdPhieu);
    await taiLichSu(moi.IdPhieu, moi.TrangThai);
    return moi;
  };

  /**
   * Nộp lại các tiêu chí đã bổ sung sau khi bị trả về (POST phieu/{id}/nop-lai).
   *
   * Khác nộp phiếu lần đầu: hồ sơ GIỮ NGUYÊN trạng thái 2 và LanDanhGia không
   * tăng - đây không phải một vòng đánh giá mới. Các dòng đang chờ thẩm định
   * hoặc đã chốt không bị đụng tới.
   */
  const executeResubmit = async () => {
    setIsSubmitting(true);
    toast.current?.show({
      severity: "info",
      summary: "Đang xử lý",
      detail: "Đang nộp lại các tiêu chí đã bổ sung",
      sticky: true,
    });

    try {
      await saveAllDrafts();
      const fresh = await refreshPhieu();
      if (!fresh?.IdPhieu)
        throw new Error("Không xác định được phiếu để nộp lại");

      await nopLaiPhieu(fresh.IdPhieu, { rowVersion: fresh.RowVersion });
      setThieuTieuChi([]);
      await dongBoTrangThai();

      toast.current?.clear();
      toast.current?.show({
        severity: "success",
        summary: "Đã nộp lại",
        detail:
          "Các tiêu chí bổ sung đã quay lại hàng đợi thẩm định. Những tiêu chí khác giữ nguyên tiến độ.",
        life: 5000,
      });
    } catch (err) {
      console.error("Lỗi khi nộp lại phiếu:", err);
      toast.current?.clear();

      // 422: cùng schema với /submit → dựng lại đúng một checklist.
      if (err.status === 422 && err.missingItems) {
        setThieuTieuChi(err.missingItems);
      }

      // Nút lẽ ra đã bị ẩn khi không còn dòng nào chờ bổ sung. Gặp mã này nghĩa
      // là state client đã lệch với server - log lại rồi đồng bộ.
      if (err.errorCode === "KHONG_CO_DONG_CHO_NOP") {
        console.error(
          "Lệch trạng thái: bấm Nộp lại khi server không còn dòng nào chờ bổ sung",
          {
            idPhieu: phieuRef.current?.IdPhieu,
            dongCanBoSung: dongCanBoSung.length,
          },
        );
      }

      if (err.isConflict) await dongBoTrangThai();

      toast.current?.show({
        severity: err.isConflict ? "warn" : "error",
        summary: "Không nộp lại được",
        // Hạn nào đang vướng là do server quyết (nộp lại gate bằng hạn thẩm
        // định) nên hiện thẳng Message của nó, đừng đoán hộ.
        detail: err.message || "Nộp lại phiếu thất bại!",
        life: 7000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResubmit = () => {
    confirmDialog({
      message: `Nộp lại ${dongCanBoSung.length} tiêu chí đã bổ sung? Hồ sơ vẫn ở bước thẩm định và số lần đánh giá không tăng.`,
      header: "Xác nhận nộp lại",
      icon: "pi pi-info-circle",
      acceptLabel: "Nộp lại",
      rejectLabel: "Để sau",
      acceptClassName: "p-button-primary",
      rejectClassName: "p-button-secondary p-button-outlined",
      accept: () => executeResubmit(),
    });
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
      if (!fresh?.IdPhieu)
        throw new Error("Không xác định được phiếu để hủy nộp");

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

  // Nói trước điều kiện hạn ở đây vì nút KHÔNG bị tắt theo `quaHan`: hủy nộp là
  // hành vi giai đoạn 1 nên luôn gate bằng hạn TỰ ĐÁNH GIÁ, khác hạn mà `quaHan`
  // đang phản ánh khi phiếu ở trạng thái 2. Sau hạn tự đánh giá, chủ phiếu vẫn
  // nộp lại được nhưng không hủy nộp được - đó là hành vi đúng.
  const handleRecall = () => {
    confirmDialog({
      message:
        "Phiếu sẽ được đưa về trạng thái nháp để bạn chỉnh sửa và nộp lại. Chỉ thực hiện được khi chưa tiêu chí nào bị chốt điểm và còn trong hạn TỰ ĐÁNH GIÁ - hạn này có thể đã đóng dù bạn vẫn đang trong hạn bổ sung theo yêu cầu thẩm định.",
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
            <h2 style={{ margin: 0 }}>{tieuDe}</h2>
            <span className="breadcrumb phu-luc-2-breadcrumb">
              {currentUser.HoTen || "Người dùng"}
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
                options={listYears.map((y) => ({
                  value: y,
                  label: `Năm ${y}`,
                }))}
                disabled={isLoading || listYears.length === 0}
              />
            </div>
          </div>
        </div>

        {/* Hiển thị tên đơn vị đánh giá */}
        {selectedDonVi && (
          <div
            style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "13.5px",
                fontWeight: "600",
                color: "#1e293b",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <i
                className="fa-solid fa-building"
                style={{ color: "#003399" }}
              ></i>
              Đơn vị đánh giá:
            </span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
               <span style={{ fontWeight: "600", color: "#003399", fontSize: "14px" }}>
                 {selectedDonVi.TenDonVi || selectedDonVi.MaDonVi}
               </span>
               {selectedDonVi.TenChucVu && (
                 <span style={{ fontSize: "13px", color: "#475569" }}>
                   ({selectedDonVi.TenChucVu})
                 </span>
               )}
            </div>
          </div>
        )}

        {/* Dải hạn chỉ dựng khi chủ phiếu còn việc. Nộp lại xong phiếu vẫn ở
            trạng thái 2 nên HanNop vẫn còn giá trị, nhưng lúc đó việc đã sang
            đơn vị thẩm định - xem `conViecCuaChuPhieu`. */}
        {!conViecCuaChuPhieu ? null : quaHan ? (
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
              {thongDiepHan}. Hiện tại bạn không thể chỉnh sửa hoặc nộp phiếu -
              cần được cấp gia hạn riêng mới thao tác tiếp được.
            </span>
          </div>
        ) : (
          thongDiepHan && (
            <div className="pl2-han-nop">
              <i className="fa-solid fa-calendar-day"></i>
              <span>{thongDiepHan}</span>
            </div>
          )
        )}

        {hienNutNopLai && (
          <div className="pl2-banner-tra-ve">
            <i className="fa-solid fa-circle-exclamation"></i>
            <div>
              <b>
                Có {dongCanBoSung.length} tiêu chí cần bạn chỉnh sửa trước khi
                thẩm định tiếp:
              </b>
              <ul>
                {dongCanBoSung.map((ct) => (
                  <li key={ct.IdTieuChi}>
                    <strong>Tiêu chí:</strong>{" "}
                    {ct.TenTieuChi || `#${ct.IdTieuChi}`}
                    {laDongBiTraVe(ct) && ct.LyDoTraVe && (
                      <>
                        . <strong>Lý do:</strong> {ct.LyDoTraVe}
                      </>
                    )}
                  </li>
                ))}
              </ul>
              Sửa xong bấm <b>Nộp lại</b>. Các tiêu chí khác đang được thẩm định
              hoặc đã chốt sẽ không bị ảnh hưởng.
              {dongBiTraVe.length > 0 &&
                dongBiTraVe.length < dongCanBoSung.length && (
                  <>
                    {" "}
                    ({dongBiTraVe.length} tiêu chí bị trả về kèm yêu cầu, phần
                    còn lại là tiêu chí bạn chưa kê khai.)
                  </>
                )}
              <div className="pl2-banner-actions">
                <button
                  type="button"
                  className="pl2-banner-btn"
                  onClick={() => setLocCanBoSung((truoc) => !truoc)}
                >
                  <i
                    className={`fa-solid ${dangLoc ? "fa-list" : "fa-filter"}`}
                  ></i>{" "}
                  {dangLoc
                    ? "Xem lại toàn bộ phiếu"
                    : `Hiển thị ${dongCanBoSung.length} tiêu chí cần chỉnh sửa`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Checklist của 422 - /submit và /nop-lai trả cùng schema nên dùng chung
            đúng một component. */}
        {thieuTieuChi.length > 0 && (
          <div className="pl2-banner-tra-ve" style={{ display: "block" }}>
            <b>
              Còn {thieuTieuChi.length} tiêu chí chưa đủ điều kiện, bổ sung rồi
              nộp lại:
            </b>
            <div style={{ marginTop: "10px" }}>
              <ThieuTieuChiChecklist items={thieuTieuChi} />
            </div>
          </div>
        )}

        {dangLoc && (
          <div className="pl2-dang-loc">
            <i className="fa-solid fa-filter"></i>
            <span>
              Đang lọc: chỉ hiện {criteriaHienThi.length} tiêu chí cần sửa. Tổng
              điểm và tiến độ bên dưới vẫn tính trên toàn bộ phiếu.
            </span>
            <button
              type="button"
              className="pl2-banner-btn"
              onClick={() => setLocCanBoSung(false)}
            >
              Bỏ lọc
            </button>
          </div>
        )}

        <div className="phu-luc-2-content">
          <DanhGiaPhuLuc2Form
            criteriaList={criteriaHienThi}
            tieuChiThongKe={criteriaList}
            formData={formData}
            autoScores={autoScores}
            tongDiemCoBan={tongDiemCoBan}
            lyDoTraVe={lyDoTraVe}
            laDongMoNhap={laDongMoNhap}
            thongTinDong={thongTinDong}
            lichSuDong={lichSuDong}
            dangTaiLichSu={dangTaiLichSu}
            hanhDong={
              /* Ba nút Nộp / Nộp lại / Hủy nộp loại trừ nhau. Nút nào hiện là do
                 trạng thái HỒ SƠ + số dòng đang chờ bổ sung quyết định, còn ô
                 nhập nào mở là do trạng thái từng DÒNG - hai trục độc lập. */
              chuaNop ? (
                <>
                  <button
                    onClick={() => handleFormSubmit(1)}
                    disabled={isSubmitting || quaHan}
                    className="btn-luu-nhap"
                  >
                    <i className="fa-solid fa-floppy-disk"></i> Lưu nháp
                  </button>
                  <button
                    onClick={() => handleFormSubmit(2)}
                    disabled={isSubmitting || quaHan}
                    className="btn-nop-phieu"
                  >
                    <i className="fa-solid fa-paper-plane"></i> Nộp Phiếu
                  </button>
                </>
              ) : hienNutNopLai ? (
                <>
                  <button
                    onClick={() => handleFormSubmit(1)}
                    disabled={isSubmitting || quaHan}
                    className="btn-luu-nhap"
                  >
                    <i className="fa-solid fa-floppy-disk"></i> Lưu nháp
                  </button>
                  <button
                    onClick={handleResubmit}
                    disabled={isSubmitting || !batNutNopLai}
                    className="btn-nop-phieu"
                    title={
                      quaHan
                        ? thongDiepHan
                        : !batNutNopLai
                          ? `Còn ${kiemTra?.SoTieuChiThieu} tiêu chí thiếu điểm hoặc minh chứng bắt buộc`
                          : "Đưa các tiêu chí đã bổ sung quay lại hàng đợi thẩm định"
                    }
                  >
                    <i className="fa-solid fa-paper-plane"></i> Nộp lại{" "}
                    {dongCanBoSung.length} tiêu chí
                  </button>
                </>
              ) : hienNutHuyNop ? (
                <button
                  onClick={handleRecall}
                  disabled={isSubmitting}
                  className="btn-thu-hoi"
                  title="Đưa phiếu về trạng thái nháp để chỉnh sửa rồi nộp lại (cần còn hạn tự đánh giá)"
                >
                  <i className="fa-solid fa-rotate-left"></i> Hủy nộp để chỉnh
                  sửa
                </button>
              ) : dangThamDinh ? (
                <div className="pl2-approved pl2-waiting">
                  <i className="fa-solid fa-clipboard-check"></i> Đang được đơn
                  vị thẩm định
                </div>
              ) : trangThaiPhieu === TRANG_THAI.CHO_TK_DUYET ? (
                <div className="pl2-approved pl2-waiting">
                  <i className="fa-solid fa-hourglass-half"></i> Chờ Trưởng khoa
                  duyệt
                </div>
              ) : trangThaiPhieu === TRANG_THAI.TK_DA_DUYET ? (
                <div className="pl2-approved">
                  <i className="fa-solid fa-circle-check"></i> Trưởng khoa đã
                  chốt
                </div>
              ) : (
                <div className="pl2-approved">
                  <i className="fa-solid fa-lock"></i> Đã hoàn tất
                </div>
              )
            }
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

export default PhieuTuDanhGia;
