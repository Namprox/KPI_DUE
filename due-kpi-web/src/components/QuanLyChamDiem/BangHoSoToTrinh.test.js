import React from "react";
import { render, screen, within } from "@testing-library/react";
import BangHoSoToTrinh from "./BangHoSoToTrinh";

test("viên chức chờ xét Trường không có kết quả cuối, ưu tiên hay quyền trả về; hồ sơ lãnh đạo vẫn chọn được", () => {
  const hoSo = [
    { IdPhieu: 1, HoTen: "Viên chức", TrangThai: 4, XetXuatSacCapTruong: true, ChoXetXuatSacTruong: true, XepLoai: 3, UuTienXuatSac: true, NhomXepHang: 2 },
    { IdPhieu: 2, HoTen: "Lãnh đạo", TrangThai: 4, CanHtDuyet: true, NhomXepHang: 3 },
    { IdPhieu: 3, HoTen: "Đã chốt cấp Trường", TrangThai: 5, XetXuatSacCapTruong: true, CanHtDuyet: false, NhomXepHang: 2 },
  ];
  const goi = { NgayDongGoi: "2026-10-01", SoNguoiMuc3: 3, Nhom: [{ Nhom: 2, HanNgach: 1 }, { Nhom: 3 }] };
  render(<BangHoSoToTrinh hoSo={hoSo} goi={goi} chonDuoc />);
  const vienChuc = screen.getByText("Viên chức").closest("tr");
  expect(within(vienChuc).getByRole("checkbox").disabled).toBe(true);
  expect(within(vienChuc).getByText("Chờ Hiệu trưởng xét xuất sắc")).toBeTruthy();
  expect(within(vienChuc).getByText("Chưa chốt")).toBeTruthy();
  expect(screen.queryByText(/Được ưu tiên/)).toBeNull();
  expect(screen.queryByText(/Top 1 của nhóm/)).toBeNull();
  expect(within(screen.getByText("Lãnh đạo").closest("tr")).getByRole("checkbox").disabled).toBe(false);
  expect(within(screen.getByText("Đã chốt cấp Trường").closest("tr")).getByText("Hoàn tất")).toBeTruthy();
});
