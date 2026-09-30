import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import BaoCaoBoSung, { DanhSachChuaLap } from "./BaoCaoBoSung";
import { fetchBaoCaoChuaLapPhieu } from "../../utils/phieuApi";
jest.mock("../../utils/phieuApi", () => ({ fetchBaoCaoChuaLapPhieu: jest.fn() }));

test("tỷ lệ lập dùng nhân viên đơn vị chính, quý tương lai không cảnh báo", () => {
  const open = jest.fn();
  render(<BaoCaoBoSung onChuaLap={open} data={{ SoNhanVien: 10, SoChuaLapPhieu: 3, TongSoPhieu: 12,
    ApDungPhieuQuy: true, QuyHienTai: 1, PhieuQuy: [
      { Quy: 1, DaDenQuy: true, SoChuaLapPhieu: 3 },
      { Quy: 2, DaDenQuy: false, SoChuaLapPhieu: 10, DemTheoXepLoaiQuy: [{ MaXepLoai: 1, XepLoaiText: "Nhãn từ API", SoLuong: 0 }] },
    ] }} />);
  expect(screen.getByText("Nhân viên đã lập phiếu năm").closest(".cd-progress")).toHaveTextContent("7/10 (70%)");
  const future = screen.getByText("Quý 2 · Chưa đến quý").closest("article");
  expect(future).toHaveClass("bc-future");
  expect(future.querySelector(".bc-warning")).toBeNull();
  expect(within(future).getByText("Nhãn từ API: 0")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Xem danh sách quý 2" }));
  expect(open).toHaveBeenCalledWith({ quy: 2 });
});

test("drill-down giữ phạm vi, bộ lọc và tổng số qua các trang", async () => {
  fetchBaoCaoChuaLapPhieu.mockResolvedValueOnce({ TotalCount: 21, Items: [{ IdNhanVien: 1, HoTen: "Người trang đầu" }] })
    .mockResolvedValueOnce({ TotalCount: 21, Items: [{ IdNhanVien: 21, HoTen: "Người trang sau" }] });
  render(<DanhSachChuaLap idNam={2026} idDonVi={7} quy={2} loaiDoiTuong={2} onClose={jest.fn()} />);
  await screen.findByText("Người trang đầu");
  fireEvent.click(screen.getByRole("button", { name: "Trang sau" }));
  await screen.findByText("Người trang sau");
  expect(fetchBaoCaoChuaLapPhieu).toHaveBeenLastCalledWith({ idNam: 2026, idDonVi: 7, quy: 2, loaiDoiTuong: 2, page: 2, pageSize: 20 });
  expect(screen.getByRole("button", { name: "Trang sau" })).toBeDisabled();
});

test("bỏ kết quả request cũ khi đổi năm", async () => {
  let resolveOld;
  fetchBaoCaoChuaLapPhieu.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }))
    .mockResolvedValueOnce({ TotalCount: 0, Items: [] });
  const { rerender } = render(<DanhSachChuaLap key="2025" idNam={2025} onClose={jest.fn()} />);
  rerender(<DanhSachChuaLap key="2026" idNam={2026} onClose={jest.fn()} />);
  await screen.findByText("Không có người chưa lập phiếu trong trang này.");
  resolveOld({ TotalCount: 1, Items: [{ IdNhanVien: 1, HoTen: "Dữ liệu cũ" }] });
  await waitFor(() => expect(screen.queryByText("Dữ liệu cũ")).not.toBeInTheDocument());
});
