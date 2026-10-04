import { apiFetch } from "./api";
import * as api from "./phatTrienDoiNguApi";
jest.mock("./api", () => ({ apiFetch: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); apiFetch.mockResolvedValue({ ok: true, json: async () => ({ Success: true }) }); });
test("query bảo toàn false, lọc hạng mục và lý do được encode", async () => {
  await api.layHangMucDoiNgu({ idLoai: 3, baoGomNgungDung: false });
  await api.layPhatTrienDoiNgu({ idNam: 2026, idHangMuc: 8, tuKhoa: "A & B", idDonVi: "" });
  await api.xoaPhatTrienDoiNgu(31, "Sai & trùng");
  expect(apiFetch.mock.calls.map((c) => c[0])).toEqual(["phat-trien-doi-ngu/hang-muc?idLoai=3&baoGomNgungDung=false", "phat-trien-doi-ngu?idNam=2026&idHangMuc=8&tuKhoa=A+%26+B", "phat-trien-doi-ngu/31?lyDo=Sai+%26+tr%C3%B9ng"]);
});
test.each([409, 422])("HTTP %s giữ Message và ErrorCode", async (status) => {
  apiFetch.mockResolvedValue({ ok: false, status, json: async () => ({ Success: false, ErrorCode: "TRUNG_BAN_GHI", Message: "Đã tồn tại bản ghi" }) });
  await expect(api.themPhatTrienDoiNgu({ IdNam: 2026, IdHangMuc: 8, IdNhanViens: [210] })).rejects.toMatchObject({ status, errorCode: "TRUNG_BAN_GHI", message: "Đã tồn tại bản ghi" });
});
test("import gửi multipart và hai giá trị kiểm tra", async () => {
  const file = new File(["x"], "doi-ngu.xlsx");
  for (const preview of [true, false]) {
    await api.importDoiNgu(file, 2026, preview);
    const [url, options] = apiFetch.mock.calls.at(-1);
    expect(url).toBe("phat-trien-doi-ngu/import");
    expect(options.body.get("file")).toBe(file);
    expect(options.body.get("idNam")).toBe("2026");
    expect(options.body.get("chiKiemTra")).toBe(String(preview));
    expect(options.headers).toBeUndefined();
  }
});
test("tải mẫu nhận JSON lỗi quyền thì không tải file", async () => {
  apiFetch.mockResolvedValue({ ok: false, status: 403, headers: { get: () => "application/json" }, json: async () => ({ Message: "Không có quyền", ErrorCode: "FORBIDDEN" }) });
  await expect(api.taiMauDoiNgu()).rejects.toMatchObject({ status: 403, errorCode: "FORBIDDEN" });
});
