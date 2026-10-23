import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { useQuyenDaoTao } from "../context/HoatDongDaoTaoContext";
import { useQuyenDoiNgu } from "../context/PhatTrienDoiNguContext";
import { useQuyenSangKien } from "../context/SangKienContext";
import { useQuyenNhiemVuPhucVu } from "../context/NhiemVuPhucVuContext";

jest.mock("../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../context/HoatDongDaoTaoContext", () => ({ useQuyenDaoTao: jest.fn() }));
jest.mock("../context/PhatTrienDoiNguContext", () => ({ useQuyenDoiNgu: jest.fn() }));
jest.mock("../context/SangKienContext", () => ({ useQuyenSangKien: jest.fn() }));
jest.mock("../context/ThanhTichDoanTheContext", () => ({ useQuyenDoanThe: () => ({ quyen: null }) }));
jest.mock("../context/NhiemVuPhucVuContext", () => ({ useQuyenNhiemVuPhucVu: jest.fn() }));

beforeEach(() => {
  useAuth.mockReturnValue({ user: { MaChucVu: "ADMIN" } });
  useQuyenDaoTao.mockReturnValue({ quyen: { LaQuanLy: true, XemTatCa: true } });
  useQuyenDoiNgu.mockReturnValue({ quyen: { LaQuanLy: true, XemTatCa: true } });
  useQuyenSangKien.mockReturnValue({ quyen: { LaQuanLy: true, XemTatCa: true } });
  useQuyenNhiemVuPhucVu.mockReturnValue({ quyen: null });
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
  ["/sang-kien/uy-quyen", "Ủy quyền nhập liệu sáng kiến", "Sáng kiến"],
])("%s chỉ tô sáng mục ủy quyền", (path, delegation) => {
  show(path);
  expect(menuItem(delegation)).toHaveClass("active");
  expect(menuItem("Ủy quyền nhập liệu")).toHaveClass("active");
  // Mục cha nằm ở nhóm khác: nhóm đó không được tô sáng và (accordion) đang đóng.
  expect(menuItem("Hoạt động & thành tích")).not.toHaveClass("active");
  expect(screen.queryByText("Sáng kiến", { exact: true })).not.toBeInTheDocument();
});

test("hiện nhãn phân khu theo thứ tự cá nhân → quản trị", () => {
  useAuth.mockReturnValue({ user: { MaChucVu: "HT", DonVi: [{ MaChucVu: "HT", LoaiDoiTuong: 1 }] } });
  show("/");
  // Nhãn khu không có role riêng nên đọc thẳng theo class.
  // eslint-disable-next-line testing-library/no-node-access
  const labels = Array.from(document.querySelectorAll(".menu-section")).map((li) => li.textContent);
  expect(labels).toEqual(["Cá nhân", "Công việc đơn vị", "Cấp Trường", "Quản trị"]);
});

const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;
const truongKhoa = { MaChucVu: "TK", DonVi: [{ MaChucVu: "TK", LoaiDoiTuong: 1 }] };

test("nhóm chỉ còn một mục hiện thành link thẳng, bấm một lần là vào trang", () => {
  useAuth.mockReturnValue({ user: { MaChucVu: "TP", DonVi: [{ MaChucVu: "TP", LoaiDoiTuong: 2 }] } });
  render(
    <MemoryRouter initialEntries={["/"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Sidebar isCollapsed={false} setIsCollapsed={jest.fn()} isMobile={false} />
      <LocationProbe />
    </MemoryRouter>,
  );
  // TP chỉ thấy Ghi nhận vi phạm nhân viên trong "Vi phạm" và Người dùng trong "Tổ chức & hệ thống".
  expect(screen.queryByText("Vi phạm", { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText("Tổ chức & hệ thống", { exact: true })).not.toBeInTheDocument();
  expect(menuItem("Người dùng")).toHaveClass("menu-item");
  expect(menuItem("Ghi nhận vi phạm nhân viên")).not.toHaveClass("has-submenu");

  fireEvent.click(menuItem("Ghi nhận vi phạm nhân viên"));
  expect(screen.getByTestId("location")).toHaveTextContent("/ghi-nhan-vi-pham-nhan-vien");
  expect(menuItem("Ghi nhận vi phạm nhân viên")).toHaveClass("active");
  expect(menuItem("Người dùng")).not.toHaveClass("active");
});

test("link thẳng vẫn tô sáng khi mở trang con của mục", () => {
  useAuth.mockReturnValue({ user: truongKhoa });
  show("/quan-ly-nguoi-dung/chi-tiet/5");
  expect(menuItem("Người dùng")).toHaveClass("active");
});

test("nhóm nhiều mục vẫn giữ tiêu đề nhóm", () => {
  show("/");
  expect(menuItem("Thiết lập KPI")).toHaveClass("has-submenu");
  expect(menuItem("Tổ chức & hệ thống")).toHaveClass("has-submenu");
});

test("accordion: mở nhóm này thì đóng nhóm đang mở", () => {
  show("/quan-ly-nam-danh-gia");
  expect(screen.getByText("Định mức giảng viên", { exact: true })).toBeInTheDocument();
  fireEvent.click(menuItem("Tổ chức & hệ thống"));
  expect(screen.getByText("Nhật ký hệ thống", { exact: true })).toBeInTheDocument();
  expect(screen.queryByText("Định mức giảng viên", { exact: true })).not.toBeInTheDocument();
  fireEvent.click(menuItem("Tổ chức & hệ thống"));
  expect(screen.queryByText("Nhật ký hệ thống", { exact: true })).not.toBeInTheDocument();
});

test.each([
  ["/nhiem-vu-phuc-vu/quan-ly", "Nhiệm vụ PVCĐ", "Nhiệm vụ PVCĐ của tôi"],
  ["/nhiem-vu-phuc-vu", "Nhiệm vụ PVCĐ của tôi", "Nhiệm vụ PVCĐ"],
  ["/nhiem-vu-phuc-vu/42", "Nhiệm vụ PVCĐ của tôi", "Nhiệm vụ PVCĐ"],
])("%s chỉ tô sáng nhóm %s", (path, active, inactive) => {
  useAuth.mockReturnValue({ user: { MaChucVu: "TK", DonVi: [{ MaChucVu: "TK", LoaiDoiTuong: 1 }] } });
  useQuyenNhiemVuPhucVu.mockReturnValue({ quyen: { Xem: true, QuanLy: true } });
  show(path);
  expect(menuItem(active)).toHaveClass("active");
  expect(menuItem(inactive)).not.toHaveClass("active");
});

test.each([
  ["/hoat-dong-dao-tao/15", "Hoạt động đào tạo", "Ủy quyền nhập liệu đào tạo"],
  ["/phat-trien-doi-ngu/31", "Phát triển đội ngũ", "Ủy quyền nhập liệu phát triển đội ngũ"],
  ["/sang-kien/12", "Sáng kiến", "Ủy quyền nhập liệu sáng kiến"],
])("%s vẫn tô sáng mục danh sách khi xem chi tiết", (path, parent, delegation) => {
  show(path);
  expect(menuItem(parent)).toHaveClass("active");
  expect(menuItem("Hoạt động & thành tích")).toHaveClass("active");
  expect(menuItem("Ủy quyền nhập liệu")).not.toHaveClass("active");
  // Nhóm ủy quyền đang đóng (accordion) nên mục con không được render.
  expect(screen.queryByText(delegation, { exact: true })).not.toBeInTheDocument();
});

test.each([
  [true, false],
  [false, true],
  [false, false],
])("sidebar theo quyền riêng: đào tạo=%s, đội ngũ=%s", (daoTao, doiNgu) => {
  useQuyenDaoTao.mockReturnValue({ quyen: { LaQuanLy: daoTao } });
  useQuyenDoiNgu.mockReturnValue({ quyen: { LaQuanLy: doiNgu } });
  show("/hoat-dong-dao-tao");
  // Mục ủy quyền nằm ở nhóm riêng. Khi chỉ còn mục sáng kiến (từ beforeEach) thì
  // nhóm thành link thẳng, không còn tiêu đề để mở.
  const coTieuDeNhom = !!screen.queryByText("Ủy quyền nhập liệu", { exact: true });
  expect(coTieuDeNhom).toBe(daoTao || doiNgu);
  if (coTieuDeNhom) fireEvent.click(menuItem("Ủy quyền nhập liệu"));
  expect(screen.getByText("Ủy quyền nhập liệu sáng kiến", { exact: true })).toBeInTheDocument();
  expect(!!screen.queryByText("Ủy quyền nhập liệu đào tạo", { exact: true })).toBe(daoTao);
  expect(!!screen.queryByText("Ủy quyền nhập liệu phát triển đội ngũ", { exact: true })).toBe(doiNgu);
});
