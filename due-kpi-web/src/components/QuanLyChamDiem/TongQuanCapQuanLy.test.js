import React from "react";
import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import TongQuanCapQuanLy from "./TongQuanCapQuanLy";
import {
  fetchBaoCaoPhongTongQuan,
  fetchBaoCaoToanTruong,
} from "../../utils/phieuApi";

jest.mock("../../utils/phieuApi", () => ({
  fetchBaoCaoPhongTongQuan: jest.fn(),
  fetchBaoCaoToanTruong: jest.fn(),
  TRANG_THAI_META: {
    1: { icon: "fa-pen" }, 2: { icon: "fa-clipboard-check" },
    3: { icon: "fa-hourglass-half" }, 4: { icon: "fa-user-check" },
    5: { icon: "fa-lock" },
  },
  XEP_LOAI_META: {
    2: { label: "Hoàn thành", className: "rating-medium" },
    4: { label: "Hoàn thành xuất sắc" },
  },
}));

const tongHop = {
  SoNhanVien: 10,
  SoChuaLapPhieu: 3,
  TongSoPhieu: 7,
  SoChoHtDuyet: 1,
  DemTheoTrangThai: [
    { TrangThai: 1, SoLuong: 2 },
    { TrangThai: 2, SoLuong: 1 },
    { TrangThai: 3, SoLuong: 1 },
    { TrangThai: 4, SoLuong: 1 },
    { TrangThai: 5, SoLuong: 2 },
  ],
};

test("tổng quan Phòng lấy toàn bộ phạm vi từ backend và không hiện phiếu quý khi chưa bật", async () => {
  fetchBaoCaoPhongTongQuan.mockResolvedValue({
    TongHop: tongHop,
    ApDungPhieuQuy: false,
    PhieuQuy: [],
    DonVi: [
      { IdDonVi: 10, TenDonVi: "Phòng A", SoNhanVien: 6, TrangThaiPhieuDv: null },
      { IdDonVi: 20, TenDonVi: "Phòng B", SoNhanVien: 4, TrangThaiPhieuDv: 4, TrangThaiToTrinh: 3 },
    ],
  });

  render(<TongQuanCapQuanLy idNam={2026} cap="phong" />);

  expect(await screen.findByText("Phòng B")).toBeInTheDocument();
  expect(screen.getByText("Phòng A")).toBeInTheDocument();
  expect(fetchBaoCaoPhongTongQuan).toHaveBeenCalledWith({ idNam: 2026 });
  expect(fetchBaoCaoToanTruong).not.toHaveBeenCalled();
  expect(screen.queryByText("Tiến độ phiếu quý của viên chức")).not.toBeInTheDocument();
  const phongA = within(screen.getByText("Phòng A").closest(".tqql-unit"));
  expect(phongA.getByText("Chưa có phiếu")).toBeInTheDocument();
  expect(phongA.getByText("Chưa có tờ trình")).toBeInTheDocument();
  expect(within(screen.getByText("Phòng B").closest(".tqql-unit")).getByText("HT đã duyệt, chờ chốt")).toBeInTheDocument();
  expect(screen.getByText("Đã nộp trong số phiếu đã lập").closest(".cd-progress").textContent).toContain("5/7");
});

test("tổng quan Trường hiển thị việc chờ HT, quý và tỷ lệ Khoa từ API", async () => {
  fetchBaoCaoToanTruong.mockResolvedValue({
    TongHop: tongHop,
    ApDungPhieuQuy: true,
    ChoHieuTruong: {
      SoToTrinhChoDuyet: 2,
      SoHoSoLanhDaoChoDuyet: 1,
      SoPhieuDonViChoDuyet: 3,
      SoPhieuDonViChoChot: 1,
    },
    DemTheoXepLoai: [{ XepLoai: "4", SoLuong: 2 }],
    HocVu: {
      SoKhoa: 1,
      NamNhapHocTotNghiep: 2022,
      NamNhapHocCanhBaoTu: 2023,
      NamNhapHocCanhBaoDen: 2026,
      TyLeTotNghiepDungHan: null,
      TyLeCanhBaoHocVu: null,
    },
    PhieuQuy: [{ Quy: 1, SoNhanVien: 10, SoChuaLapPhieu: 2, SoDangChamDiem: 3, SoChoDuyet: 4, SoDaChot: 1 }],
    DonVi: [{ IdDonVi: 30, TenDonVi: "Khoa C", LoaiDonVi: "KHOA", TrangThaiPhieuDv: 3, TongDiemPhieuDv: 0, XepLoaiPhieuDv: 2, TyLeTotNghiepDungHan: 82.5, TyLeCanhBaoHocVu: 5 }],
  });

  render(<TongQuanCapQuanLy idNam={2026} cap="truong" />);

  expect(await screen.findByText("Khoa C")).toBeInTheDocument();
  expect(fetchBaoCaoToanTruong).toHaveBeenCalledWith({ idNam: 2026 });
  expect(screen.getByLabelText("Việc chờ Hiệu trưởng")).toBeInTheDocument();
  expect(screen.getByText("Quý 1")).toBeInTheDocument();
  const khoa = within(screen.getByText("Khoa C").closest(".tqql-unit"));
  expect(khoa.getByText("82,5%")).toBeInTheDocument();
  expect(khoa.getByText("5%")).toBeInTheDocument();
  expect(khoa.getByText("Chờ Trường duyệt")).toBeInTheDocument();
  expect(khoa.getByText("Điểm phiếu đơn vị").parentElement).toHaveTextContent("0");
  expect(khoa.getByText("Hoàn thành")).toBeInTheDocument();
  expect(screen.getByText("Hoàn thành xuất sắc: 2")).toBeInTheDocument();
  expect(within(screen.getByLabelText("Tổng quan học vụ")).getAllByText("Chưa có dữ liệu")).toHaveLength(2);
});

test("ẩn thẻ thống kê tiến độ khi tài khoản kiêm nhiệm Trưởng khoa", async () => {
  fetchBaoCaoPhongTongQuan.mockResolvedValue({
    TongHop: tongHop,
    DonVi: [{ IdDonVi: 10, TenDonVi: "Phòng A", SoNhanVien: 10 }],
  });

  render(<TongQuanCapQuanLy idNam={2026} cap="phong" anThongKeTienDo />);

  expect(await screen.findByText("Phòng A")).toBeInTheDocument();
  expect(screen.queryByText("nhân viên theo đơn vị chính", { exact: false })).not.toBeInTheDocument();
  expect(screen.queryByText("Đã nộp trong số phiếu đã lập")).not.toBeInTheDocument();
  expect(screen.queryByText("Hoàn tất phiếu năm")).not.toBeInTheDocument();
  expect(screen.getByText("Chưa lập phiếu")).toBeInTheDocument();
});
