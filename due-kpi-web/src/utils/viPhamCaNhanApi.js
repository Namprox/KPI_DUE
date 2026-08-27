/**
 * Vi phạm của CHÍNH người đăng nhập - lớp đọc cho màn hình cá nhân.
 *
 * Dùng lại GET /viphamgiangday (xem docs/openapi.yaml). Endpoint có thu hẹp phạm
 * vi theo vai trò, nhưng chỉ với người dùng thường: TK/TKL/TP để trống idNhanVien
 * sẽ nhận vi phạm của CẢ ĐƠN VỊ, HT/ADMIN nhận toàn trường. Vì vậy màn hình cá
 * nhân LUÔN gửi idNhanVien = id của chính mình - cách gọi này đúng cho mọi chức
 * vụ, kể cả giảng viên thường.
 *
 * Phần tóm tắt lấy từ GET /vi-pham/tong-hop-giang-vien?idNam&idNhanVien - chính
 * con số server dùng khi chấm KPI, nên không có nguy cơ lệch với phiếu. Endpoint
 * này không ghi rõ có mở cho giảng viên thường hay không, nên khi nó lỗi/403 thì
 * tự cộng lại tại client theo đúng công thức MIN(tổng điểm trừ, 15) thay vì bỏ
 * trống ô tóm tắt.
 */

import { apiFetch } from "./api";
import { readApiError } from "./apiError";
import { parseNgay } from "./phieuApi";

/** Trần điểm trừ vi phạm của một cá nhân trong một năm (theo API tổng hợp). */
export const TRAN_DIEM_TRU_CA_NHAN = 15;

/**
 * Danh sách vi phạm của người đăng nhập trong một năm.
 *
 * idNhanVien là BẮT BUỘC: thiếu nó, tài khoản trưởng đơn vị / cấp Trường sẽ thấy
 * vi phạm của người khác trên màn hình "của tôi".
 *
 * @param {{idNam?: number|string, idNhanVien: number|string}} params
 * @returns {Promise<object[]>} ViPhamGiangDayDto[]
 */
export const fetchViPhamCuaToi = async ({ idNam, idNhanVien } = {}) => {
  if (idNhanVien == null || idNhanVien === "") {
    throw new Error("Thiếu thông tin nhân viên của tài khoản đăng nhập");
  }

  const params = new URLSearchParams();
  if (idNam) params.set("idNam", idNam);
  params.set("idNhanVien", idNhanVien);
  const response = await apiFetch(`viphamgiangday?${params.toString()}`);

  if (!response.ok) {
    const info = await readApiError(
      response,
      "Không tải được danh sách vi phạm",
    );
    const error = new Error(info.message);
    error.status = response.status;
    throw error;
  }

  const result = await response.json();
  return result.Items || (Array.isArray(result) ? result : []);
};

/**
 * Dòng tổng hợp điểm trừ của chính người đăng nhập trong một năm.
 *
 * Trả null khi server không cho gọi hoặc chưa có dữ liệu - nơi gọi sẽ tự cộng
 * lại từ danh sách chi tiết, KHÔNG coi đây là lỗi của cả trang.
 *
 * @param {{idNam?: number|string, idNhanVien: number|string}} params
 * @returns {Promise<object|null>} ViPhamTongHopGiangVienDto
 */
export const fetchTongHopViPhamCuaToi = async ({ idNam, idNhanVien } = {}) => {
  if (!idNam || idNhanVien == null || idNhanVien === "") return null;

  const params = new URLSearchParams({ idNam, idNhanVien });
  const response = await apiFetch(
    `vi-pham/tong-hop-giang-vien?${params.toString()}`,
  );
  if (!response.ok) return null;

  const result = await response.json();
  const items = result.Items || (Array.isArray(result) ? result : []);
  // Đã lọc theo idNhanVien nhưng vẫn khớp lại id: endpoint trả mảng, không phải 1 dòng
  return (
    items.find((r) => String(r.IdNhanVien) === String(idNhanVien)) ||
    items[0] ||
    null
  );
};

const soHoacKhong = (value) => {
  const so = Number(value);
  return Number.isFinite(so) ? so : 0;
};

/**
 * Tóm tắt điểm trừ của một năm.
 *
 * Ưu tiên số của server (tongHopServer) vì đó là con số thực sự vào KPI; thiếu
 * nó mới cộng lại từ danh sách chi tiết. SoBiKyLuat luôn đếm ở client - endpoint
 * tổng hợp không trả trường này.
 *
 * Trả cả điểm thô lẫn điểm sau trần để màn hình nói rõ khi người dùng đã chạm
 * trần - nếu chỉ hiện số sau trần, họ sẽ tưởng bảng bên dưới cộng sai.
 *
 * @param {object[]} danhSach       ViPhamGiangDayDto[]
 * @param {object|null} tongHopServer ViPhamTongHopGiangVienDto
 */
export const tongHopViPham = (danhSach = [], tongHopServer = null) => {
  const tongTuDanhSach = danhSach.reduce(
    (tong, vp) => tong + soHoacKhong(vp.DiemTru),
    0,
  );
  const tongDiemTruTho = tongHopServer
    ? soHoacKhong(tongHopServer.TongDiemTruTho)
    : tongTuDanhSach;
  const diemTruCaNhan = tongHopServer
    ? soHoacKhong(tongHopServer.DiemTruCaNhan)
    : Math.min(tongTuDanhSach, TRAN_DIEM_TRU_CA_NHAN);

  return {
    soViPham: tongHopServer
      ? soHoacKhong(tongHopServer.SoViPham)
      : danhSach.length,
    soBiKyLuat: danhSach.filter((vp) => vp.BiKyLuat).length,
    tongDiemTruTho,
    diemTruCaNhan,
    chamTran: tongDiemTruTho > diemTruCaNhan,
  };
};

/** Gom theo nhóm vi phạm, sắp giảm dần theo điểm trừ để nhóm nặng nhất lên đầu. */
export const nhomTheoNhomViPham = (danhSach = []) => {
  const map = new Map();
  danhSach.forEach((vp) => {
    // Bản ghi cũ có thể chưa gắn loại vi phạm (IdLoaiViPham null) nên không có nhóm
    const ten = vp.TenNhom || "Chưa phân loại";
    const cu = map.get(ten) || { tenNhom: ten, soViPham: 0, diemTru: 0 };
    cu.soViPham += 1;
    cu.diemTru += soHoacKhong(vp.DiemTru);
    map.set(ten, cu);
  });
  return [...map.values()].sort((a, b) => b.diemTru - a.diemTru);
};

/** Mới nhất lên đầu: ưu tiên ngày vi phạm, thiếu thì lấy ngày ghi nhận. */
export const sapXepMoiNhat = (danhSach = []) => {
  const moc = (vp) => {
    const d = parseNgay(vp.NgayViPham) || parseNgay(vp.NgayGhiNhan);
    return d ? d.getTime() : 0;
  };
  return [...danhSach].sort((a, b) => moc(b) - moc(a));
};
