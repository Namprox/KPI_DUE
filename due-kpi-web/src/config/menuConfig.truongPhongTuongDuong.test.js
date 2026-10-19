import { canAccessPath } from "./menuConfig";
import {
  canManageHocVu,
  ROLE_SETS,
  VAI_TRO_TRUONG_PHONG,
} from "../utils/roles";
import { laTruongPhongCuaPhieu, phongToiPhuTrach } from "../utils/phieuChamPermissions";
import { quyenPhieuPhong } from "../utils/phieuPhongApi";
import { canRecordViPham } from "../utils/viPhamPermissions";

const truongDonVi = (maChucVu, idDonVi = 10) => ({
  MaChucVu: maChucVu,
  IdDonVi: idDonVi,
  DonVi: [{ MaChucVu: maChucVu, IdDonVi: idDonVi }],
});

const cacMucCoTp = [
  "/quan-ly/tham-dinh",
  "/quan-ly/to-trinh",
  "/quan-ly/phieu-quy",
  "/quan-ly-nguoi-dung",
  "/quan-ly/cho-cham",
  "/ghi-nhan-vi-pham-nhan-vien",
  "/quan-ly/ke-khai-thanh-tich",
  "/kho-minh-chung-don-vi",
  "/danh-gia-kpi-phong",
  "/quan-ly/ho-so-nhan-vien",
  "/phieu-don-vi-cho-cham",
];

// Hai trang dữ liệu nguồn GIẢNG VIÊN nằm NGOÀI gói quyền của TP: lối vào gác
// bằng canViewTyLeGioGiang / canXemDiemTbPhanHoiSv - cấp Trường, cấp Khoa, và
// TP/QTP tại đúng P_DTBDCL. Trưởng Phòng / Trung tâm / Viện khác không thấy.
const cacMucNgoaiTruongPhong = [
  "/ty-le-hoan-thanh-gio-giang",
  "/diem-trung-binh-danh-gia-sinh-vien",
];

test.each(["TP", "QTP"])("%s tại P_DTBDCL vào được hai trang dữ liệu nguồn", (maChucVu) => {
  const tai = (MaDonVi) => ({
    MaChucVu: maChucVu,
    MaDonVi,
    DonVi: [{ MaChucVu: maChucVu, MaDonVi, IdDonVi: 23 }],
  });
  cacMucNgoaiTruongPhong.forEach((path) => {
    expect(canAccessPath(path, tai("P_DTBDCL"))).toBe(true);
    expect(canAccessPath(path, tai("P_KH"))).toBe(false);
  });
});

test.each(["QTP", "GD", "VT"])("%s có các mục và thao tác vốn mở cho TP", (maChucVu) => {
  const user = truongDonVi(maChucVu);
  expect(VAI_TRO_TRUONG_PHONG).toContain(maChucVu);
  expect(ROLE_SETS.TRUONG_DON_VI).toContain(maChucVu);
  cacMucCoTp.forEach((path) => expect(canAccessPath(path, user)).toBe(true));
  cacMucNgoaiTruongPhong.forEach((path) =>
    expect(canAccessPath(path, user)).toBe(false));
  expect(canAccessPath("/danh-gia-kpi-don-vi", user)).toBe(false);
  expect(phongToiPhuTrach(user)).toHaveLength(1);
  expect(laTruongPhongCuaPhieu(user, { IdDonVi: 10 })).toBe(true);
  expect(laTruongPhongCuaPhieu(user, { IdDonVi: 11 })).toBe(false);
  expect(quyenPhieuPhong({ TrangThai: 2, IdDonVi: 10 }, user).coTheDuyetDv).toBe(true);
  expect(canRecordViPham(user)).toBe(true);
});

test("mục theo đơn vị yêu cầu chức vụ và đơn vị trên cùng bổ nhiệm", () => {
  const user = {
    MaChucVu: "QTP",
    DonVi: [
      { MaChucVu: "QTP", IdDonVi: 10 },
      { MaChucVu: "TKP", IdDonVi: 23 },
    ],
  };
  expect(canAccessPath("/quan-ly-danh-gia-sinh-vien", user)).toBe(false);
  expect(canAccessPath("/quan-ly-danh-gia-sinh-vien", { MaChucVu: "NV", DonVi: [{ MaChucVu: "QTP", IdDonVi: 23, MaDonVi: "P_DTBDCL" }] })).toBe(true);
  expect(canAccessPath("/quan-ly-danh-gia-sinh-vien", { MaChucVu: "QTP", IdDonVi: 23, MaDonVi: "P_DTBDCL" })).toBe(true);
});

test("quản lý học vụ chỉ thêm QTP tại P_DTBDCL theo quyền backend", () => {
  const makeUser = (MaChucVu) => ({
    MaChucVu,
    MaDonVi: "P_DTBDCL",
    DonVi: [{ MaChucVu, MaDonVi: "P_DTBDCL", IdDonVi: 10 }],
  });
  expect(canManageHocVu(makeUser("QTP"))).toBe(true);
  expect(canManageHocVu(makeUser("GD"))).toBe(false);
  expect(canManageHocVu(makeUser("VT"))).toBe(false);
});
