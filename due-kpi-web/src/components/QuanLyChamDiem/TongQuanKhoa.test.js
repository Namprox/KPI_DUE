import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TongQuanKhoa from "./TongQuanKhoa";
import { useAuth } from "../../context/AuthContext";
import {
  fetchBaoCaoChuaHoanTat,
  fetchBaoCaoChuaLapPhieu,
  fetchBaoCaoDiemTrungBinh,
  fetchBaoCaoTongQuan,
  fetchThamDinhPending,
} from "../../utils/phieuApi";
import { fetchToTrinhDetail, fetchToTrinhList } from "../../utils/toTrinhApi";
import { fetchPhieuDonViList } from "../../utils/phieuDonViApi";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../utils/phieuApi", () => ({
  ...jest.requireActual("../../utils/phieuApi"),
  fetchBaoCaoTongQuan: jest.fn(),
  fetchThamDinhPending: jest.fn(),
  fetchBaoCaoDiemTrungBinh: jest.fn(),
  fetchBaoCaoChuaHoanTat: jest.fn(),
  fetchBaoCaoChuaLapPhieu: jest.fn(),
}));
jest.mock("../../utils/toTrinhApi", () => ({
  ...jest.requireActual("../../utils/toTrinhApi"),
  fetchToTrinhDetail: jest.fn(),
  fetchToTrinhList: jest.fn(),
}));
jest.mock("../../utils/phieuDonViApi", () => ({
  ...jest.requireActual("../../utils/phieuDonViApi"),
  fetchPhieuDonViList: jest.fn(),
}));

const renderIn = (ui) =>
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter>);

const hocVu = {
  SoKhoa: 1,
  NamNhapHocTotNghiep: 2022,
  NamNhapHocCanhBaoTu: 2023,
  NamNhapHocCanhBaoDen: 2026,
  SoTotNghiepDungHan: 530,
  SoSvKhoaTotNghiep: 700,
  SoThoiHocKhoaTotNghiep: 34,
  SoSvBiCanhBao: 12,
  SoSvKhoaCanhBao: 2450,
  SoThoiHocKhoaCanhBao: 50,
  TyLeTotNghiepDungHan: 70,
  TyLeCanhBaoHocVu: 10,
};

beforeEach(() => {
  jest.clearAllMocks();
  fetchBaoCaoTongQuan.mockResolvedValue({
    SoNhanVien: 17,
    TongSoPhieu: 12,
    SoChuaLapPhieu: 5,
    CoQuyenXemDanhSach: false,
    DemTheoTrangThai: [{ TrangThai: 1, SoLuong: 4 }, { TrangThai: 3, SoLuong: 8 }],
    HocVu: hocVu,
  });
  fetchThamDinhPending.mockResolvedValue({ tongSoDong: 2 });
  fetchBaoCaoDiemTrungBinh.mockResolvedValue([]);
  fetchBaoCaoChuaHoanTat.mockResolvedValue([]);
  fetchBaoCaoChuaLapPhieu.mockResolvedValue({ TotalCount: 0, Items: [] });
  fetchToTrinhList.mockResolvedValue([]);
  fetchToTrinhDetail.mockResolvedValue(null);
  fetchPhieuDonViList.mockResolvedValue([]);
});

test("TKK xem số tổng hợp của Khoa nhưng không có thao tác dành cho Trưởng khoa", async () => {
  useAuth.mockReturnValue({
    user: { MaChucVu: "TKK", IdDonVi: 10, DonVi: [{ IdDonVi: 10, MaChucVu: "TKK" }] },
  });
  fetchToTrinhList.mockResolvedValue([
    { IdToTrinh: 7, IdDonVi: 10, IdNam: 2026, TenDonVi: "Khoa Kế toán", TrangThai: 1, SoHoSo: 12, SoHoSoDaChot: 0 },
  ]);
  fetchPhieuDonViList.mockResolvedValue([{ IdPhieuDv: 3, IdDonVi: 10, TrangThai: 1 }]);

  renderIn(<TongQuanKhoa idNam={2026} idDonVi={10} />);

  expect(await screen.findByText("Việc của thư ký")).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1, name: "Khoa Kế toán" })).toBeInTheDocument();
  expect(screen.getByRole("note")).toHaveTextContent("chỉ Trưởng khoa xem được");
  expect(screen.getByText("Thư ký đang nhập")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Tiếp tục nhập điểm" })).toHaveAttribute("href", "/danh-gia-kpi-don-vi");
  expect(screen.getByText("Khóa 48 · cảnh báo học vụ 10%")).toBeInTheDocument();

  expect(fetchBaoCaoTongQuan).toHaveBeenCalledWith({ idNam: 2026 });
  expect(fetchPhieuDonViList).toHaveBeenCalledWith(expect.objectContaining({ idNam: 2026, idDonVi: 10 }));
  expect(fetchThamDinhPending).not.toHaveBeenCalled();
  expect(fetchToTrinhDetail).not.toHaveBeenCalled();
  expect(fetchBaoCaoChuaHoanTat).not.toHaveBeenCalled();
  expect(fetchBaoCaoChuaLapPhieu).not.toHaveBeenCalled();
  expect(screen.queryByText("Việc cần làm")).not.toBeInTheDocument();
});

test("TKK kiêm nhiệm TK vẫn xem chi tiết và thao tác của Trưởng khoa", async () => {
  useAuth.mockReturnValue({
    user: {
      MaChucVu: "TKK",
      IdDonVi: 10,
      DonVi: [
        { IdDonVi: 10, MaChucVu: "TKK" },
        { IdDonVi: 10, MaChucVu: "TK" },
      ],
    },
  });
  fetchToTrinhList.mockResolvedValue([{ IdToTrinh: 7, IdDonVi: 10 }]);
  fetchToTrinhDetail.mockResolvedValue({
    IdToTrinh: 7,
    IdDonVi: 10,
    IdNam: 2026,
    TrangThai: 1,
    SoHoSo: 12,
    SoHoSoDaChot: 3,
    HoSo: [{ XepLoaiKhoa: 3 }, { XepLoaiKhoa: 2 }, {}],
  });

  renderIn(<TongQuanKhoa idNam={2026} idDonVi={10} tenDonVi="Khoa Kế toán" />);

  const toTrinh = await screen.findByRole("link", { name: /Mở trang đóng gói tờ trình/ });
  expect(toTrinh).toHaveAttribute("href", "/quan-ly/to-trinh");
  expect(within(toTrinh).getByText("3 / 12 hồ sơ đã chốt")).toBeInTheDocument();
  await waitFor(() => expect(fetchToTrinhDetail).toHaveBeenCalledWith(7));
  expect(fetchThamDinhPending).toHaveBeenCalled();
  expect(fetchPhieuDonViList).not.toHaveBeenCalled();

  expect(screen.getByRole("link", { name: /Hồ sơ năm chờ bạn duyệt/ })).toHaveAttribute("href", "/quan-ly/duyet-ho-so");
  expect(screen.getByRole("link", { name: /Tiêu chí chờ bạn thẩm định/ })).toHaveAttribute("href", "/quan-ly/cho-cham");
  expect(screen.getByText("530 / 666 SV · Khóa 48")).toBeInTheDocument();
  expect(screen.getByText("12 / 2.400 SV · Khóa 49 – 52")).toBeInTheDocument();

  const xepLoai = screen.getByRole("region", { name: "Xếp loại năm" });
  expect(within(xepLoai).getByText("Mức bạn chọn khi chốt · 3 hồ sơ")).toBeInTheDocument();
  expect(within(xepLoai).getByText("1 hồ sơ")).toBeInTheDocument();
});

test("Trưởng khoa thấy danh sách hồ sơ chưa hoàn tất và người chưa lập khi có quyền", async () => {
  useAuth.mockReturnValue({
    user: { MaChucVu: "TK", IdDonVi: 10, DonVi: [{ IdDonVi: 10, MaChucVu: "TK" }] },
  });
  fetchBaoCaoTongQuan.mockResolvedValue({
    SoNhanVien: 17,
    TongSoPhieu: 12,
    SoChuaLapPhieu: 5,
    CoQuyenXemDanhSach: true,
    DemTheoTrangThai: [{ TrangThai: 2, SoLuong: 12 }],
  });
  fetchBaoCaoChuaHoanTat.mockResolvedValue([
    { IdPhieu: 1, HoTen: "Người mới", TrangThai: 2, SoNgayOTrangThai: 3, SoNgayTroi: 5 },
    { IdPhieu: 2, HoTen: "Người để lâu", TrangThai: 2, SoNgayOTrangThai: 41, SoNgayTroi: 90 },
  ]);
  fetchBaoCaoChuaLapPhieu.mockResolvedValue({
    TotalCount: 5,
    Items: [{ IdNhanVien: 9, HoTen: "Người chưa lập", TenChucDanh: "Giảng viên", LoaiDoiTuongText: "Giảng viên" }],
  });

  renderIn(<TongQuanKhoa idNam={2026} idDonVi={10} />);

  const bang = await screen.findByRole("region", { name: "Hồ sơ chưa hoàn tất" });
  const dong = within(bang).getAllByRole("row");
  expect(dong[1]).toHaveTextContent("Người để lâu");
  expect(within(dong[1]).getByRole("img", { name: "Quá 30 ngày" })).toBeInTheDocument();
  expect(within(bang).getByRole("link", { name: "Người để lâu" })).toHaveAttribute("href", "/quan-ly/phieu/2");
  expect(fetchBaoCaoChuaLapPhieu).toHaveBeenCalledWith({ idNam: 2026, page: 1, pageSize: 6 });

  const chuaLap = screen.getByRole("region", { name: "Chưa lập phiếu năm" });
  expect(within(chuaLap).getByText("Người chưa lập")).toBeInTheDocument();
  fireEvent.click(within(chuaLap).getByRole("button", { name: "Xem tất cả" }));
  expect(await screen.findByRole("button", { name: "Đóng danh sách" })).toBeInTheDocument();
});
