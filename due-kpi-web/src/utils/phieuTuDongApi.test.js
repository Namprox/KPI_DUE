import { apiFetch } from "./api";
import { fetchDiemTuDongPhieu } from "./phieuTuDongApi";
import { diemHienThiTuDong, ghepDiemTuDongPhieu, thangDiemHienThiTuDong } from "./diemTuDongPhieu";

jest.mock("./api", () => ({ apiFetch: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

test.each([0, 3])("GET theo phiếu giữ envelope của phiếu quý %s và không gửi query", async (Quy) => {
  const body = { Success: true, IdPhieu: 812, Quy, LaPhieuNhanTuDong: false, IdPhieuNhanTuDong: 800, Message: "Phiếu 800 nhận điểm", Items: [] };
  apiFetch.mockResolvedValue({ ok: true, json: async () => body });
  await expect(fetchDiemTuDongPhieu(812)).resolves.toEqual(body);
  expect(apiFetch).toHaveBeenCalledWith("phieu/812/tu-dong", { signal: undefined });
});

test("404 hiện Không tìm thấy phiếu và không retry", async () => {
  apiFetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({ Message: "Ngoài phạm vi" }) });
  await expect(fetchDiemTuDongPhieu(812)).rejects.toMatchObject({ status: 404, message: "Không tìm thấy phiếu" });
  expect(apiFetch).toHaveBeenCalledTimes(1);
});

const row = { IdChiTiet: 99, IdTieuChi: 7, LoaiNguonDiem: 2, DiemChinhThuc: 0, CongThucSnapshot: "CTDT_HOI_DONG" };
const response = (item) => ({ Quy: 0, LaPhieuNhanTuDong: true, Items: [{ IdChiTiet: 99, IdTieuChi: 7, DiemChinhThuc: 0, DiemDaGhi: 0, DiemTuDong: 5, CanChamLai: true, IdThangDiemDaGhi: 11, IdThangDiemChon: 12, ...item }] });
test("ghép đúng IdChiTiet, không ghép chỉ vì cùng IdTieuChi", () => {
  const info = ghepDiemTuDongPhieu(response({ IdChiTiet: 100 }), [row])[7];
  expect(info.TuDongTheoPhieu).toBeUndefined();
  expect(diemHienThiTuDong(info).diem).toBe(0);
});
test.each([0, 3, null])("giữ điểm chính thức %s khi nguồn thay đổi", (DiemChinhThuc) => {
  const info = ghepDiemTuDongPhieu(response({ DiemChinhThuc }), [row])[7];
  expect(info.DiemTuDong).toBe(5);
  expect(diemHienThiTuDong(info)).toEqual({ diem: DiemChinhThuc, duKien: false });
  expect(thangDiemHienThiTuDong(info)).toBe(11);
});
test.each([0, 5])("engine chưa chạy: điểm %s là dự kiến", (DiemTuDong) => {
  const info = ghepDiemTuDongPhieu(response({ DiemDaGhi: undefined, DiemTuDong }), [row])[7];
  expect(diemHienThiTuDong(info)).toEqual({ diem: DiemTuDong, duKien: true });
  expect(thangDiemHienThiTuDong(info)).toBe(12);
});
test("mã không hỗ trợ tính lại vẫn giữ điểm chính thức", () => {
  const info = ghepDiemTuDongPhieu(response({ DiemTuDong: undefined, CanChamLai: false }), [row])[7];
  expect(diemHienThiTuDong(info)).toEqual({ diem: 0, duKien: false });
});
test("field chính thức vắng tương đương null, không dùng điểm cũ trong chi tiết", () => {
  const info = ghepDiemTuDongPhieu(response({ DiemChinhThuc: undefined }), [row])[7];
  expect(diemHienThiTuDong(info)).toEqual({ diem: null, duKien: false });
});
test("API không thay nguồn snapshot của dòng chấm tay; dữ liệu NCKH được giữ nguyên", () => {
  const extra = { DuLieuGioNckh: { TongGio: 300 }, DuLieuBaiBaoQuocTe: { BaiBao: [{ Id: 1 }] } };
  expect(ghepDiemTuDongPhieu(response(extra), [{ ...row, LoaiNguonDiem: 1 }])).toEqual({});
  expect(ghepDiemTuDongPhieu(response(extra), [row])[7]).toMatchObject(extra);
});
