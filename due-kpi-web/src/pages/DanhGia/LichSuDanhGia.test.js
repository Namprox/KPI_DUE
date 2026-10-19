import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LichSuDanhGia from "./LichSuDanhGia";
import { useAuth } from "../../context/AuthContext";
import { fetchPhieuList } from "../../utils/phieuApi";
import { fetchDanhSachPhieuQuy } from "../../utils/phieuQuyApi";
import { fetchDonViList } from "../../utils/donViApi";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../hooks/useNamDanhGia", () => ({
  useNamDanhGia: () => ({
    namList: [{ IdNam: 2026 }],
    selectedNam: 2026,
    dangTaiNam: false,
  }),
}));
jest.mock("../../utils/phieuApi", () => ({
  ...jest.requireActual("../../utils/phieuApi"),
  fetchPhieuList: jest.fn(),
  fetchPhieuDetail: jest.fn(),
}));
jest.mock("../../utils/phieuQuyApi", () => ({
  ...jest.requireActual("../../utils/phieuQuyApi"),
  fetchDanhSachPhieuQuy: jest.fn(),
}));
jest.mock("../../utils/donViApi", () => ({
  ...jest.requireActual("../../utils/donViApi"),
  fetchDonViList: jest.fn(),
}));

const moTrang = () =>
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LichSuDanhGia />
    </MemoryRouter>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  fetchDonViList.mockResolvedValue([]);
  fetchPhieuList.mockResolvedValue([]);
  fetchDanhSachPhieuQuy.mockResolvedValue({ items: [], total: 0 });
});

test("giảng viên không thấy tab phiếu quý", async () => {
  useAuth.mockReturnValue({
    user: { IdNhanVien: 7, HoTen: "Phan Như Hiền", DonVi: [{ LoaiDoiTuong: 1 }] },
  });

  moTrang();

  await waitFor(() => expect(fetchPhieuList).toHaveBeenCalled());
  expect(screen.queryByRole("button", { name: /Phiếu quý/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /Phiếu năm/ })).toBeNull();
  expect(fetchDanhSachPhieuQuy).not.toHaveBeenCalled();
  expect(screen.getByText(/phiếu KPI năm/)).not.toHaveTextContent("theo quý");
});

test("viên chức vẫn thấy đủ hai tab", async () => {
  useAuth.mockReturnValue({
    user: { IdNhanVien: 9, HoTen: "Lê Viên Chức", DonVi: [{ LoaiDoiTuong: 2 }] },
  });

  moTrang();

  await waitFor(() => expect(fetchPhieuList).toHaveBeenCalled());
  expect(screen.getByRole("button", { name: /Phiếu quý/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Phiếu năm/ })).toBeInTheDocument();
});
