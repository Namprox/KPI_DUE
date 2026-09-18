import { apiFetch } from "./api";

const docBody = async (response) => response.json().catch(() => ({}));

const taoLoiApi = (response, body, fallback) => {
  const error = new Error(body?.Message || body?.message || fallback);
  error.status = response.status;
  error.errorCode = body?.ErrorCode || body?.errorCode || null;
  return error;
};

export const layDanhSachGioGiangTkb = async (idNam, signal) => {
  const response = await apiFetch(
    `gio-giang-tkb?idNam=${encodeURIComponent(idNam)}`,
    { signal },
  );
  const body = await docBody(response);
  const success = body?.Success ?? body?.success ?? response.ok;

  if (!response.ok || success === false) {
    throw taoLoiApi(response, body, "Không tải được dữ liệu giờ giảng");
  }

  return {
    items: body?.Items || body?.items || [],
    soDongChuaAnhXa:
      body?.SoDongChuaAnhXa ?? body?.soDongChuaAnhXa ?? 0,
  };
};

export const importThoiKhoaBieu = async ({
  file,
  idNam,
}) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("idNam", String(idNam));

  const response = await apiFetch("gio-giang-tkb/import", {
    method: "POST",
    body: formData,
  });
  const body = await docBody(response);
  const success = body?.Success ?? body?.success ?? response.ok;

  if (!response.ok || success === false) {
    throw taoLoiApi(response, body, "Không thể nhập file thời khóa biểu");
  }

  return body;
};

export const quetAnhXaTuDong = async (idNam) => {
  const response = await apiFetch(
    `gio-giang-tkb/anh-xa/tu-dong?idNam=${encodeURIComponent(idNam)}`,
    { method: "POST" },
  );
  const body = await docBody(response);
  const success = body?.Success ?? body?.success ?? response.ok;

  if (!response.ok || success === false) {
    throw taoLoiApi(response, body, "Không thể quét lại ánh xạ tự động");
  }

  return body;
};

export const kiemTraFileThoiKhoaBieu = (file) => {
  if (!file) return "Vui lòng chọn file Excel thời khóa biểu.";
  if (!/\.(xlsx|xls)$/i.test(file.name || "")) {
    return "File thời khóa biểu phải có định dạng .xlsx hoặc .xls.";
  }
  if (Number(file.size || 0) > 100 * 1024 * 1024) {
    return "File thời khóa biểu không được vượt quá 100 MB.";
  }
  return "";
};

export const kiemTraImportTkb = ({ file, idNam }) => {
  if (!idNam) return "Vui lòng chọn năm đánh giá trước khi upload.";
  return kiemTraFileThoiKhoaBieu(file);
};

export const chonNamDanhGiaMacDinh = (
  danhSachNam,
  namHienTai = new Date().getFullYear(),
) => {
  const danhSach = Array.isArray(danhSachNam) ? danhSachNam : [];
  const namKhop = danhSach.find(
    (item) => String(item?.IdNam) === String(namHienTai),
  );
  return String(namKhop?.IdNam || danhSach[0]?.IdNam || "");
};
