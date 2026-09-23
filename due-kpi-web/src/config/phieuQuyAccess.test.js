import { canAccessRule, findRouteRule } from "./menuConfig";

describe("phân quyền màn hình duyệt phiếu quý", () => {
  const rule = findRouteRule("/quan-ly/phieu-quy");

  test.each(["TP", "TK", "TKL", "ADMIN"])(
    "%s được mở menu và URL duyệt quý",
    (MaChucVu) => {
      expect(rule).toBeTruthy();
      expect(canAccessRule(rule, { MaChucVu })).toBe(true);
    },
  );

  test.each(["TKK", "TKP", "PTP", "PTK"])(
    "%s không có quyền duyệt quý",
    (MaChucVu) => {
      expect(canAccessRule(rule, { MaChucVu })).toBe(false);
    },
  );
});
