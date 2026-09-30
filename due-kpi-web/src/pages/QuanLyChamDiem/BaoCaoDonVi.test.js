import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { apiFetch } from "../../utils/api";
import BaoCaoDonVi from "./BaoCaoDonVi";
import { fetchBaoCaoTongQuan, fetchBaoCaoChuaHoanTat, fetchBaoCaoDiemTrungBinh, fetchBaoCaoChuaLapPhieu } from "../../utils/phieuApi";
jest.mock("primereact/toast", () => ({ Toast: () => null }));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));
jest.mock("../../hooks/useNamDanhGia", () => ({ useNamDanhGia: () => ({ namList: [{ IdNam: 2026 }], selectedNam: 2026, setSelectedNam: jest.fn(), dangTaiNam: false }) }));
jest.mock("../../utils/api", () => ({ apiFetch: jest.fn().mockResolvedValue({ ok: true, json: async () => ({ Items: [] }) }) }));
jest.mock("../../utils/phieuApi", () => ({ ...jest.requireActual("../../utils/phieuApi"), fetchBaoCaoTongQuan: jest.fn(), fetchBaoCaoChuaHoanTat: jest.fn(), fetchBaoCaoDiemTrungBinh: jest.fn(), fetchBaoCaoChuaLapPhieu: jest.fn() }));
beforeEach(() => {
  jest.clearAllMocks();
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ Items: [] }) });
  fetchBaoCaoDiemTrungBinh.mockResolvedValue([{ IdDonVi: 10, TenDonVi: "Khoa A", LaTrucThuoc: true, SoPhieuGiangVien: 1, SoPhieuVienChuc: 0, DiemTrungBinhGiangVien: 0 }]);
});

test("TKK/TKP chỉ xem tổng hợp khi API không cấp quyền danh sách", async () => {
  fetchBaoCaoTongQuan.mockResolvedValue({ SoNhanVien: 10, TongSoPhieu: 0, SoChuaLapPhieu: 10, CoQuyenXemDanhSach: false });
  render(<BaoCaoDonVi />);
  await screen.findByText("Trực thuộc Khoa A");
  expect(fetchBaoCaoChuaHoanTat).not.toHaveBeenCalled();
  expect(fetchBaoCaoChuaLapPhieu).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /Xem người chưa lập/ })).not.toBeInTheDocument();
  const row = screen.getByText("Trực thuộc Khoa A").closest("tr");
  expect(within(row).getAllByRole("cell")[2]).toHaveTextContent("0");
  expect(within(row).getAllByRole("cell")[3]).toHaveTextContent("-");
});

test("dùng ngày ở trạng thái để cảnh báo; danh sách mới chỉ tải khi mở", async () => {
  fetchBaoCaoTongQuan.mockResolvedValue({ SoNhanVien: 10, SoChuaLapPhieu: 1, CoQuyenXemDanhSach: true });
  fetchBaoCaoChuaHoanTat.mockResolvedValue([{ IdPhieu: 5, HoTen: "Nhân viên A", TrangThaiText: "Đang kiểm tra", SoNgayTroi: 90, SoNgayOTrangThai: 2 }]);
  fetchBaoCaoChuaLapPhieu.mockResolvedValue({ Items: [], TotalCount: 0 });
  render(<BaoCaoDonVi />);
  await screen.findByText("Nhân viên A");
  expect(screen.getByText("2 ngày")).toBeInTheDocument();
  expect(screen.queryByText(/phiếu quá 30 ngày/)).not.toBeInTheDocument();
  expect(fetchBaoCaoChuaHoanTat).toHaveBeenCalledWith({ idNam: 2026, idDonVi: undefined });
  expect(fetchBaoCaoChuaLapPhieu).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Xem người chưa lập phiếu năm" }));
  await screen.findByText("Không có người chưa lập phiếu trong trang này.");
  expect(fetchBaoCaoChuaLapPhieu).toHaveBeenCalledWith(expect.objectContaining({ idNam: 2026, quy: 0, page: 1 }));
});
