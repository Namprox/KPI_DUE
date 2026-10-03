import { apiFetch } from "./api";
import { themThanhTichDoanThe, suaThanhTichDoanThe, importDoanThe, taiMauDoanThe, layThanhTichDoanThe, xoaThanhTichDoanThe } from "./thanhTichDoanTheApi";
jest.mock("./api", () => ({ apiFetch: jest.fn() }));
const reply = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });
beforeEach(() => { jest.clearAllMocks(); });

test("tạo nhiều giảng viên giữ PascalCase và đọc response 201", async () => {
  apiFetch.mockResolvedValue(reply({ Success: true, SoBanGhi: 2, IdThanhTichs: [8, 9] }, true, 201));
  const body = { IdNam: 2026, IdLoai: 1, NoiDung: "CTĐT", IdNhanViens: [210, 211] };
  expect((await themThanhTichDoanThe(body)).SoBanGhi).toBe(2);
  expect(apiFetch).toHaveBeenCalledWith("thanh-tich-doan-the", { method: "POST", body: JSON.stringify(body) });
});
test.each([[409, "TRUNG_BAN_GHI"], [422, "KHONG_PHAI_GIANG_VIEN"], [403, "FORBIDDEN"]])("giữ message chi tiết từ server HTTP %s", async (status, ErrorCode) => {
  apiFetch.mockResolvedValue(reply({ Success: false, ErrorCode, Message: "Nguyễn Văn A không hợp lệ" }, false, status));
  await expect(themThanhTichDoanThe({})).rejects.toMatchObject({ status, errorCode: ErrorCode, message: "Nguyễn Văn A không hợp lệ" });
});
test("PUT giữ null để xoá giá trị và CoThayDoi=false", async () => {
  apiFetch.mockResolvedValue(reply({ Success: true, CoThayDoi: false }));
  const body = { IdNam: 2026, IdLoai: 1, IdNhanVien: 210, NoiDung: "CTĐT", CoQuanGhiNhan: null, SoQuyetDinh: null, NgayQuyetDinh: null, GhiChu: null };
  expect((await suaThanhTichDoanThe(8, body)).CoThayDoi).toBe(false);
  expect(apiFetch.mock.calls[0][1].body).toBe(JSON.stringify(body));
});
test("import gửi cùng file và đủ 3 field, không ép Content-Type", async () => {
  apiFetch.mockResolvedValue(reply({ Success: true }));
  const file = new File(["excel"], "dao-tao.xlsx");
  await importDoanThe(file, 2026, true);
  await importDoanThe(file, 2026, false);
  apiFetch.mock.calls.forEach(([url, options], index) => {
    expect(url).toBe("thanh-tich-doan-the/import");
    expect(options.headers).toBeUndefined();
    expect(options.body.get("file")).toBe(file);
    expect(options.body.get("idNam")).toBe("2026");
    expect(options.body.get("chiKiemTra")).toBe(index === 0 ? "true" : "false");
  });
});
test("file mẫu trả JSON 403 hiển thị lỗi, không tải JSON như Excel", async () => {
  apiFetch.mockResolvedValue({ ...reply({ Message: "Không có quyền" }, false, 403), headers: new Headers({ "content-type": "application/json" }) });
  await expect(taiMauDoanThe()).rejects.toThrow("Không có quyền");
});
test("query mã hoá tìm kiếm/lý do và giữ false", async () => {
  apiFetch.mockResolvedValue(reply({ Success: true }));
  await layThanhTichDoanThe({ idNam: 2026, idLoai: "", tuKhoa: "A & B", page: 2 });
  await xoaThanhTichDoanThe(15, "Sai & trùng");
  expect(apiFetch.mock.calls[0][0]).toBe("thanh-tich-doan-the?idNam=2026&tuKhoa=A+%26+B&page=2");
  expect(new URLSearchParams(apiFetch.mock.calls[1][0].split("?")[1]).get("lyDo")).toBe("Sai & trùng");
});
