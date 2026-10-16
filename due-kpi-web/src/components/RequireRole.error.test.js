import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RequireRole from "./RequireRole";
import { useAuth } from "../context/AuthContext";
import { useQuyenDaoTao } from "../context/HoatDongDaoTaoContext";
import { NETWORK_ERROR_MESSAGE } from "../utils/api";

jest.mock("../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../context/HoatDongDaoTaoContext", () => ({ useQuyenDaoTao: jest.fn() }));

test("lỗi tải quyền hiện thẻ thông báo và nút thử lại", () => {
  const refresh = jest.fn();
  useAuth.mockReturnValue({ user: { MaChucVu: "TK", DonVi: [] }, loading: false });
  useQuyenDaoTao.mockReturnValue({ quyen: null, loading: false, error: NETWORK_ERROR_MESSAGE, refresh });
  render(<MemoryRouter initialEntries={["/hoat-dong-dao-tao/uy-quyen"]}><RequireRole><div>Trang được mở</div></RequireRole></MemoryRouter>);

  expect(screen.getByRole("alert").textContent).toContain("Không tải được quyền truy cập");
  expect(screen.getByText(NETWORK_ERROR_MESSAGE)).toBeTruthy();
  expect(screen.queryByText("Trang được mở")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  expect(refresh).toHaveBeenCalledTimes(1);
});
