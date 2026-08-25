/**
 * Lớp gọi API + hằng số miền cho PHIẾU ĐÁNH GIÁ KPI CÁ NHÂN (phieu_danh_gia).
 *
 * QUY TRÌNH 4 GIAI ĐOẠN — có HAI trục trạng thái song song, đừng trộn lẫn.
 *
 * Trục 1 · TỪNG DÒNG tiêu chí (`chi_tiet_danh_gia.trang_thai_dong`):
 *   1 KE_KHAI        chủ phiếu sửa được cả điểm lẫn minh chứng
 *   2 CHO_THAM_DINH  đơn vị được giao trong tieu_chi_don_vi_cham xử lý
 *   3 DA_CHOT        diem_chinh_thuc đã ghi, khóa cứng
 *
 * Trục 2 · HỒ SƠ (`phieu_danh_gia.trang_thai`):
 *   1 NHAP          GV kê khai, chưa nộp lần nào
 *   2 THAM_DINH     còn ≥1 dòng ở trạng thái 1 hoặc 2
 *   3 CHO_TK_DUYET  100% dòng đã chốt, chờ Trưởng khoa duyệt hồ sơ
 *   4 TK_DA_DUYET   TK đã chốt hồ sơ và chọn xếp loại, chờ đóng gói tờ trình
 *   5 HOAN_TAT      Hiệu trưởng đã duyệt gói KPI Khoa, chỉ đọc
 *
 * Điểm mấu chốt: quyền thao tác tính theo DÒNG, không theo hồ sơ. Một dòng bị
 * trả về cho GV không kéo cả hồ sơ về trạng thái 1, và các dòng khác giữ nguyên
 * tiến độ. 2 ↔ 3 là TỰ ĐỘNG, server tính lại sau mọi thao tác cấp dòng — vì vậy
 * mọi response cấp dòng đều trả kèm `TrangThaiPhieu` để UI biết hồ sơ vừa rời
 * hay vừa quay lại hàng đợi.
 *
 * Xếp loại đi qua BA cột phân vai rõ: `XepLoaiDeXuat` (hệ thống gợi ý, chỉ để
 * đối chiếu) · `XepLoaiKhoa` (Trưởng khoa chọn tay, CHỈ 1/2/3) · `XepLoai` (kết
 * quả cuối, chỉ được ghi ở bước đóng gói tờ trình — xem toTrinhApi.js).
 *
 * Mọi thao tác ghi đều cần RowVersion CỦA PHIẾU CHA, kể cả các endpoint cấp
 * dòng dưới /chitiet/. Response trả `NewRowVersion` và bên gọi PHẢI dùng giá trị
 * đó cho lần gọi kế tiếp trên cùng phiếu, nếu không sẽ ăn 409 ngay. Server trả
 * 409 khi bản ghi đã bị người khác sửa — các hàm ở đây ném lỗi có cờ
 * `isConflict` để UI tải lại phiếu.
 */

import { apiFetch } from './api';
import { readApiError } from './apiError';

/* ------------------------------------------------------------------ */
/* Trạng thái hồ sơ                                                    */
/* ------------------------------------------------------------------ */

export const TRANG_THAI = {
  NHAP: 1,
  THAM_DINH: 2,
  CHO_TK_DUYET: 3,
  TK_DA_DUYET: 4,
  HOAN_TAT: 5,
};

/** Nhãn + màu badge cho từng trạng thái. Dùng chung mọi bảng/màn hình. */
export const TRANG_THAI_META = {
  1: { label: 'GV đang nhập', icon: 'fa-pen', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  2: { label: 'Đang thẩm định', icon: 'fa-clipboard-check', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  3: { label: 'Chờ Trưởng khoa duyệt', icon: 'fa-hourglass-half', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  4: { label: 'Trưởng khoa đã chốt', icon: 'fa-circle-check', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  5: { label: 'Hoàn tất', icon: 'fa-lock', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
};

export const tenTrangThai = (trangThai) =>
  TRANG_THAI_META[trangThai]?.label || `Không xác định (${trangThai ?? '—'})`;

/* ------------------------------------------------------------------ */
/* Trạng thái từng dòng tiêu chí                                       */
/* ------------------------------------------------------------------ */

export const TRANG_THAI_DONG = {
  KE_KHAI: 1,
  CHO_THAM_DINH: 2,
  DA_CHOT: 3,
};

export const TRANG_THAI_DONG_META = {
  1: { label: 'Chờ GV kê khai', icon: 'fa-pen', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  2: { label: 'Chờ thẩm định', icon: 'fa-clipboard-check', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  3: { label: 'Đã chốt điểm', icon: 'fa-lock', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
};

export const tenTrangThaiDong = (trangThaiDong) =>
  TRANG_THAI_DONG_META[trangThaiDong]?.label ||
  `Không xác định (${trangThaiDong ?? '—'})`;

/**
 * Ai đã trả dòng này về. Hai chiều hoàn toàn khác nhau:
 *   2 — đơn vị thẩm định trả cho CHỦ PHIẾU bổ sung (dòng 2 → 1)
 *   3 — Trưởng khoa trả cho ĐƠN VỊ THẨM ĐỊNH làm lại (dòng 3 → 2)
 */
export const NGUON_TRA_VE = {
  DON_VI_THAM_DINH: 2,
  TRUONG_KHOA: 3,
};

export const TEN_NGUON_TRA_VE = {
  2: 'Đơn vị thẩm định trả về',
  3: 'Trưởng khoa trả thẩm định lại',
};

/* ------------------------------------------------------------------ */
/* Xếp loại                                                            */
/* ------------------------------------------------------------------ */

/** Xếp loại cuối năm (chỉ có khi tờ trình Khoa đã được đóng gói). */
export const XEP_LOAI_META = {
  1: { label: 'Không hoàn thành', className: 'rating-low' },
  2: { label: 'Hoàn thành', className: 'rating-medium' },
  3: { label: 'Hoàn thành tốt', className: 'rating-medium' },
  4: { label: 'Hoàn thành xuất sắc', className: 'rating-high' },
};

/**
 * Mức Trưởng khoa được chọn tay khi chốt hồ sơ. Mức 4 KHÔNG có ở đây: nó phụ
 * thuộc thứ hạng trong cả Khoa nên chỉ bước đóng gói tờ trình mới nâng lên được.
 */
export const XEP_LOAI_KHOA_CHON = [1, 2, 3];

/** muc_nckhcn_qd838 — chỉ mức 2 mới đủ điều kiện tranh hạn ngạch xuất sắc. */
export const MUC_QD838 = {
  CHUA_DAT: 0,
  HT_TOT: 1,
  HT_XUAT_SAC: 2,
};

export const TEN_MUC_QD838 = {
  0: 'Chưa / không đạt',
  1: 'Hoàn thành tốt',
  2: 'Hoàn thành xuất sắc',
};

/** QĐ 838 chỉ áp dụng từ năm học 2025-2026 trở đi. */
export const NAM_AP_DUNG_QD838 = 2025;

/** loai_doi_tuong — viên chức/NLĐ bị kẹp trần mức 2 và không tranh hạn ngạch. */
export const LOAI_DOI_TUONG = {
  GIANG_VIEN: 1,
  VIEN_CHUC: 2,
};

/* ------------------------------------------------------------------ */
/* Nguồn điểm                                                          */
/* ------------------------------------------------------------------ */

/** loai_nguon_diem = 2 → điểm do hệ thống tính, cấm chấm tay. */
export const NGUON_DIEM_TU_DONG = 2;

/** Tiêu chí phải chấm tay (là phần việc của đơn vị thẩm định). */
export const laTieuChiChamTay = (ct) => ct?.LoaiNguonDiem !== NGUON_DIEM_TU_DONG;

/**
 * tieu_chi.loai_thang_diem — quyết định người chấm CHỌN MỨC hay GÕ SỐ.
 * Loại 2 không có mức nào để bày; loại 3 chỉ có đúng hai mức dựng tại chỗ.
 */
export const LOAI_THANG_DIEM = {
  ROI_RAC: 1,
  LIEN_TUC: 2,
  CO_KHONG: 3,
};

/* ------------------------------------------------------------------ */
/* Tổng điểm & xếp loại TẠM TÍNH ở client                              */
/* ------------------------------------------------------------------ */

/** nhom_tieu_chi.loai_nhom — A = điểm cơ bản, B = điểm vượt trội. */
export const LOAI_NHOM = {
  CO_BAN: 1,
  VUOT_TROI: 2,
};

/** Hai ngưỡng điểm của bảng xếp loại (QĐ ĐHKT), xem schema_ghi_chu.md §4.1. */
export const NGUONG_XEP_LOAI = {
  HOAN_THANH: 80,
  HOAN_THANH_TOT: 100,
};

/**
 * Điểm hiệu lực của một dòng tiêu chí — đúng chuỗi COALESCE của
 * sp_phieu_danh_gia_tinh_tong_diem: diem_chinh_thuc → diem_truong → diem_khoa
 * → diem_tu_danh_gia → 0.
 */
export const diemHieuLucCuaDong = (ct) =>
  Number(
    ct?.DiemChinhThuc ?? ct?.DiemTruong ?? ct?.DiemKhoa ?? ct?.DiemTuDanhGia ?? 0,
  ) || 0;

/**
 * Tổng điểm TẠM TÍNH tại client từ ChiTiet[] của phiếu.
 *
 * VÌ SAO CẦN: ba cột tong_diem_* chỉ được server ghi trong đúng một transaction
 * — POST phieu/{id}/khoa/duyet-ho-so (Trưởng khoa chốt hồ sơ). GET phieu/{id} là
 * endpoint đọc thuần, không tính lại, nên mọi hồ sơ CHƯA chốt đều trả về null và
 * màn hình chỉ hiện dấu gạch. Không có endpoint dry-run nào để hỏi trước.
 *
 * Hàm này chạy lại đúng công thức đó ở client để người duyệt nhìn thấy con số
 * trước khi bấm chốt. Kết quả CHỈ để hiển thị: server vẫn tự tính lại khi chốt
 * (chống tamper) và giá trị của server mới là giá trị được lưu.
 *
 * ⚠️ ChiTietDanhGiaDto KHÔNG mang loai_nhom (chỉ ChiTietDanhGiaDonViDto của phiếu
 * đơn vị mới có). Muốn tách cơ bản / vượt trội phải tra nhóm từ MẪU qua
 * fetchTieuChiTheoMau. Thiếu bảng đó thì vẫn cộng được tổng tích lũy, chỉ hai ô
 * thành phần trả null — thà bỏ trống còn hơn xếp nhầm cả cụm vào Nhóm A.
 *
 * @param {Map<number, {loaiNhom: number}>} [nhomTheoTieuChi] map từ fetchTieuChiTheoMau
 * @returns {{coBan: number|null, vuotTroi: number|null, tichLuy: number,
 *            soDongChuaChot: number}|null} null khi phiếu chưa có dòng nào
 */
export const tinhTongDiemTamTinh = (chiTiet, nhomTheoTieuChi) => {
  const rows = chiTiet || [];
  if (rows.length === 0) return null;

  let coBan = 0;
  let vuotTroi = 0;
  let tichLuy = 0;
  let soDongChuaChot = 0;
  let soDongChuaBietNhom = 0;

  rows.forEach((ct) => {
    if (Number(ct.TrangThaiDong) !== TRANG_THAI_DONG.DA_CHOT) soDongChuaChot += 1;
    const diem = diemHieuLucCuaDong(ct);
    tichLuy += diem;

    const loaiNhom = Number(
      nhomTheoTieuChi?.get(Number(ct.IdTieuChi))?.loaiNhom ?? ct.LoaiNhom ?? 0,
    );
    if (loaiNhom === LOAI_NHOM.CO_BAN) coBan += diem;
    else if (loaiNhom === LOAI_NHOM.VUOT_TROI) vuotTroi += diem;
    else soDongChuaBietNhom += 1;
  });

  const dayDuNhom = soDongChuaBietNhom === 0;
  return {
    coBan: dayDuNhom ? coBan : null,
    vuotTroi: dayDuNhom ? vuotTroi : null,
    tichLuy,
    soDongChuaChot,
  };
};

/**
 * Mức xếp loại GỢI Ý tính tại client — bản rút gọn của XepLoaiCalculator.
 *
 * Cùng lý do với tinhTongDiemTamTinh: `xep_loai_de_xuat` cũng chỉ được ghi lúc
 * chốt hồ sơ nên trước đó phiếu không có mức nào để đối chiếu, trong khi server
 * lại từ chối (400) nếu Trưởng khoa chọn khác mức đề xuất mà không ghi lý do.
 * Tính trước ở đây để UI đòi lý do đúng lúc thay vì để người dùng ăn lỗi.
 *
 * TRẦN LÀ MỨC 3: mức 4 phụ thuộc hạn ngạch top 20% của cả Khoa nên client không
 * có đủ dữ liệu để suy ra — đó là việc của bước đóng gói tờ trình.
 *
 * @param {boolean} canQd838 hồ sơ có bị ràng buộc QĐ 838 không (giảng viên,
 *   năm học >= 2025-2026). false thì bỏ qua điều kiện này.
 * @param {number} tranMuc kẹp trần kết quả — viên chức/NLĐ chỉ tới mức 2.
 */
export const tinhXepLoaiGoiY = ({
  tichLuy,
  mucNckhcnQd838,
  canQd838 = true,
  duDinhMucGioNckh = true,
  khongViPhamPhapLuat = true,
  tranMuc = 3,
}) => {
  if (tichLuy == null) return null;
  // Hai điều kiện cứng phủ quyết cả điểm số: thiếu một cái là rơi thẳng mức 1.
  if (!duDinhMucGioNckh || !khongViPhamPhapLuat) return 1;
  if (Number(tichLuy) < NGUONG_XEP_LOAI.HOAN_THANH) return 1;

  const datQd838 = !canQd838 || Number(mucNckhcnQd838) >= MUC_QD838.HT_TOT;
  const muc =
    Number(tichLuy) > NGUONG_XEP_LOAI.HOAN_THANH_TOT && datQd838 ? 3 : 2;
  return Math.min(muc, tranMuc);
};

/* ------------------------------------------------------------------ */
/* Tiện ích hiển thị                                                   */
/* ------------------------------------------------------------------ */

/**
 * Parse ngày từ API, chấp nhận cả ISO lẫn định dạng ASP.NET cũ "/Date(1234567890)/".
 * Endpoint namdanhgia trả ISO, nhưng vài endpoint đời đầu vẫn trả kiểu cũ nên
 * các màn hình đánh giá đang tự chép lại logic này — gom về một chỗ.
 * @returns {Date|null} null khi rỗng hoặc không parse được
 */
export const parseNgay = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && value.includes('/Date(')) {
    const khop = value.match(/\d+/);
    if (!khop) return null;
    const d = new Date(parseInt(khop[0], 10));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const haiChuSo = (n) => String(n).padStart(2, '0');

/**
 * Ngày dạng dd/mm/yyyy.
 *
 * KHÔNG dùng toLocaleDateString('vi-VN'): locale này bỏ số 0 đứng đầu
 * ('4/8/2026') nên cột ngày trong bảng so le, lệch với các màn hình còn lại vốn
 * đã tự pad. Định dạng phải cố định, không phụ thuộc locale của máy người dùng.
 */
export const formatNgay = (value) => {
  const d = parseNgay(value);
  if (!d) return '—';
  return `${haiChuSo(d.getDate())}/${haiChuSo(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** Ngày giờ dạng dd/mm/yyyy HH:mm. */
export const formatNgayGio = (value) => {
  const d = parseNgay(value);
  if (!d) return '—';
  return `${formatNgay(d)} ${haiChuSo(d.getHours())}:${haiChuSo(d.getMinutes())}`;
};

/** Số có thể null → chuỗi hiển thị, giữ nguyên 0 (0 điểm khác với chưa chấm). */
export const formatDiem = (value, soLe = 2) => {
  if (value == null || value === '') return '—';
  const num = Number(value);
  return isNaN(num) ? '—' : num.toFixed(soLe);
};

const MOT_NGAY_MS = 24 * 60 * 60 * 1000;

/**
 * Cửa sổ tự đánh giá của một NamDanhGiaDto (NgayMoTuDanhGia / NgayDongTuDanhGia).
 *
 * ⚠️ CHỈ dùng khi người dùng CHƯA CÓ PHIẾU nào cho năm đó. Đã có phiếu thì hạn
 * hiệu lực do server chọn theo GIAI ĐOẠN và chỉ đọc được qua
 * `fetchKiemTraHopLe` (HanNop / QuaHan) — tự tính lại ở client sẽ khóa nhầm
 * người đang bổ sung dòng bị trả về, vì giai đoạn thẩm định chạy sau khi hạn
 * tự đánh giá đã đóng.
 *
 * Cột ngày đóng trong DB là DATE nên giá trị trả về là 00:00 của ngày đó; nghiệp
 * vụ hiểu là "hết ngày" nên phải kéo đến 23:59:59 trước khi so — không có bước
 * này thì giảng viên mất trắng ngày cuối.
 *
 * @param {object} nam một phần tử của namList
 * @returns {{trangThai: 'khong-ro'|'chua-mo'|'dang-mo'|'da-dong',
 *            soNgayConLai: number|null, ngayMo: Date|null, ngayDong: Date|null,
 *            thongDiep: string}} soNgayConLai chỉ có nghĩa khi đang mở (0 = hạn chót hôm nay)
 */
export const tinhCuaSoTuDanhGia = (nam) => {
  const ngayMo = parseNgay(nam?.NgayMoTuDanhGia);
  const ngayDong = parseNgay(nam?.NgayDongTuDanhGia);

  if (!ngayMo || !ngayDong) {
    return {
      trangThai: 'khong-ro',
      soNgayConLai: null,
      ngayMo,
      ngayDong,
      thongDiep: 'Chưa thiết lập thời gian tự đánh giá cho năm này',
    };
  }

  const hetNgayDong = new Date(ngayDong);
  hetNgayDong.setHours(23, 59, 59, 999);
  const bayGio = Date.now();

  if (bayGio < ngayMo.getTime()) {
    return {
      trangThai: 'chua-mo',
      soNgayConLai: null,
      ngayMo,
      ngayDong: hetNgayDong,
      thongDiep: `Chưa đến thời gian tự đánh giá — mở từ ${formatNgay(ngayMo)}`,
    };
  }

  if (bayGio > hetNgayDong.getTime()) {
    return {
      trangThai: 'da-dong',
      soNgayConLai: null,
      ngayMo,
      ngayDong: hetNgayDong,
      thongDiep: `Đã hết hạn tự đánh giá từ ngày ${formatNgay(ngayDong)}`,
    };
  }

  const soNgayConLai = Math.ceil((hetNgayDong.getTime() - bayGio) / MOT_NGAY_MS);
  return {
    trangThai: 'dang-mo',
    soNgayConLai,
    ngayMo,
    ngayDong: hetNgayDong,
    thongDiep:
      soNgayConLai <= 1
        ? `Hôm nay là hạn cuối tự đánh giá (${formatNgay(ngayDong)})`
        : `Còn ${soNgayConLai} ngày để tự đánh giá, hạn chót ${formatNgay(ngayDong)}`,
  };
};

/* ------------------------------------------------------------------ */
/* Hạn theo GIAI ĐOẠN + quyền thao tác của chủ phiếu                    */
/* ------------------------------------------------------------------ */

/**
 * Nhãn cho `HanNop` của GET /phieu/{id}/kiem-tra-hop-le.
 *
 * Server chọn hạn theo GIAI ĐOẠN phiếu đang đứng: trạng thái 1 dùng
 * `ngay_dong_tu_danh_gia`, trạng thái 2 dùng `ngay_dong_danh_gia_cap_tren` —
 * giai đoạn thẩm định theo thiết kế chạy SAU khi hạn tự đánh giá đã đóng, gate
 * bằng hạn cũ thì gần như mọi lần trả về đều ăn 409 QUA_HAN.
 *
 * Hệ quả: `HanNop` của CÙNG một phiếu sẽ đổi giá trị khi phiếu chuyển 1 → 2.
 * Không được cache nó xuyên qua các lần đổi trạng thái, và không được tự tính
 * hạn ở client từ dữ liệu năm đánh giá.
 */
export const nhanHanNop = (trangThai) =>
  Number(trangThai) === TRANG_THAI.THAM_DINH
    ? 'Hạn bổ sung theo yêu cầu thẩm định'
    : 'Hạn tự đánh giá';

/**
 * Câu mô tả hạn hiệu lực, hiện thẳng cho chủ phiếu.
 *
 * `HanNop = null` nghĩa là năm chưa cấu hình ngày đóng của giai đoạn đó → KHÔNG
 * giới hạn thời gian. Phải nói rõ, để trống sẽ bị hiểu nhầm là chưa tải được.
 */
export const moTaHanNop = (kiemTra) => {
  if (!kiemTra) return '';
  const nhan = nhanHanNop(kiemTra.TrangThai);
  if (!kiemTra.HanNop) return `${nhan}: không giới hạn`;
  return kiemTra.QuaHan
    ? `Đã quá ${nhan.toLowerCase()} — hạn chót ${formatNgay(kiemTra.HanNop)}`
    : `${nhan}: ${formatNgay(kiemTra.HanNop)}`;
};

/**
 * Một DÒNG tiêu chí có cho chủ phiếu sửa không (điểm, nhận xét, minh chứng).
 *
 * Giao của ba điều kiện độc lập:
 *  - đúng chủ phiếu (`LaChuPhieu` của kiem-tra-hop-le);
 *  - dòng đang ở KE_KHAI — chưa kê khai lần đầu HOẶC vừa bị thẩm định trả về;
 *  - còn hạn của giai đoạn hiện tại (`QuaHan = false`).
 *
 * Tuyệt đối không suy từ trạng thái PHIẾU: một phiếu ở trạng thái 2 có thể chứa
 * đồng thời cả ba loại dòng, chỉ dòng bị trả về mới mở.
 */
export const suaDuocDong = (chiTiet, kiemTra) =>
  Boolean(kiemTra?.LaChuPhieu) &&
  Number(chiTiet?.TrangThaiDong) === TRANG_THAI_DONG.KE_KHAI &&
  laTieuChiChamTay(chiTiet) &&
  !kiemTra?.QuaHan;

/**
 * Các dòng đang chờ chủ phiếu bổ sung — mẫu số của nút "Nộp lại".
 *
 * Bỏ tiêu chí chấm tự động: chúng khóa cứng ở mọi đường (AUTO_SCORED) nên không
 * bao giờ là việc của chủ phiếu.
 *
 * ⚠️ API không trả cờ `CoTheNopLai`: `sp_phieu_kiem_tra_hop_le` có tính
 * `co_the_nop_lai` / `so_dong_cho_ke_khai` nhưng DAL không đọc hai cột đó nên
 * chúng không ra tới client. Chừng nào chưa nối, client phải tự đếm ở đây.
 */
export const locDongChoBoSung = (chiTiet = []) =>
  chiTiet.filter(
    (ct) =>
      Number(ct?.TrangThaiDong) === TRANG_THAI_DONG.KE_KHAI &&
      laTieuChiChamTay(ct),
  );

/**
 * Dòng có yêu cầu trả về ĐANG MỞ từ đơn vị thẩm định.
 *
 * Phân biệt "bị trả về" với "chưa kê khai": cả hai đều `TrangThaiDong = 1`, dấu
 * hiệu bị trả về là `NguonTraVe = 2` (kèm LyDoTraVe / NgayTraVe). `SoLanTraVe`
 * cộng dồn cả vòng đời và KHÔNG reset khi nộp lại, nên nó chỉ để hiển thị lịch
 * sử — không dùng để suy trạng thái hiện tại.
 */
export const laDongBiTraVe = (ct) =>
  Number(ct?.NguonTraVe) === NGUON_TRA_VE.DON_VI_THAM_DINH;

/* ------------------------------------------------------------------ */
/* Lỗi                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Dựng Error đã Việt hóa từ một response lỗi.
 * 409 trên nhóm API phiếu luôn là xung đột optimistic lock (hoặc sai trạng
 * thái) — gắn cờ `isConflict` để màn hình tự tải lại thay vì chỉ báo đỏ.
 */
const buildApiError = async (response, fallback) => {
  const info = await readApiError(response, fallback);
  const isConflict = response.status === 409;
  const error = new Error(
    isConflict
      ? info.rawMessage || info.message ||
        'Phiếu đã bị người khác cập nhật. Vui lòng tải lại trang.'
      : info.message,
  );
  error.status = response.status;
  error.errorCode = info.errorCode;
  error.isConflict = isConflict;
  error.isForbidden = response.status === 403;
  // Payload phụ của các lỗi quy trình: CHUA_DU_HO_SO / DONG_HANG kèm HoSo[],
  // DONG_HANG kèm DongHang{}, 422 submit kèm missingItems[]. Bên gọi dựng UI từ
  // chúng chứ không chỉ hiện toast — đừng nuốt mất ở đây.
  error.hoSo = info.hoSo;
  error.dongHang = info.dongHang;
  error.missingItems = info.missingItems;
  return error;
};

/** GET trả JSON; ném Error đã Việt hóa khi không 2xx. */
const getJson = async (endpoint, fallback) => {
  const response = await apiFetch(endpoint);
  if (!response.ok) throw await buildApiError(response, fallback);
  return response.json();
};

const sendJson = async (endpoint, method, body, fallback) => {
  const response = await apiFetch(endpoint, {
    method,
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await buildApiError(response, fallback);
  return response.json().catch(() => ({}));
};

/** Chuỗi query bỏ qua mọi tham số rỗng/null (server coi '' là giá trị hợp lệ). */
const buildQuery = (params) => {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    qs.set(key, String(value));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
};

/* ------------------------------------------------------------------ */
/* Phiếu                                                               */
/* ------------------------------------------------------------------ */

/**
 * Hàng đợi chờ đơn vị chấm (chỉ trang_thai = 2, đã lọc theo phân quyền tiêu chí).
 * Mỗi phiếu kèm SoTieuChiDuocGiao / SoTieuChiDaCham của ĐƠN VỊ ĐANG ĐĂNG NHẬP.
 */
export const fetchPhieuChoCham = async ({
  idNam,
  idNhanVien,
  page = 1,
  pageSize = 20,
  sortBy = 'ngay_gui',
} = {}) => {
  const data = await getJson(
    `phieu/khoa/pending${buildQuery({ idNam, idNhanVien, page, pageSize, sortBy })}`,
    'Không tải được hàng đợi chờ chấm',
  );
  return data.Items || [];
};

/**
 * Danh sách phiếu toàn đơn vị, mọi trạng thái.
 * @param {number[]|string} trangThai mảng hoặc CSV — server nhận CSV "1,2,3".
 */
export const fetchPhieuList = async ({
  idNam,
  idDonVi,
  idNhanVien,
  trangThai,
  tuNgay,
  denNgay,
  page = 1,
  pageSize = 20,
  sortBy = 'ngay_tao',
} = {}) => {
  const csv = Array.isArray(trangThai) ? trangThai.join(',') : trangThai;
  const data = await getJson(
    `phieu${buildQuery({
      idNam,
      idDonVi,
      idNhanVien,
      trangThai: csv,
      tuNgay,
      denNgay,
      page,
      pageSize,
      sortBy,
    })}`,
    'Không tải được danh sách phiếu',
  );
  return data.Items || [];
};

/** Trần số trang khi quét hết danh sách phiếu (200 dòng mỗi trang). */
const TRAN_TRANG_PHIEU = 10;
const PAGE_SIZE_QUET = 200;

/**
 * TOÀN BỘ phiếu khớp bộ lọc, không phân trang.
 *
 * Dùng khi màn hình phải ghép danh sách phiếu với một nguồn khác nằm ở client
 * (ví dụ người chưa lập phiếu): chỉ cần thiếu một phiếu là kết luận ghép sai, và
 * trộn dữ liệu client vào một trang do server cắt sẵn thì số trang lẫn số dòng
 * đều nói dối. PhieuDanhGiaResponse không trả TotalCount nên dấu hiệu duy nhất
 * biết đã hết là gặp một trang chưa đầy.
 *
 * Đắt hơn fetchPhieuList một cách rõ ràng — đừng dùng cho màn hình chỉ cần một
 * trang. Chạm trần thì cảnh báo ra console chứ KHÔNG im lặng cắt bớt.
 */
export const fetchPhieuListDayDu = async (params = {}) => {
  const all = [];
  for (let page = 1; page <= TRAN_TRANG_PHIEU; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const items = await fetchPhieuList({ ...params, page, pageSize: PAGE_SIZE_QUET });
    all.push(...items);
    if (items.length < PAGE_SIZE_QUET) return all;
  }
  console.warn(
    `[fetchPhieuListDayDu] Đã chạm trần ${TRAN_TRANG_PHIEU} trang, danh sách phiếu có thể bị thiếu.`,
  );
  return all;
};

/**
 * Phiếu của CHÍNH MÌNH trong một năm (kèm ChiTiet[]).
 *
 * Chưa có phiếu là trạng thái BÌNH THƯỜNG: phiếu chỉ được tạo khi giảng viên lưu
 * lần đầu, nên mọi phản hồi không-2xx đều quy về null thay vì ném lỗi — màn hình
 * tổng quan không được báo đỏ chỉ vì người dùng chưa mở phiếu bao giờ.
 */
export const fetchPhieuCuaToi = async (idNam, idDonVi) => {
  if (!idNam) return null;
  try {
    const query = buildQuery({ kemLichSu: true, idDonVi: idDonVi || undefined });
    const response = await apiFetch(`phieu/me/${idNam}${query}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.Item || null;
  } catch (error) {
    console.error('Lỗi tải phiếu cá nhân:', error);
    return null;
  }
};

/**
 * Tổng hợp điểm tự động (NCKH, phản hồi SV, vi phạm giảng dạy, nhiệm vụ Khoa).
 * Trong một năm CHỈ MỘT phiếu được chấm tự động.
 * Gọi trên phiếu còn lại sẽ nhận 409 PHIEU_KHONG_NHAN_DIEM_TU_DONG.
 */
export const tongHopTuDong = async (idPhieu) => {
  const response = await apiFetch(`phieu/${idPhieu}/tong-hop-tu-dong`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errorInfo = await readApiError(response, 'Tổng hợp điểm tự động thất bại');
    const err = new Error(errorInfo.message);
    err.errorCode = errorInfo.errorCode;
    err.rawMessage = errorInfo.rawMessage;
    throw err;
  }
  const data = await response.json().catch(() => ({}));
  return data.Item || data;
};

/**
 * Dry-run của submit: phiếu đã đủ điều kiện nộp chưa, còn thiếu tiêu chí nào.
 * KHÔNG đổi trạng thái phiếu, không cần RowVersion.
 *
 * ⚠️ Lệch quy ước casing: DTO ngoài là PascalCase (CoTheNop, SoTieuChiThieu,
 * TongSoTieuChi, ThieuMinhChung) nhưng từng phần tử trong ThieuMinhChung[] lại là
 * camelCase (idChiTiet, idTieuChi, tenTieuChi, missingDiemTuDanhGia,
 * missingMinhChung, batBuocMinhChung). Đây là chỗ duy nhất trong nhóm API phiếu
 * như vậy — xem docs/openapi.yaml, schema PhieuSubmitMissingItemDto.
 *
 * Server bỏ qua tiêu chí chấm tự động (LoaiNguonDiem = 2) và chỉ báo thiếu minh
 * chứng khi BatBuocMinhChung = 1 VÀ DiemTuDanhGia > 0. CoTheNop chỉ true với chủ phiếu.
 *
 * Đây cũng là NGUỒN SỰ THẬT DUY NHẤT về hạn: `HanNop`/`QuaHan` được server chọn
 * theo giai đoạn phiếu đang đứng (xem `nhanHanNop`), nên giá trị của cùng một
 * phiếu SẼ ĐỔI khi phiếu chuyển 1 → 2. Phải gọi lại sau mỗi thao tác đổi trạng
 * thái, không được giữ bản cũ.
 *
 * `SoTieuChiThieu` chỉ đếm dòng đang ở TrangThaiDong = 1 nên dùng chung được cho
 * cả nộp lần đầu lẫn nộp lại; riêng `CoTheNop` chỉ dành cho nộp LẦN ĐẦU và luôn
 * false khi phiếu ở trạng thái 2.
 */
export const fetchKiemTraHopLe = async (idPhieu) => {
  const data = await getJson(
    `phieu/${idPhieu}/kiem-tra-hop-le`,
    'Không kiểm tra được điều kiện nộp phiếu',
  );
  return data.Item || null;
};

/** Chi tiết phiếu: header + ChiTiet[] + PheDuyet[] + RowVersion. */
export const fetchPhieuDetail = async (idPhieu) => {
  const data = await getJson(`phieu/${idPhieu}`, 'Không tải được chi tiết phiếu');
  return data.Item || null;
};

/* ------------------------------------------------------------------ */
/* Giai đoạn 2 — thẩm định theo từng dòng tiêu chí                     */
/* ------------------------------------------------------------------ */

/**
 * Chuẩn hóa response của mọi endpoint cấp DÒNG.
 *
 * `trangThaiPhieu` là trạng thái hồ sơ SAU thao tác: giá trị 3 nghĩa là dòng vừa
 * xử lý là dòng cuối chưa chốt → hồ sơ tự lên Trưởng khoa và rời hàng đợi thẩm
 * định; giá trị 2 sau một thao tác trả về nghĩa là hồ sơ vừa bị kéo ngược lại.
 *
 * `newRowVersion` là RowVersion MỚI của phiếu cha — bên gọi phải dùng nó cho
 * thao tác kế tiếp trên cùng phiếu, nếu không lần gọi sau chắc chắn 409.
 */
const docKetQuaDong = (data) => ({
  item: data.Item || null,
  trangThaiPhieu: data.TrangThaiPhieu ?? null,
  newRowVersion: data.NewRowVersion ?? null,
});

/**
 * Hàng đợi thẩm định theo DÒNG — màn hình làm việc chính của chuyên viên.
 * Chỉ trả dòng đang ở CHO_THAM_DINH, đã bỏ qua tiêu chí chấm tự động. Server tự
 * đẩy dòng NguonTraVe = 3 (Trưởng khoa trả lại) lên đầu vì đó là việc đang chặn
 * cả hồ sơ — KHÔNG sắp xếp lại ở client.
 */
export const fetchThamDinhPending = async ({
  idNam,
  idNhanVien,
  idTieuChi,
  page = 1,
  pageSize = 20,
  sortBy = 'moi_nhat',
} = {}) => {
  const data = await getJson(
    `tham-dinh/pending${buildQuery({
      idNam,
      idNhanVien,
      idTieuChi,
      page,
      pageSize,
      sortBy,
    })}`,
    'Không tải được hàng đợi thẩm định',
  );
  return { items: data.Items || [], tongSoDong: data.TongSoDong ?? null };
};

/**
 * Thẩm định có SỬA điểm (dòng 2 → 3).
 *
 * `diem` bắt buộc — dòng chốt ngay tại đây nên "chốt mà không có điểm" là vô
 * nghĩa (400 THIEU_DIEM). `nhanXet` bắt buộc khi điểm khác điểm GV tự kê khai
 * (409 THIEU_LY_DO); muốn giữ nguyên điểm GV thì gọi duyetThamDinh — hàm đó
 * không đòi lý do.
 */
export const putDiemKhoa = async (idChiTiet, { diem, nhanXet, rowVersion }) => {
  const data = await sendJson(
    `chitiet/${idChiTiet}/diem-khoa`,
    'PUT',
    { Diem: diem, NhanXet: nhanXet || null, RowVersion: rowVersion },
    'Lưu điểm thất bại',
  );
  return docKetQuaDong(data);
};

/** Duyệt GIỮ NGUYÊN điểm GV tự kê khai (dòng 2 → 3). Không cần lý do. */
export const duyetThamDinh = async (idChiTiet, { nhanXet, rowVersion }) => {
  const data = await sendJson(
    `chitiet/${idChiTiet}/tham-dinh/duyet`,
    'POST',
    { NhanXet: nhanXet || null, RowVersion: rowVersion },
    'Duyệt tiêu chí thất bại',
  );
  return docKetQuaDong(data);
};

/**
 * Trả ĐÚNG MỘT DÒNG về cho chủ phiếu bổ sung (dòng 2 → 1).
 *
 * Thay thế hẳn POST phieu/{id}/khoa/tra-lai của luồng cũ — endpoint đó xóa sạch
 * điểm Khoa của MỌI dòng và đã bị gỡ. Ở đây các dòng khác giữ nguyên tiến độ,
 * hồ sơ ở lại trạng thái 2 và LanDanhGia không tăng.
 */
export const traVeThamDinh = async (idChiTiet, { lyDo, rowVersion }) => {
  const data = await sendJson(
    `chitiet/${idChiTiet}/tham-dinh/tra-ve`,
    'POST',
    { LyDo: lyDo, RowVersion: rowVersion },
    'Trả tiêu chí về thất bại',
  );
  return docKetQuaDong(data);
};

/**
 * Trưởng khoa trả một dòng ĐÃ CHỐT về cho đơn vị thẩm định làm lại (dòng 3 → 2).
 *
 * Khác traVeThamDinh (trả cho chủ phiếu): đích đến là đơn vị đã thẩm định, lấy
 * từ IdDonViThamDinh đã snapshot trên dòng. Hồ sơ tụt về 2 và HỦY cả nhóm xếp
 * loại (XepLoaiKhoa, XepLoaiDeXuat, LyDoXepLoai, HangTrongKhoa) — Trưởng khoa
 * phải chốt lại từ đầu, nên UI phải cảnh báo trước khi gọi.
 */
export const traThamDinhLai = async (idChiTiet, { lyDo, rowVersion }) => {
  const data = await sendJson(
    `chitiet/${idChiTiet}/khoa/tra-tham-dinh`,
    'POST',
    { LyDo: lyDo, RowVersion: rowVersion },
    'Trả tiêu chí về đơn vị thẩm định thất bại',
  );
  return docKetQuaDong(data);
};

/**
 * CHỦ PHIẾU nộp lại các dòng đã sửa sau khi bị trả về (dòng 1 → 2).
 *
 * Phiếu giữ nguyên trạng thái 2 và giữ nguyên LanDanhGia — đây KHÔNG phải một
 * vòng đánh giá mới. Dòng đang chờ thẩm định hoặc đã chốt không bị đụng tới.
 */
export const nopLaiPhieu = async (idPhieu, { nhanXet, rowVersion } = {}) =>
  sendJson(
    `phieu/${idPhieu}/nop-lai`,
    'POST',
    { NhanXet: nhanXet || null, RowVersion: rowVersion },
    'Nộp lại phiếu thất bại',
  );

/* ------------------------------------------------------------------ */
/* Giai đoạn 3 — Trưởng khoa chốt hồ sơ                                */
/* ------------------------------------------------------------------ */

/**
 * Trưởng khoa chốt hồ sơ cá nhân và chọn tay xếp loại (phiếu 3 → 4).
 *
 * Thay thế cả POST /truong/duyet lẫn POST /chot của luồng cũ. Server tính lại
 * tổng điểm ở bước này (chống tamper) nên đừng gửi điểm lên.
 *
 * Ràng buộc phía server, UI nên chặn trước cho đỡ mất công:
 *  - `xepLoaiKhoa` chỉ 1/2/3. Gửi 4 → 400; mức 4 do bước đóng gói tờ trình nâng.
 *  - `lyDoXepLoai` bắt buộc khi khác `XepLoaiDeXuat` của phiếu.
 *  - `mucNckhcnQd838` bắt buộc với giảng viên từ năm học 2025-2026.
 */
export const khoaDuyetHoSo = async (
  idPhieu,
  {
    xepLoaiKhoa,
    lyDoXepLoai,
    mucNckhcnQd838,
    duDinhMucGioNckh,
    khongViPhamPhapLuat,
    ghiChuXepLoai,
    nhanXet,
    rowVersion,
  },
) =>
  sendJson(
    `phieu/${idPhieu}/khoa/duyet-ho-so`,
    'POST',
    {
      XepLoaiKhoa: xepLoaiKhoa,
      LyDoXepLoai: lyDoXepLoai || null,
      MucNckhcnQd838: mucNckhcnQd838 ?? null,
      DuDinhMucGioNckh: !!duDinhMucGioNckh,
      KhongViPhamPhapLuat: !!khongViPhamPhapLuat,
      GhiChuXepLoai: ghiChuXepLoai || null,
      NhanXet: nhanXet || null,
      RowVersion: rowVersion,
    },
    'Chốt hồ sơ thất bại',
  );

/* ------------------------------------------------------------------ */
/* Giai đoạn 4 — thao tác cấp phiếu trong gói tờ trình                 */
/* ------------------------------------------------------------------ */

/**
 * Đánh dấu hồ sơ được suất xuất sắc cuối cùng — gỡ bế tắc DONG_HANG khi đóng gói.
 *
 * Số hồ sơ được đánh dấu phải BẰNG ĐÚNG số suất còn lại (`DongHang.SoSuatConLai`);
 * thừa hay thiếu thì đóng gói vẫn báo DONG_HANG. Trả về ToTrinhKhoaResponse nên
 * đọc `HoSo[]` chứ không phải `Item`.
 */
export const datUuTienXuatSac = async (idPhieu, { uuTien, rowVersion }) => {
  const data = await sendJson(
    `phieu/${idPhieu}/uu-tien-xuat-sac`,
    'PUT',
    { UuTien: !!uuTien, RowVersion: rowVersion },
    'Cập nhật ưu tiên xuất sắc thất bại',
  );
  return data.HoSo || [];
};

/**
 * Hiệu trưởng mở lại một phiếu ĐÃ HOÀN TẤT (5 → 1/2/3).
 *
 * Khác hẳn ht-tra-lai (trả hồ sơ trong gói đang trình, 4 → 3): mo-lai dùng khi
 * hồ sơ đã chốt xong toàn trường mà phát hiện sai sót. Thao tác này snapshot
 * điểm hiện tại vào lịch sử, xóa điểm theo mức trạng thái đích và tăng cả
 * LanDanhGia lẫn LanMoLai — không hoàn tác được.
 */
export const moLaiPhieu = async (
  idPhieu,
  { trangThaiMoi, lyDo, nhanXet, rowVersion },
) =>
  sendJson(
    `phieu/${idPhieu}/mo-lai`,
    'POST',
    {
      TrangThaiMoi: trangThaiMoi,
      LyDo: lyDo,
      NhanXet: nhanXet || null,
      RowVersion: rowVersion,
    },
    'Mở lại phiếu thất bại',
  );

/**
 * Phiếu cấp Trường — CHỈ ĐỂ THEO DÕI, không phải hàng đợi hành động.
 *
 * Chỉ trả phiếu ở trạng thái 4 (TK_DA_DUYET) trên toàn trường. Hiệu trưởng
 * không còn duyệt phiếu lẻ; hàng đợi hành động thật là danh sách tờ trình
 * (xem toTrinhApi.js). Trưởng khoa gọi endpoint này sẽ nhận 403 — TK dùng
 * fetchPhieuList({ trangThai: 3 }).
 */
export const fetchPhieuTruongPending = async ({
  idNam,
  idNhanVien,
  page = 1,
  pageSize = 20,
  sortBy = 'ngay_gui',
} = {}) => {
  const data = await getJson(
    `phieu/truong/pending${buildQuery({ idNam, idNhanVien, page, pageSize, sortBy })}`,
    'Không tải được danh sách phiếu cấp Trường',
  );
  return data.Items || [];
};

/**
 * CHỦ PHIẾU tự rút phiếu vừa nộp về Nháp để sửa tiếp (2 → 1).
 *
 * Khác nopLaiPhieu: hủy nộp kéo cả hồ sơ ngược về trạng thái 1, chỉ dùng được
 * khi CHƯA dòng nào chốt. Sau khi đơn vị đã thẩm định xong dù chỉ một dòng thì
 * đường về duy nhất là chờ được trả dòng rồi nộp lại.
 *
 * Giữ nguyên LanDanhGia, không mở vòng đánh giá mới. Server chỉ cho qua khi
 * người gọi là chủ phiếu, phiếu đang ở trạng thái 2, chưa dòng nào ở DA_CHOT và
 * còn trong hạn tự đánh giá (tính cả hạn gia hạn riêng). Mọi vi phạm đều trả 409
 * (INVALID_STATE / DA_CHAM / QUA_HAN) → lỗi có cờ `isConflict`, bên gọi phải
 * hiện nguyên văn message và tải lại phiếu.
 */
export const huyNopPhieu = async (idPhieu, { lyDo, rowVersion } = {}) =>
  sendJson(
    `phieu/${idPhieu}/huy-nop`,
    'POST',
    { LyDo: lyDo || null, RowVersion: rowVersion },
    'Hủy nộp phiếu thất bại',
  );

/* ------------------------------------------------------------------ */
/* Dữ liệu phụ trợ của một tiêu chí                                    */
/* ------------------------------------------------------------------ */

/**
 * Bảng tra tiêu chí của một MẪU theo IdTieuChi — thang điểm + nhóm A/B.
 *
 * Hai thứ chi tiết phiếu KHÔNG mang mà màn hình chấm/duyệt cần:
 *  - danh sách mức của thang điểm (phiếu chỉ có con số và IdThangDiemChon), để
 *    người thẩm định chọn lại mức thay vì gõ số;
 *  - `loaiNhom` của tiêu chí, để tách tổng điểm cơ bản (Nhóm A) với vượt trội
 *    (Nhóm B) — ChiTietDanhGiaDto không có cột này.
 *
 * Mẫu lồng hai tầng nhóm (Nhom → NhomCon → TieuChi) — duyệt thiếu tầng con là
 * mất nguyên nhóm tiêu chí. Nhóm con thường để trống loai_nhom và thừa hưởng của
 * nhóm cha, nên phải truyền loại của cha xuống.
 *
 * Thiếu bảng này không chặn việc chấm: bên gọi rơi về ô nhập điểm tự do và hai ô
 * điểm thành phần bỏ trống.
 */
export const fetchTieuChiTheoMau = async (idMau) => {
  const data = await getJson(
    `maudanhgia/${idMau}/chi-tiet`,
    'Không tải được chi tiết mẫu đánh giá',
  );
  const map = new Map();
  const nap = (dsTieuChi, loaiNhom) => {
    (dsTieuChi || []).forEach((tc) => {
      if (tc?.IdTieuChi == null) return;
      map.set(Number(tc.IdTieuChi), {
        loaiNhom: Number(loaiNhom) || null,
        loaiThangDiem: Number(tc.LoaiThangDiem) || 1,
        diemToiDa: tc.DiemToiDa,
        mucDiem: [...(tc.ThangDiem || [])].sort(
          (a, b) => (a.ThuTuHienThi ?? 0) - (b.ThuTuHienThi ?? 0),
        ),
      });
    });
  };
  ((data.Item || {}).Nhom || []).forEach((nhom) => {
    nap(nhom.TieuChi, nhom.LoaiNhom);
    (nhom.NhomCon || []).forEach((nhomCon) =>
      nap(nhomCon.TieuChi, nhomCon.LoaiNhom || nhom.LoaiNhom),
    );
  });
  map.nhomTree = (data.Item || {}).Nhom || [];
  return map;
};

export const fetchMinhChung = async (idChiTiet) => {
  const data = await getJson(
    `chitiet/${idChiTiet}/minh-chung`,
    'Không tải được minh chứng',
  );
  return data.Items || [];
};

export const fetchNhiemVuCongDong = async (idChiTiet) => {
  const data = await getJson(
    `chitiet/${idChiTiet}/nhiem-vu`,
    'Không tải được nhiệm vụ cộng đồng',
  );
  return data.Items || [];
};

/**
 * Lịch sử chấm điểm của 1 tiêu chí, đã gom nhóm theo (LanDanhGia, IdChiTiet, Cap).
 * Dùng để xem "vòng 1 Khoa chấm X, sau khi trả lại vòng 2 chấm Y".
 */
export const fetchLichSuChamDiem = async (idChiTiet) => {
  const data = await getJson(
    `chitiet/${idChiTiet}/lich-su-cham-diem`,
    'Không tải được lịch sử chấm điểm',
  );
  return data.Items || [];
};

/**
 * Lịch sử chấm điểm của TOÀN phiếu, cùng dạng nhóm như bản theo tiêu chí.
 * Một request thay cho n request `chitiet/{id}/lich-su-cham-diem` khi màn hình
 * cần hiện lịch sử ở mọi tiêu chí.
 */
export const fetchLichSuChamDiemPhieu = async (idPhieu) => {
  const data = await getJson(
    `phieu/${idPhieu}/lich-su-cham-diem`,
    'Không tải được lịch sử chấm điểm của phiếu',
  );
  return data.Items || [];
};

/**
 * Nhật ký đổi trạng thái của cả hồ sơ, theo thứ tự thời gian.
 *
 * Tên field khác với lịch sử chấm điểm: `Id` (không phải IdLichSu),
 * `TrangThaiTruoc`/`TrangThaiSau`, `TenNguoiThucHien`, `NgayThucHien`.
 * Nhãn cho HanhDong / CapThucHien lấy ở TEN_HANH_DONG_TRANG_THAI / TEN_CAP_CHAM.
 */
export const fetchLichSuTrangThai = async (idPhieu) => {
  const data = await getJson(
    `phieu/${idPhieu}/lich-su-trang-thai`,
    'Không tải được lịch sử trạng thái phiếu',
  );
  return data.Items || [];
};

/** Mốc thời gian của một lượt chấm, dùng làm khóa sắp xếp. */
const mocLuotCham = (entry) => parseNgay(entry?.NgayThucHien)?.getTime() ?? 0;

/** Lượt sớm nhất trong một nhóm (vòng + cấp) — vị trí của nhóm trên dòng thời gian. */
const mocSomNhatCuaNhom = (nhom) =>
  (nhom.Entries || []).reduce(
    (som, e) => Math.min(som, mocLuotCham(e)),
    Number.POSITIVE_INFINITY,
  );

/**
 * Gom lịch sử toàn phiếu về Map<IdChiTiet, nhóm[]> để từng tiêu chí tra O(1).
 * Nhóm sắp theo vòng đánh giá rồi tới mốc thời gian thực tế của lượt chấm.
 *
 * KHÔNG sắp theo mã `Cap`: thứ tự mã không còn khớp thứ tự nghiệp vụ. Trưởng
 * khoa là cấp 4 nhưng chốt hồ sơ TRƯỚC cấp trường (cấp 3), còn dòng cấp 3 do
 * engine chấm tự động lại sinh ra ngay lúc GV nộp phiếu — sớm hơn cả cấp 2.
 */
export const gomLichSuTheoChiTiet = (items) => {
  const map = new Map();
  (items || []).forEach((nhom) => {
    const key = Number(nhom.IdChiTiet);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({
      ...nhom,
      Entries: [...(nhom.Entries || [])].sort(
        (a, b) => mocLuotCham(a) - mocLuotCham(b),
      ),
    });
  });
  map.forEach((nhomList) =>
    nhomList.sort(
      (a, b) =>
        a.LanDanhGia - b.LanDanhGia ||
        mocSomNhatCuaNhom(a) - mocSomNhatCuaNhom(b) ||
        a.Cap - b.Cap,
    ),
  );
  return map;
};

/**
 * Cấp thực hiện — dùng chung cho lich_su_cham_diem.Cap và
 * lich_su_trang_thai_phieu.CapThucHien (xem docs/schema_ghi_chu.md §4.7–§4.8).
 *
 * Cấp 3 KHÔNG đồng nghĩa "Hiệu trưởng chấm": bước "Trường chấm điểm" đã bị bỏ,
 * không còn đường ghi tay nào vào nhóm cột diem_truong*. Dòng cấp 3 sinh ra hôm
 * nay chỉ có hai nguồn — engine chấm tự động (hành động Chấm) và các thao tác
 * cấp Trường (mở lại phiếu).
 *
 * ⚠️ Enum trong docs/openapi.yaml còn cũ (chỉ liệt kê 1–3 và hành động 1–3).
 * Nguồn sự thật là schema_ghi_chu.md — cấp 4 và hành động 4/5 là của luồng mới.
 */
export const CAP_CHAM = { TU_DG: 1, DON_VI_THAM_DINH: 2, TRUONG: 3, TRUONG_KHOA: 4 };
export const TEN_CAP_CHAM = {
  1: 'Giảng viên tự đánh giá',
  2: 'Đơn vị thẩm định',
  3: 'Cấp trường',
  4: 'Trưởng khoa',
};

export const HANH_DONG_CHAM = {
  CHAM: 1,
  SUA: 2,
  CHOT: 3,
  DUYET_GIU_NGUYEN: 4,
  TRA_VE_DONG: 5,
};
export const TEN_HANH_DONG_CHAM = {
  1: 'Chấm',
  2: 'Sửa điểm',
  3: 'Chốt',
  4: 'Duyệt giữ nguyên điểm',
  5: 'Trả về bổ sung',
};

/** lich_su_trang_thai_phieu.HanhDong — 9 giá trị, xem schema_ghi_chu.md §4.8. */
export const HANH_DONG_TRANG_THAI = {
  SUBMIT: 1,
  DUYET: 2,
  TRA_LAI: 3,
  CHOT: 4,
  MO_LAI: 5,
  HUY_NOP: 6,
  NOP_LAI: 7,
  TK_CHOT_HO_SO: 8,
  HT_TRA_HO_SO: 9,
};

export const TEN_HANH_DONG_TRANG_THAI = {
  1: 'Nộp phiếu',
  2: 'Duyệt & chuyển tiếp',
  3: 'Trả lại',
  4: 'Chốt kết quả',
  5: 'Mở lại phiếu',
  6: 'Hủy nộp',
  7: 'Nộp lại sau khi bị trả về',
  8: 'Trưởng khoa chốt hồ sơ',
  9: 'Hiệu trưởng trả hồ sơ về Trưởng khoa',
};

/**
 * Lượt lịch sử này do MÁY ghi hay do người chấm?
 *
 * Tiêu chí LoaiNguonDiem = 2 không đi qua cấp chấm tay nào: engine ghi thẳng
 * diem_chinh_thuc và để lại một dòng cấp 3 / hành động Chấm. IdNguoiThucHien của
 * dòng đó là người bấm NỘP PHIẾU (thường là chính giảng viên), không phải người
 * chấm — hiển thị "Chấm bởi <tên>" ở đây là sai sự thật.
 */
export const laLuotChamTuDong = (entry, chiTiet) =>
  !laTieuChiChamTay(chiTiet) &&
  Number(entry?.Cap) === CAP_CHAM.TRUONG &&
  Number(entry?.HanhDong) === HANH_DONG_CHAM.CHAM;

/* ------------------------------------------------------------------ */
/* Phân quyền chấm tiêu chí                                            */
/* ------------------------------------------------------------------ */

/**
 * Bảng phân quyền chấm của cả một mẫu phiếu.
 * Tiêu chí KHÔNG có dòng nào ở đây = mặc định trưởng đơn vị chủ quản phiếu chấm.
 */
export const fetchTieuChiDonViCham = async ({ idMau, idTieuChi } = {}) => {
  const data = await getJson(
    `tieu-chi-don-vi-cham${buildQuery({ idMau, idTieuChi })}`,
    'Không tải được phân quyền chấm tiêu chí',
  );
  return data.Items || [];
};

/* ------------------------------------------------------------------ */
/* Báo cáo                                                             */
/* ------------------------------------------------------------------ */

export const fetchBaoCaoTongQuan = async ({ idNam, idDonVi }) => {
  const data = await getJson(
    `bao-cao/tong-quan${buildQuery({ idNam, idDonVi })}`,
    'Không tải được báo cáo tổng quan',
  );
  return data.Item || null;
};

export const fetchBaoCaoDiemTrungBinh = async ({ idNam, idDonVi }) => {
  const data = await getJson(
    `bao-cao/diem-trung-binh${buildQuery({ idNam, idDonVi })}`,
    'Không tải được báo cáo điểm trung bình',
  );
  return data.Items || [];
};

export const fetchBaoCaoChuaHoanTat = async ({ idNam, idDonVi }) => {
  const data = await getJson(
    `bao-cao/chua-hoan-tat${buildQuery({ idNam, idDonVi })}`,
    'Không tải được danh sách phiếu chưa hoàn tất',
  );
  return data.Items || [];
};

/* ------------------------------------------------------------------ */
/* Hồ sơ KPI của một giảng viên                                        */
/* ------------------------------------------------------------------ */

export const fetchDinhMucApDung = async (idNv, idNam) => {
  const data = await getJson(
    `dinh-muc-giang-vien/ap-dung/${idNv}/${idNam}`,
    'Không tải được định mức áp dụng',
  );
  return data.Data || null;
};

export const fetchGioNckhThucTe = async (idNv, idNam) => {
  const data = await getJson(
    `dinh-muc-giang-vien/gio-nckh-thuc-te/${idNv}/${idNam}`,
    'Không tải được giờ NCKH thực tế',
  );
  return data.Data || null;
};

export const fetchNckhGiangVien = async (idNv, idNam) => {
  // Endpoint này dùng snake_case cho query (id_nam), khác với phần còn lại của API.
  const data = await getJson(
    `nckh/giang-vien/${idNv}${buildQuery({ id_nam: idNam })}`,
    'Không tải được dữ liệu NCKH',
  );
  return data;
};

/**
 * Mã kỳ học của một năm đánh giá: 2 chữ số cuối của năm + 1/2/3.
 * VD năm 2026 (năm học 2025-2026) → 261 (kỳ 1), 262 (kỳ 2), 263 (kỳ hè).
 */
export const kyHocCuaNam = (idNam) => {
  const nam = Number(idNam);
  if (!Number.isFinite(nam)) return [];
  const prefix = (nam % 100) * 10;
  return [prefix + 1, prefix + 2, prefix + 3];
};

/**
 * Giờ giảng import theo từng kỳ của một năm.
 *
 * ⚠️ Endpoint chỉ lọc được theo kyHoc, KHÔNG có tham số idNhanVien — bảng
 * gio_giang_import lưu HoTen chứ không lưu id. Vì vậy phải lọc theo họ tên ở
 * phía client; trùng tên sẽ ra nhiều dòng, đây là giới hạn của dữ liệu nguồn.
 */
export const fetchGioGiangTheoNam = async (idNam) => {
  const kyHocList = kyHocCuaNam(idNam);
  const responses = await Promise.all(
    kyHocList.map((kyHoc) =>
      getJson(`gio-giang-import${buildQuery({ kyHoc })}`, 'Không tải được giờ giảng').catch(
        () => ({ Items: [] }),
      ),
    ),
  );
  return responses.flatMap((r) => r.Items || []);
};

export const fetchViPhamGiangVien = async ({ idNam, idNhanVien }) => {
  const data = await getJson(
    `vi-pham/tong-hop-giang-vien${buildQuery({ idNam, idNhanVien })}`,
    'Không tải được tổng hợp vi phạm',
  );
  return data.Items || [];
};

export const fetchDiemPhanHoiSv = async (idNam) => {
  const data = await getJson(
    `diem-tb-phan-hoi-sv${buildQuery({ idNam })}`,
    'Không tải được điểm phản hồi sinh viên',
  );
  return { dotChot: data.DotChot || null, items: data.Items || [] };
};
