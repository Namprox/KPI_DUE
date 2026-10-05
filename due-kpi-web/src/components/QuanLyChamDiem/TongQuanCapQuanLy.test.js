import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  Element.prototype.scrollIntoView = jest.fn();
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
  fireEvent.click(loc);
  fireEvent.click(screen.getByRole("option", { name: "Phòng B" }));

  expect(await screen.findByRole("heading", { level: 1, name: "Phòng B" })).toBeInTheDocument();
  expect(fetchBaoCaoPhongTongQuan).toHaveBeenLastCalledWith({ idNam: 2026, idDonVi: "20" });
  expect(fetchBaoCaoTongQuan).toHaveBeenLastCalledWith({ idNam: 2026, idDonVi: "20" });
  fireEvent.click(screen.getByRole("combobox", { name: "Phòng (khi kiêm nhiệm)" }));
  expect(screen.getByRole("option", { name: "Phòng A" })).toBeInTheDocument();
});

test("tổng quan Trường hiển thị việc chờ HT, quý và tỷ lệ Khoa từ API", async () => {
  fetchBaoCaoToanTruong.mockResolvedValue({
    TongHop: { ...tongHop, SoChoHtDuyet: 8 },
    ApDungPhieuQuy: true,
    QuyHienTai: 2,
    ChoHieuTruong: {
      SoToTrinhChoDuyet: 2,
      SoHoSoLanhDaoChoDuyet: 5,
      SoHoSoLanhDaoChuaTrinh: 3,
      SoUngVienChoXetXuatSac: 12,
      SoVienChucKhoaChuaDuyet: 4,
      DuDieuKienChotXetXuatSac: false,
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
      TrangThaiToTrinh: 3, SoChoHtDuyet: 5,
      PhieuQuy: [{ Quy: 2, SoNhanVien: 10, SoDaChot: 0 }], XepLoaiPhieuDv: 2, XepLoaiPhieuDvText: "Hoàn thành", TyLeTotNghiepDungHan: 82.5, TyLeCanhBaoHocVu: 5 },
      { IdDonVi: 40, TenDonVi: "Phòng D", LoaiDonVi: "PHONG", TrangThaiToTrinh: 2, SoChoHtDuyet: 3 }],
  });

  renderIn(<TongQuanCapQuanLy idNam={2026} cap="truong" />);

  expect(await screen.findByText("Khoa C")).toBeInTheDocument();
  expect(fetchBaoCaoToanTruong).toHaveBeenCalledWith({ idNam: 2026 });

  const viec = screen.getByRole("region", { name: "Việc đang chờ Hiệu trưởng" });
  expect(within(viec).getByRole("link", { name: /Tờ trình KPI chờ duyệt/ })).toHaveAttribute("href", "/truong/to-trinh");
  expect(within(viec).getByRole("link", { name: /Tờ trình KPI chờ duyệt/ })).toHaveTextContent("2 gói");
  expect(within(viec).getByRole("link", { name: /Tờ trình KPI chờ duyệt/ })).toHaveTextContent("5 hồ sơ lãnh đạo trong gói đã trình");
  expect(within(viec).getByRole("link", { name: /Tờ trình KPI chờ duyệt/ })).toHaveTextContent("3 hồ sơ chưa trình");
  expect(within(viec).getByRole("link", { name: /Xét xuất sắc viên chức Khoa/ })).toHaveAttribute("href", "/truong/xet-xuat-sac-vien-chuc-khoa");
  expect(within(viec).getByText("Chưa chốt được — còn 4 phiếu viên chức Khoa chưa duyệt")).toBeInTheDocument();
  expect(within(viec).queryByText("Mở danh sách để chốt")).not.toBeInTheDocument();
  // Chưa có màn hình duyệt phiếu đơn vị cấp Trường: thẻ đếm không giả vờ bấm được.
  expect(within(viec).queryByRole("link", { name: /Phiếu đánh giá đơn vị/ })).not.toBeInTheDocument();
  expect(within(viec).getByText("Phiếu đánh giá đơn vị")).toBeInTheDocument();
  expect(within(viec).getByText("1 phiếu chờ chốt")).toBeInTheDocument();

  expect(screen.getByText("Quý hiện tại: Quý 2")).toBeInTheDocument();
  expect(screen.getByText("2 người chưa lập, 7 phiếu chưa chốt dù quý đã qua")).toBeInTheDocument();

  const hang = screen.getByRole("row", { name: /Khoa C/ });
  expect(within(hang).getByText("82,5%")).toBeInTheDocument();
  expect(within(hang).getByText("Chờ Trường duyệt · Hoàn thành")).toBeInTheDocument();
  expect(within(hang).getByText("0 / 10")).toBeInTheDocument();
  expect(within(hang).getByText("5 chờ HT")).toBeInTheDocument();
  expect(within(screen.getByRole("row", { name: /Phòng D/ })).getByText("3 chưa trình")).toBeInTheDocument();

  const xepLoai = screen.getByRole("region", { name: "Xếp loại năm" });
  expect(within(xepLoai).getByText("Hoàn thành xuất sắc")).toBeInTheDocument();
  expect(screen.getAllByText("Chưa có dữ liệu")).toHaveLength(2);
});

test.each([
  [true, "Đủ điều kiện chốt danh sách", "Mở danh sách để chốt"],
  [false, "Chưa đủ điều kiện chốt danh sách", "Xem danh sách xét xuất sắc"],
])("điều kiện chốt xét xuất sắc lấy từ backend (%s), kể cả khi không còn phiếu chưa duyệt", async (duDieuKien, nhan, cta) => {
  fetchBaoCaoToanTruong.mockResolvedValue({
    TongHop: tongHop,
    DonVi: [],
    ChoHieuTruong: {
      SoToTrinhChoDuyet: 0, SoHoSoLanhDaoChoDuyet: 0, SoHoSoLanhDaoChuaTrinh: 0,
      SoUngVienChoXetXuatSac: 0, SoVienChucKhoaChuaDuyet: 0,
      DuDieuKienChotXetXuatSac: duDieuKien,
      SoPhieuDonViChoDuyet: 0, SoPhieuDonViChoChot: 0,
    },
  });
  renderIn(<TongQuanCapQuanLy idNam={2026} cap="truong" />);
  const viec = await screen.findByRole("region", { name: "Việc đang chờ Hiệu trưởng" });
  expect(within(viec).getByText(nhan)).toBeInTheDocument();
  expect(within(viec).getByRole("link", { name: /Xét xuất sắc viên chức Khoa/ })).toHaveTextContent("0 ứng viên");
  expect(within(viec).getByText(cta)).toBeInTheDocument();
});

test("đổi năm ẩn số liệu cũ trong khi đang tải, năm chưa bắt đầu không cảnh báo các quý", async () => {
  let resolveNamMoi;
  fetchBaoCaoToanTruong.mockResolvedValueOnce({ TongHop: tongHop, DonVi: [] })
    .mockReturnValueOnce(new Promise((resolve) => { resolveNamMoi = resolve; }));
  const { rerender } = renderIn(<TongQuanCapQuanLy idNam={2026} cap="truong" />);
  await screen.findByText("70%");
  rerender(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><TongQuanCapQuanLy idNam={2027} cap="truong" /></MemoryRouter>);
  expect(screen.getByRole("status")).toHaveTextContent("Đang tổng hợp số liệu KPI");
  expect(screen.queryByText("70%")).not.toBeInTheDocument();
  await act(async () => resolveNamMoi({
    TongHop: { ...tongHop, SoNhanVien: 10, SoChuaLapPhieu: 10, TongSoPhieu: 0 },
    DonVi: [{ IdDonVi: 30, TenDonVi: "Khoa tương lai" }],
    ApDungPhieuQuy: true,
    QuyHienTai: 0,
    PhieuQuy: [1, 2, 3, 4].map((Quy) => ({ Quy, DaDenQuy: false, SoNhanVien: 10, SoChuaLapPhieu: 10 })),
  }));
  expect(await screen.findByText("Khoa tương lai")).toBeInTheDocument();
  expect(screen.getAllByText("Chưa đến")).toHaveLength(4);
  expect(screen.queryByText(/dù quý đã qua/)).not.toBeInTheDocument();
  expect(screen.queryByRole("columnheader", { name: /Quý 0/ })).not.toBeInTheDocument();
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
