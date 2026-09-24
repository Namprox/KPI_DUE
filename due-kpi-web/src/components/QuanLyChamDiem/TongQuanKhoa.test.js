import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import TongQuanKhoa from "./TongQuanKhoa";
import { useAuth } from "../../context/AuthContext";
import { useChuaTuCham } from "../../hooks/useChuaTuCham";
import {
  fetchBaoCaoTongQuan,
  fetchThamDinhPending,
} from "../../utils/phieuApi";
import { fetchToTrinhDetail, fetchToTrinhList } from "../../utils/toTrinhApi";

jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../hooks/useChuaTuCham", () => ({ useChuaTuCham: jest.fn() }));
jest.mock("../../utils/phieuApi", () => ({
  ...jest.requireActual("../../utils/phieuApi"),
  fetchBaoCaoTongQuan: jest.fn(),
  fetchThamDinhPending: jest.fn(),
}));
jest.mock("../../utils/toTrinhApi", () => ({
  ...jest.requireActual("../../utils/toTrinhApi"),
  fetchToTrinhDetail: jest.fn(),
  fetchToTrinhList: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useChuaTuCham.mockReturnValue({
    chuaLapPhieu: [],
    dangTai: false,
    loi: "",
    taiLai: jest.fn(),
  });
  fetchBaoCaoTongQuan.mockResolvedValue({
    TongSoPhieu: 12,
    SoChuaLapPhieu: 5,
    DemTheoTrangThai: [{ TrangThai: 1, SoLuong: 4 }, { TrangThai: 2, SoLuong: 8 }],
    HocVu: {
      SoKhoa: 1,
      NamNhapHocTotNghiep: 2022,
      NamNhapHocCanhBaoTu: 2023,
      NamNhapHocCanhBaoDen: 2026,
      TyLeTotNghiepDungHan: 70,
      TyLeCanhBaoHocVu: 10,
    },
  });
  fetchThamDinhPending.mockResolvedValue({ tongSoDong: 2 });
  fetchToTrinhList.mockResolvedValue([]);
  fetchToTrinhDetail.mockResolvedValue(null);
});

test("TKK xem tổng quan Khoa nhưng không có thao tác dành cho Trưởng khoa", async () => {
  useAuth.mockReturnValue({
    user: {
      MaChucVu: "TKK",
      IdDonVi: 10,
      DonVi: [{ IdDonVi: 10, MaChucVu: "TKK" }],
    },
  });
  fetchToTrinhList.mockResolvedValue([
    {
      IdToTrinh: 7,
      IdDonVi: 10,
      IdNam: 2026,
      TrangThai: 1,
      SoHoSo: 12,
      SoHoSoDaChot: 0,
    },
  ]);

  render(<TongQuanKhoa idNam={2026} idDonVi={10} />);

  expect(await screen.findByText("Khóa 48")).toBeInTheDocument();
  expect(screen.getByText("Khóa 49 - 52")).toBeInTheDocument();
  expect(screen.getByText("Chưa lập phiếu")).toBeInTheDocument();
  expect(screen.getByText("Tờ trình KPI của Khoa")).toBeInTheDocument();
  expect(screen.getByText("Đang tổng hợp")).toBeInTheDocument();
  expect(fetchBaoCaoTongQuan).toHaveBeenCalledWith({ idNam: 2026 });
  expect(fetchToTrinhList).toHaveBeenCalledWith({ idNam: 2026 });
  expect(fetchThamDinhPending).not.toHaveBeenCalled();
  expect(fetchToTrinhDetail).not.toHaveBeenCalled();
  expect(useChuaTuCham).toHaveBeenCalledWith(
    expect.objectContaining({ bat: false }),
  );
  expect(screen.queryByRole("button", { name: /Xem báo cáo đầy đủ/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Mở trang đóng gói tờ trình/ })).not.toBeInTheDocument();
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
    SoHoSoDaChot: 0,
    HoSo: [],
  });

  render(<TongQuanKhoa idNam={2026} idDonVi={10} />);

  expect(await screen.findByRole("button", { name: /Mở trang đóng gói tờ trình/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Xem báo cáo đầy đủ/ })).toBeInTheDocument();
  await waitFor(() => expect(fetchToTrinhDetail).toHaveBeenCalledWith(7));
  expect(fetchThamDinhPending).toHaveBeenCalled();
  expect(useChuaTuCham).toHaveBeenCalledWith(
    expect.objectContaining({ bat: true }),
  );
});
