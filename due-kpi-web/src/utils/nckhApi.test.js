import { apiFetch } from "./api";
import { dongBoNckh, dongBoGioNckh, dongBoBaiBaoQuocTe } from "./nckhApi";

jest.mock("./api", () => ({ apiFetch: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  apiFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ Success: true }) });
});

test("đồng bộ gửi đúng POST và chỉ hai API theo năm có id_nam", async () => {
  await dongBoNckh("2026");
  await dongBoGioNckh();
  await dongBoBaiBaoQuocTe(2025);
  expect(apiFetch.mock.calls).toEqual([
    ["nckh/dong-bo?id_nam=2026", { method: "POST" }],
    ["nckh/gio-nckh/dong-bo", { method: "POST" }],
    ["nckh/bai-bao-quoc-te/dong-bo?id_nam=2025", { method: "POST" }],
  ]);
});

test.each([undefined, "", 0, -1, "2026&other=1", 2026.5])("không gọi API theo năm với năm không hợp lệ %s", (year) => {
  expect(() => dongBoNckh(year)).toThrow("Vui lòng chọn năm");
  expect(() => dongBoBaiBaoQuocTe(year)).toThrow("Vui lòng chọn năm");
  expect(apiFetch).not.toHaveBeenCalled();
});

test.each([[403, false], [409, false], [502, false], [200, true]])("giữ lỗi server HTTP %s và không coi Success=false là thành công", async (status, ok) => {
  apiFetch.mockResolvedValue({ ok, status, json: async () => ({ Success: false, Message: "Thông báo từ server", ErrorCode: "FORBIDDEN" }) });
  await expect(dongBoGioNckh()).rejects.toMatchObject({ status, errorCode: "FORBIDDEN", message: "Thông báo từ server" });
});

test("body không phải JSON trả lỗi dễ đọc", async () => {
  apiFetch.mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error("HTML"); } });
  await expect(dongBoGioNckh()).rejects.toMatchObject({ status: 502, message: "Không đồng bộ được dữ liệu NCKH." });
});
