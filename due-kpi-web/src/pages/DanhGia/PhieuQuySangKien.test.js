import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PhieuQuyCuaToi from "./PhieuQuyCuaToi";
import { useAuth } from "../../context/AuthContext";
import { fetchPhieuQuyCuaToi, fetchChiTietMauDanhGia } from "../../utils/phieuQuyApi";
import { fetchDiemTuDongPhieu } from "../../utils/phieuTuDongApi";
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../utils/phieuQuyApi", () => ({ ...jest.requireActual("../../utils/phieuQuyApi"), fetchPhieuQuyCuaToi: jest.fn(), fetchChiTietMauDanhGia: jest.fn() }));
jest.mock("../../utils/phieuTuDongApi", () => ({ fetchDiemTuDongPhieu: jest.fn() }));
jest.mock("primereact/toast", () => ({ Toast: () => null }));
jest.mock("../../components/DanhGia/DanhGiaPhuLuc2/DanhGiaPhuLuc2Form", () => ({ autoScores, tongDiemCoBan }) => {
  const { diemHienThiTuDong } = jest.requireActual("../../utils/diemTuDongPhieu");
  return <div>
    <span data-testid="score">{JSON.stringify(diemHienThiTuDong(autoScores[1]))}</span><span data-testid="total">{tongDiemCoBan}</span><span>{autoScores[1]?.MinhChung?.[0]?.TieuDe}</span>
  </div>;
});
const item = { IdChiTiet: 8, IdTieuChi: 1, DiemTuDong: 30, MinhChung: [{ LoaiNguon: 12, MaNguon: 12, TieuDe: "Minh chứng nguồn hiện tại" }] };
const phieu = (code, extra) => ({ IdPhieu: 7, IdMau: 2, IdNhanVien: 201, TrangThai: 2, ChiTiet: [{ IdChiTiet: 8, IdTieuChi: 1, LoaiNguonDiem: 2, CongThucSnapshot: code, DiemTuDanhGia: 20, ...extra }] });
const show = () => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><PhieuQuyCuaToi namList={[{ IdNam: 2026 }]} selectedYear={2026} onYearChange={jest.fn()} template={{ IdMau: 2 }} /></MemoryRouter>);
beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { IdNhanVien: 201, DonVi: [{ IdDonVi: 7, LoaiDoiTuong: 2, LaChinh: true }] } });
  fetchChiTietMauDanhGia.mockResolvedValue({ Nhom: [] });
});
test.each(["TTVT_SANG_KIEN", "TTVT_KHEN_THUONG"])("phiếu quý %s giữ điểm đã ghi 0 khi nguồn mới tính được 30", async (code) => {
  fetchPhieuQuyCuaToi.mockResolvedValue(phieu(code, { DiemTuDong: 0, DiemChinhThuc: 0 }));
  fetchDiemTuDongPhieu.mockResolvedValue({ Success: true, Quy: 1, LaPhieuNhanTuDong: true, SoTieuChiTuDong: 1, Items: [{ ...item, CongThucTongHop: code, DiemDaGhi: 0, DiemChinhThuc: 0, CanChamLai: true }] });
  show();
  await screen.findByText("Minh chứng nguồn hiện tại");
  expect(screen.getByTestId("score")).toHaveTextContent('{"diem":0,"duKien":false}');
  expect(screen.getByTestId("total")).toHaveTextContent("0");
  expect(fetchDiemTuDongPhieu).toHaveBeenCalledWith(7);
});
test("engine chưa ghi dòng: hiện điểm dự kiến của `/tu-dong`", async () => {
  fetchPhieuQuyCuaToi.mockResolvedValue(phieu("TTVT_SANG_KIEN", { DiemTuDong: null }));
  fetchDiemTuDongPhieu.mockResolvedValue({ Success: true, Quy: 1, LaPhieuNhanTuDong: true, SoTieuChiTuDong: 1, Items: [{ ...item, CongThucTongHop: "TTVT_SANG_KIEN" }] });
  show();
  await screen.findByText("Minh chứng nguồn hiện tại");
  expect(screen.getByTestId("score")).toHaveTextContent('{"diem":30,"duKien":true}');
});
test("`/tu-dong` lỗi vẫn hiện điểm đã ghi trên phiếu và báo không tải được", async () => {
  fetchPhieuQuyCuaToi.mockResolvedValue(phieu("TTVT_SANG_KIEN", { DiemTuDong: 0 }));
  fetchDiemTuDongPhieu.mockRejectedValue(Object.assign(new Error("Không tải được điểm tự động và minh chứng"), { status: 500 }));
  show();
  expect(await screen.findByRole("alert")).toHaveTextContent("Không tải được điểm tự động và minh chứng");
  await waitFor(() => expect(screen.getByTestId("score")).toHaveTextContent('{"diem":0,"duKien":false}'));
});
