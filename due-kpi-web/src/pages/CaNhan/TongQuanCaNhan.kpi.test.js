import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TongQuanCaNhan from "./TongQuanCaNhan";
import { useAuth } from "../../context/AuthContext";
import { fetchPhieuCuaToi } from "../../utils/phieuApi";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../hooks/useNamDanhGia", () => ({ useNamDanhGia: () => ({ namList: [], selectedNam: 2026, setSelectedNam: jest.fn(), dangTaiNam: false }) }));
jest.mock("../../utils/phieuApi", () => ({ ...jest.requireActual("../../utils/phieuApi"), fetchPhieuCuaToi: jest.fn() }));
jest.mock("../../components/QuanLyChamDiem/TongQuanKhoa", () => () => <div>Tổng quan Khoa</div>);
jest.mock("../../components/QuanLyChamDiem/TongQuanCapQuanLy", () => () => <div>Tổng quan quản lý</div>);
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
