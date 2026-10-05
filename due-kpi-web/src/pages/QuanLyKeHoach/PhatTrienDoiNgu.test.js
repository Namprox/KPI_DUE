import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PhatTrienDoiNgu from "./PhatTrienDoiNgu";
import PhatTrienDoiNguHangMuc from "./PhatTrienDoiNguHangMuc";
import PhatTrienDoiNguUyQuyen from "./PhatTrienDoiNguUyQuyen";
import PhatTrienDoiNguForm from "../../components/PhatTrienDoiNgu/PhatTrienDoiNguForm";
import PhatTrienDoiNguImport from "../../components/PhatTrienDoiNgu/PhatTrienDoiNguImport";
import DanhGiaPhuLuc2Form from "../../components/DanhGia/DanhGiaPhuLuc2/DanhGiaPhuLuc2Form";
import RequireRole from "../../components/RequireRole";
import { useQuyenDoiNgu } from "../../context/PhatTrienDoiNguContext";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";
import * as api from "../../utils/phatTrienDoiNguApi";
import { canAccessPath, visibleGroups } from "../../config/menuConfig";
import { ghepDiemTuDongPhieu } from "../../utils/diemTuDongPhieu";

jest.mock("../../context/PhatTrienDoiNguContext", () => ({ useQuyenDoiNgu: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../hooks/useNamDanhGia", () => ({ useNamDanhGia: () => ({ namList: [{ IdNam: 2026 }], selectedNam: "2026", setSelectedNam: jest.fn(), dangTaiNam: false }) }));
jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../../utils/phatTrienDoiNguApi");
jest.mock("primereact/dialog", () => ({ Dialog: ({ header, children, footer }) => <div role="dialog" aria-label={header}>{children}{footer}</div> }));

const types = [{ IdLoai: 1, TenLoai: "Danh hiệu nhà giáo", ChoThemHangMuc: false, NhanNoiDung: "Đợt phong tặng" }, { IdLoai: 3, TenLoai: "Bồi dưỡng", ChoThemHangMuc: true, NhanNoiDung: "Khoá / cơ sở đào tạo" }];
const category = { IdHangMuc: 8, IdLoai: 3, TenHangMuc: "Cao cấp lý luận chính trị", DangSuDung: true, CoTheSua: true, ThuTu: 2 };
const teacher = { IdNhanVien: 210, MaNhanVien: "GV0210", HoTen: "Nguyễn Văn A", TenKhoa: "Khoa Kế toán" };
const item = { ...teacher, IdBanGhi: 31, IdNam: 2026, IdLoai: 3, TenLoai: "Bồi dưỡng", IdHangMuc: 8, TenHangMuc: category.TenHangMuc, ChoPhepSua: true };
const show = (node) => render(<MemoryRouter>{node}</MemoryRouter>);
const select = (name, label) => { fireEvent.click(screen.getByRole("combobox", { name })); fireEvent.click(screen.getByRole("option", { name: label })); };
const form = (props = {}) => <PhatTrienDoiNguForm idNam="2026" namList={[{ IdNam: 2026 }]} loaiList={types} khoaList={[]} {...props} />;
beforeAll(() => { Element.prototype.scrollIntoView = jest.fn(); });
beforeEach(() => {
  jest.clearAllMocks();
  useQuyenDoiNgu.mockReturnValue({ quyen: { DuocNhap: true, XemTatCa: true, LaQuanLy: true }, loading: false, refresh: jest.fn() });
  useAuth.mockReturnValue({ user: { MaChucVu: "GV" }, loading: false });
  api.layLoaiDoiNgu.mockResolvedValue({ Items: types });
  api.layHangMucDoiNgu.mockResolvedValue({ Items: [category] });
  api.layPhatTrienDoiNgu.mockResolvedValue({ Items: [item, { ...item, IdBanGhi: 32, HoTen: "Người chỉ xem", ChoPhepSua: false }], TotalCount: 21, Page: 1, TotalPages: 2 });
  api.layChiTietDoiNgu.mockResolvedValue({ Item: { ...item, GhiChu: "Ghi chú đầy đủ" }, LichSu: [{ Id: 1, HanhDong: 4, MoTa: "Nhập từ file" }] });
  api.layGiangVienDoiNgu.mockResolvedValue({ Items: [teacher, { ...teacher, IdNhanVien: 211, HoTen: "Trần Thị B" }] });
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ Items: [{ IdDonVi: 7, MaDonVi: "K_KT", TenDonVi: "Khoa Kế toán" }] }) });
});

test("menu và URL quản lý dùng quyền module, không nhận quyền đào tạo hoặc suy từ chức vụ", () => {
  const user = { MaChucVu: "ADMIN", DonVi: [{ MaChucVu: "TP", MaDonVi: "P_TCHC" }] };
  for (const path of ["/phat-trien-doi-ngu/uy-quyen"]) {
    expect(canAccessPath(path, user, { LaQuanLy: true })).toBe(false);
    expect(canAccessPath(path, { MaChucVu: "GV" }, null, { LaQuanLy: true })).toBe(true);
  }
  expect(canAccessPath("/phat-trien-doi-ngu/31", { DonVi: [{ LoaiDoiTuong: 0 }] })).toBe(true);
  const menu = (p) => visibleGroups(user, null, null, p).flatMap((g) => g.items);
  expect(menu({ XemTatCa: false }).find((i) => i.path === "/phat-trien-doi-ngu").name).toBe("Phát triển đội ngũ của tôi");
  expect(menu({ LaQuanLy: false }).some((i) => i.path === "/phat-trien-doi-ngu/hang-muc")).toBe(false);
  expect(menu({ LaQuanLy: true }).some((i) => i.path === "/phat-trien-doi-ngu/hang-muc")).toBe(false);
  expect(canAccessPath("/phat-trien-doi-ngu/hang-muc", user, null, { LaQuanLy: true })).toBe(false);
});
test.each([["hang-muc", false], ["hang-muc", true], ["hang-muc/", true], ["uy-quyen", false]])("guard chặn URL %s với LaQuanLy=%s", (path, LaQuanLy) => {
  useQuyenDoiNgu.mockReturnValue({ quyen: { LaQuanLy } });
  render(<MemoryRouter initialEntries={[`/phat-trien-doi-ngu/${path}`]}><RequireRole><div>Nội dung quản lý</div></RequireRole></MemoryRouter>);
  expect(screen.getByText("Bạn không có quyền truy cập trang này")).toBeInTheDocument();
  expect(screen.queryByText("Nội dung quản lý")).not.toBeInTheDocument();
});
test("danh sách lọc hạng mục, phân trang, nút theo ChoPhepSua và chi tiết có lịch sử", async () => {
  show(<PhatTrienDoiNgu />);
  const table = await screen.findByRole("table", { name: "Danh sách phát triển đội ngũ" });
  await screen.findByText("Người chỉ xem");
  expect(within(table).getAllByRole("button", { name: "Sửa" })).toHaveLength(1);
  expect(screen.queryByRole("link", { name: "Danh mục hạng mục" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Ủy quyền nhập liệu" })).toHaveAttribute("href", "/phat-trien-doi-ngu/uy-quyen");
  select("Lọc hạng mục", category.TenHangMuc);
  await waitFor(() => expect(api.layPhatTrienDoiNgu).toHaveBeenLastCalledWith(expect.objectContaining({ idHangMuc: 8, page: 1 }), expect.anything()));
  select("Lọc loại ghi nhận", "Bồi dưỡng");
  await waitFor(() => expect(api.layPhatTrienDoiNgu).toHaveBeenLastCalledWith(expect.objectContaining({ idLoai: 3, idHangMuc: "" }), expect.anything()));
  fireEvent.click(screen.getByRole("button", { name: "Sau" }));
  await waitFor(() => expect(api.layPhatTrienDoiNgu).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }), expect.anything()));
  fireEvent.click(screen.getAllByRole("button", { name: category.TenHangMuc })[0]);
  expect(await screen.findByText("Nhập từ file")).toBeInTheDocument();
  expect(screen.getByText(/không tự cập nhật điểm phiếu đã nộp/)).toBeInTheDocument();
});
test("người xem cá nhân không có nút nhập và không gọi picker", async () => {
  useQuyenDoiNgu.mockReturnValue({ quyen: { DuocNhap: false, LaQuanLy: false, DuocUyQuyen: true }, refresh: jest.fn() });
  api.layPhatTrienDoiNgu.mockResolvedValue({ Items: [{ ...item, ChoPhepSua: false }], TotalCount: 1, TotalPages: 1 });
  show(<PhatTrienDoiNgu />);
  await screen.findByText(teacher.HoTen);
  expect(screen.getByRole("heading", { name: "Phát triển đội ngũ của tôi" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Thêm ghi nhận/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "Lọc Khoa" })).not.toBeInTheDocument();
  expect(screen.getByText(/Quyền nhập liệu không còn hiệu lực/)).toBeInTheDocument();
  expect(api.layGiangVienDoiNgu).not.toHaveBeenCalled();
});
test("tạo nhiều giảng viên, chi tiết tuỳ chọn, không gửi IdLoai và giữ lựa chọn khi lỗi", async () => {
  const onSaved = jest.fn();
  api.themPhatTrienDoiNgu.mockRejectedValueOnce(new Error("Trần Thị B không phải giảng viên")).mockResolvedValueOnce({ Success: true, SoBanGhi: 2 });
  show(form({ onSaved }));
  select("Loại ghi nhận", "Bồi dưỡng");
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Hạng mục ghi nhận" })).toBeEnabled());
  select("Hạng mục ghi nhận", category.TenHangMuc);
  fireEvent.change(screen.getByLabelText("Tìm giảng viên"), { target: { value: "Nguyễn" } });
  fireEvent.click(await screen.findByRole("button", { name: /Nguyễn Văn A GV0210/ }));
  fireEvent.click(screen.getByRole("button", { name: /Trần Thị B GV0210/ }));
  fireEvent.click(screen.getByRole("button", { name: "Ghi nhận" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Trần Thị B không phải giảng viên");
  expect(onSaved).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Bỏ Trần Thị B" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Ghi nhận" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(api.themPhatTrienDoiNgu).toHaveBeenLastCalledWith({ IdNam: 2026, IdHangMuc: 8, NoiDung: null, SoQuyetDinh: null, NgayQuyetDinh: null, GhiChu: null, IdNhanViens: [210, 211] });
});
test("sửa giữ hạng mục ngừng dùng, gửi đủ trường và xử lý CoThayDoi=false", async () => {
  api.layHangMucDoiNgu.mockResolvedValue({ Items: [] });
  api.suaPhatTrienDoiNgu.mockResolvedValue({ Success: true, CoThayDoi: false });
  const onSaved = jest.fn();
  show(form({ item: { ...item, NgayQuyetDinh: "2026-03-15T00:00:00" }, onSaved }));
  await screen.findByText(`${category.TenHangMuc} (Đã ngừng dùng)`);
  fireEvent.change(screen.getByLabelText("Ngày quyết định"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.anything(), "Không có thay đổi nào được ghi nhận."));
  expect(api.suaPhatTrienDoiNgu).toHaveBeenCalledWith(31, { IdNam: 2026, IdHangMuc: 8, IdNhanVien: 210, NoiDung: null, SoQuyetDinh: null, NgayQuyetDinh: null, GhiChu: null });
});
test("mở sửa đọc chi tiết đầy đủ trước khi gửi PUT", async () => {
  show(<PhatTrienDoiNgu />);
  fireEvent.click(await screen.findByRole("button", { name: "Sửa" }));
  expect(await screen.findByLabelText("Ghi chú")).toHaveValue("Ghi chú đầy đủ");
  expect(api.layChiTietDoiNgu).toHaveBeenCalledWith(31);
});
test("picker nhận ID dạng chuỗi vẫn nhận ra giảng viên đã chọn", async () => {
  api.layGiangVienDoiNgu.mockResolvedValue({ Items: [{ ...teacher, IdNhanVien: "210" }] });
  show(form({ item }));
  fireEvent.change(screen.getByLabelText("Tìm giảng viên"), { target: { value: "Nguyễn" } });
  expect(await screen.findByRole("button", { name: /Nguyễn Văn A GV0210/ })).toBeDisabled();
});
test("lỗi tải hạng mục khoá lưu và cho phép thử lại", async () => {
  api.layHangMucDoiNgu.mockRejectedValueOnce(new Error("Không tải được hạng mục"));
  show(form({ item }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Không tải được hạng mục");
  expect(screen.getByRole("button", { name: "Lưu thay đổi" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Tải lại hạng mục" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Lưu thay đổi" })).toBeEnabled());
});
test("xoá cần xác nhận và gửi lý do", async () => {
  api.xoaPhatTrienDoiNgu.mockResolvedValue({ Success: true });
  show(<PhatTrienDoiNgu />);
  fireEvent.click(await screen.findByRole("button", { name: "Xoá" }));
  expect(api.xoaPhatTrienDoiNgu).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Lý do (tuỳ chọn)"), { target: { value: "Ghi nhận nhầm" } });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận xoá" }));
  await waitFor(() => expect(api.xoaPhatTrienDoiNgu).toHaveBeenCalledWith(31, "Ghi nhận nhầm"));
});
test("import kiểm tra trước xác nhận, hiện hạng mục và cảnh báo, đổi file huỷ kết quả cũ", async () => {
  const file = new File(["excel"], "doi-ngu.xlsx");
  const onImported = jest.fn();
  api.importDoiNgu.mockImplementation(async (f, year, preview) => ({ ChiKiemTra: preview, SoThem: 1, SoLoi: 1, Dong: [{ DongExcel: 2, KetQua: "THEM", TenHangMuc: category.TenHangMuc, CanhBao: "Họ tên không khớp" }, { DongExcel: 3, KetQua: "LOI", ThongBao: "Hạng mục ngừng dùng" }] }));
  show(<PhatTrienDoiNguImport idNam="2026" onImported={onImported} />);
  expect(screen.getByRole("button", { name: "Xác nhận import" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("File Excel (.xls, .xlsx)"), { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra file" }));
  await screen.findByText(category.TenHangMuc);
  expect(screen.getByText(/Họ tên không khớp/)).toBeInTheDocument();
  expect(onImported).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận import" }));
  await waitFor(() => expect(onImported).toHaveBeenCalled());
  expect(api.importDoiNgu.mock.calls.map((args) => args.slice(0, 3))).toEqual([[file, "2026", true], [file, "2026", false]]);
  fireEvent.change(screen.getByLabelText("File Excel (.xls, .xlsx)"), { target: { files: [new File(["new"], "new.xlsx")] } });
  expect(screen.queryByText(category.TenHangMuc)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Xác nhận import" })).toBeDisabled();
});
test("danh mục chỉ thêm loại được ChoThemHangMuc, sửa theo CoTheSua và ngừng dùng không xoá", async () => {
  api.layHangMucDoiNgu.mockResolvedValue({ Items: [category, { IdHangMuc: 1, IdLoai: 1, TenHangMuc: "Nhà giáo Ưu tú", CoTheSua: false, LaCoDinh: true, DangSuDung: true }] });
  api.suaHangMucDoiNgu.mockResolvedValue({ CoThayDoi: true });
  api.themHangMucDoiNgu.mockResolvedValue({ IdHangMuc: 10 });
  show(<PhatTrienDoiNguHangMuc />);
  await screen.findByText("Nhà giáo Ưu tú");
  expect(screen.getAllByRole("button", { name: "Sửa" })).toHaveLength(1);
  expect(screen.queryByRole("button", { name: /Thêm hạng mục/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Sửa" }));
  fireEvent.click(screen.getByLabelText("Đang sử dụng"));
  fireEvent.click(screen.getByRole("button", { name: "Lưu hạng mục" }));
  await waitFor(() => expect(api.suaHangMucDoiNgu).toHaveBeenCalledWith(8, { MaHangMuc: null, TenHangMuc: category.TenHangMuc, ThuTu: 2, DangSuDung: false }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  select("Loại danh mục", "Bồi dưỡng");
  fireEvent.click(await screen.findByRole("button", { name: /Thêm hạng mục/ }));
  fireEvent.change(screen.getByLabelText(/Tên hạng mục/), { target: { value: "Khoá mới" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu hạng mục" }));
  await waitFor(() => expect(api.themHangMucDoiNgu).toHaveBeenCalledWith({ IdLoai: 3, MaHangMuc: null, TenHangMuc: "Khoá mới", ThuTu: null }));
  expect(api.layHangMucDoiNgu).toHaveBeenCalledWith(expect.objectContaining({ baoGomNgungDung: true }), expect.anything());
});
test("ủy quyền hiển thị người rời phòng, không cấp thêm cho quản lý", async () => {
  api.layNguoiNhapDoiNgu.mockResolvedValue({ Items: [{ IdNhanVien: 88, HoTen: "Nhân sự cũ", ConThuocPhong: false, DaThuHoi: false }] });
  api.layUngVienDoiNgu.mockResolvedValue({ Items: [{ IdNhanVien: 5, HoTen: "Trưởng phòng", LaQuanLy: true }, { IdNhanVien: 7, HoTen: "Chuyên viên", DaDuocCap: false }] });
  api.capQuyenDoiNgu.mockResolvedValue({ Success: true });
  show(<PhatTrienDoiNguUyQuyen />);
  expect(await screen.findByRole("button", { name: "Đã có toàn quyền" })).toBeDisabled();
  expect(screen.getByText("Đã rời phòng – không còn hiệu lực")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cấp quyền" }));
  fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Phụ trách nhân sự" } });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
  await waitFor(() => expect(api.capQuyenDoiNgu).toHaveBeenCalledWith({ IdNhanVien: 7, GhiChu: "Phụ trách nhân sự" }));
});
test.each(["PTDN_DANH_HIEU_NHA_GIAO", "PTDN_NGACH_HOC_HAM_HOC_VI", "PTDN_BOI_DUONG"])("%s dùng điểm server, khoá nhập, link nguồn 11 và lý do nguyên văn", (code) => {
  const reason = "Phong To chuc - Hanh chinh chua ghi nhan...";
  const criteria = [{ IdTieuChi: 1, TenTieuChi: "Phát triển đội ngũ", DiemToiDa: 5, LoaiNguonDiem: 2 }];
  const preview = { 1: { CongThucTongHop: code, DiemTuDong: 5, LyDoDiemTuDong: reason, ApDungQuy: false, MinhChung: [{ LoaiNguon: 11, MaNguon: 31, TieuDe: "Học vị Tiến sĩ (TS)" }] } };
  const autoScores = ghepDiemTuDongPhieu(preview, [{ ...criteria[0], CongThucSnapshot: code, DiemChinhThuc: 0 }], criteria);
  expect(autoScores[1].DiemTuDong).toBe(0);
  expect(ghepDiemTuDongPhieu(preview, [{ ...criteria[0], CongThucSnapshot: code, DiemChinhThuc: null }], criteria)[1].DiemTuDong).toBeNull();
  show(<DanhGiaPhuLuc2Form criteriaList={criteria} formData={{}} autoScores={autoScores} tongDiemCoBan={0} laDongMoNhap={() => true} />);
  expect(screen.getByText(reason)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Học vị Tiến sĩ (TS)" })).toHaveAttribute("href", "/phat-trien-doi-ngu/31");
  expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  // File inputs are hidden; assert they are absent even from the DOM for automatic criteria.
  // eslint-disable-next-line testing-library/no-node-access
  expect(document.querySelector('input[type="file"]')).toBeNull();
  expect(ghepDiemTuDongPhieu(preview, [{ ...criteria[0], LoaiNguonDiem: 1 }], criteria)).toEqual({});
});
