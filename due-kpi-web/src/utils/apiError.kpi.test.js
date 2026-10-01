import { readApiError } from "./apiError";
import { luuNhiemVu } from "./nhiemVuKhoaApi";
import { createPhieuQuy } from "./phieuQuyApi";
import { apiFetch } from "./api";

jest.mock("./api", () => ({ apiFetch: jest.fn() }));
const failure = (status, ErrorCode, field = "Message") => ({ ok: false, status,
  json: async () => ({ Success: false, ErrorCode, [field]: "Nhan vien khong thuoc dien danh gia KPI" }) });
beforeEach(() => apiFetch.mockReset());

test.each([[409, "SAI_LOAI_DOI_TUONG"], [403, "NOT_GIANG_VIEN_KHOA"], [403, "NOT_VIEN_CHUC"], [409, undefined]])(
  "lỗi %s %s giữ thông điệp server", async (status, code) => {
    expect((await readApiError(failure(status, code))).message).toBe("Nhan vien khong thuoc dien danh gia KPI");
  });

test.each(["Message", "message"])("phiếu quý giữ %s của server cho SAI_LOAI_DOI_TUONG", async (field) => {
  apiFetch.mockResolvedValueOnce(failure(409, "SAI_LOAI_DOI_TUONG", field));
  await expect(createPhieuQuy({ IdNam: 2026, Quy: 1, IdMau: 2, IdDonVi: 7 })).rejects.toMatchObject({
    status: 409, errorCode: "SAI_LOAI_DOI_TUONG", message: "Nhan vien khong thuoc dien danh gia KPI",
  });
});

test.each([undefined, 12])("lưu nhiệm vụ id=%s giữ Message của GV_NGOAI_KHOA", async (id) => {
  apiFetch.mockResolvedValueOnce(failure(400, "GV_NGOAI_KHOA"));
  await expect(luuNhiemVu({ id, idNam: 2026, idDonVi: 7, idNhomNv: 2, tenNhiemVu: "Nhiệm vụ", phanCong: [] }))
    .rejects.toMatchObject({ status: 400, errorCode: "GV_NGOAI_KHOA", message: "Nhan vien khong thuoc dien danh gia KPI" });
});
