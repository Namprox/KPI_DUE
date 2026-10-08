import { canAccessPath, visibleGroups } from "./menuConfig";

test.each(["TK", "TKL", "TP", "QTP", "GD", "VT", "ADMIN"])("%s thấy sidebar và truy cập URL chấm theo tiêu chí", (MaChucVu) => {
  const user = { MaChucVu };
  expect(canAccessPath("/quan-ly/tham-dinh", user)).toBe(true);
  expect(visibleGroups(user).flatMap((g) => g.items.map((i) => i.path))).toContain("/quan-ly/tham-dinh");
});
test.each(["GV", "NV", "TKK", "TKP", "PTK", "PTP", "HT", "PHT"])("%s không được cấp quyền ngoài hợp đồng BE", (MaChucVu) => {
  const user = { MaChucVu };
  expect(canAccessPath("/quan-ly/tham-dinh", user)).toBe(false);
  expect(visibleGroups(user).flatMap((g) => g.items.map((i) => i.path))).not.toContain("/quan-ly/tham-dinh");
});
test("nhận quyền trưởng đơn vị từ bổ nhiệm kiêm nhiệm", () => {
  expect(canAccessPath("/quan-ly/tham-dinh", { MaChucVu: "NV", DonVi: [{ MaChucVu: " tp " }] })).toBe(true);
  expect(canAccessPath("/quan-ly/tham-dinh", null)).toBe(false);
});
