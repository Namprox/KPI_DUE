/**
 * Phần nghiệp vụ RIÊNG của phiếu KPI Phòng / Trung tâm (mẫu `loai_doi_tuong = 4`).
 *
 * Phòng/TT và Khoa dùng CHUNG bảng, chung stored procedure, chung controller và
 * chung phieuDonViApi.js. Chỉ bốn điểm dưới đây rẽ nhánh theo loại mẫu, và cả bốn
 * đều nằm trong file này:
 *
 *   1. Suy mẫu từ mã đơn vị   K_* và TNNCN ra mẫu Khoa, còn lại ra mẫu Phòng/TT
 *   2. Nhóm tiêu chí          Khoa tách Nhóm A (cơ bản) / B (vượt trội);
 *                             Phòng/TT khai `loai_nhom = NULL` - nhóm chỉ để gom mục
 *   3. Tổng tích lũy          Khoa = cơ bản + vượt trội;
 *                             Phòng/TT = SUM phẳng mọi dòng
 *   4. Ngưỡng xếp loại        Khoa 95/80/60; Phòng/TT 80/60/50
 *
 * Server nhận diện loại mẫu qua `sp_phieu_dv_tinh_tong_diem` (trả `@loai_doi_tuong`
 * lấy từ `mau_danh_gia`), KHÔNG đoán từ tên đơn vị. Client không có giá trị đó
 * trong DTO phiếu nên phải suy từ mã đơn vị - xem laDonViPhongTrungTam().
 */

import { normalizeRole, coQuyenTaiDonVi, ROLE } from "./roles";
import { diemHieuLucCuaDong, TRANG_THAI_DV } from "./phieuDonViApi";

/* ------------------------------------------------------------------ */
/* Nhận diện đơn vị Phòng / Trung tâm                                  */
/* ------------------------------------------------------------------ */

/**
 * Đơn vị này dùng mẫu Phòng/TT (loại 4) hay mẫu Khoa (loại 3)?
 *
 * Chép đúng quy tắc backend dùng khi suy mẫu lúc lập phiếu: Khoa là `K_*` hoặc
 * `TNNCN`, TẤT CẢ mã còn lại là Phòng/Trung tâm. Đây là nơi DUY NHẤT khai quy
 * tắc này ở phía client - đổi quy ước mã đơn vị thì sửa ở đây, đừng rải
 * `startsWith('K_')` ra các màn hình.
 *
 * Mã rỗng trả false: thà bỏ sót một đơn vị chưa rõ mã còn hơn kéo nhầm phiếu
 * Khoa vào màn hình Phòng.
 */
export const laDonViPhongTrungTam = (maDonVi) => {
  const ma = String(maDonVi || "")
    .trim()
    .toUpperCase();
  if (!ma) return false;
  return !(ma.startsWith("K_") || ma === "TNNCN");
};

/* ------------------------------------------------------------------ */
/* Xếp loại                                                            */
/* ------------------------------------------------------------------ */

/**
 * Ngưỡng của `XepLoaiCalculator.TinhXepLoaiPhongTrungTam`, được `sp_phieu_dv_chot`
 * kiểm lại lần nữa. KHÁC hẳn thang của Khoa (95/80/60) - đừng dùng lẫn.
 */
export const NGUONG_XEP_LOAI_PHONG = {
  HOAN_THANH: 50,
  TOT: 60,
  XUAT_SAC: 80,
};

/** Diễn giải điều kiện của từng mức, để UI khỏi chép lại quy chế ở nhiều chỗ. */
export const MO_TA_XEP_LOAI_PHONG = {
  1: `Dưới ${NGUONG_XEP_LOAI_PHONG.HOAN_THANH} điểm. Cũng áp dụng khi tập thể lãnh đạo bị kỷ luật, hoặc đơn vị có vụ việc tham nhũng / lãng phí / tiêu cực bị xử lý.`,
  2: `Từ ${NGUONG_XEP_LOAI_PHONG.HOAN_THANH} đến ${NGUONG_XEP_LOAI_PHONG.TOT} điểm, kèm điều kiện chung: nội bộ đoàn kết, chấp hành tốt quy định, không có thành viên lãnh đạo bị kỷ luật.`,
  3: `Trên ${NGUONG_XEP_LOAI_PHONG.TOT} điểm. Đây là mức cao nhất hệ thống tự tính được.`,
  4: `Trên ${NGUONG_XEP_LOAI_PHONG.XUAT_SAC} điểm VÀ nằm trong top 20% các phòng/TT hoàn thành tốt có điểm cao nhất. Hạn ngạch top 20% chưa được tính tự động ở bất kỳ đâu.`,
};

/**
 * Mức xếp loại GỢI Ý tính tại client, để người chốt thấy trước con số.
 *
 * TRẦN LÀ MỨC 3, cùng lý do với tinhXepLoaiGoiY của phiếu cá nhân: mức 4 phụ
 * thuộc hạn ngạch top 20% toàn trường, chỉ xác định được khi đã biết điểm của
 * MỌI phòng/TT. Hàm tự tính vì thế dừng ở mức 3; Hiệu trưởng gửi XepLoai = 4
 * bằng tay khi chốt và tự chịu trách nhiệm vế hạn ngạch.
 *
 * Kết quả CHỈ để hiển thị - server vẫn tự tính lại bằng tổng của chính nó.
 *
 * @returns {number|null} 1..3, hoặc null khi chưa có tổng điểm
 */
export const tinhXepLoaiPhongTrungTam = (tichLuy) => {
  if (tichLuy === null || tichLuy === undefined) return null;
  const diem = Number(tichLuy);
  if (!Number.isFinite(diem)) return null;
  if (diem > NGUONG_XEP_LOAI_PHONG.TOT) return 3;
  if (diem >= NGUONG_XEP_LOAI_PHONG.HOAN_THANH) return 2;
  return 1;
};

/** Mức Hiệu trưởng được chọn tay khi chốt - có cả mức 4, khác XEP_LOAI_KHOA_CHON. */
export const XEP_LOAI_PHONG_CHON = [1, 2, 3, 4];

/* ------------------------------------------------------------------ */
/* Tổng điểm tạm tính                                                  */
/* ------------------------------------------------------------------ */

/**
 * Tổng điểm tạm tính của phiếu Phòng/TT - cộng PHẲNG mọi dòng.
 *
 * Không dùng tinhTongDiemDonViTamTinh của phieuDonViApi: hàm đó tách cơ bản /
 * vượt trội theo `LoaiNhom`, mà mẫu Phòng/TT khai `loai_nhom = NULL` nên mọi dòng
 * bị dồn hết vào vế "cơ bản" - con số ra đúng nhưng nhãn thì sai hẳn nghĩa.
 *
 * VÌ SAO CẦN: ba cột `tong_diem_*` chỉ được server ghi ở bước chốt, nên phiếu
 * đang chấm luôn trả null. Kết quả ở đây CHỈ để hiển thị.
 *
 * @param {object[]} chiTiet dòng chi tiết của phiếu
 * @param {object} [nhapDiem] bản nháp đang gõ, khóa theo IdChiTietDv - có thì
 *   ưu tiên hơn số của server để tổng nhảy theo thời gian thực
 * @param {string} [cap] lớp điểm đang được sửa (xem capChamTheoTrangThai); bản
 *   nháp chỉ được áp vào lớp này
 */
export const tinhTongDiemPhongTamTinh = (chiTiet = [], nhapDiem, cap) => {
  if (!Array.isArray(chiTiet) || chiTiet.length === 0) return null;

  let tichLuy = 0;
  let soDongCoDiem = 0;
  let soDongChuaCoDiem = 0;

  chiTiet.forEach((ct) => {
    const diem = diemDangHienThi(ct, nhapDiem, cap);
    if (diem === null) {
      soDongChuaCoDiem += 1;
      return;
    }
    tichLuy += diem;
    soDongCoDiem += 1;
  });

  return {
    tichLuy,
    soDongCoDiem,
    soDongChuaCoDiem,
    tongSoDong: chiTiet.length,
  };
};

/**
 * Điểm ĐANG hiển thị của một dòng: bản nháp người dùng gõ ở lớp hiện tại nếu có,
 * ngược lại là điểm hiệu lực do server trả.
 *
 * @returns {number|null} null khi dòng chưa có điểm nào - khác hẳn 0 điểm.
 */
export const diemDangHienThi = (ct, nhapDiem, cap) => {
  if (cap && nhapDiem) {
    const nhap = nhapDiem[ct?.IdChiTietDv];
    if (nhap !== undefined) {
      if (nhap === "" || nhap === null) return null;
      const so = Number(nhap);
      return Number.isFinite(so) ? so : null;
    }
  }
  return diemHieuLucCuaDong(ct);
};

/* ------------------------------------------------------------------ */
/* Cấp chấm & quyền thao tác                                           */
/* ------------------------------------------------------------------ */

/** Ba lớp điểm, khớp tên endpoint cấp dòng của chi-tiet-don-vi. */
export const CAP_CHAM = {
  NHAP: "diem-nhap",
  DUYET_DV: "diem-duyet-dv",
  TRUONG: "diem-truong",
};

/** Nhãn cột cho dải ba lớp điểm hiển thị trên mỗi dòng tiêu chí. */
export const NHAN_CAP_CHAM = {
  [CAP_CHAM.NHAP]: "Thư ký",
  [CAP_CHAM.DUYET_DV]: "Trưởng phòng",
  [CAP_CHAM.TRUONG]: "Cấp Trường",
};

/** Trường DTO chứa điểm / nhận xét của từng lớp. */
export const TRUONG_DIEM_CUA_CAP = {
  [CAP_CHAM.NHAP]: { diem: "DiemNhap", nhanXet: "NhanXetNhap" },
  [CAP_CHAM.DUYET_DV]: { diem: "DiemDuyetDv", nhanXet: "NhanXetDuyetDv" },
  [CAP_CHAM.TRUONG]: { diem: "DiemTruong", nhanXet: "NhanXetTruong" },
};

/**
 * Lớp điểm nào đang được sửa ở trạng thái hiện tại của phiếu.
 *
 * Server chốt chặn bằng chính ràng buộc này: gọi diem-duyet-dv khi phiếu còn ở
 * trạng thái 1 sẽ nhận 409 chứ không phải 400.
 *
 * @returns {string|null} null khi phiếu đã khóa (trạng thái 4, 5)
 */
export const capChamTheoTrangThai = (trangThai) => {
  switch (Number(trangThai)) {
    case TRANG_THAI_DV.NHAP:
      return CAP_CHAM.NHAP;
    case TRANG_THAI_DV.CHO_DV_DUYET:
      return CAP_CHAM.DUYET_DV;
    case TRANG_THAI_DV.DV_DA_DUYET:
      return CAP_CHAM.TRUONG;
    default:
      return null;
  }
};

/**
 * Người dùng được làm gì trên phiếu này, theo (trạng thái phiếu × chức vụ).
 *
 * CHỈ để ẩn/hiện nút - server vẫn là chốt chặn cuối cùng và có thể từ chối
 * những gì hàm này cho qua (ví dụ TP của phòng khác, hoặc Admin gọi thao tác mà
 * SP chỉ chấp nhận đúng mã HT).
 *
 * Trưởng phòng phải đúng phòng của phiếu nên xét qua coQuyenTaiDonVi (đối chiếu
 * cặp đơn vị + chức vụ TRÊN CÙNG MỘT DÒNG của user.DonVi[]); cấp Trường không
 * ràng buộc đơn vị nên chỉ xét chức vụ chính.
 */
export const quyenPhieuPhong = (phieu, user) => {
  const trangThai = Number(phieu?.TrangThai);
  const chucVu = normalizeRole(user);

  const laThuKy = coQuyenTaiDonVi([ROLE.THU_KY_PHONG], phieu?.IdDonVi, user);
  const laTruongPhong = coQuyenTaiDonVi(
    [ROLE.TRUONG_PHONG],
    phieu?.IdDonVi,
    user,
  );
  const laCapTruong = chucVu === ROLE.HIEU_TRUONG || chucVu === ROLE.ADMIN;

  return {
    laThuKy,
    laTruongPhong,
    laCapTruong,
    coTheNhap: laThuKy && trangThai === TRANG_THAI_DV.NHAP,
    coTheTrinh: laThuKy && trangThai === TRANG_THAI_DV.NHAP,
    coTheChamDuyetDv: laTruongPhong && trangThai === TRANG_THAI_DV.CHO_DV_DUYET,
    coTheDuyetDv: laTruongPhong && trangThai === TRANG_THAI_DV.CHO_DV_DUYET,
    coTheChamTruong: laCapTruong && trangThai === TRANG_THAI_DV.DV_DA_DUYET,
    coTheDuyetTruong: laCapTruong && trangThai === TRANG_THAI_DV.DV_DA_DUYET,
    coTheChot: laCapTruong && trangThai === TRANG_THAI_DV.TRUONG_DA_DUYET,
    coTheMoLai: laCapTruong && trangThai === TRANG_THAI_DV.HOAN_TAT,
  };
};

/** Người dùng có phần việc đang chờ trên phiếu này không (đổi icon ở bảng danh sách). */
export const coViecCanLam = (phieu, user) => {
  const q = quyenPhieuPhong(phieu, user);
  return (
    q.coTheNhap ||
    q.coTheDuyetDv ||
    q.coTheDuyetTruong ||
    q.coTheChot ||
    q.coTheMoLai
  );
};

/* ------------------------------------------------------------------ */
/* Cây nhóm tiêu chí - MỘT tầng                                        */
/* ------------------------------------------------------------------ */

/**
 * Gom dòng chi tiết thành các mục của biểu mẫu Phòng/TT (I. Thực hiện nhiệm vụ,
 * II. Thi đua / Sáng tạo / ...).
 *
 * Khác hẳn cách dựng của màn hình Khoa: ở đó tầng ngoài là LoaiNhom (A/B) rồi mới
 * tới nhóm con. Mẫu Phòng/TT khai `loai_nhom = NULL` nên tầng ngoài đó không tồn
 * tại - dựng theo nó sẽ đẻ ra một tiêu đề "A - Nhóm các tiêu chí liên quan đến
 * nhiệm vụ cơ bản" bịa hoàn toàn.
 *
 * Thứ tự mục lấy theo `nhomTree` của mẫu (fetchTieuChiTheoMau); nhóm không có
 * trong cây thì xếp sau, theo thứ tự xuất hiện của dòng.
 *
 * @param {object[]} chiTietList
 * @param {Map} tieuChiMap kết quả fetchTieuChiTheoMau, có thuộc tính `nhomTree`
 */
export const dungSectionsPhong = (chiTietList = [], tieuChiMap) => {
  if (!Array.isArray(chiTietList) || chiTietList.length === 0) return [];

  const nhomTree = tieuChiMap?.nhomTree || [];

  // Mẫu lồng hai tầng; với Phòng/TT tầng con thường rỗng nhưng vẫn phải quét cả
  // hai tầng để không bỏ sót mục khi mẫu được khai theo kiểu khác.
  //
  // Tra theo id là chính; tra theo TÊN là lối thoát khi `id_nhom_cha` của dòng
  // không trỏ tới nhóm nào trong cây mẫu (mẫu được clone lại, hoặc dòng gắn vào
  // nhóm con trong khi cây chỉ trả nhóm cha). Thiếu lối thoát này thì mục mất
  // đúng thứ tự và phải lấy tên từ dòng thay vì từ mẫu.
  const tenTheoId = new Map();
  const tenTheoTen = new Map();
  const thuTuTheoId = new Map();
  const thuTuTheoTen = new Map();
  let thuTu = 0;
  const napNhom = (nhom) => {
    if (!nhom) return;
    const ten = String(nhom.TenNhom || "")
      .trim()
      .toLowerCase();
    if (nhom.IdNhom != null && !tenTheoId.has(Number(nhom.IdNhom))) {
      tenTheoId.set(Number(nhom.IdNhom), nhom.TenNhom);
      thuTuTheoId.set(Number(nhom.IdNhom), thuTu);
    }
    if (ten && !tenTheoTen.has(ten)) {
      tenTheoTen.set(ten, nhom.TenNhom);
      thuTuTheoTen.set(ten, thuTu);
    }
    thuTu += 1;
    (nhom.NhomCon || []).forEach(napNhom);
  };
  nhomTree.forEach(napNhom);

  const tenChuan = (ct) =>
    String(ct.TenNhom || "")
      .trim()
      .toLowerCase();
  const khoaCuaDong = (ct) =>
    ct.IdNhomCha != null
      ? `id:${ct.IdNhomCha}`
      : `ten:${tenChuan(ct) || "khac"}`;

  const gom = new Map();
  chiTietList.forEach((ct) => {
    const khoa = khoaCuaDong(ct);
    if (!gom.has(khoa)) gom.set(khoa, []);
    gom.get(khoa).push(ct);
  });

  return [...gom.entries()]
    .map(([khoa, dong]) => {
      const idNhom = dong[0]?.IdNhomCha;
      const ten = tenChuan(dong[0]);
      const tenTuMau =
        (idNhom != null ? tenTheoId.get(Number(idNhom)) : null) ||
        tenTheoTen.get(ten) ||
        null;
      const thuTuNhom =
        (idNhom != null ? thuTuTheoId.get(Number(idNhom)) : undefined) ??
        thuTuTheoTen.get(ten) ??
        Number.MAX_SAFE_INTEGER;
      return {
        khoa,
        ten: tenTuMau || dong[0]?.TenNhom || "Tiêu chí",
        dong,
        thuTu: thuTuNhom,
      };
    })
    .sort((a, b) => a.thuTu - b.thuTu);
};

/* ------------------------------------------------------------------ */
/* Điều kiện chốt                                                      */
/* ------------------------------------------------------------------ */

/**
 * Dòng chưa có điểm hiệu lực - bước chốt đòi MỌI dòng phải có, gửi lên khi còn
 * thiếu sẽ bị SP từ chối. Liệt kê ra để UI chặn trước và chỉ đúng dòng nào thiếu.
 */
export const dongThieuDiem = (chiTietList = []) =>
  chiTietList.filter((ct) => diemHieuLucCuaDong(ct) === null);
