/**
 * Lớp gọi API + hằng số miền cho PHIẾU ĐÁNH GIÁ KPI ĐƠN VỊ
 * (`phieu_danh_gia_don_vi`, bộ endpoint /api/phieu-don-vi và /api/chi-tiet-don-vi).
 *
 * Luồng này CHẠY SONG SONG với phiếu KPI cá nhân nhưng khóa theo `id_phieu_dv` /
 * `id_chi_tiet_dv` và có máy trạng thái riêng - đừng dùng lại hằng số của
 * phieuApi.js: cùng dải 1..5 nhưng nghĩa khác hẳn.
 *
 * Máy trạng thái (`phieu_danh_gia_don_vi.trang_thai`), ba cấp:
 *   1 NHAP             Thư ký Khoa/Phòng (TKK/TKP) nhập điểm
 *   2 CHO_DV_DUYET     chờ Trưởng đơn vị (TK/TKL/TP) duyệt
 *   3 DV_DA_DUYET      Trưởng đơn vị đã duyệt, chờ cấp Trường
 *   4 TRUONG_DA_DUYET  Hiệu trưởng đã duyệt, chờ chốt
 *   5 HOAN_TAT         đã chốt, chỉ đọc (trừ khi Hiệu trưởng mở lại)
 *
 * Mỗi dòng tiêu chí có hai nguồn điểm LOẠI TRỪ nhau (`loai_nguon_diem`):
 *   1 - thư ký gõ tay vào `diem_nhap`  → PUT chi-tiet-don-vi/{id}/diem-nhap
 *   2 - hệ thống tổng hợp từ KPI thành viên vào `diem_tong_hop`
 *       → POST phieu-don-vi/{id}/tong-hop-kpi. Cấm gõ tay.
 *
 * RowVersion là của PHIẾU CHA kể cả với thao tác cấp dòng; response cấp dòng trả
 * `NewRowVersion` chính là row_version MỚI của phiếu. Gọi tiếp bằng giá trị cũ
 * sẽ ăn 409 ngay - các hàm ở đây ném lỗi có cờ `isConflict` để UI tải lại phiếu.
 *
 * PHẠM VI: module phủ TRỌN vòng đời của phiếu - thư ký nhập, Trưởng đơn vị chấm
 * đè và duyệt, cấp Trường chấm lớp cuối và duyệt, chốt, mở lại. Luồng đơn vị KHÔNG
 * có thao tác hủy nộp hay trả phiếu về cấp dưới: đường lùi duy nhất là /mo-lai sau
 * khi phiếu đã hoàn tất, đừng đi tìm endpoint trả về vì không có.
 *
 * Endpoint dùng CHUNG cho Khoa (mẫu loại 3) và Phòng/Trung tâm (mẫu loại 4); phần
 * nghiệp vụ riêng của Phòng/TT (ngưỡng xếp loại, cách cộng tổng, cây nhóm một
 * tầng) nằm ở phieuPhongApi.js.
 */

import { apiFetch } from "./api";
import { readApiError } from "./apiError";

/* ------------------------------------------------------------------ */
/* Trạng thái phiếu                                                    */
/* ------------------------------------------------------------------ */

export const TRANG_THAI_DV = {
  NHAP: 1,
  CHO_DV_DUYET: 2,
  DV_DA_DUYET: 3,
  TRUONG_DA_DUYET: 4,
  HOAN_TAT: 5,
};

export const TRANG_THAI_DV_META = {
  1: {
    label: "Thư ký đang nhập",
    icon: "fa-pen",
    bg: "#f1f5f9",
    color: "#475569",
    border: "#e2e8f0",
  },
  2: {
    label: "Chờ Trưởng đơn vị duyệt",
    icon: "fa-hourglass-half",
    bg: "#fffbeb",
    color: "#b45309",
    border: "#fde68a",
  },
  3: {
    label: "Trưởng đơn vị đã duyệt",
    icon: "fa-user-check",
    bg: "#eff6ff",
    color: "#1d4ed8",
    border: "#bfdbfe",
  },
  4: {
    label: "Hiệu trưởng đã duyệt",
    icon: "fa-circle-check",
    bg: "#f5f3ff",
    color: "#6d28d9",
    border: "#ddd6fe",
  },
  5: {
    label: "Hoàn tất",
    icon: "fa-lock",
    bg: "#ecfdf5",
    color: "#047857",
    border: "#a7f3d0",
  },
};

export const tenTrangThaiDonVi = (trangThai) =>
  TRANG_THAI_DV_META[trangThai]?.label ||
  `Không xác định (${trangThai ?? "-"})`;

/** Chỉ trạng thái 1 mới còn sửa được điểm - trình xong là khóa với thư ký. */
export const suaDuocPhieu = (phieu) =>
  Number(phieu?.TrangThai) === TRANG_THAI_DV.NHAP;

/* ------------------------------------------------------------------ */
/* Nguồn điểm của từng dòng                                            */
/* ------------------------------------------------------------------ */

export const NGUON_DIEM_DV = {
  CHAM_TAY: 1,
  TU_DONG: 2,
};

/** Dòng thư ký được gõ điểm. Dòng tự động chỉ đổi qua nút Tổng hợp KPI. */
export const laDongChamTay = (ct) =>
  Number(ct?.LoaiNguonDiem) !== NGUON_DIEM_DV.TU_DONG;

/**
 * Phiếu có tiêu chí chấm theo điểm trừ tập thể của Khoa hay không.
 *
 * `cong_thuc_snapshot` được CHỐT LÚC TẠO PHIẾU, nên đây mới là câu hỏi đúng thay
 * vì suy từ mã đơn vị: `PhieuDanhGiaDonViDto` không trả `MaDonVi`, và một phiếu
 * Khoa lập trước khi tiêu chí được gán mã thì cũng không có dòng này.
 *
 * Dùng để quyết định có hiển thị / tải số liệu diễn giải điểm trừ tập thể không.
 */
export const coTieuChiDiemTruTapThe = (chiTiet = []) =>
  Array.isArray(chiTiet) &&
  chiTiet.some((ct) => ct?.CongThucSnapshot === "DIEM_TRU_TAP_THE");

/**
 * Tiêu chí có phải là tiêu chí đánh giá / phản hồi sinh viên hay không.
 *
 * Kiểm tra cả mã công thức snapshot (tiền tố PHSV hoặc SINH_VIEN) lẫn
 * tên tiêu chí tiếng Việt (chứa "sinh viên" và từ khóa phản hồi / đánh giá / khảo sát / điểm TB).
 * Loại trừ các tiêu chí khác như "sinh viên tốt nghiệp đúng hạn".
 */
export const laTieuChiDanhGiaSinhVien = (ct) => {
  if (!ct) return false;
  const congThuc = (ct.CongThucSnapshot || "").toUpperCase();
  if (congThuc.includes("PHSV") || congThuc.includes("SINH_VIEN")) return true;
  const ten = (ct.TenTieuChi || "").toLowerCase();
  return (
    ten.includes("sinh viên") &&
    (ten.includes("đánh giá") ||
      ten.includes("phản hồi") ||
      ten.includes("khảo sát") ||
      ten.includes("điểm tb") ||
      ten.includes("điểm trung bình")) &&
    !ten.includes("tốt nghiệp")
  );
};

/**
 * Phiếu có tiêu chí đánh giá của sinh viên hay không.
 */
export const coTieuChiDanhGiaSinhVien = (chiTiet = []) =>
  Array.isArray(chiTiet) && chiTiet.some(laTieuChiDanhGiaSinhVien);

/**
 * Tính toán số liệu thống kê điểm phản hồi sinh viên cho một Khoa / Đơn vị.
 *
 * @param {object} params
 * @param {Array} params.items Danh sách DiemTbPhanHoiSinhVienDto từ GET api/diem-tb-phan-hoi-sv
 * @param {number|string} params.idDonVi ID của đơn vị/khoa đang đánh giá
 * @param {Array} [params.donViList] Danh mục đơn vị (để bao gồm các bộ môn trực thuộc qua IdDonViCha)
 * @param {object} [params.dotChot] Thông tin đợt chốt từ response
 * @returns {object} {
 *   dotChot,
 *   soGiangVien,
 *   tongLuotDanhGia,
 *   diemTrungBinhKhoa, // Trọng số theo lượt đánh giá
 *   diemTrungBinhCong, // Trung bình cộng của các giảng viên
 *   danhSachGv,
 * }
 */
export const tinhThongKePhanHoiKhoa = ({
  items = [],
  idDonVi,
  donViList = [],
  dotChot = null,
} = {}) => {
  if (!idDonVi) {
    return {
      dotChot: null,
      soGiangVien: 0,
      tongLuotDanhGia: 0,
      diemTrungBinhKhoa: null,
      diemTrungBinhCong: null,
      danhSachGv: [],
    };
  }

  const idKhoa = Number(idDonVi);
  const childIds = new Set([idKhoa]);
  if (Array.isArray(donViList)) {
    donViList.forEach((dv) => {
      if (Number(dv.IdDonViCha ?? dv.id_don_vi_cha) === idKhoa) {
        childIds.add(Number(dv.IdDonVi ?? dv.id_don_vi));
      }
    });
  }

  let gvKhoa = (items || []).filter((item) =>
    childIds.has(Number(item.IdDonVi ?? item.id_don_vi)),
  );

  // Nếu không khớp dòng nào nhưng danh sách items có dữ liệu và toàn bộ cùng thuộc 1 đơn vị
  // (trường hợp backend đã tự lọc theo quyền của TK/TKL)
  if (gvKhoa.length === 0 && Array.isArray(items) && items.length > 0) {
    const uniqueDonVi = new Set(
      items.map((it) => it.IdDonVi ?? it.id_don_vi).filter(Boolean),
    );
    if (uniqueDonVi.size <= 1) {
      gvKhoa = items;
    }
  }

  const soGiangVien = gvKhoa.length;
  let tongDiemNhanLuot = 0;
  let tongLuot = 0;
  let tongDiemCong = 0;

  gvKhoa.forEach((gv) => {
    const dtb = Number(gv.DiemTrungBinh ?? gv.diemTrungBinh) || 0;
    const luot = Number(gv.SoLuotDanhGia ?? gv.soLuotDanhGia) || 0;
    tongDiemNhanLuot += dtb * luot;
    tongLuot += luot;
    tongDiemCong += dtb;
  });

  // Điểm TB của Khoa: trung bình các điểm TB đã chốt của từng GV thuộc Khoa (mỗi GV đếm đúng 1 lần - xem openapi.yaml PHSV_DIEM_TB_KHOA)
  const diemTrungBinhKhoa =
    soGiangVien > 0 ? Number((tongDiemCong / soGiangVien).toFixed(2)) : null;

  const diemTrungBinhTrongSo =
    tongLuot > 0 ? Number((tongDiemNhanLuot / tongLuot).toFixed(2)) : null;

  // Số lượng sinh viên đánh giá quy đổi (mỗi sinh viên trả lời 12 câu hỏi khảo sát)
  const tongSoSv = Math.round(tongLuot / 12);

  // Sắp xếp danh sách giảng viên theo họ tên và gắn số SV đánh giá quy đổi
  const danhSachGv = [...gvKhoa]
    .map((gv) => {
      const luot = Number(gv.SoLuotDanhGia ?? gv.soLuotDanhGia) || 0;
      return {
        ...gv,
        soSvDanhGia: Math.round(luot / 12),
      };
    })
    .sort((a, b) =>
      (a.HoTen || a.hoTen || "").localeCompare(b.HoTen || b.hoTen || "", "vi"),
    );

  return {
    dotChot,
    soGiangVien,
    tongLuotDanhGia: tongLuot,
    tongSoSv,
    diemTrungBinhKhoa,
    diemTrungBinhTrongSo,
    danhSachGv,
  };
};

/**
 * Điểm ĐANG có hiệu lực của một dòng, theo đúng thứ tự ưu tiên của ba cấp chấm:
 * điểm chính thức → điểm cấp Trường → điểm Trưởng đơn vị → điểm gốc của dòng
 * (thư ký gõ, hoặc hệ thống tổng hợp).
 *
 * Trả null khi dòng chưa có điểm nào - KHÁC hẳn 0 điểm: bảng phải hiện dấu gạch
 * chứ không phải số 0.
 */
export const diemHieuLucCuaDong = (ct) => {
  const goc = laDongChamTay(ct) ? ct?.DiemNhap : ct?.DiemTongHop;
  const diem = ct?.DiemChinhThuc ?? ct?.DiemTruong ?? ct?.DiemDuyetDv ?? goc;
  if (diem === null || diem === undefined || diem === "") return null;
  const so = Number(diem);
  return Number.isFinite(so) ? so : null;
};

/* ------------------------------------------------------------------ */
/* Tổng điểm TẠM TÍNH ở client                                         */
/* ------------------------------------------------------------------ */

/** `nhom_tieu_chi.loai_nhom` - A = điểm cơ bản, B = điểm vượt trội. */
export const LOAI_NHOM_DV = {
  CO_BAN: 1,
  VUOT_TROI: 2,
};

/**
 * Tổng điểm tạm tính từ ChiTiet[] của phiếu.
 *
 * VÌ SAO CẦN: ba cột `tong_diem_*` chỉ được server ghi ở bước chốt, nên phiếu
 * đang nhập luôn trả null và màn hình chỉ còn dấu gạch. Hàm này cộng lại ở client
 * để thư ký thấy con số trước khi trình. Kết quả CHỈ để hiển thị - server vẫn tự
 * tính lại và giá trị của server mới là giá trị được lưu.
 *
 * Khác phiếu cá nhân ở một điểm: ChiTietDanhGiaDonViDto có sẵn `LoaiNhom` nên
 * không phải tra lại bảng tiêu chí của mẫu để tách cơ bản / vượt trội.
 */
export const tinhTongDiemDonViTamTinh = (chiTiet = []) => {
  if (!Array.isArray(chiTiet) || chiTiet.length === 0) return null;

  let coBan = 0;
  let vuotTroi = 0;
  let tichLuy = 0;
  let soDongChuaCoDiem = 0;

  chiTiet.forEach((ct) => {
    const diem = diemHieuLucCuaDong(ct);
    if (diem === null) {
      soDongChuaCoDiem += 1;
      return;
    }
    tichLuy += diem;
    if (Number(ct.LoaiNhom) === LOAI_NHOM_DV.VUOT_TROI) vuotTroi += diem;
    else coBan += diem;
  });

  return { coBan, vuotTroi, tichLuy, soDongChuaCoDiem };
};

/* ------------------------------------------------------------------ */
/* Hạ tầng gọi API                                                     */
/* ------------------------------------------------------------------ */

const buildApiError = async (response, fallback) => {
  const info = await readApiError(response, fallback);
  const isConflict = response.status === 409;
  const error = new Error(
    isConflict
      ? info.rawMessage ||
          info.message ||
          "Phiếu đơn vị đã bị người khác cập nhật. Vui lòng tải lại trang."
      : info.message,
  );
  error.status = response.status;
  error.errorCode = info.errorCode;
  error.isConflict = isConflict;
  error.isForbidden = response.status === 403;
  return error;
};

const getJson = async (endpoint, fallback) => {
  const response = await apiFetch(endpoint);
  if (!response.ok) throw await buildApiError(response, fallback);
  return response.json();
};

const sendJson = async (endpoint, method, body, fallback) => {
  const response = await apiFetch(endpoint, {
    method,
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await buildApiError(response, fallback);
  return response.json().catch(() => ({}));
};

const buildQuery = (params) => {
  const qs = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    qs.set(key, String(value));
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
};

/* ------------------------------------------------------------------ */
/* Đọc                                                                 */
/* ------------------------------------------------------------------ */

/**
 * Danh sách phiếu đơn vị. Phạm vi do SP quyết theo chức vụ người gọi - bộ lọc
 * idDonVi chỉ thu hẹp trong phạm vi đã được phép, không mở thêm dữ liệu.
 *
 * @param {number[]|string} trangThai mảng hoặc CSV - server nhận CSV "1,2,3".
 */
export const fetchPhieuDonViList = async ({
  idNam,
  idDonVi,
  trangThai,
  page = 1,
  pageSize = 20,
  sortBy,
} = {}) => {
  const csv = Array.isArray(trangThai) ? trangThai.join(",") : trangThai;
  const data = await getJson(
    `phieu-don-vi${buildQuery({
      idNam,
      idDonVi,
      trangThai: csv,
      page,
      pageSize,
      sortBy,
    })}`,
    "Không tải được danh sách phiếu KPI đơn vị",
  );
  return data.Items || [];
};

/** Chi tiết một phiếu: header + ChiTiet[] + PheDuyet[]. */
export const fetchPhieuDonViDetail = async (idPhieuDv) => {
  const data = await getJson(
    `phieu-don-vi/${idPhieuDv}`,
    "Không tải được chi tiết phiếu KPI đơn vị",
  );
  return data.Item || null;
};

/* ------------------------------------------------------------------ */
/* Ghi cấp DÒNG - ba lớp điểm của ba cấp chấm                          */
/* ------------------------------------------------------------------ */

/**
 * Ghi điểm một dòng tiêu chí vào MỘT trong ba lớp điểm.
 *
 * Ba endpoint có cùng request/response, chỉ khác cột đích và trạng thái phiếu mà
 * server chấp nhận - nên gom một chỗ thay vì chép ba lần:
 *   diem-nhap     `diem_nhap`      chỉ nhận khi phiếu ở trạng thái 1
 *   diem-duyet-dv `diem_duyet_dv`  chỉ nhận khi phiếu ở trạng thái 2
 *   diem-truong   `diem_truong`    chỉ nhận khi phiếu ở trạng thái 3
 * Gọi sai lớp so với trạng thái hiện tại sẽ nhận 409, không phải 400.
 */
const ghiDiemChiTietDonVi = async (
  idChiTiet,
  cap,
  { diem, nhanXet, rowVersion },
) => {
  const trong = diem === "" || diem === null || diem === undefined;
  const data = await sendJson(
    `chi-tiet-don-vi/${idChiTiet}/${cap}`,
    "PUT",
    {
      Diem: trong ? null : Number(diem),
      NhanXet: nhanXet || null,
      RowVersion: rowVersion,
    },
    "Lưu điểm tiêu chí thất bại",
  );
  return { item: data.Item || null, newRowVersion: data.NewRowVersion || null };
};

/* ------------------------------------------------------------------ */
/* Ghi - phần việc của thư ký đơn vị                                   */
/* ------------------------------------------------------------------ */

/**
 * Lập phiếu cho một (năm, đơn vị). Mỗi đơn vị chỉ MỘT phiếu mỗi năm - gọi lần
 * hai nhận 400 kèm thông điệp phiếu đã tồn tại.
 *
 * `idMau` bỏ trống thì server tự suy mẫu theo mã đơn vị (K_* và TNNCN ra mẫu
 * Khoa, còn lại ra mẫu Phòng), nên UI không cần bắt người dùng chọn mẫu.
 */
export const taoPhieuDonVi = async ({ idNam, idDonVi, idMau } = {}) => {
  const data = await sendJson(
    "phieu-don-vi",
    "POST",
    { IdNam: Number(idNam), IdDonVi: Number(idDonVi), IdMau: idMau ?? null },
    "Lập phiếu KPI đơn vị thất bại",
  );
  return data.Item || null;
};

/**
 * Nhập điểm một dòng chấm tay.
 *
 * RowVersion là tùy chọn ở phía server nhưng ta LUÔN gửi: bỏ đi là mất hẳn lớp
 * chống ghi đè khi hai người cùng mở một phiếu.
 *
 * @returns {{item: object|null, newRowVersion: string|null}} `newRowVersion` là
 *   row_version mới của PHIẾU - bên gọi phải dùng cho lần ghi kế tiếp.
 */
export const nhapDiemChiTietDonVi = (idChiTiet, tham) =>
  ghiDiemChiTietDonVi(idChiTiet, "diem-nhap", tham);

/**
 * Tổng hợp điểm KPI của thành viên vào MỌI dòng có `loai_nguon_diem = 2`.
 *
 * Chạy lại được nhiều lần - mỗi lần ghi đè `diem_tong_hop` bằng số liệu mới nhất
 * của các phiếu cá nhân, nên nên gọi lại ngay trước khi trình.
 *
 * @param {boolean} baoGomDonViCon gom cả phiếu của đơn vị con (mặc định server: true)
 * @returns {{item: object|null, tongHop: object|null}} `tongHop` chỉ có ở endpoint này.
 */
export const tongHopKpiDonVi = async (idPhieuDv, { baoGomDonViCon } = {}) => {
  const data = await sendJson(
    `phieu-don-vi/${idPhieuDv}/tong-hop-kpi${buildQuery({ baoGomDonViCon })}`,
    "POST",
    {},
    "Tổng hợp KPI thành viên thất bại",
  );
  return { item: data.Item || null, tongHop: data.TongHop || null };
};

/** Trình phiếu lên Trưởng đơn vị (1 → 2). Sau bước này thư ký hết sửa được. */
export const trinhPhieuDonVi = async (idPhieuDv, { nhanXet, rowVersion }) => {
  const data = await sendJson(
    `phieu-don-vi/${idPhieuDv}/submit`,
    "POST",
    { NhanXet: nhanXet || null, RowVersion: rowVersion },
    "Trình phiếu KPI đơn vị thất bại",
  );
  return data.Item || null;
};

/* ------------------------------------------------------------------ */
/* Ghi - phần việc của Trưởng đơn vị                                   */
/* ------------------------------------------------------------------ */

/**
 * Trưởng đơn vị (TK/TKL/TP) chấm ĐÈ lên điểm thư ký đã nhập, vào `diem_duyet_dv`.
 * Không xóa `diem_nhap` - hai lớp cùng tồn tại, lớp này chỉ thắng khi tính điểm
 * hiệu lực (xem diemHieuLucCuaDong).
 */
export const nhapDiemDuyetDvChiTietDonVi = (idChiTiet, tham) =>
  ghiDiemChiTietDonVi(idChiTiet, "diem-duyet-dv", tham);

/** Trưởng đơn vị duyệt cả phiếu (2 → 3). */
export const duyetDvPhieuDonVi = async (idPhieuDv, { nhanXet, rowVersion }) => {
  const data = await sendJson(
    `phieu-don-vi/${idPhieuDv}/duyet-dv`,
    "POST",
    { NhanXet: nhanXet || null, RowVersion: rowVersion },
    "Duyệt phiếu KPI đơn vị thất bại",
  );
  return data.Item || null;
};

/* ------------------------------------------------------------------ */
/* Ghi - phần việc của cấp Trường                                      */
/* ------------------------------------------------------------------ */

/**
 * Cấp Trường (HT) chấm lớp điểm CUỐI vào `diem_truong` - lớp thắng mọi lớp dưới
 * khi tính điểm hiệu lực, và là lớp mà bước chốt đòi phải có ở mọi dòng.
 */
export const nhapDiemTruongChiTietDonVi = (idChiTiet, tham) =>
  ghiDiemChiTietDonVi(idChiTiet, "diem-truong", tham);

/** Cấp Trường duyệt phiếu (3 → 4). */
export const duyetTruongPhieuDonVi = async (
  idPhieuDv,
  { nhanXet, rowVersion },
) => {
  const data = await sendJson(
    `phieu-don-vi/${idPhieuDv}/duyet-truong`,
    "POST",
    { NhanXet: nhanXet || null, RowVersion: rowVersion },
    "Duyệt cấp Trường thất bại",
  );
  return data.Item || null;
};

/**
 * Chốt phiếu (4 → 5). Bước này tự tính lại TOÀN BỘ tổng điểm để chống tamper,
 * ghi `diem_chinh_thuc` cho từng dòng và snapshot lịch sử.
 *
 * `xepLoai` bỏ trống thì BLL tự tính theo tổng tích lũy - trần là mức 3. Gửi tay
 * một mức thì SP vẫn kiểm lại bằng tổng NÓ tự tính, không đủ điểm trả
 * `DIEM_KHONG_DU`. Riêng mức 4 còn ràng buộc hạn ngạch top 20% toàn trường mà
 * server KHÔNG kiểm được - vế đó do người chốt chịu trách nhiệm.
 *
 * Chặn nếu còn dòng chưa có điểm hiệu lực ở cấp Trường.
 */
export const chotPhieuDonVi = async (
  idPhieuDv,
  { xepLoai, ghiChuXepLoai, nhanXet, rowVersion },
) => {
  const data = await sendJson(
    `phieu-don-vi/${idPhieuDv}/chot`,
    "POST",
    {
      XepLoai: xepLoai ? Number(xepLoai) : null,
      GhiChuXepLoai: ghiChuXepLoai || null,
      NhanXet: nhanXet || null,
      RowVersion: rowVersion,
    },
    "Chốt phiếu KPI đơn vị thất bại",
  );
  return data.Item || null;
};

/**
 * Mở lại phiếu đã hoàn tất (5 → 1, 2 hoặc 3) - đường LÙI DUY NHẤT của luồng đơn
 * vị. Tăng `lan_danh_gia`, snapshot điểm cũ vào lịch sử, và XÓA TRẮNG tổng điểm
 * + xếp loại + người chốt.
 *
 * `lyDo` bắt buộc ở phía server (400 nếu bỏ trống).
 */
export const moLaiPhieuDonVi = async (
  idPhieuDv,
  { trangThaiMoi, lyDo, nhanXet, rowVersion },
) => {
  const data = await sendJson(
    `phieu-don-vi/${idPhieuDv}/mo-lai`,
    "POST",
    {
      TrangThaiMoi: trangThaiMoi ? Number(trangThaiMoi) : null,
      LyDo: lyDo || null,
      NhanXet: nhanXet || null,
      RowVersion: rowVersion,
    },
    "Mở lại phiếu KPI đơn vị thất bại",
  );
  return data.Item || null;
};
