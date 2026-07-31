import { apiFetch } from './api';
import { readApiError } from './apiError';

/**
 * Minh chứng của vi phạm giảng dạy — thay cho trường "Số hiệu hồ sơ" nhập tay trước đây.
 * Mỗi vi phạm giữ TỐI ĐA 1 file PDF; tải lên lần sau sẽ ghi đè file cũ trên máy chủ.
 *
 * Endpoint (xem docs/openapi.yaml):
 *   POST   api/viphamgiangday/{id}/minh-chung          (multipart/form-data, field "file")
 *   DELETE api/viphamgiangday/{id}/minh-chung
 *   GET    api/viphamgiangday/{id}/minh-chung/tai-ve   (trả về application/pdf)
 */

/** Khớp appSetting maxEvidenceFileSizeKb mặc định của máy chủ (10240 KB = 10 MB). */
export const MAX_MINH_CHUNG_KB = 10240;

/**
 * Kiểm tra sơ bộ phía client trước khi tốn một vòng upload.
 * Máy chủ vẫn kiểm tra lại cả đuôi .pdf lẫn chữ ký "%PDF-" của nội dung.
 *
 * @returns {string|null} thông điệp lỗi, null nếu hợp lệ
 */
export const validatePdfFile = (file) => {
    if (!file) return 'Chưa chọn tệp minh chứng';
    if (file.size === 0) return 'Tệp rỗng, vui lòng chọn tệp khác';

    const laPdf =
        file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
    if (!laPdf) return 'Chỉ chấp nhận tệp PDF';

    const kb = Math.ceil(file.size / 1024);
    if (kb > MAX_MINH_CHUNG_KB) {
        return `Tệp ${formatKb(kb)} vượt giới hạn ${formatKb(MAX_MINH_CHUNG_KB)}`;
    }
    return null;
};

/** Hiển thị kích thước: dưới 1024 KB thì để KB, lớn hơn thì đổi sang MB. */
export const formatKb = (kb) => {
    if (kb == null) return '---';
    const num = Number(kb);
    if (isNaN(num)) return '---';
    return num >= 1024 ? `${(num / 1024).toFixed(1)} MB` : `${num} KB`;
};

/**
 * Tải lên (hoặc ghi đè) minh chứng PDF của một vi phạm.
 * @returns {Promise<object>} bản ghi vi phạm đã cập nhật (Item), kèm MinhChung mới
 * @throws {Error} message đã Việt hóa để đẩy thẳng ra toast
 */
export const uploadViPhamMinhChung = async (idViPham, file) => {
    const loi = validatePdfFile(file);
    if (loi) throw new Error(loi);

    const fd = new FormData();
    fd.append('file', file);

    // Không tự đặt Content-Type: apiFetch đã bỏ header khi body là FormData
    // để trình duyệt tự sinh boundary.
    const response = await apiFetch(`viphamgiangday/${idViPham}/minh-chung`, {
        method: 'POST',
        body: fd,
    });

    if (!response.ok) {
        const err = await readApiError(response, 'Tải lên minh chứng thất bại');
        throw new Error(err.message);
    }

    const result = await response.json().catch(() => null);
    return result?.Item || null;
};

/** Gỡ minh chứng khỏi vi phạm (xóa cả metadata lẫn file trên đĩa). Dòng vi phạm vẫn còn. */
export const deleteViPhamMinhChung = async (idViPham) => {
    const response = await apiFetch(`viphamgiangday/${idViPham}/minh-chung`, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const err = await readApiError(response, 'Xóa minh chứng thất bại');
        throw new Error(err.message);
    }
};

/**
 * Lấy nội dung PDF minh chứng dưới dạng Blob.
 * Luôn đi qua apiFetch (không dùng window.open / src trực tiếp) vì API nằm khác
 * origin và xác thực bằng cookie — cách này giữ được luồng refresh phiên và đọc
 * được body lỗi JSON khi máy chủ trả 403/404.
 */
const fetchMinhChungBlob = async (idViPham) => {
    const response = await apiFetch(
        `viphamgiangday/${idViPham}/minh-chung/tai-ve`
    );

    if (!response.ok) {
        const err = await readApiError(response, 'Không tải được tệp minh chứng');
        throw new Error(err.message);
    }

    return response.blob();
};

/**
 * Tạo object URL để nhúng PDF vào <iframe> (viewer sẵn có của trình duyệt).
 * Bên gọi CHỊU TRÁCH NHIỆM gọi window.URL.revokeObjectURL(url) khi đóng preview,
 * nếu không blob sẽ nằm lại trong bộ nhớ đến khi tải lại trang.
 *
 * Ép type application/pdf: một số cấu hình máy chủ trả về octet-stream khiến
 * trình duyệt tải xuống thay vì hiển thị.
 */
export const createViPhamMinhChungUrl = async (idViPham) => {
    const blob = await fetchMinhChungBlob(idViPham);
    const pdfBlob =
        blob.type === 'application/pdf'
            ? blob
            : new Blob([blob], { type: 'application/pdf' });
    return window.URL.createObjectURL(pdfBlob);
};

/** Tải file PDF minh chứng về máy. */
export const downloadViPhamMinhChung = async (idViPham, tenFileGoc) => {
    const blob = await fetchMinhChungBlob(idViPham);
    const url = window.URL.createObjectURL(blob);
    try {
        const link = document.createElement('a');
        link.href = url;
        link.download = tenFileGoc || `minh-chung-vi-pham-${idViPham}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
    } finally {
        // Chờ trình duyệt kịp bắt đầu tải rồi mới thu hồi URL tạm
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    }
};
