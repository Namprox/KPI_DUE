import { fetchDanhSachChuaLapPhieu, tinhChuaTuCham } from "./chuaLapPhieu";
import { apiFetch } from "./api";

jest.mock("./api", () => ({ apiFetch: jest.fn() }));
const ok = (Items, TotalCount) => ({ ok: true, json: async () => ({ Items, TotalCount }) });
beforeEach(() => apiFetch.mockReset());

test("lấy đủ trang báo cáo, không đọc danh bạ và giữ lọc đơn vị chính xác", async () => {
  apiFetch.mockResolvedValueOnce(ok([{ IdNhanVien: 1, IdDonVi: 7 }, { IdNhanVien: 2, IdDonVi: 8 }], 3))
    .mockResolvedValueOnce(ok([{ IdNhanVien: 3, IdDonVi: 7 }], 3));
  expect(await fetchDanhSachChuaLapPhieu({ idNam: 2026, idDonVi: 7, idDonViLoc: 7 })).toEqual([
    { IdNhanVien: 1, IdDonVi: 7 }, { IdNhanVien: 3, IdDonVi: 7 },
  ]);
  expect(apiFetch.mock.calls.map(([url]) => url)).toEqual([
    "bao-cao/chua-lap-phieu?idNam=2026&idDonVi=7&quy=0&page=1&pageSize=100",
    "bao-cao/chua-lap-phieu?idNam=2026&idDonVi=7&quy=0&page=2&pageSize=100",
  ]);
});

test("không suy người chưa lập bằng cách trừ phiếu khỏi danh bạ", () => {
  const result = tinhChuaTuCham({ chuaLapList: [{ IdNhanVien: 4, HoTen: "Người chưa lập", LoaiDoiTuong: 2, LoaiDoiTuongText: "Nhãn API" }],
    phieuList: [{ IdPhieu: 1, IdNhanVien: 1, HoTen: "Nháp", TrangThai: 1 }, { IdPhieu: 2, IdNhanVien: 2, TrangThai: 2 }] });
  expect(result.chuaLapPhieu).toHaveLength(1);
  expect(result.chuaLapPhieu[0]).toMatchObject({ IdNhanVien: 4, TrangThai: 0, LoaiDoiTuongText: "Nhãn API" });
  expect(result.phieuNhap).toHaveLength(1);
  expect(result.phieuNhap[0]).toMatchObject({ IdPhieu: 1, IdNhanVien: 1 });
});

test("lỗi báo cáo không biến thành danh sách không còn ai thiếu", async () => {
  apiFetch.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ message: "Không có quyền xem danh sách" }) });
  await expect(fetchDanhSachChuaLapPhieu({ idNam: 2026 })).rejects.toMatchObject({ message: "Không có quyền xem danh sách" });
});
