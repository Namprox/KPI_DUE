import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import AppRoutes from "./AppRoutes";
import { useAuth } from "../context/AuthContext";
import { MENU_GROUPS, ROUTE_RULES, visibleGroups } from "../config/menuConfig";
import { apiFetch } from "../utils/api";

jest.mock("../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../pages/CaNhan/GioGiangCuaToi", () => () => <h1>Giờ giảng cá nhân</h1>);
jest.mock("../pages/QuanLyKeHoach/QL_GioGiang", () => () => <h1>Giờ TKB</h1>);
jest.mock("../pages/QuanLyKeHoach/TyLeHoanThanhGioGiang", () => () => <h1>Tỷ lệ giờ giảng</h1>);

const retiredPaths = [
  "/ke-khai-gio-quy-doi", "/quan-ly/ke-khai-gio-quy-doi",
  "/cong-viec-quy-doi", "/quan-ly/cong-viec-quy-doi",
];

function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

beforeEach(() => jest.clearAllMocks());

test.each([
  ["/ke-khai-gio-quy-doi", "/gio-giang-cua-toi", "GV", "Giờ giảng cá nhân"],
  ["/ke-khai-gio-quy-doi/tong-hop", "/gio-giang-cua-toi", "GV", "Giờ giảng cá nhân"],
  ["/quan-ly/ke-khai-gio-quy-doi", "/ty-le-hoan-thanh-gio-giang", "TK", "Tỷ lệ giờ giảng"],
  ["/quan-ly/ke-khai-gio-quy-doi/12", "/ty-le-hoan-thanh-gio-giang", "TP", "Tỷ lệ giờ giảng"],
  ["/quan-ly/ke-khai-gio-quy-doi/tong-hop", "/ty-le-hoan-thanh-gio-giang", "HT", "Tỷ lệ giờ giảng"],
  ["/cong-viec-quy-doi", "/quan-ly-gio-giang", "ADMIN", "Giờ TKB"],
  ["/quan-ly/cong-viec-quy-doi/12", "/quan-ly-gio-giang", "ADMIN", "Giờ TKB"],
])("bookmark %s chuyển sang %s", async (path, destination, MaChucVu, heading) => {
  useAuth.mockReturnValue({ user: { MaChucVu, DonVi: [{ MaChucVu, LoaiDoiTuong: 1 }] } });
  render(<MemoryRouter initialEntries={[path]}><AppRoutes /><Location /></MemoryRouter>);
  expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
  expect(screen.getByTestId("location")).toHaveTextContent(destination);
  expect(apiFetch).not.toHaveBeenCalled();
});

test("chuyển hướng vẫn áp dụng quyền của trang đích", async () => {
  useAuth.mockReturnValue({ user: { MaChucVu: "GV", DonVi: [{ MaChucVu: "GV", LoaiDoiTuong: 1 }] } });
  render(<MemoryRouter initialEntries={["/quan-ly/ke-khai-gio-quy-doi/12"]}><AppRoutes /><Location /></MemoryRouter>);
  expect(await screen.findByText("Bạn không có quyền truy cập trang này")).toBeInTheDocument();
  expect(screen.getByTestId("location")).toHaveTextContent("/ty-le-hoan-thanh-gio-giang");
  expect(screen.queryByRole("heading", { name: "Tỷ lệ giờ giảng" })).not.toBeInTheDocument();
  expect(apiFetch).not.toHaveBeenCalled();
});

test.each(["GV", "TK", "TKL", "TP", "HT", "ADMIN"])("%s không còn menu hoặc guard của module đã gỡ", (MaChucVu) => {
  const user = { MaChucVu, MaChucDanh: "GV", DonVi: [{ MaChucVu, LoaiDoiTuong: 1 }] };
  const visible = visibleGroups(user).flatMap((group) => group.items);
  const configured = MENU_GROUPS.flatMap((group) => group.items);
  retiredPaths.forEach((path) => {
    expect(visible.some((item) => item.path.startsWith(path))).toBe(false);
    expect(configured.some((item) => item.path.startsWith(path))).toBe(false);
    expect(ROUTE_RULES.some((rule) => rule.path.startsWith(path))).toBe(false);
  });
});
