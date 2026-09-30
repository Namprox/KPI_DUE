import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TongQuanCapQuanLy from "./TongQuanCapQuanLy";
import {
  fetchBaoCaoChuaLapPhieu,
  fetchBaoCaoPhongTongQuan,
  fetchBaoCaoToanTruong,
  fetchBaoCaoTongQuan,
} from "../../utils/phieuApi";

jest.mock("../../utils/phieuApi", () => ({
  ...jest.requireActual("../../utils/phieuApi"),
  fetchBaoCaoPhongTongQuan: jest.fn(),
  fetchBaoCaoToanTruong: jest.fn(),
  fetchBaoCaoTongQuan: jest.fn(),
  fetchBaoCaoChuaLapPhieu: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  fetchBaoCaoTongQuan.mockResolvedValue(null);
});

const renderIn = (ui) =>
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter>);

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

const baoCaoPhong = {
  TongHop: tongHop,
  ApDungPhieuQuy: false,
  PhieuQuy: [],
  DonVi: [
    { IdDonVi: 10, TenDonVi: "Phòng A", SoNhanVien: 6, TrangThaiPhieuDv: null },
    { IdDonVi: 20, TenDonVi: "Phòng B", SoNhanVien: 4, TrangThaiPhieuDv: 4, TrangThaiToTrinh: 3, TrangThaiToTrinhText: "Đã trình HT" },
  ],
};

test("tổng quan Phòng lấy toàn bộ phạm vi từ backend và không hiện phiếu quý khi chưa bật", async () => {
  fetchBaoCaoPhongTongQuan.mockResolvedValue(baoCaoPhong);

  renderIn(<TongQuanCapQuanLy idNam={2026} cap="phong" />);

  const danhGia = await screen.findByRole("region", { name: "Đánh giá đơn vị" });
  expect(fetchBaoCaoPhongTongQuan).toHaveBeenCalledWith({ idNam: 2026 });
  expect(fetchBaoCaoTongQuan).toHaveBeenCalledWith({ idNam: 2026 });
  expect(fetchBaoCaoToanTruong).not.toHaveBeenCalled();
  expect(screen.queryByText("Phiếu quý theo từng quý")).not.toBeInTheDocument();
  expect(within(danhGia).getByText("Phòng A")).toBeInTheDocument();
  expect(within(danhGia).getByText("Chưa có phiếu")).toBeInTheDocument();
  expect(within(danhGia).getByText("Chưa có tờ trình")).toBeInTheDocument();
  expect(within(danhGia).getByText("HT đã duyệt, chờ chốt")).toBeInTheDocument();
  expect(within(danhGia).getByText("Đã trình HT")).toBeInTheDocument();
  // Nhãn dự phòng riêng của Phòng khi server không trả TrangThaiText.
  expect(screen.getByText("Chờ Trưởng phòng chốt")).toBeInTheDocument();
  expect(screen.getByText("7 / 10 nhân sự")).toBeInTheDocument();
  expect(screen.getByText("70%")).toBeInTheDocument();
});

test("Trưởng phòng kiêm nhiệm lọc được về một Phòng mà không mất danh sách lựa chọn", async () => {
  fetchBaoCaoPhongTongQuan.mockResolvedValueOnce(baoCaoPhong).mockResolvedValueOnce({
    ...baoCaoPhong,
    DonVi: [baoCaoPhong.DonVi[1]],
  });

  renderIn(<TongQuanCapQuanLy idNam={2026} cap="phong" />);

  const loc = await screen.findByLabelText("Phòng (khi kiêm nhiệm)");
  fireEvent.change(loc, { target: { value: "20" } });

  expect(await screen.findByRole("heading", { level: 1, name: "Phòng B" })).toBeInTheDocument();
  expect(fetchBaoCaoPhongTongQuan).toHaveBeenLastCalledWith({ idNam: 2026, idDonVi: "20" });
  expect(fetchBaoCaoTongQuan).toHaveBeenLastCalledWith({ idNam: 2026, idDonVi: "20" });
  expect(within(screen.getByLabelText("Phòng (khi kiêm nhiệm)")).getByText("Phòng A")).toBeInTheDocument();
});

test("tổng quan Trường hiển thị việc chờ HT, quý và tỷ lệ Khoa từ API", async () => {
  fetchBaoCaoToanTruong.mockResolvedValue({
    TongHop: tongHop,
    ApDungPhieuQuy: true,
    QuyHienTai: 2,
    ChoHieuTruong: {
      SoToTrinhChoDuyet: 2,
      SoHoSoLanhDaoChoDuyet: 1,
      SoPhieuDonViChoDuyet: 3,
      SoPhieuDonViChoChot: 1,
    },
    DemTheoXepLoai: [{ MaXepLoai: 4, XepLoaiText: "Hoàn thành xuất sắc", SoLuong: 2 }],
    HocVu: {
      SoKhoa: 1,
      NamNhapHocTotNghiep: 2022,
      NamNhapHocCanhBaoTu: 2023,
      NamNhapHocCanhBaoDen: 2026,
      TyLeTotNghiepDungHan: null,
      TyLeCanhBaoHocVu: null,
    },
    PhieuQuy: [
      { Quy: 1, DaDenQuy: true, SoNhanVien: 10, SoChuaLapPhieu: 2, SoDangChamDiem: 3, SoChoDuyet: 4, SoDaChot: 1 },
      { Quy: 2, DaDenQuy: true, SoNhanVien: 10, SoChuaLapPhieu: 5, SoDangChamDiem: 5, SoChoDuyet: 0, SoDaChot: 0 },
    ],
    DonVi: [{ IdDonVi: 30, TenDonVi: "Khoa C", LoaiDonVi: "KHOA", SoNhanVien: 10, SoChuaLapPhieu: 2, TrangThaiPhieuDv: 3,
      PhieuQuy: [{ Quy: 2, SoNhanVien: 10, SoDaChot: 0 }], XepLoaiPhieuDv: 2, XepLoaiPhieuDvText: "Hoàn thành", TyLeTotNghiepDungHan: 82.5, TyLeCanhBaoHocVu: 5 }],
  });

  renderIn(<TongQuanCapQuanLy idNam={2026} cap="truong" />);

  expect(await screen.findByText("Khoa C")).toBeInTheDocument();
  expect(fetchBaoCaoToanTruong).toHaveBeenCalledWith({ idNam: 2026 });

  const viec = screen.getByRole("region", { name: "Việc đang chờ Hiệu trưởng" });
  expect(within(viec).getByRole("link", { name: /Tờ trình KPI chờ duyệt/ })).toHaveAttribute("href", "/truong/to-trinh");
  // Chưa có màn hình duyệt phiếu đơn vị cấp Trường: thẻ đếm không giả vờ bấm được.
  expect(within(viec).queryByRole("link", { name: /Phiếu đánh giá đơn vị chờ duyệt/ })).not.toBeInTheDocument();
  expect(within(viec).getByText("Phiếu đánh giá đơn vị chờ duyệt")).toBeInTheDocument();

  expect(screen.getByText("Quý hiện tại: Quý 2")).toBeInTheDocument();
  expect(screen.getByText("2 người chưa lập, 7 phiếu chưa chốt dù quý đã qua")).toBeInTheDocument();

  const hang = screen.getByRole("row", { name: /Khoa C/ });
  expect(within(hang).getByText("82,5%")).toBeInTheDocument();
  expect(within(hang).getByText("Chờ Trường duyệt · Hoàn thành")).toBeInTheDocument();
  expect(within(hang).getByText("0 / 10")).toBeInTheDocument();

  const xepLoai = screen.getByRole("region", { name: "Xếp loại năm" });
  expect(within(xepLoai).getByText("Hoàn thành xuất sắc")).toBeInTheDocument();
  expect(screen.getAllByText("Chưa có dữ liệu")).toHaveLength(2);
});

test("ẩn thẻ thống kê tiến độ khi tài khoản kiêm nhiệm Trưởng khoa", async () => {
  fetchBaoCaoPhongTongQuan.mockResolvedValue({
    TongHop: tongHop,
    DonVi: [{ IdDonVi: 10, TenDonVi: "Phòng A", SoNhanVien: 10 }],
  });

  renderIn(<TongQuanCapQuanLy idNam={2026} cap="phong" anThongKeTienDo />);

  expect(await screen.findByRole("heading", { level: 1, name: "Phòng A" })).toBeInTheDocument();
  expect(screen.queryByText("Nhân sự đã lập phiếu năm")).not.toBeInTheDocument();
  expect(screen.getByText("Đã lập phiếu năm")).toBeInTheDocument();
  expect(screen.getByText("Phiếu năm hoàn tất")).toBeInTheDocument();
});

test("thư ký Phòng chỉ thấy số tổng hợp, không có việc duyệt của Trưởng phòng", async () => {
  fetchBaoCaoPhongTongQuan.mockResolvedValue({
    ...baoCaoPhong,
    DonVi: [{ IdDonVi: 10, TenDonVi: "Phòng A", SoNhanVien: 10, TrangThaiPhieuDv: 1 }],
  });
  fetchBaoCaoTongQuan.mockResolvedValue({ CoQuyenXemDanhSach: false });

  renderIn(<TongQuanCapQuanLy idNam={2026} cap="phong" thuKy />);

  expect(await screen.findByText("Việc của thư ký")).toBeInTheDocument();
  expect(screen.getByRole("note")).toHaveTextContent("chỉ Trưởng phòng xem được");
  expect(screen.getByRole("link", { name: "Tiếp tục nhập điểm" })).toHaveAttribute("href", "/danh-gia-kpi-phong");
  expect(screen.queryByText("Việc cần làm")).not.toBeInTheDocument();
  expect(screen.queryByText(/xem danh sách/)).not.toBeInTheDocument();
});

test("mở danh sách người chưa lập khi có quyền xem danh sách", async () => {
  fetchBaoCaoToanTruong.mockResolvedValue({ TongHop: tongHop, DonVi: [] });
  fetchBaoCaoTongQuan.mockResolvedValue({ CoQuyenXemDanhSach: true });
  fetchBaoCaoChuaLapPhieu.mockResolvedValue({ TotalCount: 1, Items: [{ IdNhanVien: 1, HoTen: "Người chưa lập" }] });

  renderIn(<TongQuanCapQuanLy idNam={2026} cap="truong" />);

  fireEvent.click(await screen.findByRole("button", { name: /3 người chưa lập phiếu năm — xem danh sách/ }));

  expect(await screen.findByText("Người chưa lập")).toBeInTheDocument();
  await waitFor(() =>
    expect(fetchBaoCaoChuaLapPhieu).toHaveBeenCalledWith(expect.objectContaining({ idNam: 2026, quy: 0 })),
  );
});
