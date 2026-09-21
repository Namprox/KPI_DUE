import React from "react";
import { render, screen } from "@testing-library/react";
import HanNgachTheoNhom from "./HanNgachTheoNhom";
import BangHoSoToTrinh from "./BangHoSoToTrinh";

test("hiển thị suất còn trống và không tự thêm nhóm rỗng", () => {
  render(<HanNgachTheoNhom goi={{ NgayDongGoi: "2026", SoNguoiMuc3: 10, Nhom: [{ Nhom: 1, SoMauSo: 10, HanNgach: 2, SoDat: 1 }] }} />);
  expect(screen.getByText("1 / 2 suất")).toBeTruthy();
  expect(screen.queryByText("Cán bộ quản lý")).toBeNull();
});

test("ranh giới Top tính cả người thiếu điều kiện, độc lập từng nhóm", () => {
  const hoSo = [
    { IdPhieu: 1, HoTen: "GV A", NhomXepHang: 1, HangTrongKhoa: 1, DuDieuKienXuatSac: false },
    { IdPhieu: 2, HoTen: "GV B", NhomXepHang: 1, HangTrongKhoa: 2, DuDieuKienXuatSac: true },
    { IdPhieu: 3, HoTen: "VC C", LoaiDoiTuong: 2, NhomXepHang: 2, HangTrongKhoa: 1, DuDieuKienXuatSac: true },
  ];
  const goi = { NgayDongGoi: "2026", SoNguoiMuc3: 3, Nhom: [{ Nhom: 1, HanNgach: 1 }, { Nhom: 2, HanNgach: 1 }] };
  const { container, rerender } = render(<BangHoSoToTrinh goi={goi} hoSo={hoSo} />);
  const vach = container.querySelectorAll(".cd-row-vach-han-ngach");
  expect(vach).toHaveLength(2);
  expect(vach[0].textContent).toContain("GV A");
  expect(vach[1].textContent).toContain("VC C");
  rerender(<BangHoSoToTrinh goi={{ NgayDongGoi: "old" }} hoSo={hoSo} />);
  expect(screen.getByText("Hạng (quy tắc cũ)")).toBeTruthy();
  expect(container.querySelectorAll("table")).toHaveLength(1);
  expect(container.querySelectorAll(".cd-row-vach-han-ngach")).toHaveLength(0);
});

test("xem trước dùng NhomHienTai thay cho nhóm snapshot", () => {
  render(<BangHoSoToTrinh goi={{ Nhom: [{ Nhom: 3, HanNgachHienTai: 1 }] }} hoSo={[
    { IdPhieu: 1, HoTen: "A", NhomHienTai: 3, NhomXepHang: 1, HangTrongKhoa: 1 },
  ]} />);
  expect(screen.getByRole("heading", { name: "Cán bộ quản lý" })).toBeTruthy();
  expect(screen.queryByRole("heading", { name: "Giảng viên" })).toBeNull();
});
