import { apiFetch } from "./api";
import { laySangKien, dongBoSangKien, themSangKien, suaSangKien, xetGiangDaySangKien, xoaSangKien } from "./sangKienApi";
jest.mock("./api", () => ({ apiFetch: jest.fn() }));
const reply = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });
beforeEach(() => { jest.clearAllMocks(); apiFetch.mockResolvedValue(reply({ Success: true })); });

test("lọc cấp 0, chưa xét 0 và boolean false không bị bỏ khỏi query", async () => {
  await laySangKien({ idNam: "", idCap: 0, trangThaiXet: 0, ghepTheoHoTen: true, baoGomKhongCon: false, tuKhoa: "A & B" });
  const params = new URLSearchParams(apiFetch.mock.calls[0][0].split("?")[1]);
  expect(Object.fromEntries(params)).toEqual({ idCap: "0", trangThaiXet: "0", ghepTheoHoTen: "true", baoGomKhongCon: "false", tuKhoa: "A & B" });
});
test("đồng bộ POST không body, không giới hạn theo năm", async () => {
  await dongBoSangKien();
  expect(apiFetch).toHaveBeenCalledWith("sang-kien/dong-bo", { method: "POST" });
});
test("tạo 201 và PUT thay toàn bộ tác giả, giữ null cho field bị xoá", async () => {
  apiFetch.mockResolvedValue(reply({ Success: true, IdSangKien: 12 }, true, 201));
  const body = { TenSangKien: "Quy trình", IdCap: 4, NgayCongNhan: "2026-03-15", IdNhanViens: [1, 2], SoChungNhan: null };
  expect((await themSangKien(body)).IdSangKien).toBe(12);
  await suaSangKien(12, body);
  expect(apiFetch.mock.calls.map(([url, options]) => [url, options.method, JSON.parse(options.body)])).toEqual([
    ["sang-kien", "POST", body], ["sang-kien/12", "PUT", body],
  ]);
});
test("xét gửi true / false / null tường minh và lý do xoá được encode", async () => {
  const Items = [true, false, null].map((value, i) => ({ IdSangKien: i + 1, LaDoiMoiGiangDay: value }));
  await xetGiangDaySangKien(Items);
  expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({ Items });
  await xoaSangKien(12, "Sai & trùng");
  expect(new URLSearchParams(apiFetch.mock.calls[1][0].split("?")[1]).get("lyDo")).toBe("Sai & trùng");
});
test.each([[409, "TRUNG_SANG_KIEN"], [409, "DANG_DONG_BO"], [422, "KHONG_PHAI_VIEN_CHUC"], [422, "DONG_DONG_BO"], [502, "NCKH_API_RONG"], [403, "FORBIDDEN"]])("HTTP %s giữ mã lỗi %s và câu thông báo server", async (status, ErrorCode) => {
  apiFetch.mockResolvedValue(reply({ Success: false, ErrorCode, Message: "Thông báo chi tiết từ server" }, false, status));
  await expect(themSangKien({})).rejects.toMatchObject({ status, errorCode: ErrorCode, message: "Thông báo chi tiết từ server" });
});
