import { canAccessPath, visibleGroups } from "./menuConfig";
import { quyenTuCauHinh } from "../utils/nhiemVuPhucVuApi";
const paths = (user, q) => visibleGroups(user, null, null, null, null, null, q).flatMap((g) => g.items.map((i) => i.path));
const access = (p, user, q) => canAccessPath(p, user, null, null, null, null, q);
test.each(["ADMIN", "PK", "TLGVK", "TK", "TKL", "HT", "PHT"])("%s không tự có quyền quản lý từ JWT", (MaChucVu) => {
  const user = { MaChucVu };
  expect(access("/nhiem-vu-phuc-vu/quan-ly", user, null)).toBe(false);
  expect(paths(user, { Xem: false, QuanLy: false })).not.toContain("/nhiem-vu-phuc-vu");
});
test("giảng viên có nhóm riêng, không có menu và URL quản lý", () => {
  const user = { MaChucVu: "GV" }, q = quyenTuCauHinh({ Khoa: [{ IdDonVi: 7, LaGiangVienKhoa: true }] });
  expect(paths(user, q)).toContain("/nhiem-vu-phuc-vu");
  // Nhóm một mục: sidebar hiện thẳng link cho giảng viên, không lẫn vào nhóm khác.
  const rieng = visibleGroups(user, null, null, null, null, null, q).find((g) => g.key === "nhiemVuPhucVuCuaToi");
  expect(rieng.items.map((i) => i.path)).toEqual(["/nhiem-vu-phuc-vu"]);
  expect(access("/nhiem-vu-phuc-vu/quan-ly", user, q)).toBe(false);
  expect(access("/nhiem-vu-phuc-vu/tong-hop", user, q)).toBe(false);
});
test.each([{ LaBanGiamHieu: true }, { Khoa: [{ IdDonVi: 1, LaTruongKhoa: false }, { IdDonVi: 7, LaTruongKhoa: true }] }])("quyền server BGH / TK kiêm nhiệm mở menu và URL cùng nhau", (config) => {
  const q = quyenTuCauHinh(config), user = { MaChucVu: "NV" };
  ["/nhiem-vu-phuc-vu", "/nhiem-vu-phuc-vu/quan-ly", "/nhiem-vu-phuc-vu/tong-hop"].forEach((p) => {
    expect(paths(user, q)).toContain(p); expect(access(p, user, q)).toBe(true);
  });
});
test("chi tiết minh chứng của thành viên cũ để BE kiểm quyền, không cần chức vụ hiện tại", () => {
  expect(access("/nhiem-vu-phuc-vu/123", { MaChucVu: "NV" }, null)).toBe(true);
  expect(access("/nhiem-vu-phuc-vu/123", null, null)).toBe(false);
});
