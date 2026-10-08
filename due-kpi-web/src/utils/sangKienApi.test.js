import { apiFetch } from "./api";
import { laySangKien, dongBoSangKien, xetGiangDaySangKien, xetCaiTienSangKien } from "./sangKienApi";
jest.mock("./api", () => ({ apiFetch: jest.fn() }));
const reply = (body, ok = true, status = 200) => ({ ok, status, json: async () => body });
beforeEach(() => { jest.clearAllMocks(); apiFetch.mockResolvedValue(reply({ Success: true })); });

test("lọc cấp 0, chưa xét 0 và boolean false không bị bỏ khỏi query", async () => {
  await laySangKien({ idNam: "", idCap: 0, trangThaiXet: 0, trangThaiCaiTien: 0, ghepTheoHoTen: true, baoGomKhongCon: false, tuKhoa: "A & B" });
  const params = new URLSearchParams(apiFetch.mock.calls[0][0].split("?")[1]);
  expect(Object.fromEntries(params)).toEqual({ idCap: "0", trangThaiXet: "0", trangThaiCaiTien: "0", ghepTheoHoTen: "true", baoGomKhongCon: "false", tuKhoa: "A & B" });
});
test("đồng bộ POST không body, không giới hạn theo năm", async () => {
  await dongBoSangKien();
  expect(apiFetch).toHaveBeenCalledWith("sang-kien/dong-bo", { method: "POST" });
});
test("xét giảng dạy gửi true / false / null tường minh", async () => {
  const Items = [true, false, null].map((value, i) => ({ IdSangKien: i + 1, LaDoiMoiGiangDay: value }));
  await xetGiangDaySangKien(Items);
  expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({ Items });
});
test("xét cải tiến dùng endpoint mới và GhiChu, giữ cả giá trị null", async () => {
  const Items = [true, false, null].map((value, i) => ({ IdSangKien: i + 1, LaCaiTienCongViec: value, GhiChu: i === 0 ? "QĐ 45" : null }));
  await xetCaiTienSangKien(Items);
  expect(apiFetch).toHaveBeenCalledWith("sang-kien/xet-cai-tien", { method: "POST", body: JSON.stringify({ Items }) });
});
test.each([[409, "DANG_DONG_BO"], [502, "NCKH_API_RONG"], [502, "NCKH_API_ERROR"], [403, "FORBIDDEN"], [404, "NOT_FOUND"]])("HTTP %s giữ mã lỗi %s và câu thông báo server", async (status, ErrorCode) => {
  apiFetch.mockResolvedValue(reply({ Success: false, ErrorCode, Message: "Thông báo chi tiết từ server" }, false, status));
  await expect(xetCaiTienSangKien([])).rejects.toMatchObject({ status, errorCode: ErrorCode, message: "Thông báo chi tiết từ server" });
});
