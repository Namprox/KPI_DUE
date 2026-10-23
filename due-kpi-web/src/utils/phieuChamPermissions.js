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

import {
  coQuyenTaiDonVi,
  donViTheoVaiTro,
  ROLE,
  ROLE_SETS,
  VAI_TRO_TRUONG_PHONG,
  hasRole,
} from "./roles";
import { buildDonViIndex } from "./viPhamPermissions";
import { TRANG_THAI_DONG, laTieuChiChamTay } from "./phieuApi";

const ROLE_TRUONG_DON_VI = ROLE_SETS.TRUONG_DON_VI;

/** Trưởng Phòng cũng thẩm định được - họ được giao tiêu chí qua bảng phân quyền. */
export const laTruongDonVi = (user) =>
  hasRole(ROLE_TRUONG_DON_VI, user);

/**
 * Trưởng Phòng chỉ được giao đúng vài tiêu chí trong hồ sơ nên màn hình của họ
 * vốn đã là danh sách việc phải làm - không cần lọc thêm. Dùng để tắt các lớp
 * điều hướng chỉ có ích cho người nhìn cả phiếu.
 */
export const laTruongPhong = (user) =>
  hasRole(VAI_TRO_TRUONG_PHONG, user);

const ROLE_TRUONG_KHOA = ["TK", "TKL"];

/**
 * Riêng các thao tác giai đoạn 3–4 (chốt hồ sơ, trả dòng về đơn vị thẩm định,
 * đóng gói và trình tờ trình) là thẩm quyền của TRƯỞNG KHOA. Trưởng Phòng nằm
 * ngoài - gọi các endpoint đó sẽ nhận 403.
 */
export const laTruongKhoa = (user) =>
  hasRole(ROLE_TRUONG_KHOA, user);

/**
 * Danh sách Phòng / Trung tâm mà tôi đang là Trưởng phòng.
 *
 * Dùng để dựng bộ lọc đơn vị của màn hình chốt hồ sơ nhân viên. Một người có thể
 * là TP ở NHIỀU đơn vị (kiêm nhiệm), và mỗi đơn vị là một hàng đợi riêng biệt:
 * khóa phiếu là `uq_phieu_unique (id_nam, id_nhan_vien, id_don_vi)` nên cùng một
 * người có thể có hai phiếu trong cùng một năm.
 *
 * Trả mảng RỖNG với HT/Admin - họ có hiệu lực toàn hệ thống chứ không giữ chức
 * vụ TP ở đâu cả. Xem donViTheoVaiTro() để biết vì sao đó là câu trả lời đúng.
 */
export const phongToiPhuTrach = (user) =>
  donViTheoVaiTro(VAI_TRO_TRUONG_PHONG, user);

/**
 * Tôi có phải Trưởng phòng CỦA ĐÚNG đơn vị chủ quản hồ sơ này không?
 *
 * KHÁC laTruongPhong(user) ở trên: hàm kia chỉ xét có chức vụ TP nên trả
 * true cho một TP đang mở hồ sơ của Phòng KHÁC - đủ để lọc danh sách tiêu chí
 * hiển thị, KHÔNG đủ để bật nút chốt hồ sơ. Ở đây điều kiện phải là cặp (đơn vị,
 * chức vụ) trên CÙNG MỘT DÒNG user.DonVi[], đúng bằng luật server gác
 * POST phieu/{id}/khoa/duyet-ho-so: "truong don vi CHU QUAN cua ho so ... trong
 * pham vi cay don vi cua minh".
 *
 * TK/TKL chốt hồ sơ qua màn hình /quan-ly/duyet-ho-so riêng.
 *
 * Admin nhận false (ROLE.ADMIN không nằm trong tập truyền vào coQuyenTaiDonVi
 * nên đường tắt của hàm đó không kích hoạt) - với Admin màn hình chốt chạy ở chế
 * độ chỉ xem. Có chủ đích, xem ROLE_SETS.DUYET_HO_SO_NHAN_VIEN.
 *
 * Vẫn chỉ là lớp gợi ý UI - server kiểm tra lại và trả 403.
 */
export const laTruongPhongCuaPhieu = (user, phieu) =>
  coQuyenTaiDonVi(VAI_TRO_TRUONG_PHONG, phieu?.IdDonVi, user);

/**
 * Phiếu đang mở có phải của chính người đăng nhập không.
 *
 * Người được PHÂN CÔNG thẩm định (phó / thư ký) không được thao tác trên phiếu
 * của chính mình - server trả 403 TU_THAM_DINH. Trưởng đơn vị không bị luật này.
 */
export const laPhieuCuaToi = (user, phieu) =>
  user?.IdNhanVien != null && phieu?.IdNhanVien != null &&
  Number(user.IdNhanVien) === Number(phieu.IdNhanVien);

export const THONG_BAO_TU_THAM_DINH =
  "Bạn được phân công thẩm định nên không được duyệt tiêu chí trên phiếu của chính mình.";

/**
 * Phó / thư ký cấp KHOA được phân công thì nhìn cả phiếu như Trưởng khoa; phó
 * phòng / thư ký phòng chỉ nhìn phần đơn vị mình được giao như Trưởng phòng.
 * Phân biệt bằng chức vụ người đó giữ TẠI đơn vị được phân công.
 */
const VAI_TRO_PHO_THU_KY_KHOA = [ROLE.PHO_TRUONG_KHOA, ROLE.PHO_TRUONG_KHOA_LON, ROLE.THU_KY_KHOA];

const coPhanCong = (ctx) => (ctx?.phanCong || []).length > 0;

/**
 * Các đơn vị mà tôi thẩm định THAY MẶT trên phiếu này: đơn vị đang làm trưởng,
 * cộng đơn vị được phân công (`DuocGiao[]` của GET phan-cong-tham-dinh/quyen) -
 * trừ khi đây là phiếu của chính tôi.
 */
const donViThamDinh = ({ user, phieu, phanCong } = {}) => {
  const truong = laTruongDonVi(user) ? donViTheoVaiTro(ROLE_TRUONG_DON_VI, user) : [];
  return laPhieuCuaToi(user, phieu) ? truong : [...truong, ...(phanCong || [])];
};

/**
 * Danh sách tiêu chí có bị cắt còn đúng phần đơn vị tôi được giao không.
 * Trưởng khoa và người được phân công ở Khoa nhìn cả phiếu; Trưởng phòng và
 * người được phân công ở Phòng thì bị cắt (xem locTieuChiHienThi).
 */
export const chiThayPhanDuocGiao = (ctx) => {
  const { user, phanCong } = ctx || {};
  if (laTruongKhoa(user)) return false;
  if ((phanCong || []).some((pc) => coQuyenTaiDonVi(VAI_TRO_PHO_THU_KY_KHOA, pc.IdDonVi, user))) return false;
  return laTruongPhong(user) || coPhanCong(ctx);
};

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
 * @param {object[]} [ctx.phanCong] DuocGiao[] - đơn vị tôi được phân công thẩm định
 */
export const duocChamTieuChi = (
  chiTiet,
  { user, phieu, phanQuyen, donViIndex, phanCong },
) => {
  if (!chiTiet || !user) return false;
  const donViPhuTrach = donViThamDinh({ user, phieu, phanCong });
  if (donViPhuTrach.length === 0) return false;

  const daPhanQuyen = phanQuyen?.get(Number(chiTiet.IdTieuChi));
  if (daPhanQuyen && daPhanQuyen.size > 0) {
    return donViPhuTrach.some((dv) => daPhanQuyen.has(Number(dv.IdDonVi)));
  }

  // Không phân quyền riêng → đơn vị chủ quản phiếu (hoặc đơn vị cha) chấm.
  return donViPhuTrach.some((dv) =>
    laDonViChaHoacChinhNo(dv.IdDonVi, phieu?.IdDonVi, donViIndex));
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
  if (!laTruongDonVi(ctx?.user) && coPhanCong(ctx) && laPhieuCuaToi(ctx?.user, ctx?.phieu)) {
    return THONG_BAO_TU_THAM_DINH;
  }
  if (!laTruongDonVi(ctx?.user) && !coPhanCong(ctx)) {
    return "Chỉ trưởng đơn vị hoặc người được phân công mới được thẩm định tiêu chí.";
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
 *
 * Giai đoạn 3 không bao giờ mở cho người được phân công. `laTruongDonViServer`
 * (LaTruongDonVi của GET phan-cong-tham-dinh/quyen) = false thì ẩn luôn dù token
 * còn ghi chức vụ trưởng - CSDL mới là nguồn đúng.
 */
export const traThamDinhDuoc = (chiTiet, ctx) =>
  laTruongKhoa(ctx?.user) &&
  ctx?.laTruongDonViServer !== false &&
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
  if (!chiThayPhanDuocGiao(ctx)) return chiTietList;
  // Người được phân công mở phiếu của CHÍNH mình thì duocChamTieuChi luôn false;
  // cắt theo nó sẽ ra trang trống - bày cả phiếu ở chế độ chỉ đọc.
  if (!laTruongDonVi(ctx?.user) && laPhieuCuaToi(ctx?.user, ctx?.phieu)) return chiTietList;
  return chiTietList.filter((ct) => duocChamTieuChi(ct, ctx));
};

/**
 * Dựng sẵn context dùng chung cho cả màn hình chấm.
 * `quyenThamDinh` là GET phan-cong-tham-dinh/quyen; null (chưa tải / lỗi) thì
 * chỉ còn quyền theo chức vụ trưởng trong token như trước.
 */
export const buildChamContext = ({
  user,
  phieu,
  phanQuyenRows,
  donViList,
  quyenThamDinh,
}) => ({
  user,
  phieu,
  phanQuyen: buildPhanQuyenChamIndex(phanQuyenRows),
  donViIndex: buildDonViIndex(donViList),
  phanCong: quyenThamDinh?.DuocGiao || [],
  laTruongDonViServer: quyenThamDinh ? quyenThamDinh.LaTruongDonVi === true : null,
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
