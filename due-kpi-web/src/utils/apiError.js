/**
 * Map ErrorCode của API sang thông điệp tiếng Việt có dấu.
 * Message trả về từ server là tiếng Việt KHÔNG dấu nên bản map này được ưu tiên.
 */
export const VI_PHAM_ERROR_MESSAGES = {
  FORBIDDEN_CHUC_VU: 'Chỉ trưởng đơn vị (TP/TK/TKL) hoặc Admin mới được ghi nhận vi phạm',
  FORBIDDEN_DON_VI: 'Đơn vị của bạn không được phân quyền ghi nhận loại vi phạm này',
  NOT_GIANG_VIEN_KHOA: 'Chỉ được ghi nhận vi phạm cho giảng viên thuộc Khoa',
  VI_PHAM_NOT_FOUND: 'Không tìm thấy bản ghi vi phạm',
  LOAI_VI_PHAM_NOT_FOUND: 'Không tìm thấy loại vi phạm',
  NHOM_VI_PHAM_NOT_FOUND: 'Không tìm thấy nhóm vi phạm',
  NHAN_VIEN_NOT_FOUND: 'Không tìm thấy nhân viên',
  NAM_NOT_FOUND: 'Không tìm thấy năm đánh giá',
  LOAI_VI_PHAM_INACTIVE: 'Loại vi phạm đã ngừng sử dụng, không thể ghi nhận mới',
  IN_USE: 'Loại vi phạm đã phát sinh dữ liệu nên không thể xóa',
  DUPLICATE_MA: 'Mã loại vi phạm đã tồn tại, vui lòng dùng mã khác',
  MINH_CHUNG_NOT_FOUND: 'Vi phạm này chưa có tệp minh chứng',
  FILE_NOT_FOUND: 'Tệp minh chứng không còn trên máy chủ, vui lòng tải lên lại',
  IO_ERROR: 'Lỗi khi đọc/ghi tệp trên máy chủ, vui lòng thử lại',
  VALIDATION: null, // null => rơi về Message thô của server
  DB_ERROR: 'Lỗi hệ thống khi truy cập dữ liệu, vui lòng thử lại',
};

/**
 * Đọc body lỗi của một Response và dựng thông điệp hiển thị.
 *
 * ⚠️ Hàm này TIÊU THỤ body của Response — chỉ gọi đúng một lần cho mỗi response lỗi.
 *
 * @returns {Promise<{status:number, errorCode:string|null, rawMessage:string, message:string}>}
 */
export const readApiError = async (response, fallback = 'Thao tác thất bại') => {
  const body = await response.json().catch(() => null);
  const errorCode = body?.ErrorCode || null;
  const mapped = errorCode ? VI_PHAM_ERROR_MESSAGES[errorCode] : null;

  return {
    status: response.status,
    errorCode,
    rawMessage: body?.Message || '',
    message: mapped || body?.Message || fallback,
  };
};
