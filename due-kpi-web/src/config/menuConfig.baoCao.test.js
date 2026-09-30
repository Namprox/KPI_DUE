import { canAccessPath, visibleGroups } from "./menuConfig";

test.each(["TKK", "TKP", "TK", "TKL", "TP", "HT", "ADMIN"])("%s xem báo cáo qua menu và URL", (MaChucVu) => {
  const user = { MaChucVu, DonVi: [{ IdDonVi: 10, MaChucVu }] };
  expect(canAccessPath("/quan-ly/bao-cao", user)).toBe(true);
  expect(visibleGroups(user).flatMap((g) => g.items).map((r) => r.path)).toContain("/quan-ly/bao-cao");
});

test("nhân viên không được vào báo cáo quản lý", () => {
  expect(canAccessPath("/quan-ly/bao-cao", { MaChucVu: "NV", DonVi: [{ MaChucVu: "NV", LoaiDoiTuong: 2 }] })).toBe(false);
});
