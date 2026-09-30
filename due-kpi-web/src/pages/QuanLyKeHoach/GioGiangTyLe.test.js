import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TongHopGioGiang } from "./GioGiangTkbPanels";
import GioGiangNamCard from "../../components/CaNhan/GioGiangNamCard";
import { apiFetch } from "../../utils/api";
import { canAccessPath, MENU_GROUPS, visibleItems } from "../../config/menuConfig";
import { fetchPhieuCuaToi } from "../../utils/phieuApi";
import TieuChiChamCard from "../../components/QuanLyChamDiem/TieuChiChamCard";
import DanhGiaPhuLuc2Form from "../../components/DanhGia/DanhGiaPhuLuc2/DanhGiaPhuLuc2Form";

jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../../utils/donViApi", () => ({ fetchDonViList: async () => [{ IdDonVi: 12, TenDonVi: "Khoa Luật" }] }));
jest.mock("../../components/Common/SearchSelect", () => ({ value, onChange, options, ariaLabel }) =>
  <select aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>);

const ok = (body) => ({ ok: true, json: async () => body });
const daoTaoCaNam = {
  IdNhanVien: 3, HoTen: "Giảng viên đào tạo tiến sĩ", LyDo: "DAO_TAO_TINH_100",
  DinhMucApDung: 0, TongGio: 0, TyLeHoanThanh: 100, DiemDuKien: 20, DiemToiDa: 20,
};
const rows = [
  { IdNhanVien: 1, MaNhanVien: "GV1", HoTen: "Người miễn", LyDo: "MIEN_TOAN_BO", CanhBao: "THANG_MIEN_VUOT_NAM;MA_MOI", DiemToiDa: 20 },
  { IdNhanVien: 2, MaNhanVien: "GV2", HoTen: "Người có giờ", TenDonVi: "Khoa Luật", DinhMucGoc: 270, DinhMucApDung: 220.63, GiamConNho10: 15.6, GiamConNho40: 33.77, DieuChinhSan0: -2, GioQndb: 12.5, TongGio: 634.5, TyLeHoanThanh: 12591.12, DiemDuKien: 15, DiemToiDa: 20 },
];
beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockResolvedValue(ok({ Success: true, TyLeHoanThanh: rows, SoDongChuaAnhXa: 3 }));
});

test("đào tạo cả năm vẫn hiện 100%, điểm tối đa và lý do; không thuộc dòng không chấm tự động", async () => {
  apiFetch.mockResolvedValue(ok({ TyLeHoanThanh: [...rows, daoTaoCaNam] }));
  render(<TongHopGioGiang idNam={2026} tyLe />);
  expect(await screen.findByText("100,00%")).toHaveClass("is-success");
  const dong = screen.getByRole("row", { name: /Giảng viên đào tạo tiến sĩ/ });
  expect(dong).toHaveTextContent("Đi đào tạo tiến sĩ cả năm: tính hoàn thành 100%");
  expect(within(dong).getByText("20 / 20")).toBeInTheDocument();
  expect(dong).not.toHaveTextContent(/NaN|Infinity|Không chấm tự động/);
  fireEvent.click(screen.getByLabelText("Chỉ dòng không chấm tự động"));
  expect(screen.queryByText("Giảng viên đào tạo tiến sĩ")).not.toBeInTheDocument();
  expect(screen.getByText("Người miễn")).toBeInTheDocument();
});

test("thẻ tự xem đào tạo cả năm giữ tỷ lệ và điểm do API trả về", async () => {
  apiFetch.mockResolvedValue(ok({ TyLeHoanThanh: [daoTaoCaNam] }));
  render(<GioGiangNamCard idNam={2026} user={{ IdNhanVien: 3, DonVi: [{ LoaiDoiTuong: 1 }] }} />);
  expect(await screen.findByText("100,00%")).toHaveClass("is-success");
  expect(screen.getByText("20 / 20")).toBeInTheDocument();
  expect(screen.getAllByText("Đi đào tạo tiến sĩ cả năm: tính hoàn thành 100%").length).toBeGreaterThan(0);
  expect(screen.queryByText("Không chấm tự động")).not.toBeInTheDocument();
});

test("preview và phiếu đào tạo cả năm có điểm 20 được hiển thị như dòng tự động bình thường", () => {
  const { unmount } = render(<DanhGiaPhuLuc2Form criteriaList={[{ IdTieuChi: 1, TenTieuChi: "Hoàn thành giờ giảng", DiemToiDa: 20 }]}
    formData={{}} autoScores={{ 1: { CongThucTongHop: "GIO_GIANG_TY_LE", DiemTuDong: 20 } }} tongDiemCoBan={20} />);
  expect(screen.getAllByText("20đ").length).toBeGreaterThan(0);
  expect(screen.queryByText("Không chấm tự động")).not.toBeInTheDocument();
  unmount();
  render(<TieuChiChamCard chiTiet={{ IdChiTiet: 1, IdTieuChi: 1, TenTieuChi: "Giờ giảng", LoaiNguonDiem: 2, CongThucSnapshot: "GIO_GIANG_TY_LE", DiemChinhThuc: 20, DiemToiDa: 20, TrangThaiDong: 3, MinhChung: [], NhiemVuCongDong: [] }} stt={1} />);
  expect(screen.getAllByText("20.00").length).toBeGreaterThan(0);
  expect(screen.queryByText("Không chấm tự động")).not.toBeInTheDocument();
});

test("hiện nguyên số API, không cắt tỷ lệ lớn; null và cảnh báo nhiều mã an toàn", async () => {
  render(<TongHopGioGiang idNam={2026} tyLe />);
  expect(await screen.findByText("12.591,12%")).toHaveClass("is-info");
  expect(screen.getByText("Không chấm tự động")).toBeInTheDocument();
  expect(screen.getByText("MA_MOI")).toBeInTheDocument();
  expect(screen.getByText("Số tháng miễn vượt quá số tháng của năm")).toBeInTheDocument();
  expect(screen.getByText(/Còn 3 dòng TKB/)).toBeInTheDocument();
  expect(screen.getByText("220,63")).toBeInTheDocument();
  expect(document.body).not.toHaveTextContent(/NaN|undefined/);
  fireEvent.click(screen.getByRole("button", { name: "Giải trình giờ giảng của Người có giờ" }));
  const dialog = screen.getByRole("dialog");
  expect(await within(dialog).findByText("12,5")).toBeInTheDocument();
  expect(within(dialog).getByText("-2")).toBeInTheDocument();
  expect(within(dialog).getByText("33,77")).toBeInTheDocument();
  expect(within(dialog).queryByText("Tập sự / thử việc")).not.toBeInTheDocument();
});

test("lọc/sắp xếp ở client không gọi API; bộ lọc đơn vị gửi idDonVi", async () => {
  render(<TongHopGioGiang idNam={2026} tyLe />);
  await screen.findByText("Người miễn");
  fireEvent.click(screen.getByLabelText("Chỉ dòng không chấm tự động"));
  expect(screen.queryByText("Người có giờ")).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Chỉ dòng không chấm tự động"));
  fireEvent.change(screen.getByLabelText("Sắp xếp tỷ lệ giờ giảng"), { target: { value: "ty-le-giam" } });
  const bodyRows = within(screen.getByRole("table")).getAllByRole("row");
  expect(bodyRows[1]).toHaveTextContent("Người có giờ");
  fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Khoa Luật" } });
  expect(screen.queryByText("Người miễn")).not.toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("Lọc tỷ lệ giờ giảng theo đơn vị"), { target: { value: "12" } });
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("gio-giang-tkb/ty-le-hoan-thanh?idNam=2026&idDonVi=12", expect.anything()));
});

test.each([400, 403, 404])("hiện lỗi API %s và cho thử lại", async (status) => {
  apiFetch.mockResolvedValueOnce({ ok: false, status, json: async () => ({ Message: `Lỗi ${status}`, ErrorCode: "FORBIDDEN" }) });
  render(<TongHopGioGiang idNam={2026} tyLe />);
  expect(await screen.findByRole("alert")).toHaveTextContent(`Lỗi ${status}`);
  fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  expect(await screen.findByText("Người miễn")).toBeInTheDocument();
});

test("tự xem lấy ID từ auth/me và xét LoaiDoiTuong tại mọi đơn vị", async () => {
  apiFetch.mockResolvedValue(ok({ Success: true, TyLeHoanThanh: [rows[0]] }));
  const { rerender } = render(<GioGiangNamCard idNam={2026} user={{ IdNhanVien: 1, DonVi: [{ LoaiDoiTuong: 2 }] }} />);
  expect(apiFetch).not.toHaveBeenCalled();
  rerender(<GioGiangNamCard idNam={2026} user={{ IdNhanVien: 1, DonVi: [{ LoaiDoiTuong: 2 }, { LoaiDoiTuong: 1 }] }} />);
  expect(await screen.findByText("Không chấm tự động")).toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledWith("gio-giang-tkb/ty-le-hoan-thanh?idNam=2026&idNhanVien=1", expect.anything());
  expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
});

test("menu và URL dùng cùng ma trận quyền, giữ quyền nhập TKB", () => {
  const path = "/ty-le-hoan-thanh-gio-giang";
  const group = MENU_GROUPS.find((g) => g.key === "kpiSources");
  ["ADMIN", "HT", "TK", "TKL", "TP"].forEach((MaChucVu) => {
    const user = { MaChucVu };
    expect(canAccessPath(path, user)).toBe(true);
    expect(visibleItems(group, user).some((item) => item.path === path)).toBe(true);
  });
  ["GV", "TKK", "PHT", "PTK"].forEach((MaChucVu) => {
    expect(canAccessPath(path, { MaChucVu })).toBe(false);
    expect(visibleItems(group, { MaChucVu }).some((item) => item.path === path)).toBe(false);
  });
  expect(canAccessPath(path, { MaChucVu: "GV", DonVi: [{ MaChucVu: "TK", IdDonVi: 12 }] })).toBe(true);
  expect(canAccessPath("/quan-ly-gio-giang", { MaChucVu: "TK" })).toBe(false);
});

test("phiếu đã xóa không còn được trả từ cache", async () => {
  apiFetch.mockResolvedValueOnce(ok({ Item: { IdPhieu: 99 } })).mockResolvedValueOnce(ok({ Success: true }));
  expect(await fetchPhieuCuaToi(2026)).toEqual({ IdPhieu: 99 });
  expect(await fetchPhieuCuaToi(2026)).toBeNull();
  expect(apiFetch).toHaveBeenCalledTimes(2);
});

test("chi tiết phiếu đã chốt nhưng điểm trống không lấy điểm cũ làm điểm tự động", () => {
  render(<TieuChiChamCard chiTiet={{ IdChiTiet: 1, IdTieuChi: 1, TenTieuChi: "Giờ giảng", LoaiNguonDiem: 2, CongThucSnapshot: "GIO_GIANG_TY_LE", DiemTuDanhGia: 20, DiemToiDa: 20, TrangThaiDong: 3, MinhChung: [], NhiemVuCongDong: [] }} stt={1} />);
  expect(screen.getAllByText("Không chấm tự động").length).toBeGreaterThan(0);
  expect(screen.queryByText("Chưa tính")).not.toBeInTheDocument();
});

test.each([undefined, null])("preview công thức giờ giảng với điểm %s không hiện chưa hỗ trợ hay 0", (DiemTuDong) => {
  render(<DanhGiaPhuLuc2Form criteriaList={[{ IdTieuChi: 1, TenTieuChi: "Hoàn thành giờ giảng", DiemToiDa: 20 }]}
    formData={{}} autoScores={{ 1: { CongThucTongHop: "GIO_GIANG_TY_LE", DiemTuDong } }} tongDiemCoBan={0} />);
  expect(screen.getByText("Không chấm tự động")).toBeInTheDocument();
  expect(screen.queryByText("Chưa tính")).not.toBeInTheDocument();
  expect(screen.queryByText("Chưa hỗ trợ")).not.toBeInTheDocument();
});

test("đổi năm hủy kết quả cũ dù request cũ hoàn thành sau request mới", async () => {
  let resolveOld;
  apiFetch.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
    .mockResolvedValueOnce(ok({ TyLeHoanThanh: [{ ...rows[1], HoTen: "Năm mới" }] }));
  const { rerender } = render(<TongHopGioGiang idNam={2026} tyLe />);
  rerender(<TongHopGioGiang idNam={2027} tyLe />);
  expect(await screen.findByText("Năm mới")).toBeInTheDocument();
  resolveOld(ok({ TyLeHoanThanh: rows }));
  await waitFor(() => expect(apiFetch.mock.calls[0][1].signal.aborted).toBe(true));
  expect(screen.queryByText("Người miễn")).not.toBeInTheDocument();
});
