import { apiFetch } from "./api";
import { chotXetXuatSacVienChucKhoa, fetchXetXuatSacVienChucKhoa } from "./xetXuatSacVienChucKhoaApi";

jest.mock("./api", () => ({ apiFetch: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

test("GET giữ nguyên envelope PascalCase và thứ tự ứng viên", async () => {
  const data = { TongHop: { IdNam: 2026 }, UngVien: [{ IdPhieu: 9 }, { IdPhieu: 2 }] };
  apiFetch.mockResolvedValue({ ok: true, json: async () => data });
  expect(await fetchXetXuatSacVienChucKhoa(2026)).toEqual(data);
  expect(apiFetch).toHaveBeenCalledWith("xet-xuat-sac-vien-chuc-khoa?idNam=2026");
});

test("chốt lần đầu gửi [] rõ ràng, bỏ RowVersion vắng; lần sau gửi đầy đủ và phiên bản mới", async () => {
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ Success: true }) });
  await chotXetXuatSacVienChucKhoa({ idNam: "2026", idPhieuList: [] });
  expect(JSON.parse(apiFetch.mock.calls[0][1].body)).toEqual({ IdNam: 2026, IdPhieuList: [] });
  await chotXetXuatSacVienChucKhoa({ idNam: 2026, idPhieuList: [9, 2], rowVersion: "AAAAAAAAB9E=", ghiChu: "Biên bản" });
  expect(apiFetch.mock.calls[1][0]).toBe("xet-xuat-sac-vien-chuc-khoa/chot");
  expect(apiFetch.mock.calls[1][1].method).toBe("POST");
  expect(JSON.parse(apiFetch.mock.calls[1][1].body)).toEqual({ IdNam: 2026, IdPhieuList: [9, 2], RowVersion: "AAAAAAAAB9E=", GhiChu: "Biên bản" });
});

test("thiếu danh sách không được tự chuyển thành [] hay gửi request", async () => {
  await expect(chotXetXuatSacVienChucKhoa({ idNam: 2026 })).rejects.toThrow("đầy đủ danh sách");
  expect(apiFetch).not.toHaveBeenCalled();
});

test.each([
  ["CHUA_DU_HO_SO", "HoSoChuaDuyet", "hoSoChuaDuyet"],
  ["HO_SO_KHONG_HOP_LE", "HoSoKhongHopLe", "hoSoKhongHopLe"],
])("%s giữ Message BE và danh sách hồ sơ của luồng mới", async (code, field, errorField) => {
  const items = [{ IdPhieu: 812, LyDo: "Không còn là ứng viên" }];
  apiFetch.mockResolvedValue({ ok: false, status: 409, json: async () => ({ ErrorCode: code, Message: "Thông báo cấp Trường", [field]: items }) });
  await expect(chotXetXuatSacVienChucKhoa({ idNam: 2026, idPhieuList: [812] })).rejects.toMatchObject({ status: 409, errorCode: code, message: "Thông báo cấp Trường", [errorField]: items });
});
