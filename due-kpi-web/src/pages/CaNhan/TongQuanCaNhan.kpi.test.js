import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TongQuanCaNhan from "./TongQuanCaNhan";
import { useAuth } from "../../context/AuthContext";
import { fetchPhieuCuaToi } from "../../utils/phieuApi";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("primereact/toast", () => ({ Toast: () => null }));
jest.mock("../../hooks/useNamDanhGia", () => ({ useNamDanhGia: () => ({ namList: [{ IdNam: 2026 }], selectedNam: 2026, setSelectedNam: jest.fn(), dangTaiNam: false }) }));
jest.mock("../../utils/phieuApi", () => ({ ...jest.requireActual("../../utils/phieuApi"), fetchPhieuCuaToi: jest.fn() }));
jest.mock("../../components/QuanLyChamDiem/TongQuanKhoa", () => ({ controls }) => <div>Tổng quan Khoa{controls}</div>);
jest.mock("../../components/QuanLyChamDiem/TongQuanCapQuanLy", () => ({ controls }) => <div>Tổng quan quản lý{controls}</div>);
jest.mock("../../components/Common/SearchSelect", () => () => <div>Bộ lọc năm</div>);

beforeEach(() => fetchPhieuCuaToi.mockReset());
test.each(["NV", "TK", "TP"])("loại 0 chức vụ %s không gọi phiếu cá nhân và vẫn thấy dashboard đúng vai trò", (MaChucVu) => {
  useAuth.mockReturnValue({ user: { IdNhanVien: 7, MaChucVu, DonVi: [{ MaChucVu, LoaiDoiTuong: 0 }] } });
  render(<MemoryRouter><TongQuanCaNhan /></MemoryRouter>);
  expect(screen.getByText("Bạn không thuộc diện đánh giá KPI")).toBeTruthy();
  expect(fetchPhieuCuaToi).not.toHaveBeenCalled();
  expect(screen.queryByText("Danh sách phiếu của tôi")).toBeNull();
  if (MaChucVu === "TK") expect(screen.getByText("Tổng quan Khoa")).toBeTruthy();
  if (MaChucVu === "TP") expect(screen.getByText("Tổng quan quản lý")).toBeTruthy();
});

test.each([
  { MaChucVu: "ADMIN" },
  { MaChucVu: "TP", DonVi: [{ MaChucVu: "TP", MaDonVi: "P_KH", LoaiDoiTuong: 0 }] },
  { MaChucVu: "QTP", DonVi: [{ MaChucVu: "QTP", MaDonVi: "P_KH", LoaiDoiTuong: 0 }] },
  { MaChucVu: "TK", DonVi: [{ MaChucVu: "TK", MaDonVi: "K_KT", LoaiDoiTuong: 0 }, { MaChucVu: "QTP", MaDonVi: "P_KH", LoaiDoiTuong: 0 }] },
])("Tổng quan có đúng một nút đồng bộ cho người có quyền, kể cả không có KPI cá nhân %#", (user) => {
  useAuth.mockReturnValue({ user });
  render(<MemoryRouter><TongQuanCaNhan /></MemoryRouter>);
  expect(screen.getAllByRole("button", { name: "Đồng bộ dữ liệu NCKH" })).toHaveLength(1);
  expect(fetchPhieuCuaToi).not.toHaveBeenCalled();
});
