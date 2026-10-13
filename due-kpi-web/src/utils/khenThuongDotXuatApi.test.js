import { apiFetch } from "./api";
import * as api from "./khenThuongDotXuatApi";
jest.mock("./api", () => ({ apiFetch: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); apiFetch.mockResolvedValue({ ok: true, json: async () => ({ Success: true }) }); });

test("bộ lọc, false và lý do xóa được truyền đúng hợp đồng", async () => {
  await api.layMucKhenThuong({ baoGomNgungDung: false });
  await api.layKhenThuongDotXuat({ idNam: 2026, quy: 1, idMuc: 12, idDonVi: "", tuKhoa: "A & B", page: 1, pageSize: 20 });
  await api.xoaKhenThuongDotXuat(31, "Sai & trùng");
  expect(apiFetch.mock.calls.map((c) => c[0])).toEqual([
    "khen-thuong-dot-xuat/muc?baoGomNgungDung=false",
    "khen-thuong-dot-xuat?idNam=2026&quy=1&idMuc=12&tuKhoa=A+%26+B&page=1&pageSize=20",
    "khen-thuong-dot-xuat/31?lyDo=Sai+%26+tr%C3%B9ng",
  ]);
});
test.each([[403, "FORBIDDEN"], [404, "NOT_FOUND"], [409, "TRUNG_BAN_GHI"], [422, "MUC_NGUNG_DUNG"], [400, "NAM_KHEN_KHONG_HOP_LE"]])("HTTP %s giữ Message và ErrorCode", async (status, errorCode) => {
  apiFetch.mockResolvedValue({ ok: false, status, json: async () => ({ Success: false, ErrorCode: errorCode, Message: "Thông báo backend" }) });
  await expect(api.themKhenThuongDotXuat({})).rejects.toMatchObject({ status, errorCode, message: "Thông báo backend" });
});
test("không nhận response thiếu Success là thành công", async () => {
  apiFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ DuocNhap: true }) });
  await expect(api.layQuyenKhenThuong()).rejects.toThrow();
});
