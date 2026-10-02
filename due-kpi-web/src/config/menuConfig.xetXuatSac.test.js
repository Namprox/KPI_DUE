import { canAccessPath, visibleGroups } from "./menuConfig";
const path = "/truong/xet-xuat-sac-vien-chuc-khoa";
test.each([
  [{ MaChucVu: "HT" }, true], [{ MaChucVu: "ADMIN" }, true],
  [{ MaChucVu: "NV", DonVi: [{ MaChucVu: "HT", LaChinh: false }] }, true],
  [{ MaChucVu: "TK", DonVi: [{ MaChucVu: "Admin", LaChinh: false }] }, true],
  ...["TK", "TKL", "PTK", "PTKL", "PHT", "TP", "TKK", "NV"].map((MaChucVu) => [{ MaChucVu }, false]),
])("menu và URL tuân thủ HT/ADMIN: %j", (user, allowed) => {
  expect(canAccessPath(path, user)).toBe(allowed);
  expect(visibleGroups(user).some((g) => g.items.some((i) => i.path === path))).toBe(allowed);
});
