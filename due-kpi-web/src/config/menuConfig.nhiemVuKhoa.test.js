import { canAccessPath, visibleGroups } from "./menuConfig";
const path = "/quan-ly/nhiem-vu-khoa";
test.each([
  [{ MaChucVu: "TK" }, true],
  [{ MaChucVu: "TKL" }, true],
  [{ MaChucVu: "TLGVK" }, true],
  [{ MaChucVu: "TKK" }, false],
  [{ MaChucVu: "GV" }, false],
  [{ MaChucVu: "TKK", DonVi: [{ MaChucVu: "TK", IdDonVi: 7 }] }, true],
  [{ MaChucVu: "NV", DonVi: [{ MaChucVu: "TLGVK", IdDonVi: 7 }] }, true],
])("menu và URL nhiệm vụ Khoa cho %j = %s", (user, allowed) => {
  expect(canAccessPath(path, user)).toBe(allowed);
  expect(
    visibleGroups(user)
      .flatMap((group) => group.items.map((item) => item.path))
      .includes(path),
  ).toBe(allowed);
});
