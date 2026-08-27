import { apiFetch } from "./api";
import { readApiError } from "./apiError";
import {
  formatKb,
  validatePdfFile,
  MAX_MINH_CHUNG_KB,
} from "./viPhamMinhChungApi";

/**
 * Minh chứng của PHIẾU ĐÁNH GIÁ KPI (bảng minh_chung, khóa theo IdMinhChung).
 *
 * Khác minh chứng vi phạm ở hai điểm:
 *   - Mỗi chi tiết tiêu chí có NHIỀU minh chứng, mỗi bản ghi một IdMinhChung.
 *   - Server nhận pdf/doc/docx/xls/xlsx/png/jpg (trường LoaiFile) nên các bản ghi
 *     cũ vẫn có thể là doc/xls/ảnh: phần đọc phải phân nhánh "xem trước được" và
 *     "chỉ tải về". Còn phần TẢI LÊN thì nghiệp vụ chỉ cho phép PDF - xem locFilePdf.
 *
 * Endpoint (xem docs/openapi.yaml):
 *   GET api/chitiet/{idChiTiet}/minh-chung   → danh sách (nằm ở phieuApi.js)
 *   GET api/minhchung/{idMinhChung}/tai-ve   → nội dung tệp
 *
 * Endpoint tải về nằm sau [TokenAuthorize] và khác origin nên KHÔNG gắn thẳng vào
 * <a href> / <iframe src> được (sẽ 401): phải fetch qua apiFetch để đi kèm cookie
 * và luồng refresh phiên, rồi dựng object URL từ blob.
 */

/** Tái dùng chung hàm format kích thước và bộ kiểm tra PDF cho toàn hệ thống. */
export { formatKb, validatePdfFile, MAX_MINH_CHUNG_KB };

/** Giá trị accept cho <input type="file"> minh chứng. */
export const ACCEPT_PDF = "application/pdf,.pdf";

/**
 * Lọc danh sách tệp người dùng vừa chọn, chỉ giữ lại PDF hợp lệ.
 *
 * accept trên input chỉ là bộ lọc gợi ý của hộp thoại chọn tệp: người dùng vẫn đổi
 * được sang "All files" hoặc kéo thả tệp bất kỳ, nên phải chặn lại bằng mã.
 *
 * @returns {{hopLe: File[], loi: string[]}} loi kèm sẵn tên tệp để đẩy thẳng ra toast
 */
export const locFilePdf = (files) => {
  const hopLe = [];
  const loi = [];
  for (const file of files || []) {
    const thongBao = validatePdfFile(file);
    if (thongBao) loi.push(`${file?.name || "Tệp"}: ${thongBao}`);
    else hopLe.push(file);
  }
  return { hopLe, loi };
};

export const LOAI_MINH_CHUNG = { FILE: 1, LINK: 2, DOI: 3 };

export const laMinhChungFile = (mc) =>
  Number(mc?.LoaiMinhChung) === LOAI_MINH_CHUNG.FILE;

/** Đuôi tệp viết thường: ưu tiên LoaiFile do server ghi, fallback tên tệp gốc. */
export const duoiFile = (mc) => {
  const tho = String(mc?.LoaiFile || "")
    .trim()
    .replace(/^\./, "")
    .toLowerCase();
  if (tho) return tho;
  const khop = /\.([a-z0-9]+)$/i.exec(mc?.TenFileGoc || mc?.DuongDan || "");
  return khop ? khop[1].toLowerCase() : "";
};

const DUOI_ANH = ["png", "jpg", "jpeg", "gif", "webp", "bmp"];

/**
 * Kiểu xem trước ngay trong modal.
 * @returns {'pdf'|'image'|null} null = trình duyệt không hiển thị được (doc/xls…),
 *   màn hình chỉ mời tải về chứ không tải blob vô ích.
 */
export const kieuXemTruoc = (mc) => {
  const duoi = duoiFile(mc);
  if (duoi === "pdf") return "pdf";
  return DUOI_ANH.includes(duoi) ? "image" : null;
};

/**
 * MIME đoán từ đuôi tệp. Cần ép lại type của blob vì server suy Content-Type từ
 * loai_file và trả application/octet-stream cho đuôi lạ - khi đó iframe/img sẽ
 * tải xuống thay vì hiển thị.
 */
const MIME_THEO_DUOI = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
};

/** Icon + màu theo định dạng, để danh sách minh chứng đọc được bằng mắt. */
export const iconFile = (mc) => {
  switch (duoiFile(mc)) {
    case "pdf":
      return { className: "fa-solid fa-file-pdf", color: "#dc2626" };
    case "doc":
    case "docx":
      return { className: "fa-solid fa-file-word", color: "#1d4ed8" };
    case "xls":
    case "xlsx":
      return { className: "fa-solid fa-file-excel", color: "#047857" };
    default:
      return DUOI_ANH.includes(duoiFile(mc))
        ? { className: "fa-solid fa-file-image", color: "#7c3aed" }
        : { className: "fa-regular fa-file", color: "#64748b" };
  }
};

/**
 * Chuẩn hóa một phần tử DanhSachFile về hình dạng MinhChungDto.
 *
 * Các form đánh giá (DanhGiaNhanVien, DanhGiaPhuLuc2, ChiTietDuyetPhieu) tự dựng
 * mảng DanhSachFile bằng tên trường camelCase riêng, còn GET api/approval - endpoint
 * chưa có trong docs/openapi.yaml - trả camelCase/snake_case lẫn lộn, nên phải đọc
 * phòng hờ nhiều biến thể.
 *
 * IdMinhChung có thể null: endpoint tai-ve khóa theo id chứ không theo đường dẫn,
 * nên bản ghi cũ chỉ còn tên tệp (cột ten_file trên chi_tiet_danh_gia, có từ trước
 * khi tách bảng minh_chung) là không tải được - bên gọi phải nói rõ với người dùng
 * thay vì mở ra tab lỗi.
 */
export const chuanHoaFileMinhChung = (file) => {
  const duongDan = file?.fileName || file?.ten_file || file?.DuongDan || "";
  const tenGoc =
    file?.originalName ||
    file?.ten_file_goc ||
    file?.TenFileGoc ||
    file?.TenHienThi ||
    duongDan;

  return {
    IdMinhChung:
      file?.IdMinhChung ?? file?.idMinhChung ?? file?.id_minh_chung ?? null,
    // DanhSachFile chỉ chứa tệp tải lên; vẫn tôn trọng loại nếu nguồn có trả
    LoaiMinhChung: Number(
      file?.LoaiMinhChung ?? file?.loai_minh_chung ?? LOAI_MINH_CHUNG.FILE,
    ),
    TenFileGoc: tenGoc,
    TenHienThi: tenGoc,
    DuongDan: duongDan,
    LoaiFile: file?.fileType || file?.loai_file || file?.LoaiFile || "",
    KichThuocKb:
      file?.fileSizeKB ?? file?.kich_thuoc_kb ?? file?.KichThuocKb ?? null,
  };
};

/**
 * ErrorCode riêng của nhóm minh chứng phiếu. VI_PHAM_ERROR_MESSAGES trong
 * apiError.js dùng chung mã MINH_CHUNG_NOT_FOUND / FILE_NOT_FOUND nhưng diễn giải
 * theo ngữ cảnh vi phạm ("Vi phạm này chưa có tệp…"), nên map lại ở đây.
 */
const MINH_CHUNG_ERROR_MESSAGES = {
  MINH_CHUNG_NOT_FOUND: "Minh chứng không tồn tại hoặc đã bị xóa",
  FILE_NOT_FOUND: "Tệp minh chứng không còn trên máy chủ",
  MINH_CHUNG_KHONG_PHAI_FILE:
    "Minh chứng này là liên kết nên không có tệp để tải về",
  FORBIDDEN_CHUC_VU: "Bạn không có quyền xem minh chứng của phiếu này",
  // Kho minh chứng (GET api/minhchung) dùng mã ngắn gọn hơn endpoint tải về
  FORBIDDEN: "Bạn không có quyền xem minh chứng của phiếu này",
};

/**
 * Kho minh chứng: liệt kê minh chứng theo phiếu, theo năm, hoặc toàn bộ.
 *
 * Thứ tự ưu tiên do SERVER quyết, bên gọi không cần tự loại tham số:
 *   idPhieu > idNam > (không tham số = mọi năm của người đang đăng nhập).
 * idNhanVien chỉ dùng kèm idNam, mặc định là chính người đăng nhập.
 *
 * 404 nghĩa là "không có phiếu nào khớp bộ lọc" chứ không phải hỏng - quy về mảng
 * rỗng để màn hình hiện trạng thái trống thay vì báo đỏ. 403 vẫn ném lỗi vì đó là
 * chuyện quyền, người dùng cần biết.
 *
 * @returns {Promise<Array>} MinhChungKhoDto[] - đã sắp theo năm giảm dần, rồi thứ
 *   tự hiển thị của tiêu chí
 */
export const fetchKhoMinhChung = async ({
  idPhieu,
  idNam,
  idNhanVien,
} = {}) => {
  const qs = new URLSearchParams();
  if (idPhieu) qs.set("idPhieu", String(idPhieu));
  if (idNam) qs.set("idNam", String(idNam));
  if (idNhanVien) qs.set("idNhanVien", String(idNhanVien));
  const query = qs.toString();

  const response = await apiFetch(`minhchung${query ? `?${query}` : ""}`);

  if (response.status === 404) return [];

  if (!response.ok) {
    const info = await readApiError(response, "Không tải được kho minh chứng");
    const error = new Error(
      MINH_CHUNG_ERROR_MESSAGES[info.errorCode] || info.message,
    );
    error.status = info.status;
    error.errorCode = info.errorCode;
    throw error;
  }

  const data = await response.json();
  return data.Items || [];
};

/** Lấy nội dung tệp minh chứng dưới dạng Blob. */
const fetchFileBlob = async (idMinhChung) => {
  const response = await apiFetch(`minhchung/${idMinhChung}/tai-ve`);

  if (!response.ok) {
    const info = await readApiError(response, "Không tải được tệp minh chứng");
    const error = new Error(
      MINH_CHUNG_ERROR_MESSAGES[info.errorCode] || info.message,
    );
    error.status = info.status;
    error.errorCode = info.errorCode;
    throw error;
  }

  return response.blob();
};

/**
 * Tạo object URL để nhúng tệp vào <iframe> / <img>.
 * Bên gọi CHỊU TRÁCH NHIỆM gọi window.URL.revokeObjectURL(url) khi đóng preview,
 * nếu không blob nằm lại trong bộ nhớ đến khi tải lại trang.
 */
export const createMinhChungPreviewUrl = async (mc) => {
  const blob = await fetchFileBlob(mc.IdMinhChung);
  const mime = MIME_THEO_DUOI[duoiFile(mc)];
  const ketQua =
    mime && blob.type !== mime ? new Blob([blob], { type: mime }) : blob;
  return window.URL.createObjectURL(ketQua);
};

/** Tải tệp minh chứng về máy, giữ đúng tên tệp gốc người dùng đã tải lên. */
export const downloadMinhChungFile = async (mc) => {
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
