import React from "react";
import { render, screen, within } from "@testing-library/react";
import HanNgachTheoNhom from "./HanNgachTheoNhom";
import BangHoSoToTrinh from "./BangHoSoToTrinh";

const NHOM_BACKEND = [
  { Nhom: 2, SoNguoi: 15, SoNguoiMuc3: 4, SoMauSo: 4, HanNgach: 1, SoDat: 1 },
  { Nhom: 2, SoNguoi: 8, SoNguoiMuc3: 2, SoMauSo: 2, HanNgach: 1, SoDat: 1 },
  { Nhom: 2, SoNguoi: 8, SoNguoiMuc3: 0, SoMauSo: 0, HanNgach: 0, SoDat: 0 },
  { Nhom: 1, SoNguoi: 30, SoNguoiMuc3: 10, SoMauSo: 10, HanNgach: 2, SoDat: 1 },
  { Nhom: 3, SoNguoi: 3, SoMauSo: 3, HanNgach: 1, SoDat: 1 },
];

test.each(NHOM_BACKEND)("snapshot nhóm $Nhom, tổng $SoNguoi, mẫu số $SoMauSo hiển thị đúng số backend", (n) => {
  render(<HanNgachTheoNhom goi={{ NgayDongGoi: "2026-10-01", SoNguoiMuc3: n.SoNguoiMuc3 ?? 0, Nhom: [n] }} />);
  const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
  expect(cells[1].textContent).toBe(String(n.SoMauSo));
  expect(cells[2].textContent).toBe(`${n.SoDat} / ${n.HanNgach} suất`);
});

test.each(NHOM_BACKEND)("preview nhóm $Nhom, tổng $SoNguoi, mẫu số $SoMauSo dùng vế hiện tại", (n) => {
  const hienTai = Object.fromEntries(Object.entries(n).filter(([key]) => key !== "Nhom" && key !== "SoDat").map(([key, value]) => [`${key}HienTai`, value]));
  render(<HanNgachTheoNhom goi={{ Nhom: [{ ...n, ...hienTai }] }} />);
  const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
  expect(cells[1].textContent).toBe(String(n.SoMauSo));
  expect(cells[2].textContent).toBe(`- / ${n.HanNgach} suất`);
});

test("cảnh báo gói cũ khi chỉ mẫu số / hạn ngạch nhóm 2 thay đổi, biến mất sau khi đóng gói lại", () => {
  const n = {
    Nhom: 2, SoNguoi: 15, SoNguoiHienTai: 15,
    SoNguoiMuc3: 4, SoNguoiMuc3HienTai: 4,
    SoMauSo: 15, SoMauSoHienTai: 4,
    HanNgach: 3, HanNgachHienTai: 1, SoDat: 1,
  };
  const goi = { NgayDongGoi: "2026-09-30", SoNguoiMuc3: 4, Nhom: [n] };
  const { rerender } = render(<HanNgachTheoNhom goi={goi} />);
  expect(screen.getByText("Số liệu đã thay đổi, cần đóng gói lại.")).toBeTruthy();
  expect(screen.getByText("1 / 3 suất")).toBeTruthy();
  rerender(<HanNgachTheoNhom goi={{ ...goi, NgayDongGoi: "2026-10-01", Nhom: [{ ...n, SoMauSo: 4, HanNgach: 1 }] }} />);
  expect(screen.queryByText("Số liệu đã thay đổi, cần đóng gói lại.")).toBeNull();
  expect(screen.getByText("1 / 1 suất")).toBeTruthy();
});

test("key vắng hiển thị dấu gạch, khác 0, và giữ nguyên fallback nhóm legacy", () => {
  const { rerender } = render(<HanNgachTheoNhom goi={{ Nhom: [{ Nhom: 2, SoNguoiHienTai: 15, SoNguoiMuc3HienTai: 4 }] }} />);
  const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell");
  expect(cells[1].textContent).toBe("-");
  expect(cells[2].textContent).toBe("- / - suất");
  for (const goi of [{}, { Nhom: [] }, { NgayDongGoi: "old", Nhom: [{ Nhom: 2 }] }]) {
    rerender(<HanNgachTheoNhom goi={goi} />);
    expect(screen.queryByRole("table")).toBeNull();
  }
});

test("hồ sơ nhóm 2 vẫn hiện khi hạn ngạch 0 và không có vạch Top", () => {
  const { container } = render(<BangHoSoToTrinh goi={{ NgayDongGoi: "2026-10-01", SoNguoiMuc3: 0, Nhom: [NHOM_BACKEND[2]] }} hoSo={[
    { IdPhieu: 1, HoTen: "Viên chức A", NhomXepHang: 2, HangTrongKhoa: 1 },
  ]} />);
  expect(screen.getByRole("heading", { name: "Viên chức / NLĐ" })).toBeTruthy();
  expect(screen.getByText("Viên chức A")).toBeTruthy();
  expect(container.querySelectorAll(".cd-row-vach-han-ngach")).toHaveLength(0);
});

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
