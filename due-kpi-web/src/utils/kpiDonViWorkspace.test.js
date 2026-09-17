import { donViKpiCuaToi, timHoacTaoPhieu } from "./kpiDonViWorkspace";
import { fetchPhieuDonViList, taoPhieuDonVi } from "./phieuDonViApi";
import { canAccessPath } from "../config/menuConfig";

jest.mock("./phieuDonViApi", () => ({
  ...jest.requireActual("./phieuDonViApi"),
  fetchPhieuDonViList: jest.fn(), taoPhieuDonVi: jest.fn(),
}));
const user = { IdNhanVien: 1, DonVi: [
  { IdDonVi: 10, MaChucVu: "TKK" }, { IdDonVi: 20, MaChucVu: "TP" },
  { IdDonVi: 30, MaChucVu: "TKP" }, { IdDonVi: 30, MaChucVu: "TP" },
] };
const danhMuc = [
  { IdDonVi: 10, MaDonVi: "K_A" }, { IdDonVi: 20, MaDonVi: "P_B" },
  { IdDonVi: 30, MaDonVi: "TT_C" },
];
const args = { user, loai: "phong", idNam: 2026, idDonVi: 30 };
const phieu = { IdPhieuDv: 7, IdNam: 2026, IdDonVi: 30 };
beforeEach(() => jest.clearAllMocks());

test("route Khoa và Phòng mở đúng hai cấp của mình, kể cả URL chi tiết", () => {
  ["/danh-gia-kpi-don-vi", "/danh-gia-kpi-don-vi/7", "/lich-su-danh-gia-khoa", "/lich-su-danh-gia-khoa/7"].forEach((path) => {
    ["TKK", "TK", "TKL"].forEach((role) => expect(canAccessPath(path, { MaChucVu: role })).toBe(true));
    ["TKP", "TP", "HT", "ADMIN"].forEach((role) => expect(canAccessPath(path, { MaChucVu: role })).toBe(false));
  });
  ["/danh-gia-kpi-phong", "/danh-gia-kpi-phong/7", "/lich-su-danh-gia-phong", "/lich-su-danh-gia-phong/7"].forEach((path) => {
    ["TKP", "TP"].forEach((role) => expect(canAccessPath(path, { MaChucVu: role })).toBe(true));
    ["TKK", "TK", "TKL", "HT", "ADMIN"].forEach((role) => expect(canAccessPath(path, { MaChucVu: role })).toBe(false));
  });
});

test("lọc loại và chức vụ trên cùng đơn vị, khử trùng kiêm nhiệm", () => {
  expect(donViKpiCuaToi(user, danhMuc, "khoa").map((d) => d.IdDonVi)).toEqual([10]);
  // Trưởng Khoa vào cùng màn hình với thư ký, nhưng ở bước duyệt.
  expect(donViKpiCuaToi({ DonVi: [{ IdDonVi: 10, MaChucVu: "TK" }] }, danhMuc, "khoa").map((d) => d.IdDonVi)).toEqual([10]);
  expect(donViKpiCuaToi({ DonVi: [{ IdDonVi: 10, MaChucVu: "TK" }] }, danhMuc, "phong")).toHaveLength(0);
  expect(donViKpiCuaToi(user, danhMuc, "phong").map((d) => d.IdDonVi)).toEqual([20, 30]);
  expect(donViKpiCuaToi({ DonVi: [{ IdDonVi: 40, MaChucVu: "TKK", MaDonVi: "TNNCN" }] }, [], "khoa")).toHaveLength(1);
  expect(donViKpiCuaToi({ DonVi: [{ IdDonVi: 40, MaChucVu: "TKK" }] }, [], "khoa")).toHaveLength(0);
});
test("phiếu có sẵn không gọi tạo", async () => {
  fetchPhieuDonViList.mockResolvedValue([phieu]);
  expect(await timHoacTaoPhieu(args)).toEqual(phieu);
  expect(taoPhieuDonVi).not.toHaveBeenCalled();
});
test("TP không được tự tạo, dù có TKP tại đơn vị khác", async () => {
  fetchPhieuDonViList.mockResolvedValue([]);
  expect(await timHoacTaoPhieu({ ...args, idDonVi: 20 })).toBeNull();
  expect(taoPhieuDonVi).not.toHaveBeenCalled();
});
test("tra cứu lỗi hoặc lựa chọn hết hiệu lực không tạo phiếu", async () => {
  fetchPhieuDonViList.mockRejectedValueOnce(new Error("network"));
  await expect(timHoacTaoPhieu(args)).rejects.toThrow("network");
  fetchPhieuDonViList.mockResolvedValue([]);
  await timHoacTaoPhieu({ ...args, conHieuLuc: () => false });
  expect(taoPhieuDonVi).not.toHaveBeenCalled();
});
test("hai lượt tải đồng thời chỉ POST một lần", async () => {
  fetchPhieuDonViList.mockResolvedValue([]);
  let finish;
  taoPhieuDonVi.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const one = timHoacTaoPhieu(args);
  const two = timHoacTaoPhieu(args);
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(taoPhieuDonVi).toHaveBeenCalledTimes(1);
  finish(phieu);
  expect(await Promise.all([one, two])).toEqual([phieu, phieu]);
});
test("tạo bị trùng đọc lại đúng phiếu; thiếu mẫu vẫn báo lỗi", async () => {
  fetchPhieuDonViList.mockResolvedValueOnce([]).mockResolvedValueOnce([phieu]);
  taoPhieuDonVi.mockRejectedValueOnce(new Error("Trùng phiếu"));
  expect(await timHoacTaoPhieu(args)).toEqual(phieu);
  fetchPhieuDonViList.mockResolvedValue([]);
  taoPhieuDonVi.mockRejectedValueOnce(new Error("Thiếu mẫu đánh giá"));
  await expect(timHoacTaoPhieu(args)).rejects.toThrow("Thiếu mẫu đánh giá");
});
