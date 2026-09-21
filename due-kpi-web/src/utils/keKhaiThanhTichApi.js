/**
 * Kê khai THÀNH TÍCH VƯỢT TRỘI (Nhóm II - bảng KPI viên chức / người lao động).
 * Lớp truy cập API của cả module.
 *
 * Nghiệp vụ: **nhân viên tự kê khai từng thành tích** (sáng kiến, khen thưởng,
 * đào tạo, phong trào); ĐƠN VỊ PHỤ TRÁCH chốt hoặc trả về TỪNG DÒNG. KHÔNG còn
 * bước "nộp" hay "chốt cả bản kê": nhân viên kê tới đâu người duyệt thấy tới đó.
 * Khác vi phạm - nơi trưởng đơn vị ghi nhận cho người khác: ở đây không ai kê
 * khai hộ, `PUT chi-tiet` trả 403 với bất kỳ ai không phải chính chủ.
 *
 * Mọi request đi qua apiFetch nên đã có sẵn `credentials: 'include'` và vòng
 * refresh 401 (xem utils/api.js); tuyệt đối không gọi fetch trần ở màn hình.
 *
 * Module này là SONG SINH của kê khai giờ quy đổi (utils/keKhaiGioQuyDoiApi.js):
 * cùng vòng đời, cùng envelope, cùng cách bóc slot. Bốn điểm khác cần nhớ:
 *
 *  1. **Duyệt gác HAI TẦNG.** Tầng bản kê (`ChoPhepDuyet` = duyệt được ít nhất
 *     một dòng) mở màn hình. Tầng DÒNG gác `duyet-chi-tiet` theo `IdDonViDuyet`
 *     của từng mức: lẫn MỘT dòng của đơn vị khác là cả request bị từ chối 403
 *     FORBIDDEN_DONG và KHÔNG ghi gì. Màn hình duyệt phải gom dòng theo đơn vị
 *     và gửi từng nhóm một, và chỉ thao tác dòng có `ChoPhepXet`.
 *  2. **Minh chứng là BẮT BUỘC** với mức có `YeuCauMinhChung`, và bị chặn NGAY
 *     Ở BƯỚC LƯU chứ không phải lúc nộp (không còn bước nộp). Dòng CHƯA tồn tại
 *     thì tải tệp vào KHO TẠM trước rồi gửi `IdMinhChung[]` kèm lần lưu; server
 *     trả `DongCoVanDe[]` (có `ThuTu`) chỉ đúng dòng nào thiếu.
 *     Mỗi dòng nhận NHIỀU file (khác vi phạm: một file một bản ghi).
 *  3. **Vượt trần KHÔNG chặn lưu.** Bảng KPI ghi "Điểm tối đa 30", không ghi
 *     "chỉ được kê 30". Phần vượt chỉ không được tính - đọc `TongHopTheoLoai[]`
 *     để hiện cảnh báo, ĐỪNG tắt nút nào vì nó.
 *  4. **Client KHÔNG bao giờ gửi điểm.** Server tính `SoLuong × DiemQuyDoi` và ép
 *     `SoLuong` về 1 với mức có `ChoPhepSoLuong = false`. tinhDiem() ở đây chỉ để
 *     hiện con số DỰ KIẾN lúc gõ.
 *  5. **Vòng đời nằm ở TỪNG DÒNG.** Trạng thái bản kê chỉ còn là NHÃN dẫn xuất,
 *     và server trả sẵn `ChoPhepSua` / `ChoPhepXet` trên từng dòng - dùng đúng
 *     các cờ đó, đừng tự suy từ trạng thái + chức vụ ở FE (fail-closed khi thiếu).
 *
 * Nguồn chuẩn: docs/openapi.yaml (tag KeKhaiThanhTich, DanhMucThanhTich),
 * docs/schema_ghi_chu.md mục 11.
 */

import { apiFetch } from "./api";

/* ------------------------------------------------------------------ */
/* Hằng số nghiệp vụ                                                   */
/* ------------------------------------------------------------------ */

/**
 * Nhãn DẪN XUẤT của header. Đây không còn là state machine hay khoá nghiệp vụ:
 * server tính lại từ trạng thái các dòng sau mỗi lần lưu / xét, theo thứ tự ưu
 * tiên 4 → 2 → 3 → 1.
 */
export const TRANG_THAI_KE_KHAI = {
  KHONG_CO_DONG: 1,
  CON_CHO_DUYET: 2,
  TAT_CA_DA_CHOT: 3,
  CON_TRA_VE: 4,
};

/** Trạng thái TỪNG DÒNG (`chi_tiet_ke_khai_thanh_tich.trang_thai_dong`). */
export const TRANG_THAI_DONG_TT = {
  CHO_DUYET: 1,
  DA_CHOT: 2,
  TRA_VE: 3,
};

/** Quyết định gửi lên endpoint duyệt-chi-tiet. Giá trị khác 2/3 ⇒ 400 INVALID. */
export const QUYET_DINH = {
  CHOT: TRANG_THAI_DONG_TT.DA_CHOT,
  TRA_VE: TRANG_THAI_DONG_TT.TRA_VE,
};

/** Nhãn + màu badge của bản kê. Dùng chung màn hình nhân viên lẫn màn duyệt. */
export const TRANG_THAI_KE_KHAI_META = {
  1: {
    label: "Chưa có dòng",
    icon: "fa-pen",
    bg: "#f1f5f9",
    color: "#475569",
    border: "#e2e8f0",
  },
  2: {
    label: "Còn dòng chờ duyệt",
    icon: "fa-hourglass-half",
    bg: "#fffbeb",
    color: "#b45309",
    border: "#fde68a",
  },
  3: {
    label: "Tất cả đã chốt",
    icon: "fa-lock",
    bg: "#ecfdf5",
    color: "#047857",
    border: "#a7f3d0",
  },
  4: {
    label: "Có dòng trả về",
    icon: "fa-rotate-left",
    bg: "#fef2f2",
    color: "#b91c1c",
    border: "#fecaca",
  },
};

export const TRANG_THAI_DONG_TT_META = {
  1: {
    label: "Chờ duyệt",
    icon: "fa-hourglass-half",
    bg: "#fffbeb",
    color: "#b45309",
    border: "#fde68a",
  },
  2: {
    label: "Đã chốt",
    icon: "fa-circle-check",
    bg: "#ecfdf5",
    color: "#047857",
    border: "#a7f3d0",
  },
  3: {
    label: "Trả về",
    icon: "fa-circle-xmark",
    bg: "#fef2f2",
    color: "#b91c1c",
    border: "#fecaca",
  },
};

export const tenTrangThaiKeKhai = (trangThai) =>
  TRANG_THAI_KE_KHAI_META[trangThai]?.label ||
  `Không xác định (${trangThai ?? "-"})`;

/* ------------------------------------------------------------------ */
/* Bốn tiêu chí của Nhóm II                                            */
/* ------------------------------------------------------------------ */

/**
 * `LoaiThanhTich` khoá 1-1 với mã công thức `TTVT_*` phía server. Thêm giá trị
 * mới ở đây mà không có nhánh tương ứng trong fn_nckh_diem_tu_dong thì dòng kê
 * khai sẽ KHÔNG BAO GIỜ thành điểm.
 */
export const LOAI_THANH_TICH = {
  SANG_KIEN: 1,
  KHEN_THUONG: 2,
  DAO_TAO: 3,
  PHONG_TRAO: 4,
};

/**
 * Nhãn + trần điểm của 4 tiêu chí.
 *
 * ⚠️ `tranDiem` ở đây chỉ là NHÃN DỰ PHÒNG cho lúc chưa có dữ liệu (ví dụ ô chọn
 * trong picker). Con số CHÍNH THỨC luôn là `TongHopTheoLoai[].TranDiem` server
 * trả về - nó đọc từ `tieu_chi_danh_gia.DiemToiDa` nên Admin đổi được.
 */
export const LOAI_THANH_TICH_META = {
  1: {
    label: "Sáng kiến, cải tiến",
    icon: "fa-lightbulb",
    tranDiem: 30,
    bg: "#eff6ff",
    color: "#1d4ed8",
    border: "#bfdbfe",
  },
  2: {
    label: "Khen thưởng đột xuất",
    icon: "fa-award",
    tranDiem: 15,
    bg: "#fef3c7",
    color: "#b45309",
    border: "#fde68a",
  },
  3: {
    label: "Đào tạo, bồi dưỡng",
    icon: "fa-graduation-cap",
    tranDiem: 10,
    bg: "#f0fdf4",
    color: "#15803d",
    border: "#bbf7d0",
  },
  4: {
    label: "Phong trào của Trường",
    icon: "fa-hands-holding-circle",
    tranDiem: 10,
    bg: "#faf5ff",
    color: "#7e22ce",
    border: "#e9d5ff",
  },
};

export const tenLoaiThanhTich = (loai) =>
  LOAI_THANH_TICH_META[loai]?.label || `Không xác định (${loai ?? "-"})`;

/**
 * Trần của CẢ NHÓM thành tích vượt trội trong bảng KPI.
 *
 * ⚠️ Tổng trần 4 tiêu chí là 65 > 50, nhưng server hiện CHỈ áp trần từng tiêu chí
 * (`sp_phieu_danh_gia_tinh_tong_diem` mới cộng, chưa cắt). Vì vậy con số này chỉ
 * để THAM KHẢO trên giao diện - không được dùng để chặn thao tác nào.
 */
export const TRAN_DIEM_NHOM = 50;

/**
 * Quý phát sinh thành tích. Cột `quy` nằm trên TỪNG DÒNG, còn bản kê vẫn khoá
 * theo NĂM - đây là chỗ duy nhất trong hệ thống có khái niệm quý, thêm sẵn cho
 * bước tích luỹ theo quý sau này (chưa dựng).
 *
 * Cố ý KHÔNG suy từ `NgayDatDuoc`: chưa xác nhận được là quý dương lịch hay quý
 * năm học, đoán sai sẽ ghi sai dữ liệu một cách lặng lẽ.
 */
export const QUY_OPTIONS = [
  { value: "1", label: "Quý I" },
  { value: "2", label: "Quý II" },
  { value: "3", label: "Quý III" },
  { value: "4", label: "Quý IV" },
];

/** Cảnh báo trên `TongHopTheoLoai[]`. Cả hai đều là THÔNG TIN, không phải lỗi. */
export const MA_CANH_BAO = {
  VUOT_TRAN: "VUOT_TRAN",
  KHEN_THUONG_TRUNG_NOI_DUNG: "KHEN_THUONG_TRUNG_NOI_DUNG",
};

export const CANH_BAO_META = {
  VUOT_TRAN: {
    label: "Vượt trần",
    icon: "fa-triangle-exclamation",
    bg: "#fffbeb",
    color: "#b45309",
    border: "#fde68a",
  },
  KHEN_THUONG_TRUNG_NOI_DUNG: {
    label: "Trùng nội dung",
    icon: "fa-clone",
    bg: "#eff6ff",
    color: "#1d4ed8",
    border: "#bfdbfe",
  },
};

/** Hành động trong nhật ký (`lich_su_ke_khai_thanh_tich.hanh_dong`). */
/**
 * Hành động trong nhật ký (`lich_su_ke_khai_thanh_tich.hanh_dong`).
 *
 * Bốn giá trị của luồng "nộp" (4, 7, 8, 9) KHÔNG còn được sinh ra nữa, nhưng vẫn
 * nằm trong dữ liệu CŨ nên phải dịch được - bỏ chúng đi thì nhật ký của các bản
 * kê năm trước hiện thành "Hành động 7".
 */
export const HANH_DONG_TT = {
  TAO_DONG: 1,
  SUA_DONG: 2,
  XOA_DONG: 3,
  NOP: 4,
  CHOT_DONG: 5,
  TRA_VE_DONG: 6,
  CHOT: 7,
  TRA_LAI: 8,
  HUY_NOP: 9,
  MO_LAI_DONG: 10,
};

export const TEN_HANH_DONG_TT = {
  [HANH_DONG_TT.TAO_DONG]: "Thêm dòng",
  [HANH_DONG_TT.SUA_DONG]: "Sửa dòng",
  [HANH_DONG_TT.XOA_DONG]: "Gỡ dòng",
  [HANH_DONG_TT.NOP]: "Nộp bản kê",
  [HANH_DONG_TT.CHOT_DONG]: "Chốt dòng",
  [HANH_DONG_TT.TRA_VE_DONG]: "Trả về dòng",
  [HANH_DONG_TT.CHOT]: "Chốt bản kê",
  [HANH_DONG_TT.TRA_LAI]: "Trả lại",
  [HANH_DONG_TT.HUY_NOP]: "Huỷ nộp",
  [HANH_DONG_TT.MO_LAI_DONG]: "Mở lại dòng đã chốt",
};

/**
 * Giới hạn upload minh chứng.
 *
 * Module không có endpoint cấu hình riêng, nên hằng số ở đây là lớp chặn sớm cho
 * êm tay người dùng - server vẫn là nơi quyết định.
 */
export const GIOI_HAN_MINH_CHUNG = {
  Accept: ".pdf",
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
export const KKTT_ERROR_MESSAGES = {
  INVALID: null,
  VALIDATION: null,
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này",
  FORBIDDEN_CHUC_VU: "Chức vụ của bạn không được phép thực hiện thao tác này",
  FORBIDDEN_DONG:
    "Có dòng thuộc quyền duyệt của đơn vị khác nên TOÀN BỘ lần lưu đã bị huỷ - chưa có gì được ghi. Hãy bỏ các dòng đó ra rồi lưu lại.",
  NOT_FOUND: "Không tìm thấy dữ liệu",
  FILE_NOT_FOUND: "Tệp minh chứng không còn trên máy chủ",
  MUC_KHONG_HOP_LE:
    "Có dòng trỏ tới mức không kê khai được (nút gộp hoặc đã ngừng sử dụng). Toàn bộ lần lưu đã bị huỷ.",
  // Khoá theo DÒNG, không phải theo bản kê: các dòng còn lại vẫn sửa được.
  DONG_DA_CHOT:
    "Dòng này đã được chốt. Hãy nhờ đơn vị phụ trách mở lại trước khi sửa.",
  THIEU_LY_DO: "Phải ghi rõ lý do khi trả dòng về cho nhân viên.",
  THIEU_MINH_CHUNG:
    "Còn dòng bắt buộc minh chứng nhưng chưa có tệp PDF - xem danh sách bên dưới. Toàn bộ lần lưu đã bị huỷ.",
  // Hai mã cũ còn sót ở endpoint gỡ minh chứng; diễn đạt lại theo phạm vi DÒNG.
  DA_NOP: "Dòng này đang được xét nên không gỡ minh chứng được",
  DA_DUYET: "Dòng này đã chốt nên không gỡ minh chứng được",
  DANG_SU_DUNG: "Mức đang được kê khai nên không đổi được",
  CO_CON_HOAT_DONG: "Còn mức con đang hoạt động",
  DUPLICATE_MA: "Mã mục đã tồn tại",
  CONCURRENCY_CONFLICT:
    "Bản kê vừa được người khác thay đổi. Hãy làm mới trang rồi thao tác lại.",
  IO_ERROR: "Lỗi đọc/ghi tệp trên máy chủ",
  DB_ERROR: "Lỗi hệ thống khi truy cập dữ liệu, vui lòng thử lại",
  SQL_ERROR: "Lỗi hệ thống khi truy cập dữ liệu, vui lòng thử lại",
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
 *
 * ⚠️ Khác bản giờ quy đổi: PHẢI mang theo `DongCoVanDe`. Hai lỗi quan trọng nhất
 * của module - THIEU_MINH_CHUNG (lúc nộp) và FORBIDDEN_DONG (lúc duyệt) - đều vô
 * dụng nếu thiếu mảng này, vì màn hình sẽ không biết chỉ vào dòng nào.
 */
const taoLoi = (response, body, fallback) => {
  const errorCode = body?.ErrorCode || null;
  const rawMessage = body?.Message || body?.message || "";
  const mapped = errorCode ? KKTT_ERROR_MESSAGES[errorCode] : null;

  const error = new Error(mapped || rawMessage || fallback);
  error.status = response.status;
  error.errorCode = errorCode;
  error.rawMessage = rawMessage;
  error.dongCoVanDe = Array.isArray(body?.DongCoVanDe) ? body.DongCoVanDe : [];
  return error;
};

const buildQuery = (params) => {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    qs.set(key, String(value));
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
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

const jsonBody = (data, method = "POST") => ({
  method,
  body: JSON.stringify(data),
});

/* ------------------------------------------------------------------ */
/* Danh mục thành tích (Nhóm II - cây 2 cấp)                           */
/* ------------------------------------------------------------------ */

/**
 * Cây danh mục thành tích - danh sách PHẲNG đã sắp theo thứ tự cây.
 *
 * Đúng 2 cấp và ĐỀU: gốc = tiêu chí (4 nút, mang `TranDiem`), lá = mức quy đổi
 * (mang `DiemQuyDoi`). Chỉ mức có `LaLa = true` mới kê khai được.
 *
 * `TranDiemNhom` (trần kéo từ gốc xuống, có cả ở lá) CHỈ endpoint này phát ra.
 *
 * ⚠️ Đừng truyền `chiLa` khi dựng ô chọn: picker cần cả nút gốc để làm thanh
 * điều hướng bên trái, lọc `LaLa` ở phía màn hình rẻ hơn gọi hai lần.
 *
 * @param {object} [opts]
 * @param {number} [opts.loai] lọc theo LoaiThanhTich 1..4
 * @param {boolean} [opts.chiLa] true = chỉ trả mức kê khai được
 * @param {boolean} [opts.chiHoatDong] true = chỉ trả mục đang hoạt động
 */
export const layCayThanhTich = ({ loai, chiLa, chiHoatDong } = {}) =>
  layItems(
    `danh-muc-thanh-tich${buildQuery({
      loai,
      chiLa: chiLa ? 1 : undefined,
      trangThai: chiHoatDong ? 1 : undefined,
    })}`,
    undefined,
    "Không tải được danh mục thành tích",
  );

/**
 * Thêm một mục vào danh mục (ADMIN).
 *
 * `LoaiThanhTich` BẮT BUỘC khi `IdCha = null`; với nút con server tự kéo từ cha
 * và bỏ qua giá trị client gửi. `DiemQuyDoi` bắt buộc khi `LaLa = true`.
 */
export const taoMucThanhTich = (payload) =>
  layItem(
    "danh-muc-thanh-tich",
    jsonBody(payload),
    "Thêm mục danh mục thất bại",
  );

/**
 * Sửa một mục (ADMIN).
 *
 * KHÔNG đổi được `IdCha` / `LoaiThanhTich`. Sửa `DiemQuyDoi` KHÔNG ảnh hưởng các
 * dòng đã kê - mỗi dòng giữ snapshot riêng.
 *
 * Đây cũng là nơi Admin gán `IdDonViDuyet`: danh mục được seed toàn NULL vì id
 * của P.TCHC / P.KHHTQT khác nhau theo từng lần triển khai. Phải gán trên các
 * mức LÁ, không phải chỉ ở nút gốc - quyền đọc và duyệt đều xét theo từng dòng.
 */
export const capNhatMucThanhTich = (idMuc, payload) =>
  layItem(
    `danh-muc-thanh-tich/${idMuc}`,
    jsonBody(payload, "PUT"),
    "Cập nhật mục danh mục thất bại",
  );

/**
 * Ngừng sử dụng một mục (ADMIN) - xoá MỀM, không bao giờ xoá vật lý vì các dòng
 * đã kê vẫn phải đọc được. Bị chặn khi còn mức con đang hoạt động.
 */
export const xoaMucThanhTich = async (idMuc) => {
  await goiApi(
    `danh-muc-thanh-tich/${idMuc}`,
    { method: "DELETE" },
    "Ngừng sử dụng mục thất bại",
  );
};

/* ------------------------------------------------------------------ */
/* Bản kê của nhân viên                                                */
/* ------------------------------------------------------------------ */

/**
 * Bản kê của một năm. Endpoint đọc KHÔNG ghi dữ liệu: chưa kê gì thì server trả
 * header ẢO `IdKeKhai = 0` với `ChiTiet` rỗng - đó là giá trị hợp lệ, đừng coi
 * là lỗi. Header thật chỉ sinh ra khi lưu dòng đầu tiên (lazy-create).
 *
 * @param {number|string} idNam
 * @param {number|string} [idNhanVien] xem bản kê của người khác (cần quyền duyệt)
 */
export const layBanKeCuaToi = (idNam, idNhanVien) =>
  layItem(
    `ke-khai-thanh-tich/cua-toi${buildQuery({ idNam, idNhanVien })}`,
    undefined,
    "Không tải được bản kê thành tích",
  );

/** Bản kê theo id - lối vào của màn hình duyệt. */
export const layBanKeTheoId = (idKeKhai) =>
  layItem(
    `ke-khai-thanh-tich/${idKeKhai}`,
    undefined,
    "Không tải được bản kê thành tích",
  );

/**
 * Lưu TOÀN BỘ các dòng trong một request. Đây cũng là nơi TẠO bản kê nếu chưa có.
 *
 * Dòng CÒN SỬA ĐƯỢC mà không nằm trong `chiTiet` sẽ bị gỡ - đây là cách duy nhất
 * để xoá một dòng, không có endpoint xoá lẻ. Dòng ĐÃ CHỐT vắng mặt thì server
 * GIỮ NGUYÊN; gửi nó lên để sửa mới bị từ chối 409 DONG_DA_CHOT. Vì vậy màn hình
 * nên bỏ hẳn dòng đã chốt ra khỏi payload.
 *
 * Dòng đang bị TRẢ VỀ mà bị sửa sẽ TỰ quay lại "chờ duyệt" và mất kết quả xét cũ.
 *
 * MINH CHỨNG BẮT BUỘC bị chặn NGAY Ở ĐÂY (422 THIEU_MINH_CHUNG, kèm
 * `DongCoVanDe[]` có `ThuTu` trỏ vào vị trí dòng trong `chiTiet` vừa gửi). Dòng
 * MỚI chưa có `IdChiTiet` để đính kèm nên phải tải tệp vào kho tạm trước
 * (themMinhChungTam) rồi gửi id qua `IdMinhChung[]`.
 *
 * KHÔNG gửi điểm: server tự tính `SoLuong × DiemQuyDoi` của mức.
 * KHÔNG chặn khi vượt trần hay trùng nội dung khen thưởng - vẫn lưu, phần vượt
 * chỉ không được tính (xem `TongHopTheoLoai[].MaCanhBao`).
 *
 * @param {number|string} idNam
 * @param {Array<{IdChiTiet?: number, IdMuc: number, Quy: number,
 *   NgayDatDuoc?: string, TenThanhTich: string, SoQuyetDinh?: string,
 *   CoQuanCap?: string, SoLuong: number, MoTa?: string,
 *   IdMinhChung?: number[]}>} chiTiet
 */
export const luuChiTiet = (idNam, chiTiet) =>
  layItem(
    "ke-khai-thanh-tich/chi-tiet",
    jsonBody({ IdNam: Number(idNam), ChiTiet: chiTiet }, "PUT"),
    "Lưu bản kê thất bại",
  );

/* ------------------------------------------------------------------ */
/* Phía người duyệt (TK / TKL / TP / HT / ADMIN)                       */
/* ------------------------------------------------------------------ */

/**
 * Danh sách bản kê trong phạm vi duyệt, kèm phân trang.
 *
 * Một bản kê lọt vào danh sách khi người gọi duyệt được ÍT NHẤT MỘT dòng của nó.
 * Hai đường vào: (a) dòng trỏ tới mức có `IdDonViDuyet` = đơn vị người gọi giữ
 * chức vụ duyệt (ví dụ P.TCHC thấy dòng khen thưởng của MỌI nhân viên toàn
 * trường); (b) dòng không chỉ định đơn vị phụ trách → rơi về trưởng đơn vị quản
 * lý trực tiếp.
 *
 * `SoDongChoDuyetCuaToi` cho biết phần việc của RIÊNG người gọi - đây mới là con
 * số cần nhìn trước tiên, không phải `SoDongChoDuyet`.
 *
 * KHÔNG còn bước "nộp" nên danh sách không lọc theo trạng thái bản kê nữa:
 * `chiConChoDuyet = 1` (mặc định của server) chỉ lấy bản kê còn dòng PHẢI XÉT của
 * chính người gọi, `0` lấy hết. Luôn truyền tường minh để ý định đọc được ngay.
 *
 * ⚠️ `idDonVi` chỉ là bộ lọc HIỂN THỊ, KHÔNG phải phân quyền.
 *
 * @returns {Promise<{items: object[], phanTrang: object|null}>}
 */
export const layDanhSachChoDuyet = async ({
  idNam,
  loai,
  idDonVi,
  trangThai,
  tuKhoa,
  chiConChoDuyet,
  page,
  pageSize,
} = {}) => {
  const envelope = await goiApi(
    `ke-khai-thanh-tich/cho-duyet${buildQuery({
      idNam,
      loai,
      idDonVi,
      trangThai,
      tuKhoa,
      chiConChoDuyet,
      page,
      pageSize,
    })}`,
    undefined,
    "Không tải được danh sách bản kê chờ duyệt",
  );
  return {
    items: Array.isArray(envelope.Items) ? envelope.Items : [],
    phanTrang: envelope.PhanTrang ?? null,
  };
};

/**
 * Chốt / trả về / mở lại NHIỀU DÒNG trong một lần bấm.
 *
 * Đây là NƠI DUY NHẤT điều khiển vòng đời - không còn chốt / trả lại cấp bản kê.
 * Dòng đang ở trạng thái "đã chốt" vẫn xét lại được qua chính endpoint này (nhật
 * ký ghi HanhDong = 10 "Mở lại dòng đã chốt").
 *
 * ⚠️ GÁC THEO TỪNG DÒNG. Mỗi dòng được đối chiếu với `IdDonViDuyet` của chính
 * mức nó trỏ tới. Gửi lẫn MỘT dòng thuộc đơn vị khác là CẢ REQUEST bị từ chối
 * (403 FORBIDDEN_DONG) và KHÔNG ghi gì - `error.dongCoVanDe` nói rõ dòng nào
 * thuộc đơn vị nào. Vì vậy màn hình phải gom dòng theo đơn vị duyệt và gọi hàm
 * này cho TỪNG NHÓM, đừng bao giờ dựng nút "duyệt tất cả" toàn bản kê.
 *
 * `SoLuongDuyet` bỏ trống = giữ nguyên số nhân viên đã kê. Dòng bị trả về cho
 * `DiemDuyet = 0` nhưng VẪN GIỮ số lượng để đối chiếu; `NhanXet` là BẮT BUỘC khi
 * trả về (thiếu ⇒ 400 THIEU_LY_DO). Điểm duyệt tính lại từ SNAPSHOT của dòng,
 * không đọc lại danh mục.
 *
 * @param {number} idKeKhai
 * @param {Array<{IdChiTiet: number, QuyetDinh: 2|3, SoLuongDuyet?: number|null,
 *   NhanXet?: string}>} quyetDinh
 */
export const duyetChiTiet = (idKeKhai, quyetDinh) =>
  layItem(
    `ke-khai-thanh-tich/${idKeKhai}/duyet-chi-tiet`,
    jsonBody({ QuyetDinh: quyetDinh }),
    "Lưu kết quả duyệt thất bại",
  );

/** Nhật ký của một bản kê, mới nhất trước. Quyền đọc = quyền xem bản kê. */
export const layLichSuBanKe = (idKeKhai) =>
  layItems(
    `ke-khai-thanh-tich/${idKeKhai}/lich-su`,
    undefined,
    "Không tải được nhật ký bản kê",
  );

/**
 * Tổng hợp điểm thành tích ĐÃ DUYỆT theo nhân viên × loại × quý.
 *
 * `DiemDuocTinh` là con số THẬT SỰ vào KPI: đã khử trùng nội dung khen thưởng và
 * đã cắt ở trần của tiêu chí - trùng khớp với fn_nckh_diem_tu_dong.
 */
export const layTongHopThanhTich = ({ idNam, idDonVi, quy } = {}) =>
  layItems(
    `ke-khai-thanh-tich/tong-hop${buildQuery({ idNam, idDonVi, quy })}`,
    undefined,
    "Không tải được tổng hợp điểm thành tích",
  );

/* ------------------------------------------------------------------ */
/* Minh chứng (BẮT BUỘC với mức có YeuCauMinhChung, nhiều file/dòng)   */
/* ------------------------------------------------------------------ */

export const formatKb = (kb) => {
  if (kb == null) return "-";
  const num = Number(kb);
  if (!Number.isFinite(num)) return "-";
  return num >= 1024 ? `${(num / 1024).toFixed(1)} MB` : `${num} KB`;
};

/**
 * Kiểm tra sơ bộ phía client trước khi tốn một vòng upload.
 * Server vẫn kiểm HAI LỚP: đuôi file VÀ chữ ký `%PDF-` ở đầu tệp - đổi đuôi
 * .docx thành .pdf sẽ bị trả 400.
 *
 * @returns {string|null} thông điệp lỗi, null nếu hợp lệ
 */
export const validatePdf = (file) => {
  if (!file) return "Chưa chọn tệp minh chứng";
  if (file.size === 0) return "Tệp rỗng, vui lòng chọn tệp khác";

  const laPdf =
    file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
  if (!laPdf) return "Chỉ chấp nhận tệp PDF";

  const kb = Math.ceil(file.size / 1024);
  if (kb > GIOI_HAN_MINH_CHUNG.MaxFileSizeKb) {
    return `Tệp ${formatKb(kb)} vượt giới hạn ${formatKb(GIOI_HAN_MINH_CHUNG.MaxFileSizeKb)}`;
  }
  return null;
};

/**
 * Đính kèm PDF cho MỘT dòng kê khai ĐÃ TỒN TẠI. Một dòng nhận NHIỀU tệp.
 *
 * Gác theo DÒNG chứ không theo bản kê: dòng đã chốt trả 409 DONG_DA_CHOT dù các
 * dòng khác vẫn sửa được. Dòng CHƯA tồn tại thì dùng themMinhChungTam().
 */
export const themMinhChung = async (idChiTiet, file, tenHienThi) => {
  const loi = validatePdf(file);
  if (loi) throw new Error(loi);

  const fd = new FormData();
  fd.append("file", file);
  if (tenHienThi?.trim()) fd.append("tenHienThi", tenHienThi.trim());

  return layItem(
    `ke-khai-thanh-tich/chi-tiet/${idChiTiet}/minh-chung`,
    { method: "POST", body: fd },
    "Tải lên minh chứng thất bại",
  );
};

/**
 * Tải PDF lên KHO TẠM - đường phá vòng khoá của dòng CHƯA tồn tại.
 *
 * Minh chứng là BẮT BUỘC với mức có `YeuCauMinhChung` và bị chặn ngay ở bước
 * LƯU, nhưng dòng mới thì chưa có `IdChiTiet` để gắn tệp vào. Luồng đúng:
 * gọi hàm này → giữ `IdMinhChungTt` trong state của dòng → gửi kèm
 * `ChiTiet[i].IdMinhChung` khi luuChiTiet(). Server gắn tệp vào dòng vừa tạo
 * trong cùng transaction.
 *
 * Tệp không bao giờ được gắn sẽ bị server dọn sau 7 ngày, nên bỏ trang giữa
 * chừng không để lại rác vĩnh viễn - nhưng người dùng bỏ tệp ra khỏi dòng thì
 * vẫn nên gọi xoaMinhChung() cho sạch.
 *
 * @returns {Promise<object|null>} MinhChungThanhTichDto với `IdChiTiet = null`
 */
export const themMinhChungTam = async (idNam, file, tenHienThi) => {
  const loi = validatePdf(file);
  if (loi) throw new Error(loi);

  const fd = new FormData();
  fd.append("file", file);
  if (tenHienThi?.trim()) fd.append("tenHienThi", tenHienThi.trim());

  return layItem(
    `ke-khai-thanh-tich/minh-chung-tam${buildQuery({ idNam })}`,
    { method: "POST", body: fd },
    "Tải lên minh chứng thất bại",
  );
};

/** Gỡ minh chứng (soft) + dọn file vật lý. Dùng cho cả tệp đã gắn lẫn tệp tạm. */
export const xoaMinhChung = async (idMinhChungTt) => {
  await goiApi(
    `ke-khai-thanh-tich/minh-chung/${idMinhChungTt}`,
    { method: "DELETE" },
    "Gỡ minh chứng thất bại",
  );
};

/**
 * Tải nội dung file về dạng Blob.
 *
 * Endpoint hỗ trợ cookie nên thẻ `<a href>` cũng xác thực được, nhưng đi qua
 * apiFetch giữ được vòng refresh phiên và đọc được body lỗi JSON khi server trả
 * 403/404 - cùng cách làm với minh chứng của phiếu, vi phạm và giờ quy đổi.
 *
 * Quyền đọc rộng hơn quyền sửa: chính chủ HOẶC bất kỳ ai duyệt được ít nhất một
 * dòng của bản kê (người của P.TCHC không phải trưởng đơn vị của nhân viên nhưng
 * vẫn phải đọc được minh chứng để thẩm định).
 */
const taiBlobMinhChung = async (idMinhChungTt) => {
  const response = await apiFetch(
    `ke-khai-thanh-tich/minh-chung/${idMinhChungTt}`,
  );
  if (!response.ok) {
    throw taoLoi(
      response,
      await docBody(response),
      "Không tải được tệp minh chứng",
    );
  }
  return response.blob();
};

/**
 * Object URL để nhúng PDF vào `<iframe>`.
 * Bên gọi CHỊU TRÁCH NHIỆM revokeObjectURL khi đóng preview, nếu không blob sẽ
 * nằm lại trong bộ nhớ đến khi tải lại trang.
 */
export const taoUrlXemMinhChung = async (idMinhChungTt) => {
  const blob = await taiBlobMinhChung(idMinhChungTt);
  // Ép type: một số cấu hình server trả octet-stream khiến trình duyệt tải
  // xuống thay vì hiển thị. Module chỉ nhận PDF nên ép luôn là an toàn.
  const pdf =
    blob.type === "application/pdf"
      ? blob
      : new Blob([blob], { type: "application/pdf" });
  return window.URL.createObjectURL(pdf);
};

export const taiMinhChungVeMay = async (mc) => {
  const id = mc?.IdMinhChungTt;
  if (!id) return;
  const blob = await taiBlobMinhChung(id);
  const url = window.URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
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
 * Điểm DỰ KIẾN của một dòng: `SoLuong × DiemMuc`.
 *
 * Chỉ để hiện lúc người dùng đang gõ - con số CHÍNH THỨC luôn là `DiemKeKhai`
 * server trả về sau khi lưu, và con số VÀO KPI lại là `DiemDuocTinh` của
 * `TongHopTheoLoai` (đã khử trùng và cắt trần). Đừng gửi kết quả hàm này lên API.
 */
export const tinhDiem = (soLuong, diemMuc) => {
  const sl = Number(soLuong);
  const dm = Number(diemMuc);
  if (!Number.isFinite(sl) || !Number.isFinite(dm)) return null;
  return Math.round(sl * dm * 100) / 100;
};

/** Số điểm hiển thị. `null` giữ nguyên nghĩa "chưa có", không quy về 0. */
export const formatDiem = (value, soLe = 2) => {
  if (value === null || value === undefined || value === "") return "-";
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: soLe,
  });
};

/** Nhãn quý của một dòng. */
export const tenQuy = (quy) =>
  QUY_OPTIONS.find((q) => q.value === String(quy))?.label ||
  `Không xác định (${quy ?? "-"})`;

/**
 * Tên đơn vị phụ trách duyệt MỘT DÒNG - dùng làm khoá gom nhóm ở màn hình duyệt.
 *
 * `IdDonViDuyet = null` KHÔNG phải "chưa gán": theo hợp đồng nó có nghĩa là đơn
 * vị quản lý trực tiếp của nhân viên duyệt dòng này. Phải hiện thành một nhóm có
 * tên đàng hoàng, đừng để trống.
 */
export const tenDonViDuyet = (ct) =>
  ct?.TenDonViDuyet || "Đơn vị quản lý trực tiếp";

/**
 * Chính chủ có quyền kê thêm / lưu không. Dùng cờ server, fail-closed khi thiếu.
 *
 * Đây là cờ của CẢ BẢN KÊ (còn trong kỳ kê khai hay không); điều kiện của từng
 * dòng nằm ở `ChiTiet[].ChoPhepSua` - bản kê mở KHÔNG có nghĩa là mọi dòng sửa
 * được, và mọi dòng đã chốt KHÔNG có nghĩa là hết kê thêm được.
 */
export const choPhepSua = (banKe) => banKe?.ChoPhepSua === true;

/** Xét được ÍT NHẤT MỘT dòng của bản kê ⇒ mở được màn hình duyệt. */
export const choPhepDuyet = (banKe) => banKe?.ChoPhepDuyet === true;

/**
 * Quyền sửa của CHÍNH DÒNG. Dòng mới dựng ở client (chưa có `idChiTiet`) luôn
 * sửa được; dòng từ server phải có cờ `ChoPhepSua = true`, thiếu cờ là khoá.
 */
export const choPhepSuaDong = (dong) =>
  dong?.idChiTiet == null ||
  dong?.ChoPhepSua === true ||
  dong?.choPhepSua === true;

/** Quyền chốt / trả về / mở lại của CHÍNH DÒNG. Fail-closed khi thiếu cờ. */
export const choPhepXetDong = (dong) =>
  dong?.ChoPhepXet === true || dong?.choPhepXet === true;

/** Còn dòng chưa xét trong nhãn dẫn xuất của header. */
export const conDongChuaXet = (banKe) => Number(banKe?.SoDongChoDuyet) > 0;
