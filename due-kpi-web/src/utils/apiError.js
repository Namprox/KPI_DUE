/**
 * Map ErrorCode của API sang thông điệp tiếng Việt có dấu.
 * Message trả về từ server là tiếng Việt KHÔNG dấu nên bản map này được ưu tiên.
 */
export const VI_PHAM_ERROR_MESSAGES = {
  FORBIDDEN_CHUC_VU:
    "Chỉ trưởng đơn vị (TP/TK/TKL) hoặc Admin mới được ghi nhận vi phạm",
  FORBIDDEN_DON_VI:
    "Đơn vị của bạn không được phân quyền ghi nhận loại vi phạm này",
  NOT_GIANG_VIEN_KHOA: "Chỉ được ghi nhận vi phạm cho giảng viên thuộc Khoa",
  VI_PHAM_NOT_FOUND: "Không tìm thấy bản ghi vi phạm",
  LOAI_VI_PHAM_NOT_FOUND: "Không tìm thấy loại vi phạm",
  NHOM_VI_PHAM_NOT_FOUND: "Không tìm thấy nhóm vi phạm",
  NHAN_VIEN_NOT_FOUND: "Không tìm thấy nhân viên",
  NAM_NOT_FOUND: "Không tìm thấy năm đánh giá",
  LOAI_VI_PHAM_INACTIVE:
    "Loại vi phạm đã ngừng sử dụng, không thể ghi nhận mới",
  IN_USE: "Loại vi phạm đã phát sinh dữ liệu nên không thể xóa",
  DUPLICATE_MA: "Mã loại vi phạm đã tồn tại, vui lòng dùng mã khác",
  MINH_CHUNG_NOT_FOUND: "Vi phạm này chưa có tệp minh chứng",
  FILE_NOT_FOUND: "Tệp minh chứng không còn trên máy chủ, vui lòng tải lên lại",
  IO_ERROR: "Lỗi khi đọc/ghi tệp trên máy chủ, vui lòng thử lại",
  VALIDATION: null, // null => rơi về Message thô của server
  DB_ERROR: "Lỗi hệ thống khi truy cập dữ liệu, vui lòng thử lại",
};

/**
 * Mã lỗi của quy trình 4 giai đoạn → thông điệp tiếng Việt có dấu.
 *
 * Nguồn: docs/workflow.html mục 12. Server trả Message tiếng Việt KHÔNG dấu nên
 * bản map này được ưu tiên; mã nào chưa có ở đây sẽ rơi về Message thô.
 */
export const PHIEU_ERROR_MESSAGES = {
  THIEU_DIEM: "Phải nhập điểm trước khi chốt tiêu chí này",
  THIEU_LY_DO: "Phải nêu lý do — sửa điểm hoặc trả về đều bắt buộc ghi lý do",
  INVALID_STATE_DONG:
    "Tiêu chí không còn ở bước cho phép thao tác này, vui lòng tải lại",
  AUTO_SCORED: "Tiêu chí do hệ thống chấm tự động, không thao tác tay được",
  FORBIDDEN_DON_VI:
    "Bạn có chức vụ đó nhưng không phải tại đơn vị này (đơn vị không có quyền thao tác)",
  PHIEU_KHONG_NHAN_DIEM_TU_DONG: null, // rơi về server message chứa số hiệu phiếu đang giữ điểm tự động
  TAI_KHOAN_CHUA_GAN_DON_VI_CHINH:
    "Tài khoản chưa được gán đơn vị chính. Vui lòng liên hệ quản trị viên.",
  // Nút "Nộp lại" lẽ ra đã bị ẩn khi không còn dòng nào chờ bổ sung — gặp mã này
  // là lệch state ở client, bên gọi phải log lại rồi tải lại phiếu.
  KHONG_CO_DONG_CHO_NOP:
    "Không còn tiêu chí nào đang chờ bạn bổ sung để nộp lại",
  // null => rơi về Message thô. Hạn hiệu lực phụ thuộc GIAI ĐOẠN (nộp lần đầu và
  // hủy nộp dùng hạn tự đánh giá, nộp lại / sửa dòng bị trả về dùng hạn thẩm
  // định) nên chỉ server mới biết đang vướng hạn nào — hard-code một câu ở đây
  // sẽ nói sai với ít nhất một luồng.
  QUA_HAN: null,
  CHUA_CHOT_HET:
    "Còn tiêu chí chưa được thẩm định xong, chưa chốt được hồ sơ",
  VUOT_MUC_VIEN_CHUC:
    "Viên chức / người lao động chỉ được xếp tối đa mức 2 (Hoàn thành nhiệm vụ)",
  CHUA_DU_HO_SO:
    "Còn hồ sơ chưa được Trưởng khoa chốt, chưa đóng gói tờ trình được",
  DONG_HANG:
    "Có nhiều hồ sơ đồng điểm tranh suất xuất sắc cuối cùng — cần chỉ định người được suất",
  TY_LE_KHONG_HOP_LE: "Tỷ lệ xuất sắc phải nằm trong khoảng lớn hơn 0 và tối đa 1",
  TRAN_LAN_TRINH: "Gói đã đạt giới hạn số lần trình Hiệu trưởng",
  DANH_SACH_RONG: "Phải chọn ít nhất một hồ sơ để trả lại",
  HO_SO_KHONG_HOP_LE:
    "Danh sách chứa hồ sơ không thuộc gói hoặc không ở trạng thái cho phép",
  TO_TRINH_DA_TRINH:
    "Gói KPI đã được trình lên Hiệu trưởng — cần Hiệu trưởng trả hồ sơ về trước",
  PHIEU_SUBMIT_VALIDATION_FAILED:
    "Còn tiêu chí chưa hoàn tất, xem danh sách bên dưới",
  PVCD_CAP_EXCEEDED: "Vượt trần 20 điểm phục vụ cộng đồng",
  PHIEU_NOT_FOUND: "Không tìm thấy phiếu, hoặc phiếu đã bị xóa",
  DA_CHAM: "Đơn vị đã bắt đầu thẩm định nên không hủy nộp được nữa",
};

const ERROR_MESSAGES = { ...VI_PHAM_ERROR_MESSAGES, ...PHIEU_ERROR_MESSAGES };

/**
 * Rút mã lỗi ra khỏi body, chấp nhận cả BA quy ước đặt tên mà server đang dùng:
 *   - `ErrorCode`  (PascalCase) — ChiTietDanhGiaResponse, ToTrinhKhoaResponse
 *   - `error_code` (snake_case) — nhóm lỗi quy trình 4 giai đoạn
 *   - `error`      (camelCase)  — chỉ PHIEU_SUBMIT_VALIDATION_FAILED và PVCD_CAP_EXCEEDED
 */
const docMaLoi = (body) =>
  body?.ErrorCode || body?.error_code || body?.error || null;

export const readApiError = async (
  response,
  fallback = "Thao tác thất bại",
) => {
  const body = await response.json().catch(() => null);
  const errorCode = docMaLoi(body);
  const mapped = errorCode ? ERROR_MESSAGES[errorCode] : null;

  return {
    status: response.status,
    errorCode,
    // Envelope lỗi cũng PascalCase, riêng hai lỗi 422 dùng `message` thường.
    rawMessage: body?.Message || body?.message || "",
    message: mapped || body?.Message || body?.message || fallback,
    // Payload phụ đi kèm lỗi — bên gọi cần để dựng UI, không chỉ để báo đỏ.
    hoSo: body?.HoSo || null,
    dongHang: body?.DongHang || null,
    missingItems: body?.missingItems || null,
  };
};
