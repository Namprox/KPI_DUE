import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDiemTuDongPhieu } from "../../hooks/useDiemTuDongPhieu";
import { fetchDiemTuDongPhieu } from "../../utils/phieuTuDongApi";
import { tongHopTuDong } from "../../utils/phieuApi";
import { ghepDiemTuDongPhieu } from "../../utils/diemTuDongPhieu";
import PhieuTuDongNotice, { duocTongHopTuDongPhieu } from "./PhieuTuDongNotice";
import DanhGiaPhuLuc2Form from "./DanhGiaPhuLuc2/DanhGiaPhuLuc2Form";
import TieuChiChamCard, { MinhChungRow } from "../QuanLyChamDiem/TieuChiChamCard";
import { layChiTietDaoTao } from "../../utils/hoatDongDaoTaoApi";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../utils/phieuTuDongApi", () => ({ fetchDiemTuDongPhieu: jest.fn() }));
jest.mock("../../utils/hoatDongDaoTaoApi", () => ({ layChiTietDaoTao: jest.fn() }));
jest.mock("../../utils/phieuApi", () => ({ ...jest.requireActual("../../utils/phieuApi"), tongHopTuDong: jest.fn() }));

const row = { IdChiTiet: 99, IdTieuChi: 7, TenTieuChi: "Hội đồng CTĐT", TenNhom: "Đào tạo", TenNhomCha: "Đào tạo", LoaiNguonDiem: 2, DiemToiDa: 5, DiemChinhThuc: 0, MinhChung: [], NhiemVuCongDong: [] };
const form = { IdPhieu: 812, IdDonVi: 7, TrangThai: 2, Quy: 0, ChiTiet: [row] };
const data = { IdPhieu: 812, Quy: 0, LaPhieuNhanTuDong: true, Items: [{ IdChiTiet: 99, IdTieuChi: 7, CongThucTongHop: "CTDT_HOI_DONG", DiemDaGhi: 0, DiemChinhThuc: 0, DiemTuDong: 5, CanChamLai: true, MinhChung: [{ LoaiNguon: 9, MaNguon: 15, TieuDe: "CTĐT Kế toán", MoTa: "QĐ 123" }] }] };
const show = (ui) => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{ui}</MemoryRouter>);
beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { MaChucVu: "GV", IdNhanVien: 155 } });
  fetchDiemTuDongPhieu.mockResolvedValue(data);
});

test("form hiển thị 0 chính thức, cảnh báo nguồn mới là 5 và minh chứng", () => {
  show(<DanhGiaPhuLuc2Form criteriaList={[row]} formData={{}} autoScores={ghepDiemTuDongPhieu(data, [row])} tongDiemCoBan={0} />);
  expect(screen.getByText("Điểm chính thức")).toBeInTheDocument();
  expect(screen.getByText(/Dữ liệu nguồn đã thay đổi — điểm mới sẽ là 5/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "CTĐT Kế toán" })).toBeInTheDocument();
  expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
});
test("card đã chốt vẫn cảnh báo và hiển thị minh chứng nguồn loại 1 dạng văn bản", () => {
  const info = ghepDiemTuDongPhieu(data, [row])[7];
  info.MinhChung = [{ LoaiNguon: 1, MaNguon: 33, TieuDe: "Bài báo A", MoTa: "Tạp chí A" }];
  show(<TieuChiChamCard chiTiet={{ ...row, TrangThaiDong: 3 }} autoInfo={info} stt={1} />);
  expect(screen.getByText("Bài báo A")).toBeInTheDocument();
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.getByText(/điểm mới sẽ là 5/)).toBeInTheDocument();
});
test("draft nhận nhãn Dự kiến kể cả 0 và lý do backend nguyên văn", () => {
  const reason = "Phòng Đào tạo chưa ghi nhận hoạt động.";
  const preview = { ...data, Items: [{ ...data.Items[0], DiemDaGhi: undefined, DiemTuDong: 0, CanChamLai: false, LyDoDiemTuDong: reason }] };
  show(<DanhGiaPhuLuc2Form criteriaList={[row]} formData={{}} autoScores={ghepDiemTuDongPhieu(preview, [row])} tongDiemCoBan={0} />);
  expect(screen.getByText("Dự kiến")).toBeInTheDocument();
  expect(screen.getByText(reason)).toBeInTheDocument();
});

test.each(["ADMIN", "TK", "TKL", "TP", "QTP", "GD", "VT"])("%s đúng phạm vi được tổng hợp phiếu năm 1/2", (MaChucVu) => {
  expect(duocTongHopTuDongPhieu({ MaChucVu, DonVi: [{ IdDonVi: 7, MaChucVu }] }, form, data)).toBe(true);
});
test.each(["GV", "VC", "PTK", "PHT", "HT"])("%s chỉ xem cảnh báo", (MaChucVu) => {
  expect(duocTongHopTuDongPhieu({ MaChucVu }, form, data)).toBe(false);
});
test("kiêm nhiệm, đơn vị cha, phiếu quý, phiếu chốt, phiếu không nhận điểm", () => {
  const user = { MaChucVu: "TP", DonVi: [{ IdDonVi: 8, MaChucVu: "TP" }, { IdDonVi: 7, MaChucVu: "GV" }] };
  expect(duocTongHopTuDongPhieu(user, form, data)).toBe(false);
  expect(duocTongHopTuDongPhieu(user, form, data, [{ IdDonVi: 7, IdDonViCha: 8 }])).toBe(true);
  for (const change of [{ Quy: 1 }, { TrangThai: 3 }, { TrangThai: 5 }]) {
    expect(duocTongHopTuDongPhieu({ MaChucVu: "ADMIN" }, { ...form, ...change }, { ...data, ...change })).toBe(false);
  }
  expect(duocTongHopTuDongPhieu({ MaChucVu: "ADMIN" }, form, { ...data, LaPhieuNhanTuDong: false })).toBe(false);
});
test("nút tổng hợp gọi POST rồi tải lại phiếu", async () => {
  useAuth.mockReturnValue({ user: { MaChucVu: "ADMIN" } });
  tongHopTuDong.mockResolvedValue({});
  const reload = jest.fn().mockResolvedValue({});
  show(<PhieuTuDongNotice phieu={form} tuDong={{ data }} onReload={reload} />);
  fireEvent.click(screen.getByRole("button", { name: "Tổng hợp tự động" }));
  await screen.findByText("Đã tổng hợp điểm tự động.");
  expect(tongHopTuDong).toHaveBeenCalledWith(812);
  expect(reload).toHaveBeenCalledTimes(1);
});
test.each([0, 2])("hiện Message và link đúng phiếu nhận điểm, quý %s", (Quy) => {
  show(<PhieuTuDongNotice phieu={form} tuDong={{ data: { ...data, Quy, LaPhieuNhanTuDong: false, IdPhieuNhanTuDong: 800, Message: "Điểm thuộc phiếu 800" } }} />);
  expect(screen.getByText("Điểm thuộc phiếu 800")).toBeInTheDocument();
  expect(screen.getByRole("link")).toHaveAttribute("href", `/lich-su-danh-gia/800${Quy ? "?loai=quy" : ""}`);
});
test("nguồn đào tạo mở lại modal hiện có qua GET đúng MaNguon", async () => {
  layChiTietDaoTao.mockResolvedValue({ Item: { HoTen: "Nguyễn A", IdNam: 2026, NoiDung: "Hội đồng kế toán" }, LichSu: [] });
  show(<MinhChungRow mc={data.Items[0].MinhChung[0]} />);
  fireEvent.click(screen.getByRole("link", { name: "CTĐT Kế toán" }));
  await screen.findByText("Hội đồng kế toán");
  expect(layChiTietDaoTao).toHaveBeenCalledWith(15);
});
const HookView = ({ phieu }) => {
  const tuDong = useDiemTuDongPhieu(phieu);
  return <><PhieuTuDongNotice phieu={phieu} tuDong={tuDong} /><span>{tuDong.data?.IdPhieu}</span></>;
};
test("đổi phiếu bỏ qua kết quả cũ và 404 không tự gọi lại", async () => {
  let resolveOld;
  fetchDiemTuDongPhieu.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
    .mockRejectedValueOnce(Object.assign(new Error("Không tìm thấy phiếu"), { status: 404 }));
  const view = show(<HookView phieu={form} />);
  view.rerender(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><HookView phieu={{ ...form, IdPhieu: 900 }} /></MemoryRouter>);
  await screen.findByText("Không tìm thấy phiếu");
  await act(async () => resolveOld(data));
  expect(screen.queryByText("812")).not.toBeInTheDocument();
  await waitFor(() => expect(fetchDiemTuDongPhieu).toHaveBeenCalledTimes(2));
});
