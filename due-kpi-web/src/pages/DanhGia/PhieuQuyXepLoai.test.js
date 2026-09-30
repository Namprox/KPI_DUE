import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TongHopNam } from "./PhieuQuyCuaToi";
import { fetchTongHopPhieuQuy, fetchPhieuNamCuaToi, tongHopPhieuNamTuQuy } from "../../utils/phieuQuyApi";

jest.mock("../../utils/phieuQuyApi", () => ({
  fetchTongHopPhieuQuy: jest.fn(), fetchPhieuNamCuaToi: jest.fn(), tongHopPhieuNamTuQuy: jest.fn(),
}));
jest.mock("../../components/DanhGia/DanhGiaPhuLuc2/DanhGiaPhuLuc2Form", () => () => null);

const show = async (data) => {
  fetchTongHopPhieuQuy.mockResolvedValue(data);
  fetchPhieuNamCuaToi.mockResolvedValue({ IdPhieu: 7, RowVersion: "v1", TrangThai: 1 });
  render(<TongHopNam idNam={2026} idDonVi={1} idNhanVien={2} toast={jest.fn()} />);
  await screen.findByText("Xếp loại theo điểm");
};
beforeEach(() => jest.clearAllMocks());
test("thiếu field không suy xếp loại từ điểm", async () => {
  await show({ DiemTichLuyDuKien: 150 });
  expect(screen.getByText("Chưa có quý nào được chốt")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
test("hiện nguyên văn dự kiến và nhãn của bốn quý", async () => {
  await show({ XepLoaiNamDuKien: 3, XepLoaiNamDuKienText: "Nhãn API", Quy: [1,2,3,4].map(Quy => ({ Quy, DaChot: true, XepLoaiQuyText: `API quý ${Quy}` })) });
  expect(screen.getByText("Nhãn API (dự kiến)")).toBeInTheDocument();
  for (const q of [1,2,3,4]) expect(screen.getByText(`Xếp loại quý: API quý ${q}`)).toBeInTheDocument();
});
test.each([2,3])("ưu tiên đã lưu; chỉ cảnh báo nếu dự kiến %s khác 2", async (preview) => {
  await show({ XepLoaiTongHopQuy: 2, XepLoaiTongHopQuyText: "Đã lưu API", XepLoaiNamDuKien: preview, XepLoaiNamDuKienText: "Dự kiến API", NgayTongHopQuy: "2026-09-29T08:00:00" });
  expect(screen.getByText("Đã lưu API")).toBeInTheDocument();
  expect(screen.queryByText("Dự kiến API (dự kiến)")).not.toBeInTheDocument();
  expect(Boolean(screen.queryByRole("alert"))).toBe(preview !== 2);
});
test("hiện kết quả POST độc lập với dữ liệu GET sau refresh", async () => {
  tongHopPhieuNamTuQuy.mockResolvedValue({ XepLoaiTongHopQuy: 3, XepLoaiTongHopQuyText: "Kết quả POST" });
  await show({ SoQuyDaChot: 1 });
  fireEvent.click(screen.getByRole("button", { name: "Tổng hợp từ quý" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Xếp loại cả năm theo điểm: Kết quả POST");
  expect(tongHopPhieuNamTuQuy).toHaveBeenCalledWith(7, "v1");
});
