/**
 * Phục vụ cộng đồng và các nhiệm vụ khác theo phân công của Khoa - lớp truy cập
 * API của cả module.
 *
 * Đây là **KPI Nhóm III** của phiếu đánh giá giảng viên: tiêu chí "Thực hiện
 * nhiệm vụ theo phân công của Khoa" (trần 20 điểm), điểm cộng dồn từ mức quy đổi
 * của từng vai trò trong `danh_muc_vai_tro_pvcd`.
 *
 * Chủ trì tự kê khai người phối hợp; Trưởng khoa xét từng nhiệm vụ.
 * Chỉ nhiệm vụ đã duyệt được tính điểm. Quyền thao tác lấy từ cờ server.
 *
 * Mọi request đi qua apiFetch nên đã có sẵn `credentials: 'include'` và vòng
 * refresh 401 (xem utils/api.js); tuyệt đối không gọi fetch trần ở màn hình.
 *
 * Bốn quy ước của server mà file này gói lại một chỗ, để màn hình không phải nhớ:
 *
 *  1. Envelope PascalCase `{ Success, Message, ErrorCode?, Item?, Items?, Nhom? }`
 *     và server bật NullValueHandling.Ignore ⇒ trường null BIẾN MẤT khỏi JSON chứ
 *     không phải `null`. Đừng so sánh `=== null`, luôn `?.` và `??`.
 *  2. Lỗi từ filter xác thực trả hình dạng KHÁC - `{ "message": "..." }` chữ
 *     thường, không có `Success`. docLoi() chịu được cả hai dạng.
 *  3. Lưu nhiệm vụ là MỘT form MỘT lần lưu: gửi TOÀN BỘ danh sách phân công sau
 *     khi sửa, server tự tính diff. Không có endpoint thêm/xoá từng dòng.
 *  4. Client KHÔNG gửi điểm - server resolve từ danh mục vai trò rồi ghi cứng vào
 *     bản ghi (diem_snapshot). Điểm ở FE chỉ để hiển thị dự kiến.
 *
 * Nguồn chuẩn: docs/openapi.yaml (tag NhiemVuKhoa),
 * docs/schema_ghi_chu.md mục 7.
 */

import { apiFetch } from "./api";

/* ------------------------------------------------------------------ */
/* Hằng số nghiệp vụ                                                   */
/* ------------------------------------------------------------------ */

/** Trạng thái kỳ. 2 = khoá ghi TOÀN BỘ, kể cả upload minh chứng và gửi phản hồi. */
export const TRANG_THAI_KY = { DANG_MO: 1, DA_CHOT: 2 };

/** 1 = sai vai trò (bắt buộc trỏ tới một nhiệm vụ), 2 = thiếu nhiệm vụ. */
export const LOAI_PHAN_HOI = { SAI_VAI_TRO: 1, THIEU_NHIEM_VU: 2 };

/** Trạng thái phản hồi lưu trữ từ luồng cũ, chỉ đọc. */
export const TRANG_THAI_PHAN_HOI = { CHO_XU_LY: 1, DA_XU_LY: 2 };

/** Minh chứng hai cấp dùng chung một bảng: 1 = cấp nhiệm vụ, 2 = cấp phản hồi. */
export const CAP_MINH_CHUNG = { NHIEM_VU: 1, PHAN_HOI: 2 };

/** Hành động trong nhật ký (lich_su_nhiem_vu_khoa.hanh_dong). */
export const HANH_DONG = {
  TAO_NHIEM_VU: 1,
  SUA_NHIEM_VU: 2,
  XOA_NHIEM_VU: 3,
  THEM_PHAN_CONG: 4,
  DOI_VAI_TRO: 5,
  GO_PHAN_CONG: 6,
  CHOT_KY: 7,
  MO_LAI_KY: 8,
  XU_LY_PHAN_HOI: 9,
  DUYET_NHIEM_VU: 10,
  TRA_VE_NHIEM_VU: 11,
  MO_LAI_NHIEM_VU: 12,
};

export const TEN_LOAI_PHAN_HOI = {
  [LOAI_PHAN_HOI.SAI_VAI_TRO]: "Sai vai trò",
  [LOAI_PHAN_HOI.THIEU_NHIEM_VU]: "Thiếu nhiệm vụ",
};

export const TEN_HANH_DONG = {
  [HANH_DONG.TAO_NHIEM_VU]: "Tạo nhiệm vụ",
  [HANH_DONG.SUA_NHIEM_VU]: "Sửa nhiệm vụ",
  [HANH_DONG.XOA_NHIEM_VU]: "Xoá nhiệm vụ",
  [HANH_DONG.THEM_PHAN_CONG]: "Thêm phân công",
  [HANH_DONG.DOI_VAI_TRO]: "Đổi vai trò / điểm",
  [HANH_DONG.GO_PHAN_CONG]: "Gỡ phân công",
  [HANH_DONG.CHOT_KY]: "Chốt kỳ",
  [HANH_DONG.MO_LAI_KY]: "Mở lại kỳ",
  [HANH_DONG.XU_LY_PHAN_HOI]: "Xử lý phản hồi (cũ)",
  [HANH_DONG.DUYET_NHIEM_VU]: "Duyệt nhiệm vụ",
  [HANH_DONG.TRA_VE_NHIEM_VU]: "Trả về nhiệm vụ",
  [HANH_DONG.MO_LAI_NHIEM_VU]: "Mở lại nhiệm vụ",
};

/**
 * Giới hạn upload mặc định - chỉ dùng khi CHƯA gọi được /cau-hinh/nhiem-vu-khoa.
 * Cấu hình thật lấy từ server: Khoa/năm có thể có mức riêng.
 */
export const CAU_HINH_MAC_DINH = {
  AllowedExtensions: ["pdf"],
  Accept: ".pdf",
  MaxFileSizeKb: 10240,
  MaxTenHienThiLength: 255,
};

/* ------------------------------------------------------------------ */
/* Lỗi: map ErrorCode → tiếng Việt có dấu                              */
/* ------------------------------------------------------------------ */

/**
 * Message của server là tiếng Việt KHÔNG dấu nên bản map này được ưu tiên.
 * Giá trị `null` = cố tình rơi về Message thô, vì server nêu rõ trường nào sai.
 */
export const NVK_ERROR_MESSAGES = {
  INVALID: null,
  KHONG_PHAI_KHOA:
    "Đơn vị này không phải Khoa - module nhiệm vụ chỉ áp dụng cho Khoa",
  GV_NGOAI_KHOA: null, // Có thể là người không thuộc diện KPI; giữ Message của server.
  FORBIDDEN: "Bạn không có quyền thực hiện thao tác này",
  NOT_FOUND: "Không tìm thấy dữ liệu",
  KY_DA_CHOT:
    "Kỳ đã chốt nên không ghi được. Cần mở lại kỳ trước khi chỉnh sửa.",
  TRUNG_CHU_TRI:
    "Người kê khai là chủ trì; người phối hợp chỉ chọn vai trò phối hợp chính hoặc phối hợp",
  THIEU_LY_DO: "Vui lòng nhập lý do trả về hoặc mở lại nhiệm vụ",
  NHIEM_VU_DA_DUYET:
    "Nhiệm vụ đã duyệt. Cần nhờ Trưởng khoa mở lại để chỉnh sửa.",
  TRANG_THAI_KHONG_HOP_LE:
    "Trạng thái nhiệm vụ đã thay đổi. Dữ liệu sẽ được tải lại.",
  DUYET_KHONG_HOP_LE:
    "Nhiệm vụ cũ chưa có chủ trì. Hãy xoá nhiệm vụ và nhờ chủ trì thực tế kê khai lại.",
  LUONG_DA_NGUNG: "Luồng thao tác cũ đã ngừng. Vui lòng tải lại trang.",
  SQL_ERROR: "Lỗi hệ thống khi truy cập dữ liệu, vui lòng thử lại",
};

/** Đọc body an toàn: 204, body rỗng hay HTML lỗi đều không được làm vỡ luồng. */
const docBody = async (response) => {
  try {
    return await response.json();
  } catch (err) {
    return null;
  }
};

/**
 * Dựng Error đã Việt hoá để đẩy thẳng ra toast.
 * Chịu được cả envelope của module (`Message`/`ErrorCode`) lẫn hình dạng của
 * filter xác thực (`message` chữ thường, không có Success).
 */
const taoLoi = (response, body, fallback) => {
  const errorCode = body?.ErrorCode || null;
  const rawMessage = body?.Message || body?.message || "";
  const mapped = errorCode ? NVK_ERROR_MESSAGES[errorCode] : null;

  const error = new Error(mapped || rawMessage || fallback);
  error.status = response.status;
  error.errorCode = errorCode;
  error.rawMessage = rawMessage;
  return error;
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

/**
 * Gọi API và trả về ENVELOPE đã kiểm lỗi (chưa bóc slot).
 *
 * Kiểm cả `response.ok` lẫn `Success === false`: hợp đồng nói 200 luôn kèm
 * Success = true, nhưng chặn hai lớp thì một thay đổi phía server không thể
 * lặng lẽ biến lỗi thành dữ liệu rỗng trên màn hình.
 */
const goiApi = async (endpoint, options, fallback) => {
  const response = await apiFetch(endpoint, options);
  const body = await docBody(response);

  if (!response.ok || body?.Success === false) {
    throw taoLoi(response, body, fallback);
  }
  return body || {};
};

/** Bóc slot `Item`; trả null khi server bỏ qua trường (NullValueHandling.Ignore). */
const layItem = async (endpoint, options, fallback) => {
  const envelope = await goiApi(endpoint, options, fallback);
  return envelope.Item ?? null;
};

/** Bóc slot `Items`; luôn trả mảng để màn hình khỏi rải `|| []`. */
const layItems = async (endpoint, options, fallback) => {
  const envelope = await goiApi(endpoint, options, fallback);
  return Array.isArray(envelope.Items) ? envelope.Items : [];
};

const jsonBody = (data) => ({
  method: "POST",
  body: JSON.stringify(data),
});

/* ------------------------------------------------------------------ */
/* Cấu hình module                                                     */
/* ------------------------------------------------------------------ */

/**
 * Trần điểm, bộ vai trò kèm mức điểm, 7 nhóm công tác và giới hạn upload.
 *
 * KHÔNG hardcode 10/7/4 trong màn hình: mức điểm resolve theo thứ tự ưu tiên
 * (đơn vị,năm) > (đơn vị,NULL) > (NULL,năm) > (NULL,NULL) nên Khoa có thể có
 * mức riêng theo năm.
 *
 * `LechCauHinh = true` ⇒ điểm chấm vào phiếu KPI sẽ khác bảng tổng hợp; hiện
 * banner cảnh báo cho admin nhưng KHÔNG chặn thao tác.
 */
export const layCauHinh = async ({ idDonVi, idNam } = {}) => {
  const item = await layItem(
    `cau-hinh/nhiem-vu-khoa${buildQuery({ idDonVi, idNam })}`,
    undefined,
    "Không tải được cấu hình module nhiệm vụ Khoa",
  );
  return item ? { ...CAU_HINH_MAC_DINH, ...item } : { ...CAU_HINH_MAC_DINH };
};

/* ------------------------------------------------------------------ */
/* Kỳ nhiệm vụ                                                         */
/* ------------------------------------------------------------------ */

/**
 * Kỳ của (năm × Khoa) + 7 nhóm công tác kèm số nhiệm vụ đã nhập.
 *
 * Kỳ được TẠO LƯỜI: endpoint này tự INSERT nếu chưa có, nên màn hình KHÔNG cần
 * nút "mở kỳ".
 *
 * `Nhom` nằm ở cấp ENVELOPE chứ không trong Item - đây là endpoint duy nhất
 * (cùng với Item của /tong-hop) phát slot này.
 *
 * @returns {Promise<{ky: object|null, nhom: object[]}>}
 */
export const layKy = async ({ idNam, idDonVi }) => {
  const envelope = await goiApi(
    `nhiem-vu-khoa/ky${buildQuery({ idNam, idDonVi })}`,
    undefined,
    "Không tải được kỳ nhiệm vụ của Khoa",
  );
  return {
    ky: envelope.Item ?? null,
    nhom: Array.isArray(envelope.Nhom) ? envelope.Nhom : [],
  };
};

/**
 * Đặt hạn phản hồi / ghi chú, hoặc mở lại kỳ đã chốt.
 *
 * Hạn phản hồi chỉ là NHÃN hiển thị - hết hạn không khoá gì ("không lên tiếng =
 * đồng ý"). `xoaHan` ưu tiên hơn `hanPhanHoi`. Mở lại bắt buộc có `lyDo` và chỉ
 * người có `CanDuyet` mới làm được (TLGVK cố ý bị loại).
 */
export const capNhatKy = async ({
  idNam,
  idDonVi,
  hanPhanHoi,
  xoaHan,
  ghiChu,
  moLai,
  lyDo,
}) => {
  const envelope = await goiApi(
    "nhiem-vu-khoa/ky",
    {
      method: "PUT",
      body: JSON.stringify({
        IdNam: idNam,
        IdDonVi: idDonVi,
        HanPhanHoi: hanPhanHoi ?? null,
        XoaHan: !!xoaHan,
        GhiChu: ghiChu ?? null,
        MoLai: !!moLai,
        LyDo: lyDo ?? null,
      }),
    },
    moLai ? "Mở lại kỳ thất bại" : "Cập nhật kỳ thất bại",
  );
  return {
    ky: envelope.Item ?? null,
    nhom: Array.isArray(envelope.Nhom) ? envelope.Nhom : [],
  };
};

/* ------------------------------------------------------------------ */
/* Nhiệm vụ + phân công                                                */
/* ------------------------------------------------------------------ */

/**
 * Danh sách nhiệm vụ của kỳ. Mỗi dòng ĐÃ KÈM SẴN `PhanCong[]` và `MinhChung[]`
 * (SP trả 3 result set, C# ghép sẵn) - đừng gọi thêm gì cho từng dòng.
 */
export const layDanhSachNhiemVu = ({
  idNam,
  idDonVi,
  idNhomNv,
  tuKhoa,
  trangThai,
} = {}) =>
  layItems(
    `nhiem-vu-khoa${buildQuery({ idNam, idDonVi, idNhomNv, tuKhoa, trangThai })}`,
    undefined,
    "Không tải được danh sách nhiệm vụ",
  );

export const layNhiemVu = (id) =>
  layItem(`nhiem-vu-khoa/${id}`, undefined, "Không tải được nhiệm vụ");

/**
 * Chỉ giữ ba trường server nhận, bỏ mọi field snapshot của dòng đang hiển thị.
 *
 * Quan trọng: KHÔNG gửi `DiemSnapshot` / `MaVaiTroSnapshot` dù form đang có sẵn.
 * Server tự tra mức điểm rồi ghi cứng, và chỉ re-snapshot khi `IdVaiTro` THAY
 * ĐỔI - nhờ vậy sửa tên nhiệm vụ không làm điểm kỳ cũ nhảy theo quy chế mới.
 */
const chuanBiPhanCong = (danhSach) =>
  (danhSach || [])
    .filter((d) => d && !d.LaChuTri && d.IdNhanVien && d.IdVaiTro)
    .map((d) => ({
      IdNhanVien: Number(d.IdNhanVien),
      IdVaiTro: Number(d.IdVaiTro),
      GhiChu: d.GhiChu?.trim() ? d.GhiChu.trim() : null,
    }));

/**
 * Tạo (không có `id`) hoặc sửa (có `id`) - MỘT form, MỘT lần lưu.
 *
 * ⚠️ Khi sửa phải truyền TOÀN BỘ danh sách phân công SAU KHI SỬA, không phải
 * phần thay đổi. Server tự tính diff: dòng không còn trong danh sách = gỡ, dòng
 * đổi IdVaiTro = đổi vai trò + re-snapshot điểm, dòng mới = thêm.
 * **Xoá một người khỏi nhiệm vụ = đơn giản là không gửi dòng đó nữa.**
 *
 * Chỉ gửi người phối hợp (PHC/PH); chủ trì được server tự thêm.
 * Danh sách rỗng hợp lệ khi nhiệm vụ chỉ có chủ trì.
 *
 * `idNam` / `idDonVi` bị BỎ QUA khi sửa (server lấy từ chính nhiệm vụ).
 *
 * Trả envelope với Item và Message để giữ nguyên trạng thái khi không có thay đổi.
 */
export const luuNhiemVu = async ({
  id,
  idNam,
  idDonVi,
  idNhomNv,
  tenNhiemVu,
  moTa,
  phanCong,
}) => {
  const body = {
    IdNam: idNam,
    IdDonVi: idDonVi,
    IdNhomNv: Number(idNhomNv),
    TenNhiemVu: (tenNhiemVu || "").trim(),
    MoTa: moTa?.trim() ? moTa.trim() : null,
    PhanCong: chuanBiPhanCong(phanCong),
  };

  return goiApi(
    id ? `nhiem-vu-khoa/${id}` : "nhiem-vu-khoa",
    { method: id ? "PUT" : "POST", body: JSON.stringify(body) },
    id ? "Lưu nhiệm vụ thất bại" : "Tạo nhiệm vụ thất bại",
  );
};

/** Xét từng nhiệm vụ; trả về trạng thái và quyền mới từ server. */
export const xetNhiemVu = (id, { trangThai, lyDo } = {}) =>
  layItem(
    `nhiem-vu-khoa/${id}/xet`,
    jsonBody({
      TrangThai: Number(trangThai),
      ...(Number(trangThai) === 3 ? { LyDo: lyDo?.trim() } : {}),
    }),
    "Xét nhiệm vụ thất bại",
  );

export const TEN_TRANG_THAI_NHIEM_VU = {
  1: "Chờ duyệt",
  2: "Đã duyệt",
  3: "Trả về",
};
export const canKeKhaiNhiemVu = (header) =>
  header?.CanKeKhai === true && !laKyDaChot(header);
export const canSuaNhiemVu = (nv) => nv?.ChoPhepSua === true;
export const canXetNhiemVu = (nv) => nv?.ChoPhepXet === true;
export const canDuyetKy = (ky) => ky?.CanDuyet === true;
export const canXoaNhiemVu = (nv, ky) =>
  !laKyDaChot(ky) && (canSuaNhiemVu(nv) || canDuyetKy(ky));

/** Những lỗi do dữ liệu/quyền thay đổi cần đọc lại server trước thao tác tiếp. */
export const canTaiLaiNhiemVu = (error) =>
  error?.status === 409 || error?.status === 403;

/** Xoá mềm nhiệm vụ - kéo theo cả phân công nên màn hình phải hỏi xác nhận. */
export const xoaNhiemVu = async (id) => {
  await goiApi(
    `nhiem-vu-khoa/${id}`,
    { method: "DELETE" },
    "Xoá nhiệm vụ thất bại",
  );
};

/**
 * Toàn bộ giảng viên của Khoa kèm sẵn tổng điểm hiện tại - dùng cho ô chọn người.
 *
 * Gọi MỘT lần khi mở form rồi cache lại; không gọi cho từng dòng phân công.
 * `TongDiemThucTe > TranDiem` chỉ để tô cảnh báo, KHÔNG chặn chọn.
 */
export const layGiangVien = ({ idNam, idDonVi, tuKhoa } = {}) =>
  layItems(
    `nhiem-vu-khoa/giang-vien${buildQuery({ idNam, idDonVi, tuKhoa })}`,
    undefined,
    "Không tải được danh sách giảng viên của Khoa",
  );

/* ------------------------------------------------------------------ */
/* Màn hình giảng viên                                                 */
/* ------------------------------------------------------------------ */

/**
 * Bảng điểm nhiệm vụ của CHÍNH người đang đăng nhập.
 *
 * Không cần `idDonVi` - server lấy từ token, ai cũng xem được của mình.
 * Khoa chưa mở kỳ thì `Header` vẫn trả về nhưng `Items` rỗng: hiện thông báo
 * "Khoa chưa phân công nhiệm vụ nào" thay vì màn hình trắng.
 *
 * @returns {Promise<{Header: object|null, Items: object[], PhanHoi: object[]}>}
 */
export const layNhiemVuCuaToi = async (idNam) => {
  const item = await layItem(
    `nhiem-vu-khoa/cua-toi${buildQuery({ idNam })}`,
    undefined,
    "Không tải được bảng nhiệm vụ của bạn",
  );
  return {
    Header: item?.Header ?? null,
    Items: Array.isArray(item?.Items) ? item.Items : [],
    PhanHoi: Array.isArray(item?.PhanHoi) ? item.PhanHoi : [],
  };
};

/* ------------------------------------------------------------------ */
/* Tổng hợp nhiệm vụ đã duyệt                                          */
/* ------------------------------------------------------------------ */

/**
 * Bảng tổng hợp toàn Khoa, GỒM CẢ giảng viên chưa được phân công nhiệm vụ nào
 * (để Khoa thấy chỗ trống).
 *
 * `SoNhiemVuTheoNhom` là map IdNhomNv → số lượng: dựng cột động bằng cách duyệt
 * `Nhom` (đã sắp theo ThuTu) rồi tra map, mặc định 0.
 */
export const layTongHop = async ({ idNam, idDonVi }) => {
  const item = await layItem(
    `nhiem-vu-khoa/tong-hop${buildQuery({ idNam, idDonVi })}`,
    undefined,
    "Không tải được bảng tổng hợp",
  );
  return {
    Header: item?.Header ?? null,
    Items: Array.isArray(item?.Items) ? item.Items : [],
    Nhom: Array.isArray(item?.Nhom) ? item.Nhom : [],
  };
};

/**
 * Xuất bảng tổng hợp ra Excel.
 *
 * Đi qua apiFetch thay vì `window.location`: API khác origin, và endpoint này
 * CÓ THỂ trả JSON (khi thiếu quyền) thay vì file - kiểm Content-Type trước khi
 * dựng blob, nếu không người dùng sẽ tải về một file .xlsx chứa thông báo lỗi.
 */
export const taiExcelTongHop = async ({ idNam, idDonVi, maDonVi }) => {
  const response = await apiFetch(
    `nhiem-vu-khoa/export${buildQuery({ idNam, idDonVi })}`,
  );
  const contentType = response.headers.get("Content-Type") || "";

  if (!response.ok || contentType.includes("application/json")) {
    throw taoLoi(
      response,
      await docBody(response),
      "Không xuất được file Excel",
    );
  }

  const blob = await response.blob();
  taiBlobVeMay(blob, `NhiemVuKhoa_${maDonVi || idDonVi}_${idNam}.xlsx`);
};

/* ------------------------------------------------------------------ */
/* Phản hồi                                                            */
/* ------------------------------------------------------------------ */

/**
 * Danh sách phản hồi của kỳ (phía Khoa). Mỗi dòng đã kèm sẵn `MinhChung[]`.
 * `trangThai` bỏ trống = tất cả.
 */
export const layDanhSachPhanHoi = ({ idNam, idDonVi, trangThai } = {}) =>
  layItems(
    `nhiem-vu-khoa/phan-hoi${buildQuery({ idNam, idDonVi, trangThai })}`,
    undefined,
    "Không tải được danh sách phản hồi",
  );

/* ------------------------------------------------------------------ */
/* Minh chứng (dùng chung cho cả hai cấp)                              */
/* ------------------------------------------------------------------ */

/** Kích thước hiển thị: dưới 1024 KB để KB, lớn hơn đổi sang MB. */
export const formatKb = (kb) => {
  if (kb == null) return "-";
  const num = Number(kb);
  if (!Number.isFinite(num)) return "-";
  return num >= 1024 ? `${(num / 1024).toFixed(1)} MB` : `${num} KB`;
};

/**
 * Kiểm tra sơ bộ phía client trước khi tốn một vòng upload.
 * Server vẫn kiểm HAI LỚP: đuôi file VÀ chữ ký `%PDF-` - đổi đuôi .docx thành
 * .pdf sẽ bị trả 400, nên đây chỉ là lớp chặn sớm cho êm tay người dùng.
 *
 * @param {File} file
 * @param {object} [cauHinh] kết quả layCauHinh(); thiếu thì dùng mặc định
 * @returns {string|null} thông điệp lỗi, null nếu hợp lệ
 */
export const validatePdf = (file, cauHinh) => {
  const gioiHan = cauHinh?.MaxFileSizeKb || CAU_HINH_MAC_DINH.MaxFileSizeKb;

  if (!file) return "Chưa chọn tệp minh chứng";
  if (file.size === 0) return "Tệp rỗng, vui lòng chọn tệp khác";

  const laPdf =
    file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
  if (!laPdf) return "Chỉ chấp nhận tệp PDF";

  const kb = Math.ceil(file.size / 1024);
  if (kb > gioiHan) {
    return `Tệp ${formatKb(kb)} vượt giới hạn ${formatKb(gioiHan)}`;
  }
  return null;
};

const uploadMinhChung = async (endpoint, file, tenHienThi, cauHinh) => {
  const loi = validatePdf(file, cauHinh);
  if (loi) throw new Error(loi);

  const fd = new FormData();
  fd.append("file", file);
  if (tenHienThi?.trim()) fd.append("tenHienThi", tenHienThi.trim());

  return layItem(
    endpoint,
    { method: "POST", body: fd },
    "Tải lên minh chứng thất bại",
  );
};

/**
 * Minh chứng CẤP NHIỆM VỤ (cấp 1): quyết định phân công, kế hoạch, biên bản -
 * tải lên MỘT lần, mọi giảng viên trong nhiệm vụ đều xem được.
 */
export const themMinhChungNhiemVu = (idNhiemVu, file, tenHienThi, cauHinh) =>
  uploadMinhChung(
    `nhiem-vu-khoa/${idNhiemVu}/minh-chung`,
    file,
    tenHienThi,
    cauHinh,
  );

export const layMinhChungNhiemVu = (idNhiemVu) =>
  layItems(
    `nhiem-vu-khoa/${idNhiemVu}/minh-chung`,
    undefined,
    "Không tải được danh sách minh chứng",
  );

/** Xoá mềm minh chứng + dọn file vật lý. Kỳ phải còn mở. */
export const xoaMinhChung = async (idMinhChung) => {
  await goiApi(
    `minh-chung-nvk/${idMinhChung}`,
    { method: "DELETE" },
    "Xoá minh chứng thất bại",
  );
};

/**
 * Tải nội dung file về dạng Blob.
 *
 * Endpoint hỗ trợ cookie nên thẻ `<a href>` cũng xác thực được, nhưng đi qua
 * apiFetch giữ được vòng refresh phiên và đọc được body lỗi JSON khi server trả
 * 403/404 - cùng cách làm với minh chứng của phiếu và vi phạm.
 */
const taiBlobMinhChung = async (idMinhChung) => {
  const response = await apiFetch(`minh-chung-nvk/${idMinhChung}/tai-ve`);
  if (!response.ok) {
    throw taoLoi(
      response,
      await docBody(response),
      "Không tải được tệp minh chứng",
    );
  }
  return response.blob();
};

/**
 * Object URL để nhúng PDF vào `<iframe>`.
 * Bên gọi CHỊU TRÁCH NHIỆM revokeObjectURL khi đóng preview, nếu không blob sẽ
 * nằm lại trong bộ nhớ đến khi tải lại trang.
 */
export const taoUrlXemMinhChung = async (idMinhChung) => {
  const blob = await taiBlobMinhChung(idMinhChung);
  // Ép type: một số cấu hình server trả octet-stream khiến trình duyệt tải
  // xuống thay vì hiển thị. Module chỉ nhận PDF nên ép luôn là an toàn.
  const pdf =
    blob.type === "application/pdf"
      ? blob
      : new Blob([blob], { type: "application/pdf" });
  return window.URL.createObjectURL(pdf);
};

const taiBlobVeMay = (blob, tenFile) => {
  const url = window.URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = tenFile;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Chờ trình duyệt kịp bắt đầu tải rồi mới thu hồi URL tạm
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
  }
};

export const taiMinhChungVeMay = async (mc) => {
  const id = mc?.IdMinhChungNvk;
  if (!id) return;
  const blob = await taiBlobMinhChung(id);
  taiBlobVeMay(blob, mc.TenFileGoc || `minh-chung-${id}.pdf`);
};

/* ------------------------------------------------------------------ */
/* Nhật ký                                                             */
/* ------------------------------------------------------------------ */

export const layLichSuKy = ({ idNam, idDonVi }) =>
  layItems(
    `nhiem-vu-khoa/lich-su${buildQuery({ idNam, idDonVi })}`,
    undefined,
    "Không tải được nhật ký của kỳ",
  );

export const layLichSuNhiemVu = (idNhiemVu) =>
  layItems(
    `nhiem-vu-khoa/${idNhiemVu}/lich-su`,
    undefined,
    "Không tải được nhật ký của nhiệm vụ",
  );

/* ------------------------------------------------------------------ */
/* Suy luận trạng thái dùng chung cho mọi màn hình                     */
/* ------------------------------------------------------------------ */

/** Kỳ đã chốt ⇒ read-only TOÀN BỘ, kể cả upload minh chứng và gửi phản hồi. */
export const laKyDaChot = (kyHoacHeader) =>
  Number(kyHoacHeader?.TrangThai) === TRANG_THAI_KY.DA_CHOT;

/**
 * Vượt trần chỉ là CẢNH BÁO - tuyệt đối không dùng để chặn nút Lưu.
 * Chênh lệch nhỏ hơn 0.005 coi như bằng nhau để tránh nhiễu số thực.
 */
export const vuotTran = (diemThucTe, tranDiem) => {
  const thucTe = Number(diemThucTe);
  const tran = Number(tranDiem);
  if (!Number.isFinite(thucTe) || !Number.isFinite(tran)) return false;
  return thucTe - tran > 0.005;
};
