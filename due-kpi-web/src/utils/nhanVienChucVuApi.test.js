import { apiFetch } from "./api";
import * as api from "./nhanVienChucVuApi";
jest.mock("./api", () => ({ apiFetch: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); apiFetch.mockResolvedValue({ ok: true, json: async () => ({ Success: true }) }); });

test("đường dẫn ủy quyền và quyền không cache", async () => {
  await api.layQuyenChucVu();
  await api.layNguoiNhapChucVu(false);
  await api.layNguoiNhapChucVu(true);
  await api.layUngVienChucVu();
  await api.capQuyenChucVu({ IdNhanVien: 7, GhiChu: null });
  await api.thuHoiQuyenChucVu(7);
  expect(apiFetch.mock.calls.map((c) => c[0])).toEqual([
    "nhan-vien-chuc-vu/quyen",
    "nhan-vien-chuc-vu/nguoi-nhap?baoGomDaThuHoi=false",
    "nhan-vien-chuc-vu/nguoi-nhap?baoGomDaThuHoi=true",
    "nhan-vien-chuc-vu/nguoi-nhap/ung-vien",
    "nhan-vien-chuc-vu/nguoi-nhap",
    "nhan-vien-chuc-vu/nguoi-nhap/7",
  ]);
  expect(apiFetch.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
  expect(JSON.parse(apiFetch.mock.calls[4][1].body)).toEqual({ IdNhanVien: 7, GhiChu: null });
});

test.each([[403, "FORBIDDEN"], [409, "DA_DUOC_CAP"], [422, "KHONG_THUOC_PHONG"]])("HTTP %s giữ Message và ErrorCode", async (status, errorCode) => {
  apiFetch.mockResolvedValue({ ok: false, status, json: async () => ({ Success: false, ErrorCode: errorCode, Message: "Không thực hiện được" }) });
  await expect(api.capQuyenChucVu({ IdNhanVien: 7 })).rejects.toMatchObject({ status, errorCode, message: "Không thực hiện được" });
});

test("Success=false với HTTP 200 vẫn là lỗi", async () => {
  apiFetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ Success: false, Message: "Thiếu IdNhanVien" }) });
  await expect(api.capQuyenChucVu({})).rejects.toThrow("Thiếu IdNhanVien");
});

// Ba mã 403 của đợt 2026-10-20 có câu hiển thị riêng, thắng Message của server;
// lỗi nghiệp vụ cũ không có ErrorCode nên vẫn hiện nguyên văn Message.
test("ErrorCode quyết định thông báo, không có thì dùng Message rồi mặc định", () => {
  expect(api.thongBaoLoiChucVu({ ErrorCode: "FORBIDDEN", Message: "forbidden" }, "mặc định")).toBe("Bạn không có quyền kê khai chức vụ.");
  expect(api.thongBaoLoiChucVu({ ErrorCode: "TU_SUA" }, "mặc định")).toMatch(/chính mình/);
  expect(api.thongBaoLoiChucVu({ ErrorCode: "CHUC_VU_ADMIN" }, "mặc định")).toMatch(/ADMIN/);
  expect(api.thongBaoLoiChucVu({ Message: "Đã có dòng hiệu lực trùng" }, "mặc định")).toBe("Đã có dòng hiệu lực trùng");
  expect(api.thongBaoLoiChucVu({ message: "lowercase từ bộ lọc token" }, "mặc định")).toBe("lowercase từ bộ lọc token");
  expect(api.thongBaoLoiChucVu({}, "mặc định")).toBe("mặc định");
  expect(api.thongBaoLoiChucVu(null, "mặc định")).toBe("mặc định");
});

test.each(["ADMIN", " admin ", "Admin"])("nhận ra chức vụ ADMIN bất kể hoa thường: %s", ma => {
  expect(api.laChucVuAdmin({ MaChucVu: ma })).toBe(true);
  expect(api.laChucVuAdmin({ ma_chuc_vu: ma })).toBe(true);
});
test.each([{ MaChucVu: "TP" }, { MaChucVu: null }, {}])("chức vụ thường không bị coi là ADMIN", cv => {
  expect(api.laChucVuAdmin(cv)).toBe(false);
});
