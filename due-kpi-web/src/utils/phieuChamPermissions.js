/**
 * "Ô nhập điểm của tiêu chí này có được mở cho tôi không?"
 *
 * Quy tắc server (PUT api/chitiet/{id}/diem-khoa):
 *  - Tiêu chí CÓ dòng trong `tieu_chi_don_vi_cham` → chỉ trưởng (TK/TKL/TP) của
 *    đúng các đơn vị đó được chấm.
 *  - Tiêu chí KHÔNG có dòng nào → mặc định trưởng đơn vị chủ quản của phiếu
 *    (hoặc đơn vị cha) được chấm.
 *
 * Từ quy trình 4 giai đoạn, điều kiện "đúng bước" tính theo TỪNG DÒNG
 * (`TrangThaiDong`), KHÔNG theo trạng thái hồ sơ nữa: một dòng vẫn thẩm định
 * được kể cả khi hồ sơ đã ở trạng thái 3, và ngược lại hồ sơ ở trạng thái 2
 * không có nghĩa là mọi dòng đều mở.
 *
 * Đây CHỈ là lớp gợi ý UI để disable ô nhập thay vì để người dùng gõ xong mới
 * ăn 403. Server vẫn kiểm tra lại - không được coi đây là hàng rào bảo mật.
 */

import { normalizeRole, ROLE } from "./roles";
import { buildDonViIndex } from "./viPhamPermissions";
import { TRANG_THAI_DONG, laTieuChiChamTay } from "./phieuApi";

const ROLE_TRUONG_DON_VI = ["TK", "TKL", "TP"];

/** Trưởng Phòng cũng thẩm định được - họ được giao tiêu chí qua bảng phân quyền. */
export const laTruongDonVi = (user) =>
  ROLE_TRUONG_DON_VI.includes(normalizeRole(user));

/**
 * Trưởng Phòng chỉ được giao đúng vài tiêu chí trong hồ sơ nên màn hình của họ
 * vốn đã là danh sách việc phải làm - không cần lọc thêm. Dùng để tắt các lớp
 * điều hướng chỉ có ích cho người nhìn cả phiếu.
 */
export const laTruongPhong = (user) =>
  normalizeRole(user) === ROLE.TRUONG_PHONG;

const ROLE_TRUONG_KHOA = ["TK", "TKL"];

/**
 * Riêng các thao tác giai đoạn 3–4 (chốt hồ sơ, trả dòng về đơn vị thẩm định,
 * đóng gói và trình tờ trình) là thẩm quyền của TRƯỞNG KHOA. Trưởng Phòng nằm
 * ngoài - gọi các endpoint đó sẽ nhận 403.
 */
export const laTruongKhoa = (user) =>
  ROLE_TRUONG_KHOA.includes(normalizeRole(user));

/**
 * `idCha` có phải chính nó hoặc tổ tiên của `idCon` không (đi ngược IdDonViCha).
 * Giới hạn 6 bước để dữ liệu bẩn tạo vòng lặp không treo trình duyệt.
 */
export const laDonViChaHoacChinhNo = (idCha, idCon, donViIndex) => {
  if (idCha == null || idCon == null) return false;
  if (String(idCha) === String(idCon)) return true;
  if (!donViIndex) return false;

  let current = donViIndex.get(Number(idCon)) || donViIndex.get(idCon);
  const seen = new Set();
  let hop = 0;
  while (current && hop < 6) {
    if (seen.has(current.IdDonVi)) return false;
    seen.add(current.IdDonVi);
    if (current.IdDonViCha == null) return false;
    if (String(current.IdDonViCha) === String(idCha)) return true;
    current = donViIndex.get(current.IdDonViCha);
    hop += 1;
  }
  return false;
};

/**
 * Gom danh sách phân quyền phẳng thành Map(idTieuChi → Set(idDonVi)).
 * @param {object[]} rows TieuChiDonViChamDto[] lấy theo idMau của phiếu
 */
export const buildPhanQuyenChamIndex = (rows = []) => {
  const map = new Map();
  rows.forEach((row) => {
    if (!row || row.IdTieuChi == null) return;
    const key = Number(row.IdTieuChi);
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(Number(row.IdDonVi));
  });
  return map;
};

/**
 * Tôi có được chấm tiêu chí này không (chưa xét trạng thái phiếu).
 *
 * @param {object} chiTiet   ChiTietDanhGiaDto
 * @param {object} ctx
 * @param {object} ctx.user       người đăng nhập
 * @param {object} ctx.phieu      phiếu đang mở (cần IdDonVi = đơn vị chủ quản)
 * @param {Map}    ctx.phanQuyen  Map(idTieuChi → Set(idDonVi))
 * @param {Map}    ctx.donViIndex Map(idDonVi → DonViDto)
 */
export const duocChamTieuChi = (
  chiTiet,
  { user, phieu, phanQuyen, donViIndex },
) => {
  if (!chiTiet || !user || !laTruongDonVi(user)) return false;
  if (user.IdDonVi == null) return false;

  const daPhanQuyen = phanQuyen?.get(Number(chiTiet.IdTieuChi));
  if (daPhanQuyen && daPhanQuyen.size > 0) {
    return daPhanQuyen.has(Number(user.IdDonVi));
  }

  // Không phân quyền riêng → đơn vị chủ quản phiếu (hoặc đơn vị cha) chấm.
  return laDonViChaHoacChinhNo(user.IdDonVi, phieu?.IdDonVi, donViIndex);
};

/**
 * Tên đơn vị ĐƯỢC GIAO thẩm định tiêu chí - để nói thẳng "ai chấm" thay vì
 * "đơn vị khác". Theo đúng thứ tự ưu tiên của server: có dòng trong
 * `tieu_chi_don_vi_cham` thì lấy các đơn vị đó (một tiêu chí có thể giao cho
 * nhiều đơn vị → nối bằng dấu phẩy), không có dòng nào thì rơi về đơn vị chủ
 * quản của phiếu.
 *
 * Khác `chiTiet.TenDonViThamDinh`: cột đó là đơn vị ĐÃ chấm, chỉ có sau khi dòng
 * được chấm; hàm này trả lời được cả khi dòng còn trống.
 *
 * Trả null khi thiếu dữ liệu đơn vị - bên gọi phải có câu chữ dự phòng.
 */
export const tenDonViDuocGiaoCham = (
  chiTiet,
  { phieu, phanQuyen, donViIndex } = {},
) => {
  const tenTheoId = (id) => {
    if (id == null) return null;
    const donVi = donViIndex?.get(Number(id)) ?? donViIndex?.get(id);
    return donVi?.TenDonVi || null;
  };

  const daPhanQuyen = phanQuyen?.get(Number(chiTiet?.IdTieuChi));
  if (daPhanQuyen && daPhanQuyen.size > 0) {
    const ten = [...daPhanQuyen].map(tenTheoId).filter(Boolean);
    return ten.length > 0 ? ten.join(", ") : null;
  }

  return tenTheoId(phieu?.IdDonVi) || phieu?.TenDonVi || null;
};

/**
 * Ô nhập điểm mở khi: DÒNG đang ở bước chờ thẩm định, tiêu chí chấm tay, và tôi
 * được giao tiêu chí đó.
 */
export const oNhapDiemMo = (chiTiet, ctx) =>
  Number(chiTiet?.TrangThaiDong) === TRANG_THAI_DONG.CHO_THAM_DINH &&
  laTieuChiChamTay(chiTiet) &&
  duocChamTieuChi(chiTiet, ctx);

/** Lý do tiếng Việt để hiện cạnh ô bị khóa - giúp người dùng khỏi đoán. */
export const lyDoKhoaONhap = (chiTiet, ctx) => {
  if (!laTieuChiChamTay(chiTiet)) {
    return "Tiêu chí này do hệ thống tính điểm tự động, không chấm tay.";
  }
  const trangThaiDong = Number(chiTiet?.TrangThaiDong);
  if (trangThaiDong === TRANG_THAI_DONG.KE_KHAI) {
    return "Tiêu chí đang chờ giảng viên kê khai / bổ sung, chưa tới lượt thẩm định.";
  }
  if (trangThaiDong === TRANG_THAI_DONG.DA_CHOT) {
    return "Tiêu chí đã chốt điểm chính thức. Chỉ Trưởng khoa mới trả về thẩm định lại được.";
  }
  if (!laTruongDonVi(ctx?.user)) {
    return "Chỉ trưởng đơn vị (TK/TKL/TP) mới được thẩm định tiêu chí.";
  }
  const tenDonVi = tenDonViDuocGiaoCham(chiTiet, ctx);
  return tenDonVi
    ? `Tiêu chí này được giao cho ${tenDonVi} thẩm định.`
    : "Tiêu chí này được giao cho đơn vị khác thẩm định.";
};

/**
 * Xếp mỗi dòng vào đúng MỘT rổ việc, để màn hình chấm lọc/gom nhóm mà không phải
 * tự suy diễn lại luật. Thứ tự if bên dưới là thứ tự ưu tiên, đừng đảo:
 *
 *  - TU_DONG xét TRƯỚC hết. Engine chấm tự động chạy ngay trong giao dịch nộp
 *    phiếu và đẩy dòng LoaiNguonDiem = 2 lên thẳng trang_thai_dong = 3, nên nếu
 *    để DA_CHOT đứng trước thì rổ này luôn rỗng - chip lọc không bao giờ hiện và
 *    không có lối nào xem riêng phần máy tính. Đổi lại, rổ DA_CHOT chỉ còn dòng
 *    CHẤM TAY đã xong, đúng bằng mẫu số của tinhTienDoCham.
 *  - DA_CHOT đứng trước hai rổ chờ: dòng đã chốt không còn là việc của ai nữa.
 *  - Còn lại là CHO_THAM_DINH: của tôi (ô nhập mở) hay của đơn vị khác.
 */
export const RO_VIEC = {
  CAN_XU_LY: "canXuLy",
  DON_VI_KHAC: "donViKhac",
  CHO_GV: "choGv",
  DA_CHOT: "daChot",
  TU_DONG: "tuDong",
};

export const RO_VIEC_META = {
  [RO_VIEC.CAN_XU_LY]: { nhan: "Cần xử lý", icon: "fa-pen-to-square" },
  [RO_VIEC.DON_VI_KHAC]: { nhan: "Chờ đơn vị khác", icon: "fa-hourglass-half" },
  [RO_VIEC.CHO_GV]: { nhan: "Chờ giảng viên bổ sung", icon: "fa-rotate-left" },
  [RO_VIEC.DA_CHOT]: { nhan: "Đã chốt", icon: "fa-circle-check" },
  // Gọi đúng tên cái pill trên thẻ tiêu chí ("Điểm tự động") để người dùng nối
  // được chip lọc với dòng họ đang nhìn.
  [RO_VIEC.TU_DONG]: { nhan: "Điểm tự động", icon: "fa-robot" },
};

export const phanLoaiDongCham = (chiTiet, ctx) => {
  if (!laTieuChiChamTay(chiTiet)) return RO_VIEC.TU_DONG;
  const trangThaiDong = Number(chiTiet?.TrangThaiDong);
  if (trangThaiDong === TRANG_THAI_DONG.DA_CHOT) return RO_VIEC.DA_CHOT;
  if (trangThaiDong === TRANG_THAI_DONG.KE_KHAI) return RO_VIEC.CHO_GV;
  return oNhapDiemMo(chiTiet, ctx) ? RO_VIEC.CAN_XU_LY : RO_VIEC.DON_VI_KHAC;
};

/**
 * Trưởng khoa có trả được dòng này về đơn vị thẩm định không.
 * Chỉ dòng ĐÃ CHỐT mới trả lại được, và chỉ tiêu chí chấm tay.
 */
export const traThamDinhDuoc = (chiTiet, ctx) =>
  laTruongKhoa(ctx?.user) &&
  laTieuChiChamTay(chiTiet) &&
  Number(chiTiet?.TrangThaiDong) === TRANG_THAI_DONG.DA_CHOT;

/**
 * Tiêu chí nào được HIỂN THỊ trên màn hình thẩm định.
 *
 * Trưởng khoa (TK/TKL) chịu trách nhiệm chốt cả hồ sơ nên phải xem hết, kể cả
 * phần đơn vị khác thẩm định. Trưởng phòng chỉ tham gia đúng các tiêu chí được
 * giao qua `tieu_chi_don_vi_cham` - hiện cả phiếu vừa gây nhiễu vừa để lọt điểm
 * và nhận xét của đơn vị khác.
 *
 * Đây là lọc HIỂN THỊ, không phải hàng rào bảo mật: dữ liệu đầy đủ vẫn nằm
 * trong response của server.
 */
export const locTieuChiHienThi = (chiTietList = [], ctx) => {
  if (!laTruongPhong(ctx?.user)) return chiTietList;
  return chiTietList.filter((ct) => duocChamTieuChi(ct, ctx));
};

/** Dựng sẵn context dùng chung cho cả màn hình chấm. */
export const buildChamContext = ({
  user,
  phieu,
  phanQuyenRows,
  donViList,
}) => ({
  user,
  phieu,
  phanQuyen: buildPhanQuyenChamIndex(phanQuyenRows),
  donViIndex: buildDonViIndex(donViList),
});

/**
 * Tiến độ thẩm định: đếm trên tiêu chí CHẤM TAY.
 * `cuaToi` = phần việc của đơn vị đang đăng nhập; `toanPhieu` = mọi đơn vị -
 * hồ sơ chỉ tự lên Trưởng khoa khi `toanPhieu` đủ, nên cần hiện cả hai.
 *
 * Đếm theo TrangThaiDong = DA_CHOT, KHÔNG theo `DiemKhoa != null`: một dòng bị
 * trả về vẫn còn DiemKhoa của vòng trước, đếm theo cột đó sẽ báo nhầm "đã xong"
 * trong khi đơn vị vẫn phải xử lý nó.
 */
export const tinhTienDoCham = (chiTietList = [], ctx) => {
  const chamTay = chiTietList.filter(laTieuChiChamTay);
  const cuaToi = chamTay.filter((ct) => duocChamTieuChi(ct, ctx));
  const daChot = (list) =>
    list.filter((ct) => Number(ct.TrangThaiDong) === TRANG_THAI_DONG.DA_CHOT)
      .length;

  return {
    toanPhieu: { tong: chamTay.length, xong: daChot(chamTay) },
    cuaToi: { tong: cuaToi.length, xong: daChot(cuaToi) },
  };
};
