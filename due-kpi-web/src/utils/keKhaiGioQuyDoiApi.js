/**
 * Kê khai giờ quy đổi theo PHỤ LỤC II — "Quy đổi các hoạt động chuyên môn ra giờ
 * chuẩn giảng dạy". Lớp truy cập API của cả module.
 *
 * Nghiệp vụ: **giảng viên tự kê khai số lượng từng đầu việc**; TK/TKL/TP duyệt
 * hoặc từ chối TỪNG DÒNG và được sửa số lượng trước khi chốt. Khác hẳn nhiệm vụ
 * Khoa (nơi Khoa nhập, giảng viên chỉ phản hồi).
 *
 * Mọi request đi qua apiFetch nên đã có sẵn `credentials: 'include'` và vòng
 * refresh 401 (xem utils/api.js); tuyệt đối không gọi fetch trần ở màn hình.
 *
 * Năm quy ước của server mà file này gói lại một chỗ, để màn hình không phải nhớ:
 *
 *  1. Envelope PascalCase `{ Success, Message, ErrorCode?, Item?, Items?,
 *     PhanTrang? }` và server bật NullValueHandling.Ignore ⇒ trường null BIẾN MẤT
 *     khỏi JSON chứ không phải `null`. Đừng so sánh `=== null`, luôn `?.` và `??`.
 *  2. **Client KHÔNG bao giờ gửi số giờ.** Server lấy hệ số từ danh mục rồi tính
 *     `ROUND(SoLuong × HeSo / SoLuongMau, 2)`. Hàm tinhGio() ở đây chỉ để hiện
 *     con số DỰ KIẾN lúc gõ; sau khi lưu luôn lấy lại từ response.
 *  3. Lưu chi tiết là MỘT form MỘT lần lưu: gửi TOÀN BỘ danh sách dòng, server tự
 *     tính diff thêm/sửa/gỡ. Dòng không xuất hiện trong danh sách sẽ bị soft
 *     delete. Danh sách rỗng = gỡ hết dòng (vẫn lưu được, chỉ chặn khi NỘP).
 *  4. Hệ số / tên đầu việc / đơn vị tính trên từng dòng là SNAPSHOT lúc nhập —
 *     Admin sửa danh mục về sau KHÔNG làm đổi số liệu đã lưu. Snapshot chỉ làm
 *     mới khi `IdCongViec` của dòng đổi.
 *  5. Server trả sẵn các cờ `ChoPhepSua` / `ChoPhepNop` / `ChoPhepDuyet` — dùng
 *     cờ, đừng tự suy từ trạng thái + chức vụ ở FE (fail-closed khi thiếu cờ).
 *
 * Nguồn chuẩn: docs/openapi.yaml (tag KeKhaiGioQuyDoi, CongViecQuyDoi),
 * docs/schema_ghi_chu.md mục 9.
 */

import { apiFetch } from './api';

/* ------------------------------------------------------------------ */
/* Hằng số nghiệp vụ                                                   */
/* ------------------------------------------------------------------ */

/**
 * Vòng đời bản kê (`ke_khai_gio_quy_doi.trang_thai`).
 *
 *   1 NHAP ──nộp──> 2 CHO_DUYET ──chốt──> 3 DA_DUYET
 *     ^               │
 *     └──huỷ nộp──────┘
 *                     └──trả lại──> 4 TRA_LAI ──nộp lại──> 2
 *
 * ⚠️ Trạng thái 3 hiện là ĐIỂM CUỐI — chưa có endpoint mở lại. Chốt nhầm phải
 * sửa tay dưới DB, nên màn hình duyệt phải hỏi xác nhận trước khi chốt.
 */
export const TRANG_THAI_KE_KHAI = {
  NHAP: 1,
  CHO_DUYET: 2,
  DA_DUYET: 3,
  TRA_LAI: 4,
};

/** Trạng thái TỪNG DÒNG (`chi_tiet_ke_khai_gio_quy_doi.trang_thai_dong`). */
export const TRANG_THAI_DONG_KK = {
  CHO_DUYET: 1,
  DA_DUYET: 2,
  TU_CHOI: 3,
};

/** Quyết định gửi lên endpoint duyệt-chi-tiet. Giá trị khác 2/3 ⇒ 400 INVALID. */
export const QUYET_DINH = {
  DUYET: TRANG_THAI_DONG_KK.DA_DUYET,
  TU_CHOI: TRANG_THAI_DONG_KK.TU_CHOI,
};

/** Nhãn + màu badge của bản kê. Dùng chung cả màn hình giảng viên lẫn màn duyệt. */
export const TRANG_THAI_KE_KHAI_META = {
  1: {
    label: 'Đang kê khai',
    icon: 'fa-pen',
    bg: '#f1f5f9',
    color: '#475569',
    border: '#e2e8f0',
  },
  2: {
    label: 'Chờ duyệt',
    icon: 'fa-hourglass-half',
    bg: '#fffbeb',
    color: '#b45309',
    border: '#fde68a',
  },
  3: {
    label: 'Đã chốt',
    icon: 'fa-lock',
    bg: '#ecfdf5',
    color: '#047857',
    border: '#a7f3d0',
  },
  4: {
    label: 'Bị trả lại',
    icon: 'fa-rotate-left',
    bg: '#fef2f2',
    color: '#b91c1c',
    border: '#fecaca',
  },
};

export const TRANG_THAI_DONG_KK_META = {
  1: {
    label: 'Chờ duyệt',
    icon: 'fa-hourglass-half',
    bg: '#fffbeb',
    color: '#b45309',
    border: '#fde68a',
  },
  2: {
    label: 'Đã duyệt',
    icon: 'fa-circle-check',
    bg: '#ecfdf5',
    color: '#047857',
    border: '#a7f3d0',
  },
  3: {
    label: 'Từ chối',
    icon: 'fa-circle-xmark',
    bg: '#fef2f2',
    color: '#b91c1c',
    border: '#fecaca',
  },
};

export const tenTrangThaiKeKhai = (trangThai) =>
  TRANG_THAI_KE_KHAI_META[trangThai]?.label ||
  `Không xác định (${trangThai ?? '—'})`;

/** Hành động trong nhật ký (`lich_su_ke_khai_gio_quy_doi.hanh_dong`). */
export const HANH_DONG_KK = {
  TAO_DONG: 1,
  SUA_DONG: 2,
  XOA_DONG: 3,
  NOP: 4,
  DUYET_DONG: 5,
  TU_CHOI_DONG: 6,
  CHOT: 7,
  TRA_LAI: 8,
  HUY_NOP: 9,
};

export const TEN_HANH_DONG_KK = {
  [HANH_DONG_KK.TAO_DONG]: 'Thêm dòng',
  [HANH_DONG_KK.SUA_DONG]: 'Sửa dòng',
  [HANH_DONG_KK.XOA_DONG]: 'Gỡ dòng',
  [HANH_DONG_KK.NOP]: 'Nộp bản kê',
  [HANH_DONG_KK.DUYET_DONG]: 'Duyệt dòng',
  [HANH_DONG_KK.TU_CHOI_DONG]: 'Từ chối dòng',
  [HANH_DONG_KK.CHOT]: 'Chốt bản kê',
  [HANH_DONG_KK.TRA_LAI]: 'Trả lại',
  [HANH_DONG_KK.HUY_NOP]: 'Huỷ nộp',
};

/**
 * Giới hạn upload minh chứng.
 *
 * Module này KHÔNG có endpoint cấu hình riêng (khác nhiệm vụ Khoa), nên hằng số
 * ở đây là lớp chặn sớm cho êm tay người dùng — server vẫn là nơi quyết định.
 */
export const GIOI_HAN_MINH_CHUNG = {
  Accept: '.pdf',
  MaxFileSizeKb: 10240,
  MaxTenHienThiLength: 255,
};

/* ------------------------------------------------------------------ */
/* Lỗi: map ErrorCode → tiếng Việt có dấu                              */
/* ------------------------------------------------------------------ */

/**
 * Message của server là tiếng Việt KHÔNG dấu nên bản map này được ưu tiên.
 * Giá trị `null` = cố tình rơi về Message thô, vì server nêu rõ trường nào sai.
 */
export const KKGQD_ERROR_MESSAGES = {
  INVALID: null,
  VALIDATION: null,
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này',
  FORBIDDEN_CHUC_VU: 'Chức vụ của bạn không được phép thực hiện thao tác này',
  NOT_FOUND: 'Không tìm thấy dữ liệu',
  FILE_NOT_FOUND: 'Tệp minh chứng không còn trên máy chủ',
  CONG_VIEC_KHONG_HOP_LE:
    'Có dòng trỏ tới đầu việc không kê khai được (nút gộp hoặc đã ngừng sử dụng). Toàn bộ lần lưu đã bị huỷ.',
  DA_NOP: 'Bản kê đang chờ duyệt nên không sửa được. Hãy huỷ nộp trước.',
  DA_DUYET: 'Bản kê đã chốt nên không thay đổi được nữa',
  CHUA_NOP: 'Bản kê chưa được nộp',
  DA_XET:
    'Người duyệt đã xét ít nhất một dòng nên không huỷ nộp được — hãy nhờ người duyệt trả lại bản kê.',
  DANG_SU_DUNG: 'Đầu việc đang được kê khai nên không đổi được',
  CO_CON_HOAT_DONG: 'Còn đầu việc con đang hoạt động',
  DUPLICATE_MA: 'Mã đầu việc đã tồn tại',
  CONCURRENCY_CONFLICT:
    'Bản kê vừa được người khác thay đổi. Hãy làm mới trang rồi thao tác lại.',
  CON_DONG_CHUA_XET:
    'Vẫn còn dòng chưa duyệt hoặc chưa từ chối nên chưa chốt được bản kê',
  KHONG_CO_DONG: 'Bản kê chưa có dòng nào để nộp',
  IO_ERROR: 'Lỗi đọc/ghi tệp trên máy chủ',
  DB_ERROR: 'Lỗi hệ thống khi truy cập dữ liệu, vui lòng thử lại',
  SQL_ERROR: 'Lỗi hệ thống khi truy cập dữ liệu, vui lòng thử lại',
};

/** Đọc body an toàn: 204, body rỗng hay HTML lỗi đều không được làm vỡ luồng. */
const docBody = async (response) => {
  try {
    return await response.json();
  } catch (err) {
    return null;
  }
};

/**
 * Dựng Error đã Việt hoá để đẩy thẳng ra toast.
 * Chịu được cả envelope của module (`Message`/`ErrorCode`) lẫn hình dạng của
 * filter xác thực (`message` chữ thường, không có Success).
 */
const taoLoi = (response, body, fallback) => {
  const errorCode = body?.ErrorCode || null;
  const rawMessage = body?.Message || body?.message || '';
  const mapped = errorCode ? KKGQD_ERROR_MESSAGES[errorCode] : null;

  const error = new Error(mapped || rawMessage || fallback);
  error.status = response.status;
  error.errorCode = errorCode;
  error.rawMessage = rawMessage;
  return error;
};

const buildQuery = (params) => {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    qs.set(key, String(value));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
};

/**
 * Gọi API và trả về ENVELOPE đã kiểm lỗi (chưa bóc slot).
 *
 * Kiểm cả `response.ok` lẫn `Success === false`: hợp đồng nói 200 luôn kèm
 * Success = true, nhưng chặn hai lớp thì một thay đổi phía server không thể
 * lặng lẽ biến lỗi thành dữ liệu rỗng trên màn hình.
 */
const goiApi = async (endpoint, options, fallback) => {
  const response = await apiFetch(endpoint, options);
  const body = await docBody(response);

  if (!response.ok || body?.Success === false) {
    throw taoLoi(response, body, fallback);
  }
  return body || {};
};

/** Bóc slot `Item`; trả null khi server bỏ qua trường (NullValueHandling.Ignore). */
const layItem = async (endpoint, options, fallback) => {
  const envelope = await goiApi(endpoint, options, fallback);
  return envelope.Item ?? null;
};

/** Bóc slot `Items`; luôn trả mảng để màn hình khỏi rải `|| []`. */
const layItems = async (endpoint, options, fallback) => {
  const envelope = await goiApi(endpoint, options, fallback);
  return Array.isArray(envelope.Items) ? envelope.Items : [];
};

const jsonBody = (data, method = 'POST') => ({
  method,
  body: JSON.stringify(data),
});

/* ------------------------------------------------------------------ */
/* Danh mục đầu việc (PHỤ LỤC II)                                      */
/* ------------------------------------------------------------------ */

/**
 * Cây danh mục đầu việc quy đổi — danh sách PHẲNG đã sắp theo thứ tự cây.
 *
 * Cây tối đa 4 cấp và độ sâu KHÔNG đều: lá có thể nằm ở cấp 2 ("Hướng dẫn đề án
 * môn học"), cấp 3 hoặc cấp 4 ("Chủ tịch" trong một hội đồng). Vì vậy đừng dựng
 * ô chọn theo "cấp cuối cùng" — hãy lọc theo `LaLa`.
 *
 * `DuongDanTen` (tên ghép từ gốc xuống) chỉ có ở endpoint này, và là thứ duy
 * nhất cho phép hiện một đầu việc trên MỘT dòng mà vẫn hiểu được ngữ cảnh.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.chiLa] true = chỉ trả đầu việc kê khai được
 * @param {boolean} [opts.chiHoatDong] true = chỉ trả mục đang hoạt động
 */
export const layCayCongViec = ({ chiLa, chiHoatDong } = {}) =>
  layItems(
    `cong-viec-quy-doi${buildQuery({
      chiLa: chiLa ? 1 : undefined,
      trangThai: chiHoatDong ? 1 : undefined,
    })}`,
    undefined,
    'Không tải được danh mục đầu việc quy đổi',
  );

/* ------------------------------------------------------------------ */
/* Bản kê của giảng viên                                               */
/* ------------------------------------------------------------------ */

/**
 * Bản kê của một năm — server TỰ TẠO bản NHAP nếu chưa có, nên màn hình không
 * cần nút "mở bản kê".
 *
 * @param {number|string} idNam
 * @param {number|string} [idNhanVien] xem bản kê của người khác (cần quyền duyệt)
 */
export const layBanKeCuaToi = (idNam, idNhanVien) =>
  layItem(
    `ke-khai-gio-quy-doi/cua-toi${buildQuery({ idNam, idNhanVien })}`,
    undefined,
    'Không tải được bản kê giờ quy đổi',
  );

/** Bản kê theo id — lối vào của màn hình duyệt (TK/TKL/TP). */
export const layBanKeTheoId = (idKeKhai) =>
  layItem(
    `ke-khai-gio-quy-doi/${idKeKhai}`,
    undefined,
    'Không tải được bản kê giờ quy đổi',
  );

/**
 * Lưu TOÀN BỘ các dòng trong một request.
 *
 * Dòng đang có trong DB mà KHÔNG nằm trong `chiTiet` sẽ bị gỡ — đây là cách duy
 * nhất để xoá một dòng, không có endpoint xoá lẻ. Mảng rỗng = gỡ hết.
 *
 * KHÔNG gửi số giờ: server tự tính từ hệ số của danh mục.
 *
 * @param {number|string} idNam
 * @param {Array<{IdChiTiet?: number, IdCongViec: number, KyHoc?: number,
 *   SoLuong: number, MoTa?: string}>} chiTiet
 */
export const luuChiTiet = (idNam, chiTiet) =>
  layItem(
    'ke-khai-gio-quy-doi/chi-tiet',
    jsonBody({ IdNam: Number(idNam), ChiTiet: chiTiet }, 'PUT'),
    'Lưu bản kê thất bại',
  );

/**
 * Nộp bản kê (1 hoặc 4 → 2).
 *
 * Reset mọi dòng về "Chờ duyệt" và xoá kết quả duyệt cũ (trường hợp nộp lại sau
 * khi bị trả về). `rowVersion` nên lấy từ lần đọc gần nhất để chặn ghi đè.
 */
export const nopBanKe = (idNam, rowVersion) =>
  layItem(
    'ke-khai-gio-quy-doi/nop',
    jsonBody({ IdNam: Number(idNam), RowVersion: rowVersion ?? null }),
    'Nộp bản kê thất bại',
  );

/**
 * Huỷ nộp (2 → 1).
 *
 * CHỈ được khi người duyệt chưa đụng vào dòng nào; đã có dòng được duyệt / từ
 * chối thì server trả 409 DA_XET và phải nhờ người duyệt trả lại.
 */
export const huyNopBanKe = (idNam, rowVersion) =>
  layItem(
    'ke-khai-gio-quy-doi/huy-nop',
    jsonBody({ IdNam: Number(idNam), RowVersion: rowVersion ?? null }),
    'Huỷ nộp thất bại',
  );

/* ------------------------------------------------------------------ */
/* Phía người duyệt (TK / TKL / TP / HT / ADMIN)                       */
/* ------------------------------------------------------------------ */

/**
 * Danh sách bản kê trong phạm vi duyệt, kèm phân trang.
 *
 * Phạm vi do SERVER quyết (đơn vị mình + đơn vị con; ADMIN/HT thấy toàn trường)
 * nên FE không lọc lại, chỉ hiển thị.
 *
 * @returns {Promise<{items: object[], phanTrang: object|null}>}
 */
export const layDanhSachChoDuyet = async ({
  idNam,
  idDonVi,
  trangThai,
  tuKhoa,
  page,
  pageSize,
} = {}) => {
  const envelope = await goiApi(
    `ke-khai-gio-quy-doi/cho-duyet${buildQuery({
      idNam,
      idDonVi,
      trangThai,
      tuKhoa,
      page,
      pageSize,
    })}`,
    undefined,
    'Không tải được danh sách bản kê chờ duyệt',
  );
  return {
    items: Array.isArray(envelope.Items) ? envelope.Items : [],
    phanTrang: envelope.PhanTrang ?? null,
  };
};

/**
 * Duyệt / từ chối NHIỀU DÒNG trong một lần bấm.
 *
 * `SoLuongDuyet` bỏ trống = giữ nguyên số giảng viên đã kê. Dòng bị từ chối cho
 * `GioDuyet = 0` nhưng VẪN GIỮ số lượng để đối chiếu. Giờ duyệt được tính lại từ
 * SNAPSHOT của dòng, không đọc lại danh mục.
 *
 * @param {number} idKeKhai
 * @param {Array<{IdChiTiet: number, QuyetDinh: 2|3, SoLuongDuyet?: number|null,
 *   NhanXet?: string}>} quyetDinh
 */
export const duyetChiTiet = (idKeKhai, quyetDinh) =>
  layItem(
    `ke-khai-gio-quy-doi/${idKeKhai}/duyet-chi-tiet`,
    jsonBody({ QuyetDinh: quyetDinh }),
    'Lưu kết quả duyệt thất bại',
  );

/**
 * Chốt bản kê (2 → 3).
 *
 * ⚠️ ĐIỂM CUỐI — chưa có endpoint mở lại, chốt nhầm phải sửa tay dưới DB. Bị
 * chặn khi còn dòng chưa xét (422 CON_DONG_CHUA_XET).
 */
export const chotBanKe = (idKeKhai, { ghiChu, rowVersion } = {}) =>
  layItem(
    `ke-khai-gio-quy-doi/${idKeKhai}/chot`,
    jsonBody({ GhiChu: ghiChu || null, RowVersion: rowVersion ?? null }),
    'Chốt bản kê thất bại',
  );

/**
 * Trả bản kê về cho giảng viên sửa (2 → 4).
 *
 * Lý do BẮT BUỘC và được lưu vào `NhanXetDuyet` của header. Toàn bộ trạng thái
 * dòng bị reset về "Chờ duyệt", `SoLuongDuyet`/`GioDuyet` bị xoá — người duyệt
 * sẽ phải xét lại từ đầu sau khi giảng viên nộp lại.
 */
export const traLaiBanKe = (idKeKhai, lyDo, rowVersion) =>
  layItem(
    `ke-khai-gio-quy-doi/${idKeKhai}/tra-lai`,
    jsonBody({ LyDo: lyDo, RowVersion: rowVersion ?? null }),
    'Trả lại bản kê thất bại',
  );

/** Nhật ký của một bản kê, mới nhất trước. Quyền đọc = quyền xem bản kê. */
export const layLichSuBanKe = (idKeKhai) =>
  layItems(
    `ke-khai-gio-quy-doi/${idKeKhai}/lich-su`,
    undefined,
    'Không tải được nhật ký bản kê',
  );

/**
 * Tổng giờ quy đổi ĐÃ DUYỆT / giảng viên / năm, tách theo hai mục cấp 1 của
 * PHỤ LỤC II (Sau đại học / Đại học).
 *
 * CHỈ tính bản kê đã chốt và dòng đã duyệt. Đây là điểm nối cho bước cộng với
 * giờ giảng dạy (dữ liệu do hệ thống ngoài gọi về) — module CỐ Ý không ghi vào
 * `gio_thuc_hien_gv`.
 */
export const layTongHopGioQuyDoi = ({ idNam, idDonVi } = {}) =>
  layItems(
    `ke-khai-gio-quy-doi/tong-hop${buildQuery({ idNam, idDonVi })}`,
    undefined,
    'Không tải được tổng hợp giờ quy đổi',
  );

/* ------------------------------------------------------------------ */
/* Minh chứng (tuỳ chọn, gắn vào TỪNG DÒNG)                            */
/* ------------------------------------------------------------------ */

export const formatKb = (kb) => {
  if (kb == null) return '—';
  const num = Number(kb);
  if (!Number.isFinite(num)) return '—';
  return num >= 1024 ? `${(num / 1024).toFixed(1)} MB` : `${num} KB`;
};

/**
 * Kiểm tra sơ bộ phía client trước khi tốn một vòng upload.
 * Server vẫn kiểm HAI LỚP: đuôi file VÀ chữ ký `%PDF-` ở đầu tệp — đổi đuôi
 * .docx thành .pdf sẽ bị trả 400.
 *
 * @returns {string|null} thông điệp lỗi, null nếu hợp lệ
 */
export const validatePdf = (file) => {
  if (!file) return 'Chưa chọn tệp minh chứng';
  if (file.size === 0) return 'Tệp rỗng, vui lòng chọn tệp khác';

  const laPdf =
    file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  if (!laPdf) return 'Chỉ chấp nhận tệp PDF';

  const kb = Math.ceil(file.size / 1024);
  if (kb > GIOI_HAN_MINH_CHUNG.MaxFileSizeKb) {
    return `Tệp ${formatKb(kb)} vượt giới hạn ${formatKb(GIOI_HAN_MINH_CHUNG.MaxFileSizeKb)}`;
  }
  return null;
};

/**
 * Đính kèm PDF cho MỘT dòng kê khai. Minh chứng KHÔNG bắt buộc để nộp.
 *
 * Dòng phải đã tồn tại dưới DB (có `IdChiTiet`), nên màn hình phải lưu bản kê
 * trước rồi mới đính kèm được cho dòng vừa thêm.
 */
export const themMinhChung = async (idChiTiet, file, tenHienThi) => {
  const loi = validatePdf(file);
  if (loi) throw new Error(loi);

  const fd = new FormData();
  fd.append('file', file);
  if (tenHienThi?.trim()) fd.append('tenHienThi', tenHienThi.trim());

  return layItem(
    `ke-khai-gio-quy-doi/chi-tiet/${idChiTiet}/minh-chung`,
    { method: 'POST', body: fd },
    'Tải lên minh chứng thất bại',
  );
};

/** Gỡ minh chứng (soft) + dọn file vật lý. Chỉ chính chủ, bản kê còn sửa được. */
export const xoaMinhChung = async (idMinhChung) => {
  await goiApi(
    `ke-khai-gio-quy-doi/minh-chung/${idMinhChung}`,
    { method: 'DELETE' },
    'Gỡ minh chứng thất bại',
  );
};

/**
 * Tải nội dung file về dạng Blob.
 *
 * Endpoint hỗ trợ cookie nên thẻ `<a href>` cũng xác thực được, nhưng đi qua
 * apiFetch giữ được vòng refresh phiên và đọc được body lỗi JSON khi server trả
 * 403/404 — cùng cách làm với minh chứng của phiếu, vi phạm và nhiệm vụ Khoa.
 */
const taiBlobMinhChung = async (idMinhChung) => {
  const response = await apiFetch(
    `ke-khai-gio-quy-doi/minh-chung/${idMinhChung}`,
  );
  if (!response.ok) {
    throw taoLoi(
      response,
      await docBody(response),
      'Không tải được tệp minh chứng',
    );
  }
  return response.blob();
};

/**
 * Object URL để nhúng PDF vào `<iframe>`.
 * Bên gọi CHỊU TRÁCH NHIỆM revokeObjectURL khi đóng preview, nếu không blob sẽ
 * nằm lại trong bộ nhớ đến khi tải lại trang.
 */
export const taoUrlXemMinhChung = async (idMinhChung) => {
  const blob = await taiBlobMinhChung(idMinhChung);
  // Ép type: một số cấu hình server trả octet-stream khiến trình duyệt tải
  // xuống thay vì hiển thị. Module chỉ nhận PDF nên ép luôn là an toàn.
  const pdf =
    blob.type === 'application/pdf'
      ? blob
      : new Blob([blob], { type: 'application/pdf' });
  return window.URL.createObjectURL(pdf);
};

export const taiMinhChungVeMay = async (mc) => {
  const id = mc?.IdMinhChungKk;
  if (!id) return;
  const blob = await taiBlobMinhChung(id);
  const url = window.URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = mc.TenFileGoc || `minh-chung-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Chờ trình duyệt kịp bắt đầu tải rồi mới thu hồi URL tạm
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
  }
};

/* ------------------------------------------------------------------ */
/* Suy luận & định dạng dùng chung cho mọi màn hình                    */
/* ------------------------------------------------------------------ */

/**
 * Giờ DỰ KIẾN của một dòng: `ROUND(SoLuong × HeSo / SoLuongMau, 2)`.
 *
 * Chỉ để hiện lúc người dùng đang gõ — con số CHÍNH THỨC luôn là `GioKeKhai`
 * server trả về sau khi lưu. Đừng gửi kết quả hàm này lên API.
 */
export const tinhGio = (soLuong, heSo, soLuongMau) => {
  const sl = Number(soLuong);
  const hs = Number(heSo);
  const mau = Number(soLuongMau) || 1;
  if (!Number.isFinite(sl) || !Number.isFinite(hs)) return null;
  return Math.round(((sl * hs) / mau) * 100) / 100;
};

/** Số giờ hiển thị. `null` giữ nguyên nghĩa "chưa có", không quy về 0. */
export const formatGio = (value, soLe = 2) => {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return num.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: soLe,
  });
};

/** Số lượng hiển thị theo đơn vị tính, kèm đơn vị nếu có. */
export const formatSoLuong = (soLuong, donViTinh) => {
  const so = formatGio(soLuong, 2);
  if (so === '—') return so;
  return donViTinh ? `${so} ${donViTinh}` : so;
};

/**
 * Cách đọc hệ số trong quyết định, ví dụ "1,0/10 bài".
 *
 * Ưu tiên `GhiChuQuyDoi` — đó là chuỗi GỐC trong văn bản QĐ, giữ lại để FE hiện
 * đúng câu chữ. Chỉ khi thiếu mới tự ghép từ hệ số / mẫu số / đơn vị tính.
 */
export const nhanHeSo = (cv) => {
  if (!cv) return '';
  if (cv.GhiChuQuyDoi) return cv.GhiChuQuyDoi;

  const heSo = cv.HeSoQuyDoi ?? cv.HeSo;
  if (heSo == null) return '';
  const mau = Number(cv.SoLuongMau) || 1;
  const donVi = cv.DonViTinh ? ` ${cv.DonViTinh}` : '';
  return mau > 1
    ? `${formatGio(heSo, 3)}/${mau}${donVi}`
    : `${formatGio(heSo, 3)}/${donVi.trim() || 'đơn vị'}`;
};

/** Bản kê còn sửa được không. Dùng cờ server, fail-closed khi thiếu. */
export const choPhepSua = (banKe) => banKe?.ChoPhepSua === true;

/** Được nộp / nộp lại không. */
export const choPhepNop = (banKe) => banKe?.ChoPhepNop === true;

/** Được duyệt / chốt / trả lại không. */
export const choPhepDuyet = (banKe) => banKe?.ChoPhepDuyet === true;

/**
 * Huỷ nộp chỉ CÓ NGHĨA khi bản kê đang chờ duyệt và người xem là chính chủ.
 * Server còn chặn thêm điều kiện "chưa ai xét dòng nào" (409 DA_XET) — điều kiện
 * đó FE không suy được nên vẫn để người dùng bấm rồi đọc lỗi.
 */
export const choPhepHuyNop = (banKe) =>
  banKe?.CanSua === true &&
  Number(banKe?.TrangThai) === TRANG_THAI_KE_KHAI.CHO_DUYET;

/** Bản kê đã chốt ⇒ read-only tuyệt đối với mọi vai trò. */
export const daChot = (banKe) =>
  Number(banKe?.TrangThai) === TRANG_THAI_KE_KHAI.DA_DUYET;

/** Bị trả lại ⇒ hiện banner lý do (`NhanXetDuyet`) cho giảng viên sửa. */
export const biTraLai = (banKe) =>
  Number(banKe?.TrangThai) === TRANG_THAI_KE_KHAI.TRA_LAI;

/** Còn dòng chưa xét ⇒ nút Chốt phải tắt (server trả 422 CON_DONG_CHUA_XET). */
export const conDongChuaXet = (banKe) => Number(banKe?.SoDongChoDuyet) > 0;
