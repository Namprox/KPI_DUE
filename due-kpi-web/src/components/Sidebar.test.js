import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { useQuyenDaoTao } from "../context/HoatDongDaoTaoContext";
import { useQuyenDoiNgu } from "../context/PhatTrienDoiNguContext";

jest.mock("../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../context/HoatDongDaoTaoContext", () => ({ useQuyenDaoTao: jest.fn() }));
jest.mock("../context/PhatTrienDoiNguContext", () => ({ useQuyenDoiNgu: jest.fn() }));
jest.mock("../context/ThanhTichDoanTheContext", () => ({ useQuyenDoanThe: () => ({ quyen: null }) }));

beforeEach(() => {
  useAuth.mockReturnValue({ user: { MaChucVu: "ADMIN" } });
  useQuyenDaoTao.mockReturnValue({ quyen: { LaQuanLy: true, XemTatCa: true } });
  useQuyenDoiNgu.mockReturnValue({ quyen: { LaQuanLy: true, XemTatCa: true } });
});

const show = (path) => render(
  <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Sidebar isCollapsed={false} setIsCollapsed={jest.fn()} isMobile={false} />
  </MemoryRouter>,
);

// Sidebar uses list items as navigation controls.
// eslint-disable-next-line testing-library/no-node-access
const menuItem = (name) => screen.getByText(name, { exact: true }).closest("li");

test.each([
  ["/hoat-dong-dao-tao/uy-quyen", "Ủy quyền nhập liệu đào tạo", "Hoạt động đào tạo"],
  ["/phat-trien-doi-ngu/uy-quyen", "Ủy quyền nhập liệu phát triển đội ngũ", "Phát triển đội ngũ"],
])("%s chỉ tô sáng mục ủy quyền", (path, delegation, parent) => {
  show(path);
  expect(menuItem(delegation)).toHaveClass("active");
  expect(menuItem(parent)).not.toHaveClass("active");
  expect(menuItem("Ghi nhận và số liệu KPI")).toHaveClass("active");
});

test.each([
  ["/hoat-dong-dao-tao/15", "Hoạt động đào tạo", "Ủy quyền nhập liệu đào tạo"],
  ["/phat-trien-doi-ngu/31", "Phát triển đội ngũ", "Ủy quyền nhập liệu phát triển đội ngũ"],
])("%s vẫn tô sáng mục danh sách khi xem chi tiết", (path, parent, delegation) => {
  show(path);
  expect(menuItem(parent)).toHaveClass("active");
  expect(menuItem(delegation)).not.toHaveClass("active");
});

test.each([
  [true, false],
  [false, true],
  [false, false],
])("sidebar theo quyền riêng: đào tạo=%s, đội ngũ=%s", (daoTao, doiNgu) => {
  useQuyenDaoTao.mockReturnValue({ quyen: { LaQuanLy: daoTao } });
  useQuyenDoiNgu.mockReturnValue({ quyen: { LaQuanLy: doiNgu } });
  show("/hoat-dong-dao-tao");
  expect(!!screen.queryByText("Ủy quyền nhập liệu đào tạo", { exact: true })).toBe(daoTao);
  expect(!!screen.queryByText("Ủy quyền nhập liệu phát triển đội ngũ", { exact: true })).toBe(doiNgu);
});
