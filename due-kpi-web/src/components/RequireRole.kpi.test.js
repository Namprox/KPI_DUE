import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RequireRole from "./RequireRole";
import { useAuth } from "../context/AuthContext";
import { visibleGroups, canAccessPath } from "../config/menuConfig";
import { duongDanPhieuTuDanhGia, tenLoaiDoiTuongKpi } from "../utils/roles";

jest.mock("../context/AuthContext", () => ({ useAuth: jest.fn() }));

const personal = ["/danh-gia-phu-luc-2", "/danh-gia-kpi-nhan-vien", "/gio-giang-cua-toi", "/ke-khai-thanh-tich",
  "/thanh-tich-nckh", "/phan-hoi-sinh-vien-cua-toi", "/nhiem-vu-khoa-cua-toi", "/vi-pham-cua-toi", "/lich-su-danh-gia", "/lich-su-danh-gia/9"];
const guard = (path) => render(<MemoryRouter initialEntries={[path]}><RequireRole><div>Trang được mở</div></RequireRole></MemoryRouter>);

test.each(personal.flatMap((path) => ["HDLD_GV", "HDLD_HUU"].map((title) => [title, path])))("%s loại 0 ẩn menu và chặn URL %s", (MaChucDanh, path) => {
  const user = { MaChucDanh, DonVi: [{ MaChucVu: "NV", LoaiDoiTuong: 0 }, { MaChucVu: "NV", LoaiDoiTuong: 0 }] };
  useAuth.mockReturnValue({ user, loading: false });
  expect(visibleGroups(user).flatMap((g) => g.items.map((i) => i.path))).not.toContain(path);
  expect(canAccessPath(path, user)).toBe(false);
  guard(path);
  expect(screen.getByText("Bạn không thuộc diện đánh giá KPI")).toBeTruthy();
  expect(screen.queryByText("Trang được mở")).toBeNull();
  expect(duongDanPhieuTuDanhGia(user)).toBeNull();
});

test.each(["TK", "TP", "ADMIN", "HT"])("loại 0 giữ quyền quản lý của %s", (MaChucVu) => {
  const user = { MaChucVu, MaChucDanh: "HDLD_HUU", DonVi: [{ MaChucVu, LoaiDoiTuong: 0 }] };
  const paths = visibleGroups(user).flatMap((g) => g.items.map((i) => i.path));
  expect(paths).toContain("/quan-ly/bao-cao");
  expect(canAccessPath("/quan-ly/bao-cao", user)).toBe(true);
  expect(paths).not.toContain("/danh-gia-kpi-nhan-vien");
});

test.each([null, undefined, 3])("phân loại %s chặn an toàn và không báo là miễn KPI", (LoaiDoiTuong) => {
  useAuth.mockReturnValue({ user: { MaChucDanh: "GV", DonVi: [{ LoaiDoiTuong }] }, loading: false });
  guard("/nhiem-vu-khoa-cua-toi");
  expect(screen.getByText("Bạn không có quyền truy cập trang này")).toBeTruthy();
  expect(tenLoaiDoiTuongKpi(LoaiDoiTuong)).toBe("Chưa có phân loại đối tượng KPI");
});

test("kiêm nhiệm xét mọi đơn vị, không lấy đơn vị đầu và không bỏ quyền quản lý", () => {
  const user = { MaChucDanh: "CV", DonVi: [{ LoaiDoiTuong: 0 }, { MaChucVu: "TP", LoaiDoiTuong: 2 }, { MaChucVu: "NV", LoaiDoiTuong: 1 }] };
  useAuth.mockReturnValue({ user, loading: false });
  personal.forEach((path) => expect(canAccessPath(path, user)).toBe(true));
  guard("/nhiem-vu-khoa-cua-toi");
  expect(screen.getByText("Trang được mở")).toBeTruthy();
});

test("chờ auth/me trước khi hiển thị trang hoặc thông báo chặn", () => {
  useAuth.mockReturnValue({ user: null, loading: true });
  guard("/danh-gia-kpi-nhan-vien");
  expect(screen.getByText("Đang tải thông tin tài khoản...")).toBeTruthy();
  expect(screen.queryByText("Trang được mở")).toBeNull();
});

test("nhãn 0 khác dữ liệu chưa migrate", () => {
  expect(tenLoaiDoiTuongKpi(0)).toBe("Không thuộc diện đánh giá KPI");
  expect(tenLoaiDoiTuongKpi(null)).toBe("Chưa có phân loại đối tượng KPI");
});
