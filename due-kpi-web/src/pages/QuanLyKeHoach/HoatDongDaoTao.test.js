import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HoatDongDaoTao from "./HoatDongDaoTao";
import HoatDongDaoTaoUyQuyen from "./HoatDongDaoTaoUyQuyen";
import HoatDongDaoTaoForm from "../../components/HoatDongDaoTao/HoatDongDaoTaoForm";
import HoatDongDaoTaoImport from "../../components/HoatDongDaoTao/HoatDongDaoTaoImport";
import RequireRole from "../../components/RequireRole";
import { useQuyenDaoTao } from "../../context/HoatDongDaoTaoContext";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";
import * as api from "../../utils/hoatDongDaoTaoApi";
import { canAccessPath, visibleGroups } from "../../config/menuConfig";

jest.mock("../../context/HoatDongDaoTaoContext", () => ({ useQuyenDaoTao: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../hooks/useNamDanhGia", () => ({ useNamDanhGia: () => ({ namList: [{ IdNam: 2026 }], selectedNam: "2026", setSelectedNam: jest.fn(), dangTaiNam: false }) }));
jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../../utils/hoatDongDaoTaoApi");
jest.mock("primereact/dialog", () => ({ Dialog: ({ header, children, footer }) => <div role="dialog" aria-label={header}>{children}{footer}</div> }));

const types = [{ IdLoai: 1, TenLoai: "Hội đồng CTĐT", NhanNoiDung: "Tên chương trình đào tạo" }, { IdLoai: 3, TenLoai: "Hướng dẫn NCS", NhanNoiDung: "Họ tên NCS – tên đề tài luận án" }];
const teacher = { IdNhanVien: 210, MaNhanVien: "GV0210", HoTen: "Nguyễn Văn A", TenKhoa: "Khoa Kế toán" };
const item = { ...teacher, IdHoatDong: 15, IdNam: 2026, IdLoai: 1, TenLoai: "Hội đồng CTĐT", NoiDung: "CTĐT Kế toán", ChoPhepSua: true };
const show = (component) => render(<MemoryRouter>{component}</MemoryRouter>);
const select = (name, label) => { fireEvent.click(screen.getByRole("combobox", { name })); fireEvent.click(screen.getByRole("option", { name: label })); };
beforeAll(() => { Element.prototype.scrollIntoView = jest.fn(); });
beforeEach(() => {
  jest.clearAllMocks();
  useQuyenDaoTao.mockReturnValue({ quyen: { DuocNhap: true, XemTatCa: true, LaQuanLy: true }, loading: false, refresh: jest.fn() });
  useAuth.mockReturnValue({ user: { MaChucVu: "GV" }, loading: false });
  api.layLoaiDaoTao.mockResolvedValue({ Items: types });
  api.layHoatDongDaoTao.mockResolvedValue({ Items: [item, { ...item, IdHoatDong: 16, HoTen: "Người chỉ xem", ChoPhepSua: false }], TotalCount: 21, Page: 1, PageSize: 20, TotalPages: 2 });
  api.layGiangVienDaoTao.mockResolvedValue({ Items: [teacher, { ...teacher, IdNhanVien: 211, HoTen: "Trần Thị B" }] });
  api.layChiTietDaoTao.mockResolvedValue({ Item: item, LichSu: [{ Id: 1, HanhDong: 4, MoTa: "Nhập từ file", TenNguoiThucHien: "Chuyên viên", NgayThucHien: "2026-03-15T08:00:00" }] });
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ Items: [{ IdDonVi: 7, MaDonVi: "K_KT", TenDonVi: "Khoa Kế toán" }] }) });
});
test("menu / URL ủy quyền chỉ đọc cờ server, không suy từ chức vụ hoặc đơn vị chính", () => {
  const user = { MaChucVu: "ADMIN", DonVi: [{ MaChucVu: "TP", MaDonVi: "P_DTBDCL" }] };
  expect(canAccessPath("/hoat-dong-dao-tao/uy-quyen", user)).toBe(false);
  expect(canAccessPath("/hoat-dong-dao-tao/uy-quyen", user, { LaQuanLy: false })).toBe(false);
  expect(canAccessPath("/hoat-dong-dao-tao/uy-quyen", { MaChucVu: "GV" }, { LaQuanLy: true })).toBe(true);
  expect(canAccessPath("/hoat-dong-dao-tao", { DonVi: [{ LoaiDoiTuong: 0 }] })).toBe(true);
  expect(visibleGroups(user, { XemTatCa: false }).flatMap((g) => g.items).find((i) => i.path === "/hoat-dong-dao-tao").name).toBe("Hoạt động đào tạo của tôi");
});
test("guard chặn URL ủy quyền khi server không cho phép", () => {
  useQuyenDaoTao.mockReturnValue({ quyen: { LaQuanLy: false } });
  render(<MemoryRouterGuard />);
  expect(screen.getByText("Bạn không có quyền truy cập trang này")).toBeInTheDocument();
});
function MemoryRouterGuard() { return <MemoryRouter initialEntries={["/hoat-dong-dao-tao/uy-quyen"]}><RequireRole><div>Ủy quyền được mở</div></RequireRole></MemoryRouter>; }
test("danh sách theo ChoPhepSua, lọc và phân trang gửi lên backend; chi tiết có lịch sử", async () => {
  show(<HoatDongDaoTao />);
  const table = await screen.findByRole("table", { name: "Danh sách hoạt động đào tạo" });
  await screen.findByText("Người chỉ xem");
  expect(within(table).getAllByRole("button", { name: "Sửa" })).toHaveLength(1);
  select("Lọc loại hoạt động", "Hướng dẫn NCS");
  await waitFor(() => expect(api.layHoatDongDaoTao).toHaveBeenLastCalledWith(expect.objectContaining({ idLoai: 3, page: 1 }), expect.anything()));
  fireEvent.click(screen.getByRole("button", { name: "Sau" }));
  await waitFor(() => expect(api.layHoatDongDaoTao).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }), expect.anything()));
  fireEvent.click(screen.getAllByRole("button", { name: "CTĐT Kế toán" })[0]);
  expect(await screen.findByText("Nhập từ file")).toBeInTheDocument();
});
test("người xem cá nhân không thấy nhập/import/ủy quyền/Khoa và không gọi picker", async () => {
  useQuyenDaoTao.mockReturnValue({ quyen: { DuocNhap: false, LaQuanLy: false, DuocUyQuyen: true }, refresh: jest.fn() });
  api.layHoatDongDaoTao.mockResolvedValue({ Items: [{ ...item, ChoPhepSua: false }], TotalCount: 1, TotalPages: 1 });
  show(<HoatDongDaoTao />);
  await screen.findByText("Nguyễn Văn A");
  expect(screen.getByRole("heading", { name: "Hoạt động đào tạo của tôi" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Thêm hoạt động/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Import Excel" })).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "Lọc Khoa" })).not.toBeInTheDocument();
  expect(screen.getByText(/Quyền nhập liệu không còn hiệu lực/)).toBeInTheDocument();
  expect(api.layGiangVienDaoTao).not.toHaveBeenCalled();
});
test("thêm nhiều giảng viên; lỗi 422 giữ form và danh sách, label nội dung lấy từ loại", async () => {
  const onSaved = jest.fn();
  api.themHoatDongDaoTao.mockRejectedValueOnce(new Error("Trần Thị B không phải giảng viên đang công tác")).mockResolvedValueOnce({ Success: true, SoBanGhi: 2 });
  show(<HoatDongDaoTaoForm item={null} idNam="2026" namList={[{ IdNam: 2026 }]} loaiList={types} khoaList={[]} onSaved={onSaved} />);
  expect(api.layGiangVienDaoTao).not.toHaveBeenCalled();
  select("Loại ghi nhận", "Hướng dẫn NCS");
  fireEvent.change(screen.getByLabelText("Họ tên NCS – tên đề tài luận án *"), { target: { value: "NCS A – đề tài B" } });
  fireEvent.change(screen.getByLabelText("Tìm giảng viên"), { target: { value: "GV" } });
  fireEvent.click(await screen.findByRole("button", { name: /Nguyễn Văn A GV0210/ }));
  fireEvent.click(screen.getByRole("button", { name: /Trần Thị B GV0210/ }));
  fireEvent.click(screen.getByRole("button", { name: "Ghi nhận" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Trần Thị B không phải giảng viên");
  expect(screen.getByRole("button", { name: "Bỏ Trần Thị B" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Ghi nhận" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(api.themHoatDongDaoTao).toHaveBeenLastCalledWith({ IdNam: 2026, IdLoai: 3, NoiDung: "NCS A – đề tài B", SoQuyetDinh: null, NgayQuyetDinh: null, GhiChu: null, IdNhanViens: [210, 211] });
});
test("sửa gửi đủ trường, xoá giá trị tuỳ chọn và hiện CoThayDoi=false", async () => {
  const onSaved = jest.fn();
  api.suaHoatDongDaoTao.mockResolvedValue({ Success: true, CoThayDoi: false });
  show(<HoatDongDaoTaoForm item={{ ...item, NgayQuyetDinh: "2026-03-15T00:00:00" }} namList={[{ IdNam: 2026 }]} loaiList={types} khoaList={[]} onSaved={onSaved} />);
  expect(screen.getByLabelText("Ngày quyết định")).toHaveValue("2026-03-15");
  fireEvent.change(screen.getByLabelText("Ngày quyết định"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.anything(), "Không có thay đổi nào được ghi nhận."));
  expect(api.suaHoatDongDaoTao).toHaveBeenCalledWith(15, { IdNam: 2026, IdLoai: 1, IdNhanVien: 210, NoiDung: "CTĐT Kế toán", SoQuyetDinh: null, NgayQuyetDinh: null, GhiChu: null });
});
test("xoá phải xác nhận và gửi lý do", async () => {
  api.xoaHoatDongDaoTao.mockResolvedValue({ Success: true, Message: "Đã xoá" });
  show(<HoatDongDaoTao />);
  fireEvent.click(await screen.findByRole("button", { name: "Xoá" }));
  expect(api.xoaHoatDongDaoTao).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Lý do (tuỳ chọn)"), { target: { value: "Sai nội dung" } });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận xoá" }));
  await waitFor(() => expect(api.xoaHoatDongDaoTao).toHaveBeenCalledWith(15, "Sai nội dung"));
});
test("import hai bước giữ file, hiển thị warnings, invalidates preview khi đổi file", async () => {
  const file = new File(["excel"], "dao-tao.xlsx");
  const onImported = jest.fn();
  api.importDaoTao.mockImplementation(async (f, year, preview) => ({ Success: true, ChiKiemTra: preview, TongDong: 3, SoThem: 1, SoTrung: 1, SoLoi: 1, SoCanhBao: 1, Warnings: ["Chỉ đọc 5000 dòng"], Dong: [
    { DongExcel: 2, KetQua: "THEM", HoTen: "Nguyễn Văn A", CanhBao: "Họ tên không khớp" }, { DongExcel: 3, KetQua: "LOI", ThongBao: "Không tìm thấy nhân viên" }, { DongExcel: 4, KetQua: "TRUNG" },
  ] }));
  show(<HoatDongDaoTaoImport idNam="2026" onImported={onImported} />);
  expect(screen.getByRole("button", { name: "Xác nhận import" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("File Excel (.xls, .xlsx)"), { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra file" }));
  await screen.findByText("Chỉ đọc 5000 dòng");
  expect(screen.getByText(/Họ tên không khớp/)).toBeInTheDocument();
  expect(onImported).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận import" }));
  await waitFor(() => expect(onImported).toHaveBeenCalled());
  expect(api.importDaoTao.mock.calls.map((args) => args.slice(0, 3))).toEqual([[file, "2026", true], [file, "2026", false]]);
  expect(screen.getByRole("button", { name: "Xác nhận import" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("File Excel (.xls, .xlsx)"), { target: { files: [new File(["x"], "new.xlsx")] } });
  expect(screen.queryByText("Chỉ đọc 5000 dòng")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Xác nhận import" })).toBeDisabled();
});
test("lỗi cấp file hiển thị Message và không mở xác nhận", async () => {
  api.importDaoTao.mockRejectedValue(new Error("Thiếu cột Mã nhân viên"));
  show(<HoatDongDaoTaoImport idNam="2026" />);
  fireEvent.change(screen.getByLabelText("File Excel (.xls, .xlsx)"), { target: { files: [new File(["x"], "bad.xlsx")] } });
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra file" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Thiếu cột Mã nhân viên");
  expect(screen.getByRole("button", { name: "Xác nhận import" })).toBeDisabled();
});
test("ủy quyền: manager disabled, người đã cấp Thu hồi, lịch sử và người rời phòng", async () => {
  api.layNguoiNhapDaoTao.mockResolvedValue({ Items: [{ IdNhanVien: 88, HoTen: "Nhân sự cũ", ConThuocPhong: false, DaThuHoi: false }] });
  api.layUngVienDaoTao.mockResolvedValue({ Items: [{ IdNhanVien: 5, HoTen: "Trưởng phòng", LaQuanLy: true }, { IdNhanVien: 6, HoTen: "Người đã cấp", DaDuocCap: true }, { IdNhanVien: 7, HoTen: "Người chưa cấp", DaDuocCap: false }] });
  api.capQuyenDaoTao.mockResolvedValue({ Success: true });
  api.thuHoiQuyenDaoTao.mockResolvedValue({ Success: true });
  show(<HoatDongDaoTaoUyQuyen />);
  expect(await screen.findByRole("button", { name: "Đã có toàn quyền" })).toBeDisabled();
  expect(screen.getByText("Đã rời phòng – không còn hiệu lực")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cấp quyền" }));
  fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Phụ trách CTĐT" } });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
  await waitFor(() => expect(api.capQuyenDaoTao).toHaveBeenCalledWith({ IdNhanVien: 7, GhiChu: "Phụ trách CTĐT" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  fireEvent.click(screen.getAllByRole("button", { name: "Thu hồi" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
  await waitFor(() => expect(api.thuHoiQuyenDaoTao).toHaveBeenCalledWith(88));
  fireEvent.click(screen.getByLabelText("Bao gồm đã thu hồi"));
  await waitFor(() => expect(api.layNguoiNhapDaoTao).toHaveBeenLastCalledWith(true));
});
