import { apiFetch } from "./api";
import { dongGoiToTrinh } from "./toTrinhApi";
jest.mock("./api", () => ({ apiFetch: jest.fn() }));

test("đóng gói giữ riêng số hồ sơ chờ xét Trường và Message BE", async () => {
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ SoHoSoChoHt: 0, SoHoSoChoXetTruong: 3, SoHoSoHoanTat: 2, Message: "3 viên chức chờ xét xuất sắc cấp Trường." }) });
  expect(await dongGoiToTrinh(10, { rowVersion: "version" })).toMatchObject({ soHoSoChoHt: 0, soHoSoChoXetTruong: 3, soHoSoHoanTat: 2, message: "3 viên chức chờ xét xuất sắc cấp Trường." });
});
