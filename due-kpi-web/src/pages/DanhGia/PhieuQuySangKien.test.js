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
jest.mock("../../components/DanhGia/DanhGiaPhuLuc2/DanhGiaPhuLuc2Form", () => ({ autoScores, tongDiemCoBan }) => <div>
  <span data-testid="saved-score">{JSON.stringify(autoScores[1]?.DiemTuDong)}</span><span data-testid="total">{tongDiemCoBan}</span><span>{autoScores[1]?.MinhChung?.[0]?.TieuDe}</span>
</div>);
beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { IdNhanVien: 201, DonVi: [{ IdDonVi: 7, LoaiDoiTuong: 2, LaChinh: true }] } });
  fetchChiTietMauDanhGia.mockResolvedValue({ Nhom: [] });
  fetchDiemTuDongPhieu.mockResolvedValue({ Success: true, Items: [{ IdChiTiet: 8, IdTieuChi: 1, CongThucTongHop: "TTVT_SANG_KIEN", DiemTuDong: 30, MinhChung: [{ LoaiNguon: 12, MaNguon: 12, TieuDe: "Minh chứng nguồn hiện tại" }] }] });
});
test.each(["TTVT_SANG_KIEN", "TTVT_KHEN_THUONG"].flatMap((code) => [0, null, undefined].map((score) => [code, score])))("phiếu quý giữ điểm %s = %s đã lưu khi preview nguồn mới là 30", async (code, score) => {
  fetchPhieuQuyCuaToi.mockResolvedValue({ IdPhieu: 7, IdMau: 2, IdNhanVien: 201, TrangThai: 2, ChiTiet: [{ IdChiTiet: 8, IdTieuChi: 1, LoaiNguonDiem: 2, CongThucSnapshot: code, DiemTuDong: score, DiemTuDanhGia: 20 }] });
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><PhieuQuyCuaToi namList={[{ IdNam: 2026 }]} selectedYear={2026} onYearChange={jest.fn()} template={{ IdMau: 2 }} /></MemoryRouter>);
  await screen.findByText("Minh chứng nguồn hiện tại");
  await waitFor(() => expect(screen.getByTestId("saved-score")).toHaveTextContent(score === 0 ? "0" : "null"));
  expect(screen.getByTestId("total")).toHaveTextContent("0");
  expect(fetchDiemTuDongPhieu).toHaveBeenCalledWith(7);
});
