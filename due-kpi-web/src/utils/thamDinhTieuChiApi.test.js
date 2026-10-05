import { apiFetch } from "./api";
import { duyetThamDinhHangLoat, fetchCaNhanThamDinhTieuChi, fetchThamDinhTieuChi } from "./phieuApi";

jest.mock("./api", () => ({ apiFetch: jest.fn() }));
const ok = (body) => ({ ok: true, status: 200, json: async () => body });
beforeEach(() => apiFetch.mockReset());

test("gửi năm, tải tối đa 500 dòng theo FIFO và giữ nguyên field bị lược bỏ", async () => {
  apiFetch.mockResolvedValueOnce(ok({ Items: [{ IdTieuChi: 57, CoPhanQuyen: false }] }));
  expect(await fetchThamDinhTieuChi(2026)).toEqual([{ IdTieuChi: 57, CoPhanQuyen: false }]);
  expect(apiFetch).toHaveBeenLastCalledWith("tham-dinh/tieu-chi?idNam=2026");
  const dong = { IdChiTiet: 9, RowVersion: "AAAAAAAAB9E=" };
  apiFetch.mockResolvedValueOnce(ok({ Items: [dong], TongSoDong: 800 }));
  expect(await fetchCaNhanThamDinhTieuChi(57, { idNam: 2026 })).toEqual({ items: [dong], tongSoDong: 800 });
  expect(apiFetch).toHaveBeenLastCalledWith("tham-dinh/tieu-chi/57/ca-nhan?idNam=2026&page=1&pageSize=500&sortBy=cu_nhat");
});

test("HTTP 200 Success=false vẫn trả toàn bộ thành công một phần", async () => {
  const result = { Success: false, SoThanhCong: 1, SoThatBai: 1, KetQua: [{ IdChiTiet: 9, Success: true }, { IdChiTiet: 10, Success: false, ErrorCode: "CONCURRENCY_CONFLICT" }] };
  apiFetch.mockResolvedValue(ok(result));
  expect(await duyetThamDinhHangLoat({ items: [{ IdChiTiet: 9, RowVersion: "rv1", HoTen: "A" }, { IdChiTiet: 10, RowVersion: "rv2" }], nhanXet: "Đã đối chiếu" })).toEqual(result);
  const [url, init] = apiFetch.mock.calls[0];
  expect(url).toBe("tham-dinh/duyet-hang-loat");
  expect(init.method).toBe("POST");
  expect(JSON.parse(init.body)).toEqual({ NhanXet: "Đã đối chiếu", Items: [{ IdChiTiet: 9, RowVersion: "rv1" }, { IdChiTiet: 10, RowVersion: "rv2" }] });
});

test.each([
  [], [{ IdChiTiet: 0, RowVersion: "rv" }], [{ IdChiTiet: 9 }],
  [{ IdChiTiet: 9, RowVersion: "rv" }, { IdChiTiet: 9, RowVersion: "rv" }],
  Array.from({ length: 501 }, (_, i) => ({ IdChiTiet: i + 1, RowVersion: "rv" })),
].map((items) => ({ items })))("chặn request cả lô không hợp lệ trước khi gọi API %#", async ({ items }) => {
  await expect(duyetThamDinhHangLoat({ items })).rejects.toThrow();
  expect(apiFetch).not.toHaveBeenCalled();
});

test("chặn nhận xét quá 1000 ký tự", async () => {
  await expect(duyetThamDinhHangLoat({ items: [{ IdChiTiet: 9, RowVersion: "rv" }], nhanXet: "a".repeat(1001) })).rejects.toThrow("1000");
  expect(apiFetch).not.toHaveBeenCalled();
});
