import { canAccessPath } from "./menuConfig";

const DUONG_DAN = [
  "/quan-ly/ke-khai-thanh-tich",
  "/quan-ly/ke-khai-thanh-tich/12",
];

describe("phân quyền duyệt kê khai thành tích", () => {
  test.each(["TK", "TKL"])("không hiển thị và không cho %s mở URL trực tiếp", (role) => {
    DUONG_DAN.forEach((path) => {
      expect(canAccessPath(path, { MaChucVu: role })).toBe(false);
    });
  });

  test.each(["TP", "HT", "ADMIN"])("giữ quyền cho %s", (role) => {
    DUONG_DAN.forEach((path) => {
      expect(canAccessPath(path, { MaChucVu: role })).toBe(true);
    });
  });

  test("vẫn cho người kiêm nhiệm TP truy cập", () => {
    const user = {
      MaChucVu: "TK",
      DonVi: [{ IdDonVi: 7, MaChucVu: "TP" }],
    };

    DUONG_DAN.forEach((path) => {
      expect(canAccessPath(path, user)).toBe(true);
    });
  });
});
