import { laGoiLegacy, nhomHanNgachHienThi, snapshotHanNgachDaDoi, nhomDongHang, daChonDuSuatMoiNhom } from "./hanNgachXuatSac";
import { tinhXepLoaiGoiY } from "./phieuApi";
import { readApiError } from "./apiError";
import { coQuyenTaiDonVi, ROLE_SETS } from "./roles";
import { canAccessPath } from "../config/menuConfig";

test.each([[1, 100, 2], [1, 100.01, 3], [1, 100.99, 3], [2, 100.01, 2], [2, 100.99, 2], [2, 101, 3]])(
  "loại %s, điểm %s => mức %s", (loaiDoiTuong, tichLuy, muc) => {
    expect(tinhXepLoaiGoiY({ loaiDoiTuong, tichLuy, mucNckhcnQd838: 1 })).toBe(muc);
  },
);

test("viên chức không cần NCKH nhưng vẫn bị điều kiện pháp luật phủ quyết", () => {
  const input = { loaiDoiTuong: 2, tichLuy: 120, duDinhMucGioNckh: false };
  expect(tinhXepLoaiGoiY(input)).toBe(3);
  expect(tinhXepLoaiGoiY({ ...input, khongViPhamPhapLuat: false })).toBe(1);
});

test("preview đọc đúng vế hiện tại, không suy mẫu số từ đầu người", () => {
  const goi = { Nhom: [{ Nhom: 2, SoNguoiHienTai: 8, SoNguoiMuc3HienTai: 2, SoMauSoHienTai: 8, HanNgachHienTai: 1 }] };
  expect(laGoiLegacy(goi)).toBe(false);
  expect(nhomHanNgachHienThi(goi)[0]).toMatchObject({ SoMauSo: 8, HanNgach: 1, SoDat: undefined });
  expect(snapshotHanNgachDaDoi(goi)).toBe(false);
});

test("snapshot giữ suất bỏ trống, phát hiện thay đổi và nhóm xuất hiện / biến mất", () => {
  const n = { Nhom: 1, SoMauSo: 10, SoMauSoHienTai: 10, HanNgach: 2, HanNgachHienTai: 2, SoDat: 1 };
  const goi = { NgayDongGoi: "2026-09-19", SoNguoiMuc3: 10, Nhom: [n] };
  expect(nhomHanNgachHienThi(goi)[0]).toMatchObject({ SoDat: 1, HanNgach: 2 });
  expect(snapshotHanNgachDaDoi(goi)).toBe(false);
  expect(snapshotHanNgachDaDoi({ ...goi, Nhom: [{ ...n, SoMauSoHienTai: 11 }] })).toBe(true);
  expect(snapshotHanNgachDaDoi({ ...goi, Nhom: [{ Nhom: 3, SoMauSoHienTai: 3 }] })).toBe(true);
  expect(snapshotHanNgachDaDoi({ ...goi, Nhom: [{ Nhom: 3, SoMauSo: 3 }] })).toBe(true);
});

test.each([{ NgayDongGoi: "old", Nhom: [{ Nhom: 1 }] }, { SoNguoiMuc3: 3, Nhom: [] }, {}])("legacy không dựng nhóm từ chức vụ hiện tại", (goi) => {
  expect(laGoiLegacy(goi)).toBe(true);
  expect(nhomHanNgachHienThi(goi)).toEqual([]);
  expect(snapshotHanNgachDaDoi(goi)).toBe(false);
});

test("đồng hạng phải đủ suất từng nhóm, loại người chưa đủ điều kiện", async () => {
  const body = {
    ErrorCode: "DONG_HANG", Message: "Thông điệp hai nhóm",
    DongHang: { Nhom: 1, SoNhomDongHang: 2 },
    DongHangNhom: [{ Nhom: 1, SoSuatConLai: 1 }, { Nhom: 3, SoSuatConLai: 1 }],
    HoSo: [
      { IdPhieu: 1, NhomXepHang: 1, DuDieuKienXuatSac: true },
      { IdPhieu: 2, NhomXepHang: 1, DuDieuKienXuatSac: true },
      { IdPhieu: 3, NhomXepHang: 3, DuDieuKienXuatSac: false },
      { IdPhieu: 4, NhomXepHang: 3, DuDieuKienXuatSac: true },
    ],
  };
  const loi = await readApiError({ status: 409, json: async () => body });
  expect(loi.message).toBe(body.Message);
  const nhom = nhomDongHang(loi);
  expect(nhom).toHaveLength(2);
  expect(daChonDuSuatMoiNhom(nhom, [1, 2])).toBe(false);
  expect(daChonDuSuatMoiNhom(nhom, [1, 3])).toBe(false);
  expect(daChonDuSuatMoiNhom(nhom, [1, 4])).toBe(true);
  expect(nhomDongHang({ dongHang: body.DongHangNhom[0], hoSo: body.HoSo })).toHaveLength(1);
});

test("giữ nguyên Message ngưỡng điểm từ backend", async () => {
  const loi = await readApiError({ status: 409, json: async () => ({ ErrorCode: "DIEM_KHONG_DU", Message: "Viên chức cần từ 101 điểm" }) });
  expect(loi.message).toBe("Viên chức cần từ 101 điểm");
});

test("quyền tờ trình và ưu tiên: trưởng đúng đơn vị / ADMIN, không phải cấp phó", () => {
  for (const role of ["TK", "TKL", "TP", "ADMIN"]) {
    const user = { MaChucVu: role, DonVi: [{ IdDonVi: 7, MaChucVu: role }] };
    expect(canAccessPath("/quan-ly/to-trinh", user)).toBe(true);
    expect(coQuyenTaiDonVi(ROLE_SETS.TO_TRINH_DON_VI, 7, user)).toBe(true);
    expect(coQuyenTaiDonVi(ROLE_SETS.TO_TRINH_DON_VI, 8, user)).toBe(role === "ADMIN");
  }
  for (const role of ["PTK", "PTKL", "PTP"]) {
    const user = { MaChucVu: role, DonVi: [{ IdDonVi: 7, MaChucVu: role }] };
    expect(canAccessPath("/quan-ly/to-trinh", user)).toBe(false);
    expect(coQuyenTaiDonVi(ROLE_SETS.TO_TRINH_DON_VI, 7, user)).toBe(false);
  }
  const kiemNhiem = { MaChucVu: "PTK", DonVi: [{ IdDonVi: 7, MaChucVu: "PTK" }, { IdDonVi: 8, MaChucVu: "TP" }] };
  expect(coQuyenTaiDonVi(ROLE_SETS.TO_TRINH_DON_VI, 7, kiemNhiem)).toBe(false);
  expect(coQuyenTaiDonVi(ROLE_SETS.TO_TRINH_DON_VI, 8, kiemNhiem)).toBe(true);
});
