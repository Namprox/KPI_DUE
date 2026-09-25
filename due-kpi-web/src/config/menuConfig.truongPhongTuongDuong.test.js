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
  "/quan-ly/to-trinh",
  "/quan-ly/phieu-quy",
  "/quan-ly-nguoi-dung",
  "/quan-ly/cho-cham",
  "/ghi-nhan-vi-pham-nhan-vien",
  "/quan-ly/ke-khai-gio-quy-doi",
  "/quan-ly/ke-khai-thanh-tich",
  "/kho-minh-chung-don-vi",
  "/danh-gia-kpi-phong",
  "/quan-ly/ho-so-nhan-vien",
  "/phieu-don-vi-cho-cham",
];

test.each(["QTP", "GD", "VT"])("%s có các mục và thao tác vốn mở cho TP", (maChucVu) => {
  const user = truongDonVi(maChucVu);
  expect(VAI_TRO_TRUONG_PHONG).toContain(maChucVu);
  expect(ROLE_SETS.TRUONG_DON_VI).toContain(maChucVu);
  cacMucCoTp.forEach((path) => expect(canAccessPath(path, user)).toBe(true));
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
  expect(canAccessPath("/quan-ly-danh-gia-sinh-vien", truongDonVi("QTP", 23))).toBe(true);
  expect(canAccessPath("/quan-ly-danh-gia-sinh-vien", { MaChucVu: "QTP", IdDonVi: 23 })).toBe(true);
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
