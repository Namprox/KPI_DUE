import { apiFetch } from "./api";
import { readApiError } from "./apiError";

const query = (params = {}) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  const value = search.toString();
  return value ? `?${value}` : "";
};

const unwrapItem = (body) => body?.Item ?? body?.item ?? body?.Data ?? null;
const unwrapItems = (body) => body?.Items ?? body?.items ?? body?.Data ?? [];

const request = async (endpoint, options, fallback) => {
  const response = await apiFetch(endpoint, options);
  if (!response.ok) {
    const error = await readApiError(response, fallback);
    error.responseStatus = response.status;
    throw error;
  }
  return response.status === 204 ? {} : response.json().catch(() => ({}));
};

export const TRANG_THAI_PHIEU_QUY = {
  NHAP: 1,
  CHO_TRUONG_DON_VI: 2,
  DA_CHOT: 5,
};

export const trangThaiPhieuQuy = (phieu) =>
  phieu?.TrangThaiText ||
  ({ 1: "Nháp", 2: "Chờ Trưởng đơn vị duyệt", 5: "Đã chốt điểm quý" }[
    Number(phieu?.TrangThai)
  ] || "Chưa tạo phiếu");

export const khoangDiemVienChuc = (diemToiDa) => {
  const max = Number(diemToiDa) || 0;
  return max > 0 ? { san: -max, tran: max } : { san: max, tran: 0 };
};

// DanhGiaPhuLuc2Form gom nhóm cấp một bằng IdNhomCha/TenNhomCha. Dữ liệu phiếu
// quý chỉ có IdNhom/TenNhom, còn LoaiNhom là thuộc tính nghiệp vụ và không phải
// khóa hiển thị (nhiều nhóm khác tên có thể cùng một LoaiNhom).
export const taoTieuChiHienThiQuy = (chiTiet = {}) => {
  const tenNhom =
    String(chiTiet.TenNhom || "")
      .replace(/\s+/g, " ")
      .trim() || "Nhóm tiêu chí";

  return {
    ...chiTiet,
    IdNhomCha: `phieu-quy:${tenNhom.toLocaleLowerCase("vi-VN")}`,
    TenNhomCha: tenNhom,
    TenNhom: tenNhom,
    LoaiThangDiem: chiTiet.LoaiThangDiem ?? 2,
    CacThangDiem: chiTiet.CacThangDiem || chiTiet.ThangDiem || [],
  };
};

export const lapTieuChiMauTheoId = (mau = {}) => {
  const result = {};
  const them = (tieuChi) => {
    if (tieuChi?.IdTieuChi == null) return;
    result[tieuChi.IdTieuChi] = tieuChi;
  };

  (mau.Nhom || []).forEach((nhomCha) => {
    (nhomCha.TieuChi || []).forEach(them);
    (nhomCha.NhomCon || []).forEach((nhomCon) => {
      (nhomCon.TieuChi || []).forEach(them);
    });
  });
  return result;
};

export const fetchPhieuQuyCuaToi = async ({ idNam, quy, idDonVi }) => {
  const body = await request(
    `phieu-quy/cua-toi${query({ idNam, quy, idDonVi })}`,
    undefined,
    "Không tải được phiếu quý",
  );
  return unwrapItem(body);
};

/**
 * Danh sách phiếu quý theo phạm vi mà backend cho phép.
 *
 * Màn lịch sử luôn truyền idNhanVien của người đang đăng nhập để tài khoản có
 * quyền quản lý đơn vị vẫn chỉ nhìn thấy phiếu của chính mình.
 */
export const fetchDanhSachPhieuQuy = async (params = {}) => {
  const body = await request(
    `phieu-quy${query(params)}`,
    undefined,
    "Không tải được danh sách phiếu quý",
  );
  const items = unwrapItems(body);
  return {
    items,
    total:
      body?.TotalCount ?? body?.Total ?? body?.TotalItems ?? null,
  };
};

export const fetchPhieuQuy = async (idPhieu) => {
  const body = await request(
    `phieu-quy/${idPhieu}`,
    undefined,
    "Không tải được chi tiết phiếu quý",
  );
  return unwrapItem(body);
};

export const fetchDiemTuDongMau = async ({ idMau, idNhanVien, quy }) => {
  const body = await request(
    `maudanhgia/${idMau}/diem-tu-dong${query({ idNhanVien, quy })}`,
    undefined,
    "Không tải được điểm tự động",
  );
  const phamViQuy = Number(body?.Quy ?? quy ?? 0);
  return unwrapItems(body)
    .filter(Boolean)
    .map((item) => ({ ...item, Quy: phamViQuy }));
};

export const fetchChiTietMauDanhGia = async (idMau) => {
  const body = await request(
    `maudanhgia/${idMau}/chi-tiet`,
    undefined,
    "Không tải được chi tiết mẫu đánh giá",
  );
  return unwrapItem(body) || {};
};

export const createPhieuQuy = async (payload) => {
  const body = await request(
    "phieu-quy",
    { method: "POST", body: JSON.stringify(payload) },
    "Không tạo được phiếu quý",
  );
  return unwrapItem(body);
};

export const saveTuDanhGiaQuy = async (idChiTiet, payload) => {
  const body = await request(
    `chitiet/${idChiTiet}/tu-danh-gia`,
    { method: "PUT", body: JSON.stringify(payload) },
    "Không lưu được điểm tự đánh giá",
  );
  return unwrapItem(body) || body;
};

export const nopPhieuQuy = async (idPhieu, payload) => {
  const body = await request(
    `phieu-quy/${idPhieu}/nop`,
    { method: "POST", body: JSON.stringify(payload) },
    "Không nộp được phiếu quý",
  );
  return unwrapItem(body) || body;
};

export const huyNopPhieuQuy = async (idPhieu, payload) => {
  const body = await request(
    `phieu-quy/${idPhieu}/huy-nop`,
    { method: "POST", body: JSON.stringify(payload) },
    "Không hủy nộp được phiếu quý",
  );
  return unwrapItem(body) || body;
};

export const fetchPendingPhieuQuy = async (params) => {
  const body = await request(
    `phieu-quy/tp/pending${query(params)}`,
    undefined,
    "Không tải được hàng đợi duyệt quý",
  );
  return {
    items: unwrapItems(body),
    total:
      body?.TotalCount ?? body?.Total ?? body?.TotalItems ?? unwrapItems(body).length,
  };
};

export const duyetPhieuQuy = async (idPhieu, payload) =>
  request(
    `phieu-quy/${idPhieu}/tp/duyet`,
    { method: "POST", body: JSON.stringify(payload) },
    "Không duyệt được phiếu quý",
  );

export const traVePhieuQuy = async (idPhieu, payload) =>
  request(
    `phieu-quy/${idPhieu}/tp/tra-ve`,
    { method: "POST", body: JSON.stringify(payload) },
    "Không trả được phiếu quý",
  );

export const fetchTongHopPhieuQuy = async (params) =>
  request(
    `phieu-quy/tong-hop${query(params)}`,
    undefined,
    "Không tải được tổng hợp bốn quý",
  );

export const tongHopPhieuNamTuQuy = async (idPhieu, rowVersion) =>
  request(
    `phieu/${idPhieu}/tong-hop-tu-quy`,
    { method: "POST", body: JSON.stringify({ RowVersion: rowVersion }) },
    "Không tổng hợp được điểm năm từ các quý",
  );

export const uploadMinhChungQuy = async (idChiTiet, file) => {
  const data = new FormData();
  data.append("file", file);
  data.append("tenHienThi", file.name);
  const body = await request(
    `chitiet/${idChiTiet}/minh-chung/file`,
    { method: "POST", body: data },
    "Không tải được tệp minh chứng",
  );
  return unwrapItem(body) || body;
};

export const addLinkMinhChungQuy = async (idChiTiet, duongDan, tenHienThi) => {
  const body = await request(
    `chitiet/${idChiTiet}/minh-chung/link`,
    {
      method: "POST",
      body: JSON.stringify({
        DuongDan: duongDan,
        TenHienThi: tenHienThi || duongDan,
        Loai: 2,
      }),
    },
    "Không thêm được liên kết minh chứng",
  );
  return unwrapItem(body) || body;
};

export const fetchMinhChungQuy = async (idChiTiet) => {
  const body = await request(
    `chitiet/${idChiTiet}/minh-chung`,
    undefined,
    "Không tải được minh chứng",
  );
  return unwrapItems(body);
};

export const deleteMinhChungQuy = async (idMinhChung) =>
  request(
    `minhchung/${idMinhChung}`,
    { method: "DELETE" },
    "Không xóa được minh chứng",
  );

export const downloadMinhChungQuy = async (idMinhChung, fileName) => {
  const response = await apiFetch(`minhchung/${idMinhChung}/tai-ve`);
  if (!response.ok) throw await readApiError(response, "Không tải được minh chứng");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName || "minh-chung";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const fetchPhieuNamCuaToi = async ({ idNam, idDonVi }) => {
  const body = await request(
    `phieu/me/${idNam}${query({ kemLichSu: true, idDonVi })}`,
    undefined,
    "Không tải được phiếu năm",
  );
  return unwrapItem(body);
};

export const createPhieuNam = async (payload) => {
  const body = await request(
    "phieu",
    { method: "POST", body: JSON.stringify(payload) },
    "Không tạo được phiếu năm",
  );
  return unwrapItem(body);
};

export const submitPhieuNam = async (idPhieu, rowVersion) => {
  const body = await request(
    `phieu/${idPhieu}/submit`,
    { method: "POST", body: JSON.stringify({ RowVersion: rowVersion }) },
    "Không nộp được phiếu năm",
  );
  return unwrapItem(body) || body;
};

export const queryStringPhieuQuy = query;
