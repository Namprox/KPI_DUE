import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TongQuanVienChucCaNhan from "./TongQuanVienChucCaNhan";
import { fetchBaoCaoTongQuan } from "../../utils/phieuApi";
import { fetchTongHopPhieuQuy } from "../../utils/phieuQuyApi";
import { fetchViPhamCuaToi } from "../../utils/viPhamCaNhanApi";

jest.mock("../../utils/phieuApi", () => ({ ...jest.requireActual("../../utils/phieuApi"), fetchBaoCaoTongQuan: jest.fn() }));
jest.mock("../../utils/phieuQuyApi", () => ({ fetchTongHopPhieuQuy: jest.fn() }));
jest.mock("../../utils/viPhamCaNhanApi", () => ({ fetchViPhamCuaToi: jest.fn() }));

const renderIn = (ui) =>
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter>);

beforeEach(() => {
  jest.clearAllMocks();
  fetchViPhamCuaToi.mockResolvedValue([]);
});

test("năm chưa bật đánh giá theo quý thì trả về khối phiếu chung, không gọi tổng hợp quý", async () => {
  fetchBaoCaoTongQuan.mockResolvedValue({ ApDungPhieuQuy: false });
  renderIn(
    <TongQuanVienChucCaNhan idNam={2026} idNhanVien={7} fallback={<p>Khối phiếu chung</p>} />,
  );
  await screen.findByText("Khối phiếu chung");
  expect(fetchTongHopPhieuQuy).not.toHaveBeenCalled();
});

test("giữ điểm 0 từ tổng hợp cá nhân và nói rõ quý hiện tại đang chờ duyệt", async () => {
  fetchBaoCaoTongQuan.mockResolvedValue({ ApDungPhieuQuy: true, QuyHienTai: 2 });
  fetchTongHopPhieuQuy.mockResolvedValue({
    SoQuyDaChot: 1,
    DanhSachQuyDaChot: "1",
    DiemCoBanTbQuy: 0,
    DiemVpvcNam: 0,
    DiemVuotTroiTongQuy: 0,
    DiemTichLuyDuKien: 0,
    XepLoaiNamDuKien: 1,
    XepLoaiNamDuKienText: "Không hoàn thành nhiệm vụ",
    Quy: [
      { Quy: 1, IdPhieu: 11, DaChot: true, TongDiemTichLuy: 0, TongDiemCoBan: 0, TongDiemVuotTroi: 0, XepLoaiQuy: 1, XepLoaiQuyText: "Nhãn quý" },
      { Quy: 2, IdPhieu: 12, DaChot: false, TrangThai: 2, TrangThaiText: "Chờ Trưởng phòng duyệt" },
      { Quy: 3, IdPhieu: null, DaChot: false },
      { Quy: 4, IdPhieu: null, DaChot: false },
    ],
  });
  fetchViPhamCuaToi.mockResolvedValue([{ Id: 1 }]);

  renderIn(
    <TongQuanVienChucCaNhan
      idNam={2026}
      idNhanVien={7}
      phieu={{ TrangThai: 1 }}
      hanNop="2026-12-31"
      duongDanPhieu="/danh-gia-kpi-nhan-vien?year=2026"
    />,
  );

  expect(await screen.findByText("Phiếu quý 2 đã nộp — đang chờ trưởng đơn vị duyệt")).toBeInTheDocument();
  expect(fetchTongHopPhieuQuy).toHaveBeenCalledWith({ idNam: 2026, idNhanVien: 7 });
  expect(screen.getByRole("link", { name: "Xem phiếu quý 2" })).toHaveAttribute("href", "/danh-gia-kpi-nhan-vien?year=2026");
  expect(screen.getByText("Tính từ 1 / 4 quý đã chốt (quý 1)")).toBeInTheDocument();
  expect(screen.getAllByText("0,0").length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText("Còn 80,0 điểm để đạt mức Hoàn thành (≥ 80)")).toBeInTheDocument();
  expect(screen.getByText("Nhãn quý")).toBeInTheDocument();
  expect(screen.getByText("Chờ Trưởng phòng duyệt")).toBeInTheDocument();
  expect(screen.getAllByText("Chưa đến quý.")).toHaveLength(2);
  expect(screen.getByText((_, el) => el.className === "db-kv" && el.textContent === "Vi phạm đã ghi nhận1")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Xem người/ })).not.toBeInTheDocument();
});
