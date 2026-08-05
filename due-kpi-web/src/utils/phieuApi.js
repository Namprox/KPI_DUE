/**
 * Lớp gọi API + hằng số miền cho PHIẾU ĐÁNH GIÁ KPI CÁ NHÂN (phieu_danh_gia).
 *
 * Máy trạng thái phiếu — mọi màn hình phải đọc từ đây, không tự khai số:
 *   1 NHAP          GV tự đánh giá
 *   2 DON_VI_CHAM   trưởng đơn vị chấm các tiêu chí được giao
 *   3 CHO_HT_DUYET  chờ Hiệu trưởng duyệt
 *   4 HT_DA_DUYET   HT đã duyệt, chờ chốt
 *   5 HOAN_TAT      chỉ đọc, chỉ mở lại được
 *
 * 2 → 3 là TỰ ĐỘNG: khi tiêu chí chấm tay CUỐI CÙNG của phiếu (tính trên mọi
 * đơn vị, không riêng đơn vị mình) có điểm Khoa, stored procedure tự đẩy phiếu
 * sang 3. Vì vậy KHÔNG có nút "Khoa duyệt" — chỉ có nút chấm từng tiêu chí, và
 * response của PUT diem-khoa trả kèm `TrangThaiPhieu` để UI biết phiếu vừa rời
 * hàng đợi (xem putDiemKhoa bên dưới).
 *
 * Mọi thao tác đổi trạng thái (trả lại / duyệt / chốt / mở lại) đều cần
 * RowVersion lấy từ phiếu detail. Server trả 409 khi bản ghi đã bị người khác
 * sửa — các hàm ở đây ném lỗi có cờ `isConflict` để UI tải lại phiếu.
 */

import { apiFetch } from './api';
import { readApiError } from './apiError';

/* ------------------------------------------------------------------ */
/* Trạng thái phiếu                                                    */
/* ------------------------------------------------------------------ */

export const TRANG_THAI = {
  NHAP: 1,
  DON_VI_CHAM: 2,
  CHO_HT_DUYET: 3,
  HT_DA_DUYET: 4,
  HOAN_TAT: 5,
};

/** Nhãn + màu badge cho từng trạng thái. Dùng chung mọi bảng/màn hình. */
export const TRANG_THAI_META = {
  1: { label: 'GV đang nhập', icon: 'fa-pen', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  2: { label: 'Chờ đơn vị chấm', icon: 'fa-clipboard-check', bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  3: { label: 'Chờ HT duyệt', icon: 'fa-hourglass-half', bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  4: { label: 'HT đã duyệt', icon: 'fa-circle-check', bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe' },
  5: { label: 'Hoàn tất', icon: 'fa-lock', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
};

export const tenTrangThai = (trangThai) =>
  TRANG_THAI_META[trangThai]?.label || `Không xác định (${trangThai ?? '—'})`;

/** Xếp loại cuối năm (chỉ có khi phiếu đã chốt). */
export const XEP_LOAI_META = {
  1: { label: 'Không hoàn thành', className: 'rating-low' },
  2: { label: 'Hoàn thành', className: 'rating-medium' },
  3: { label: 'Hoàn thành tốt', className: 'rating-medium' },
  4: { label: 'Hoàn thành xuất sắc', className: 'rating-high' },
};

/** loai_nguon_diem = 2 → điểm do hệ thống tính, cấm chấm tay. */
export const NGUON_DIEM_TU_DONG = 2;

/** Tiêu chí phải chấm tay (là phần việc của trưởng đơn vị). */
export const laTieuChiChamTay = (ct) => ct?.LoaiNguonDiem !== NGUON_DIEM_TU_DONG;

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

/**
 * Phiếu của CHÍNH MÌNH trong một năm (kèm ChiTiet[]).
 *
 * Chưa có phiếu là trạng thái BÌNH THƯỜNG: phiếu chỉ được tạo khi giảng viên lưu
 * lần đầu, nên mọi phản hồi không-2xx đều quy về null thay vì ném lỗi — màn hình
 * tổng quan không được báo đỏ chỉ vì người dùng chưa mở phiếu bao giờ.
 */
export const fetchPhieuCuaToi = async (idNam) => {
  if (!idNam) return null;
  try {
    const response = await apiFetch(`phieu/me/${idNam}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.Item || null;
  } catch (error) {
    console.error('Lỗi tải phiếu cá nhân:', error);
    return null;
  }
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

/**
 * Chấm điểm cấp Khoa cho 1 tiêu chí.
 * @returns {{item: object, trangThaiPhieu: number|null}} trangThaiPhieu = 3 nghĩa là
 *   tiêu chí vừa chấm là tiêu chí chấm tay cuối cùng của phiếu → phiếu đã tự
 *   chuyển lên HT và rời hàng đợi. Bên gọi PHẢI tải lại phiếu khi thấy giá trị này.
 */
export const putDiemKhoa = async (idChiTiet, { diem, nhanXet }) => {
  const data = await sendJson(
    `chitiet/${idChiTiet}/diem-khoa`,
    'PUT',
    { Diem: diem, NhanXet: nhanXet },
    'Lưu điểm thất bại',
  );
  return { item: data.Item || null, trangThaiPhieu: data.TrangThaiPhieu ?? null };
};

/** Trả phiếu về cho GV sửa lại (cấp Khoa). RowVersion lấy từ phiếu detail. */
export const traLaiPhieuKhoa = async (idPhieu, { lyDo, nhanXet, rowVersion }) =>
  sendJson(
    `phieu/${idPhieu}/khoa/tra-lai`,
    'POST',
    { LyDo: lyDo, NhanXet: nhanXet || null, RowVersion: rowVersion },
    'Trả lại phiếu thất bại',
  );

/**
 * CHỦ PHIẾU tự rút phiếu vừa nộp về Nháp để sửa tiếp (2 → 1).
 *
 * Khác trả lại cấp Khoa: giữ nguyên LanDanhGia, không mở vòng đánh giá mới.
 * Server chỉ cho qua khi người gọi là chủ phiếu, phiếu đang ở trạng thái 2, đơn
 * vị CHƯA chấm tiêu chí nào và còn trong hạn tự đánh giá (tính cả hạn gia hạn
 * riêng). Mọi vi phạm đều trả 409 (INVALID_STATE / DA_CHAM / QUA_HAN) → lỗi có
 * cờ `isConflict`, bên gọi phải hiện nguyên văn message và tải lại phiếu.
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

export const CAP_CHAM = { TU_DG: 1, KHOA: 2, TRUONG: 3 };
export const TEN_CAP_CHAM = { 1: 'Tự đánh giá', 2: 'Đơn vị', 3: 'Hiệu trưởng' };
export const TEN_HANH_DONG_CHAM = { 1: 'Chấm', 2: 'Sửa', 3: 'Chốt' };

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
