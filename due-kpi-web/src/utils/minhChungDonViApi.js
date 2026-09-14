import { apiFetch } from "./api";
import { readApiError } from "./apiError";
import {
  duoiFile,
  formatKb,
  iconFile,
  kieuXemTruoc,
  laMinhChungFile,
  LOAI_MINH_CHUNG,
} from "./minhChungPhieuApi";

/**
 * Minh chứng của PHIẾU KPI ĐƠN VỊ (bảng minh_chung_don_vi, khóa theo id_minh_chung_dv).
 *
 * Server cố ý trả về đúng hình dạng MinhChungDto của luồng cá nhân
 * (id_minh_chung_dv → IdMinhChung, id_chi_tiet_dv → IdChiTiet) để FE dùng chung một
 * component cho cả hai luồng - xem docs/openapi.yaml mục MinhChungDonViResponse. Nhờ
 * vậy mọi helper THUẦN (đọc đuôi tệp, chọn icon, quyết định xem trước được hay không)
 * tái dùng nguyên xi từ minhChungPhieuApi, file này chỉ thêm phần gắn với endpoint.
 *
 * Endpoint (xem docs/openapi.yaml):
 *   POST   api/chi-tiet-don-vi/{idChiTiet}/minh-chung/file  (multipart, field "file")
 *   GET    api/chi-tiet-don-vi/{idChiTiet}/minh-chung       → danh sách của một dòng
 *   GET    api/minh-chung-don-vi/{idMinhChung}/tai-ve       → nội dung tệp
 *   DELETE api/minh-chung-don-vi/{idMinhChung}
 *
 * ⚠️ KHÔNG nhận và KHÔNG đổi RowVersion của phiếu. Thêm/xóa minh chứng cố tình không
 * đụng dữ liệu chấm điểm để không làm hỏng thao tác đang dở của người khác - bên gọi
 * vì thế TUYỆT ĐỐI không được ghi đè phieu.RowVersion sau khi gọi các hàm ở đây.
 *
 * ⚠️ Minh chứng là TÙY CHỌN: sp_phieu_dv_submit không kiểm bat_buoc_minh_chung, nên cờ
 * BatBuocMinhChung chỉ để đánh dấu hiển thị, không được dùng để chặn nút Trình phiếu.
 *
 * Endpoint tải về nằm sau [TokenAuthorize] nên KHÔNG gắn thẳng vào <a href> / <iframe
 * src> được: phải fetch qua apiFetch để đi kèm cookie và luồng refresh phiên, rồi dựng
 * object URL từ blob.
 */

/** Tái dùng nguyên các helper thuần của luồng cá nhân - hai bảng cùng tập cột. */
export { duoiFile, formatKb, iconFile, kieuXemTruoc, laMinhChungFile, LOAI_MINH_CHUNG };

/**
 * Giới hạn dùng khi CHƯA gọi được GET api/cau-hinh/minh-chung.
 *
 * Khớp trần cứng trong code server (pdf/png/jpg/jpeg): appSettings chỉ THU HẸP được
 * danh sách này chứ không nới rộng thêm, nên lấy trần làm mặc định là an toàn.
 */
export const CAU_HINH_MC_MAC_DINH = {
  AllowedExtensions: ["pdf", "png", "jpg", "jpeg"],
  Accept: ".pdf,.png,.jpg,.jpeg",
  MaxFileSizeKb: 10240,
  MaxTenHienThiLength: 255,
};

/**
 * Việt hóa ErrorCode. Message của server là tiếng Việt KHÔNG dấu nên bản map này
 * được ưu tiên; mã nào không có ở đây thì rơi về Message thô.
 */
const MC_DV_ERROR_MESSAGES = {
  INVALID_STATE: "Phiếu đã nộp nên không thêm / gỡ minh chứng được nữa",
  FORBIDDEN: "Bạn không có quyền sửa minh chứng của phiếu này",
  VALIDATION_FAILED: null,
  IO_ERROR: "Máy chủ không lưu được tệp, vui lòng thử lại",
  NOT_FOUND: "Không tìm thấy tiêu chí hoặc minh chứng này",
  MINH_CHUNG_KHONG_PHAI_FILE:
    "Minh chứng này là liên kết nên không có tệp để tải về",
  FILE_NOT_FOUND: "Tệp minh chứng không còn trên máy chủ",
};

/** Dựng Error đã Việt hóa để đẩy thẳng ra toast. */
const taoLoi = async (response, fallback) => {
  const info = await readApiError(response, fallback);
  const error = new Error(MC_DV_ERROR_MESSAGES[info.errorCode] || info.message);
  error.status = info.status;
  error.errorCode = info.errorCode;
  return error;
};

/* ------------------------------------------------------------------ */
/* Cấu hình + kiểm tra phía client                                     */
/* ------------------------------------------------------------------ */

/**
 * Whitelist đuôi tệp và giới hạn dung lượng server đang áp dụng.
 *
 * Lỗi không chặn màn hình: rơi về mặc định rồi để server từ chối nếu lệch, vì phiếu
 * vẫn chấm điểm được kể cả khi không đính kèm được tệp.
 */
export const layCauHinhMinhChung = async () => {
  try {
    const response = await apiFetch("cau-hinh/minh-chung");
    if (!response.ok) return { ...CAU_HINH_MC_MAC_DINH };
    const data = await response.json();
    return data.Item
      ? { ...CAU_HINH_MC_MAC_DINH, ...data.Item }
      : { ...CAU_HINH_MC_MAC_DINH };
  } catch (error) {
    console.error("Lỗi tải cấu hình minh chứng:", error);
    return { ...CAU_HINH_MC_MAC_DINH };
  }
};

/**
 * Kiểm tra sơ bộ trước khi tốn một vòng upload.
 *
 * Khác validatePdfFile của luồng vi phạm ở chỗ không cắm cứng PDF: endpoint đơn vị
 * nhận cả ảnh, nên đối chiếu đuôi tệp với whitelist do server trả về.
 * Máy chủ vẫn kiểm HAI LỚP (đuôi tệp VÀ magic bytes của nội dung) - đổi đuôi để lách
 * sẽ bị từ chối 400.
 *
 * @returns {string|null} thông điệp lỗi, null nếu hợp lệ
 */
export const validateFileMinhChung = (file, cauHinh = CAU_HINH_MC_MAC_DINH) => {
  if (!file) return "Chưa chọn tệp minh chứng";
  if (file.size === 0) return "Tệp rỗng, vui lòng chọn tệp khác";

  const duoi = String(file.name || "")
    .split(".")
    .pop()
    .toLowerCase();
  const chapNhan = cauHinh?.AllowedExtensions?.length
    ? cauHinh.AllowedExtensions
    : CAU_HINH_MC_MAC_DINH.AllowedExtensions;
  if (!duoi || !chapNhan.includes(duoi)) {
    return `Chỉ chấp nhận tệp ${chapNhan.join(", ")}`;
  }

  const gioiHan = cauHinh?.MaxFileSizeKb || CAU_HINH_MC_MAC_DINH.MaxFileSizeKb;
  const kb = Math.ceil(file.size / 1024);
  if (kb > gioiHan) {
    return `Tệp ${formatKb(kb)} vượt giới hạn ${formatKb(gioiHan)}`;
  }
  return null;
};

/**
 * Lọc lô tệp người dùng vừa chọn, giữ lại tệp hợp lệ.
 *
 * accept trên input chỉ là bộ lọc gợi ý của hộp thoại: người dùng vẫn đổi được sang
 * "All files" hoặc kéo thả tệp bất kỳ, nên phải chặn lại bằng mã.
 *
 * @returns {{hopLe: File[], loi: string[]}} loi kèm sẵn tên tệp để đẩy thẳng ra toast
 */
export const locFileHopLe = (files, cauHinh) => {
  const hopLe = [];
  const loi = [];
  for (const file of files || []) {
    const thongBao = validateFileMinhChung(file, cauHinh);
    if (thongBao) loi.push(`${file?.name || "Tệp"}: ${thongBao}`);
    else hopLe.push(file);
  }
  return { hopLe, loi };
};

/* ------------------------------------------------------------------ */
/* Ghi                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Tải một tệp minh chứng lên cho một dòng tiêu chí của phiếu đơn vị.
 *
 * @param {number} idChiTiet id_chi_tiet_dv - KHÔNG phải id_chi_tiet của luồng cá nhân
 * @returns {Promise<object>} bản ghi minh chứng vừa tạo (MinhChungDto)
 */
export const themMinhChungDonVi = async (idChiTiet, file, tenHienThi = "") => {
  const loi = validateFileMinhChung(file);
  if (loi) throw new Error(loi);

  const fd = new FormData();
  fd.append("file", file);
  if (tenHienThi?.trim()) fd.append("tenHienThi", tenHienThi.trim());

  // Không tự đặt Content-Type: apiFetch đã bỏ header khi body là FormData để
  // trình duyệt tự sinh boundary.
  const response = await apiFetch(
    `chi-tiet-don-vi/${idChiTiet}/minh-chung/file`,
    { method: "POST", body: fd },
  );

  if (!response.ok) throw await taoLoi(response, "Tải lên minh chứng thất bại");

  const data = await response.json();
  return data.Item || null;
};

/** Xóa mềm một minh chứng và dọn tệp vật lý trên máy chủ. */
export const xoaMinhChungDonVi = async (idMinhChung) => {
  const response = await apiFetch(`minh-chung-don-vi/${idMinhChung}`, {
    method: "DELETE",
  });
  if (!response.ok) throw await taoLoi(response, "Gỡ minh chứng thất bại");
  return true;
};

/* ------------------------------------------------------------------ */
/* Đọc                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Danh sách minh chứng (chưa xóa) của một dòng tiêu chí.
 *
 * Thường KHÔNG cần gọi: GET api/phieu-don-vi/{id} đã trả sẵn MinhChung[] trên mỗi
 * dòng ChiTiet. Giữ lại cho trường hợp cần làm mới riêng một dòng.
 */
export const fetchMinhChungDonVi = async (idChiTiet) => {
  const response = await apiFetch(`chi-tiet-don-vi/${idChiTiet}/minh-chung`);
  if (!response.ok) {
    throw await taoLoi(response, "Không tải được danh sách minh chứng");
  }
  const data = await response.json();
  return data.Items || [];
};

/** MIME đoán từ đuôi tệp, để ép lại type khi server trả application/octet-stream. */
const MIME_THEO_DUOI = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
};

/** Lấy nội dung tệp minh chứng đơn vị dưới dạng Blob. */
const fetchFileBlob = async (idMinhChung) => {
  const response = await apiFetch(`minh-chung-don-vi/${idMinhChung}/tai-ve`);
  if (!response.ok) {
    throw await taoLoi(response, "Không tải được tệp minh chứng");
  }
  return response.blob();
};

/**
 * Tạo object URL để nhúng tệp vào <iframe> / <img>.
 * Bên gọi CHỊU TRÁCH NHIỆM gọi window.URL.revokeObjectURL(url) khi đóng preview,
 * nếu không blob nằm lại trong bộ nhớ đến khi tải lại trang.
 */
export const createMinhChungDonViPreviewUrl = async (mc) => {
  const blob = await fetchFileBlob(mc.IdMinhChung);
  const mime = MIME_THEO_DUOI[duoiFile(mc)];
  const ketQua =
    mime && blob.type !== mime ? new Blob([blob], { type: mime }) : blob;
  return window.URL.createObjectURL(ketQua);
};

/** Tải tệp minh chứng về máy, giữ đúng tên tệp gốc người dùng đã tải lên. */
export const downloadMinhChungDonViFile = async (mc) => {
  const blob = await fetchFileBlob(mc.IdMinhChung);
  const url = window.URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download =
      mc.TenFileGoc || mc.TenHienThi || `minh-chung-${mc.IdMinhChung}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Chờ trình duyệt kịp bắt đầu tải rồi mới thu hồi URL tạm
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
  }
};
