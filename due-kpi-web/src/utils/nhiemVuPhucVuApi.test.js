import { apiFetch } from "./api";
import * as api from "./nhiemVuPhucVuApi";
jest.mock("./api", () => ({ apiFetch: jest.fn() }));
const ok = (data) => ({ ok: true, json: async () => ({ Success: true, ...data }) });
beforeEach(() => apiFetch.mockReset());

test("danh sách gửi đúng bộ lọc và giữ envelope phân trang", async () => {
  apiFetch.mockResolvedValue(ok({ Items: [], TotalPages: 3, TotalCount: 41 }));
  const result = await api.layDanhSach({ idNam: 2026, idDonVi: "", nguon: 2, trangThai: 4, chiMoDangKy: true, page: 2, pageSize: 20 });
  expect(apiFetch.mock.calls[0][0]).toBe("nhiem-vu-phuc-vu?idNam=2026&nguon=2&trangThai=4&chiMoDangKy=true&page=2&pageSize=20");
  expect(result.TotalPages).toBe(3);
});
test.each(["dang-ky", "rut-dang-ky"])("%s không gửi người, vai trò, điểm hay RowVersion", async (action) => {
  apiFetch.mockResolvedValue(ok({ Item: { RowVersion: "new" } }));
  expect(await api.thaoTac({ IdNhiemVu: 9, RowVersion: "old" }, action)).toEqual({ RowVersion: "new" });
  expect(apiFetch).toHaveBeenCalledWith(`nhiem-vu-phuc-vu/9/${action}`, { method: "POST" });
});
test.each(["cong-bo", "trien-khai", "huy", "phan-cong", "gui-bao-cao", "tra-bao-cao", "chot"])("%s gửi phiên bản vừa đọc", async (action) => {
  apiFetch.mockResolvedValue(ok({ Item: { RowVersion: "next" } }));
  await api.thaoTac({ IdNhiemVu: 9, RowVersion: "latest" }, action, { LyDo: "Lý do", RowVersion: "stale" });
  expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({ LyDo: "Lý do", RowVersion: "latest" });
});
test("upload trả minh chứng nên phải đọc lại chi tiết lấy RowVersion", async () => {
  apiFetch.mockResolvedValueOnce(ok({ Item: { IdMinhChung: 77 } })).mockResolvedValueOnce(ok({ Item: { IdNhiemVu: 9, RowVersion: "new" } }));
  const file = new File(["%PDF-1.4"], "bien-ban.pdf", { type: "application/pdf" });
  expect(await api.taiMinhChung({ IdNhiemVu: 9 }, file, " Biên bản ")).toEqual({ IdNhiemVu: 9, RowVersion: "new" });
  expect(apiFetch.mock.calls[0][1].body.get("file")).toBe(file);
  expect(apiFetch.mock.calls[0][1].body.get("tenHienThi")).toBe("Biên bản");
  expect(apiFetch.mock.calls[1][0]).toBe("nhiem-vu-phuc-vu/9");
});
test("DELETE minh chứng không có body theo docs mới", async () => {
  apiFetch.mockResolvedValue(ok({ Item: { RowVersion: "new" } }));
  await api.xoaMinhChung(77);
  expect(apiFetch).toHaveBeenCalledWith("nhiem-vu-phuc-vu/minh-chung/77", { method: "DELETE" });
});
test.each([[409, "CONCURRENCY_CONFLICT"], [409, "HET_SUAT"], [403, "FORBIDDEN"], [422, "THIEU_CHU_TRI"]])("giữ lỗi %s %s để UI xử lý", async (status, ErrorCode) => {
  apiFetch.mockResolvedValue({ ok: false, status, json: async () => ({ Success: false, ErrorCode, Message: "Thông báo BE" }) });
  await expect(api.layNhiemVu(9)).rejects.toMatchObject({ status, code: ErrorCode, message: "Thông báo BE" });
});
test("ngày giờ Việt Nam không qua Date hoặc timezone trình duyệt", () => {
  expect(api.hienThiNgay("2026-11-05T17:00:00", true)).toBe("05/11/2026 17:00");
  expect(api.gioInput("2026-11-05T17:00:05+07:00")).toBe("2026-11-05T17:00:05");
});
test("phân công giữ suất tự đăng ký và loại suất đã rời; kiểm một CT và số lượng", () => {
  const current = api.thanhVienHienTai({ ThanhVien: [{ IdNhanVien: 1, MaVaiTro: "CT" }, { IdNhanVien: 2, MaVaiTro: "PH", NguonThamGia: 1 }, { IdNhanVien: 3, DaRoi: true }] });
  expect(current).toHaveLength(2);
  expect(api.loiPhanCong(current, 2)).toBe("");
  expect(api.loiPhanCong(current, 1)).toMatch(/vượt/);
  expect(api.loiPhanCong(current.map((v) => ({ ...v, MaVaiTro: "CT" })), 2)).toMatch(/một Chủ trì/);
});
test("upload kiểm giới hạn server, PDF, số lượng và tên", () => {
  const config = { AllowedExtensions: ["pdf"], MaxFileSizeKb: 1, MaxSoMinhChung: 2, MaxTenHienThiLength: 5 };
  const file = new File(["%PDF"], "a.pdf");
  expect(api.loiMinhChung(file, "", config, 0)).toBe("");
  expect(api.loiMinhChung(file, "", null, 0)).toMatch(/Chưa tải/);
  expect(api.loiMinhChung(new File(["x"], "a.png"), "", config, 0)).toMatch(/PDF/);
  expect(api.loiMinhChung(new File(["x".repeat(1025)], "a.pdf"), "", config, 0)).toMatch(/vượt/);
  expect(api.loiMinhChung(file, "", config, 2)).toMatch(/Tối đa/);
  expect(api.loiMinhChung(file, "123456", config, 0)).toMatch(/quá dài/);
});
