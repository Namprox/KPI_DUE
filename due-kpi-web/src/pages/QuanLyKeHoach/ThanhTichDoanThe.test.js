import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ThanhTichDoanThe from "./ThanhTichDoanThe";
import ThanhTichDoanTheForm from "../../components/ThanhTichDoanThe/ThanhTichDoanTheForm";
import ThanhTichDoanTheImport from "../../components/ThanhTichDoanThe/ThanhTichDoanTheImport";
import { useQuyenDoanThe } from "../../context/ThanhTichDoanTheContext";
import { apiFetch } from "../../utils/api";
import * as api from "../../utils/thanhTichDoanTheApi";
import { canAccessPath, visibleGroups } from "../../config/menuConfig";
import DanhGiaPhuLuc2Form from "../../components/DanhGia/DanhGiaPhuLuc2/DanhGiaPhuLuc2Form";
import ThanhTichDoanTheDetail from "../../components/ThanhTichDoanThe/ThanhTichDoanTheDetail";
import { ghepDiemTuDongPhieu } from "../../utils/diemTuDongPhieu";

jest.mock("../../context/ThanhTichDoanTheContext", () => ({ useQuyenDoanThe: jest.fn() }));
jest.mock("../../hooks/useNamDanhGia", () => ({ useNamDanhGia: () => ({ namList: [{ IdNam: 2026 }], selectedNam: "2026", setSelectedNam: jest.fn(), dangTaiNam: false }) }));
jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../../utils/thanhTichDoanTheApi");
jest.mock("primereact/dialog", () => ({ Dialog: ({ header, children, footer }) => <div role="dialog" aria-label={header}>{children}{footer}</div> }));

const types = [{ IdLoai: 1, TenLoai: "Huy chương Đồng trở lên", NhanNoiDung: "Huy chương – nội dung – tên giải / hội thi" }, { IdLoai: 2, TenLoai: "Ghi nhận ngoài DUE và UD", NhanNoiDung: "Nội dung thành tích được ghi nhận" }];
const teacher = { IdNhanVien: 210, MaNhanVien: "GV0210", HoTen: "Nguyễn Văn A", TenKhoa: "Khoa Kế toán" };
const item = { ...teacher, IdThanhTich: 15, IdNam: 2026, IdLoai: 1, TenLoai: "Huy chương Đồng trở lên", NoiDung: "HC Đồng – Cầu lông – Hội thao ĐHĐN", ChoPhepSua: true };
const show = (component) => render(<MemoryRouter>{component}</MemoryRouter>);
const select = (name, label) => { fireEvent.click(screen.getByRole("combobox", { name })); fireEvent.click(screen.getByRole("option", { name: label })); };
beforeAll(() => { Element.prototype.scrollIntoView = jest.fn(); });
beforeEach(() => {
  jest.clearAllMocks();
  useQuyenDoanThe.mockReturnValue({ quyen: { DuocNhap: true, XemTatCa: true }, loading: false, refresh: jest.fn() });
  api.layLoaiDoanThe.mockResolvedValue({ Items: types });
  api.layThanhTichDoanThe.mockResolvedValue({ Items: [item, { ...item, IdThanhTich: 16, HoTen: "Người chỉ xem", ChoPhepSua: false }], TotalCount: 21, Page: 1, PageSize: 20, TotalPages: 2 });
  api.layGiangVienDoanThe.mockResolvedValue({ Items: [teacher, { ...teacher, IdNhanVien: 211, HoTen: "Trần Thị B" }] });
  api.layChiTietDoanThe.mockResolvedValue({ Item: item, LichSu: [{ Id: 1, HanhDong: 4, MoTa: "Nhập từ file", TenNguoiThucHien: "Chuyên viên", NgayThucHien: "2026-03-15T08:00:00" }] });
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ Items: [{ IdDonVi: 7, MaDonVi: "K_KT", TenDonVi: "Khoa Kế toán" }] }) });
});
test("menu cá nhân và quản lý theo cờ server, không dựa chức vụ token hay đơn vị chính", () => {
  const user = { MaChucVu: "GV", DonVi: [{ MaDonVi: "K_KT", LoaiDoiTuong: 1 }] };
  const menu = (permission) => visibleGroups(user, null, permission).flatMap((g) => g.items).find((i) => i.path === "/thanh-tich-doan-the");
  expect(menu({}).name).toBe("Thành tích đoàn thể của tôi");
  expect(menu({ XemTatCa: true }).name).toBe("Thành tích đoàn thể");
  expect(menu({ XemTheoKhoa: true }).name).toBe("Thành tích đoàn thể");
  expect(canAccessPath("/thanh-tich-doan-the/8", user)).toBe(true);
});
test("có quyền xem Khoa vẫn không thấy nút ghi khi DuocNhap=false", async () => {
  useQuyenDoanThe.mockReturnValue({ quyen: { DuocNhap: false, XemTheoKhoa: true }, refresh: jest.fn() });
  api.layThanhTichDoanThe.mockResolvedValue({ Items: [{ ...item, ChoPhepSua: false }], TotalCount: 1, TotalPages: 1 });
  show(<ThanhTichDoanThe />);
  await screen.findByText("Nguyễn Văn A");
  expect(screen.getByRole("combobox", { name: "Lọc Khoa" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Thêm thành tích/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Sửa" })).not.toBeInTheDocument();
});
test("danh sách theo ChoPhepSua, lọc và phân trang gửi lên backend; chi tiết có lịch sử", async () => {
  show(<ThanhTichDoanThe />);
  const table = await screen.findByRole("table", { name: "Danh sách thành tích đoàn thể" });
  await screen.findByText("Người chỉ xem");
  expect(within(table).getAllByRole("button", { name: "Sửa" })).toHaveLength(1);
  select("Lọc loại thành tích", "Ghi nhận ngoài DUE và UD");
  await waitFor(() => expect(api.layThanhTichDoanThe).toHaveBeenLastCalledWith(expect.objectContaining({ idLoai: 2, page: 1 }), expect.anything()));
  fireEvent.click(screen.getByRole("button", { name: "Sau" }));
  await waitFor(() => expect(api.layThanhTichDoanThe).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }), expect.anything()));
  fireEvent.click(screen.getAllByRole("button", { name: "HC Đồng – Cầu lông – Hội thao ĐHĐN" })[0]);
  expect(await screen.findByText("Nhập từ file")).toBeInTheDocument();
});
test("người xem cá nhân không thấy nhập/import/ủy quyền/Khoa và không gọi picker", async () => {
  useQuyenDoanThe.mockReturnValue({ quyen: { DuocNhap: false }, refresh: jest.fn() });
  api.layThanhTichDoanThe.mockResolvedValue({ Items: [{ ...item, ChoPhepSua: false }], TotalCount: 1, TotalPages: 1 });
  show(<ThanhTichDoanThe />);
  await screen.findByText("Nguyễn Văn A");
  expect(screen.getByRole("heading", { name: "Thành tích đoàn thể của tôi" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Thêm thành tích/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Import Excel" })).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "Lọc Khoa" })).not.toBeInTheDocument();
  expect(api.layGiangVienDoanThe).not.toHaveBeenCalled();
});
test("thêm nhiều giảng viên; lỗi 422 giữ form và danh sách, label nội dung lấy từ loại", async () => {
  const onSaved = jest.fn();
  api.themThanhTichDoanThe.mockRejectedValueOnce(new Error("Trần Thị B không phải giảng viên đang công tác")).mockResolvedValueOnce({ Success: true, SoBanGhi: 2 });
  show(<ThanhTichDoanTheForm item={null} idNam="2026" namList={[{ IdNam: 2026 }]} loaiList={types} khoaList={[]} onSaved={onSaved} />);
  expect(api.layGiangVienDoanThe).not.toHaveBeenCalled();
  select("Loại ghi nhận", "Ghi nhận ngoài DUE và UD");
  fireEvent.change(screen.getByLabelText("Nội dung thành tích được ghi nhận *"), { target: { value: "Giấy khen hoạt động cộng đồng" } });
  fireEvent.change(screen.getByLabelText("Tìm giảng viên"), { target: { value: "GV" } });
  fireEvent.click(await screen.findByRole("button", { name: /Nguyễn Văn A GV0210/ }));
  fireEvent.click(screen.getByRole("button", { name: /Trần Thị B GV0210/ }));
  fireEvent.click(screen.getByRole("button", { name: "Ghi nhận" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Trần Thị B không phải giảng viên");
  expect(screen.getByRole("button", { name: "Bỏ Trần Thị B" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Ghi nhận" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(api.themThanhTichDoanThe).toHaveBeenLastCalledWith({ IdNam: 2026, IdLoai: 2, NoiDung: "Giấy khen hoạt động cộng đồng", CoQuanGhiNhan: null, SoQuyetDinh: null, NgayQuyetDinh: null, GhiChu: null, IdNhanViens: [210, 211] });
});
test("sửa gửi đủ trường, xoá giá trị tuỳ chọn và hiện CoThayDoi=false", async () => {
  const onSaved = jest.fn();
  api.suaThanhTichDoanThe.mockResolvedValue({ Success: true, CoThayDoi: false });
  show(<ThanhTichDoanTheForm item={{ ...item, CoQuanGhiNhan: "Đại học Đà Nẵng", NgayQuyetDinh: "2026-03-15T00:00:00" }} namList={[{ IdNam: 2026 }]} loaiList={types} khoaList={[]} onSaved={onSaved} />);
  fireEvent.change(screen.getByLabelText("Cơ quan ghi nhận"), { target: { value: "" } });
  expect(screen.getByLabelText("Ngày quyết định")).toHaveValue("2026-03-15");
  fireEvent.change(screen.getByLabelText("Ngày quyết định"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.anything(), "Không có thay đổi nào được ghi nhận."));
  expect(api.suaThanhTichDoanThe).toHaveBeenCalledWith(15, { IdNam: 2026, IdLoai: 1, IdNhanVien: 210, NoiDung: "HC Đồng – Cầu lông – Hội thao ĐHĐN", CoQuanGhiNhan: null, SoQuyetDinh: null, NgayQuyetDinh: null, GhiChu: null });
});
test("xoá phải xác nhận và gửi lý do", async () => {
  api.xoaThanhTichDoanThe.mockResolvedValue({ Success: true, Message: "Đã xoá" });
  show(<ThanhTichDoanThe />);
  fireEvent.click(await screen.findByRole("button", { name: "Xoá" }));
  expect(api.xoaThanhTichDoanThe).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Lý do (tuỳ chọn)"), { target: { value: "Sai nội dung" } });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận xoá" }));
  await waitFor(() => expect(api.xoaThanhTichDoanThe).toHaveBeenCalledWith(15, "Sai nội dung"));
});
test("import hai bước giữ file, hiển thị warnings, invalidates preview khi đổi file", async () => {
  const file = new File(["excel"], "dao-tao.xlsx");
  const onImported = jest.fn();
  api.importDoanThe.mockImplementation(async (f, year, preview) => ({ Success: true, ChiKiemTra: preview, TongDong: 3, SoThem: 1, SoTrung: 1, SoLoi: 1, SoCanhBao: 1, Warnings: ["Chỉ đọc 5000 dòng"], Dong: [
    { DongExcel: 2, KetQua: "THEM", HoTen: "Nguyễn Văn A", CanhBao: "Họ tên không khớp" }, { DongExcel: 3, KetQua: "LOI", ThongBao: "Không tìm thấy nhân viên" }, { DongExcel: 4, KetQua: "TRUNG" },
  ] }));
  show(<ThanhTichDoanTheImport idNam="2026" onImported={onImported} />);
  expect(screen.getByRole("button", { name: "Xác nhận import" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("File Excel (.xls, .xlsx)"), { target: { files: [file] } });
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra file" }));
  await screen.findByText("Chỉ đọc 5000 dòng");
  expect(screen.getByText(/Họ tên không khớp/)).toBeInTheDocument();
  expect(onImported).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận import" }));
  await waitFor(() => expect(onImported).toHaveBeenCalled());
  expect(api.importDoanThe.mock.calls.map((args) => args.slice(0, 3))).toEqual([[file, "2026", true], [file, "2026", false]]);
  expect(screen.getByRole("button", { name: "Xác nhận import" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("File Excel (.xls, .xlsx)"), { target: { files: [new File(["x"], "new.xlsx")] } });
  expect(screen.queryByText("Chỉ đọc 5000 dòng")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Xác nhận import" })).toBeDisabled();
});
test("lỗi cấp file hiển thị Message và không mở xác nhận", async () => {
  api.importDoanThe.mockRejectedValue(new Error("Thiếu cột Mã nhân viên"));
  show(<ThanhTichDoanTheImport idNam="2026" />);
  fireEvent.change(screen.getByLabelText("File Excel (.xls, .xlsx)"), { target: { files: [new File(["x"], "bad.xlsx")] } });
  fireEvent.click(screen.getByRole("button", { name: "Kiểm tra file" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Thiếu cột Mã nhân viên");
  expect(screen.getByRole("button", { name: "Xác nhận import" })).toBeDisabled();
});

test.each(["TTDT_HUY_CHUONG", "TTDT_GHI_NHAN_NGOAI"])("%s khoá điểm/minh chứng, link nguồn 10, hiện lý do nguyên văn", (code) => {
  const reason = "To truong P_TCTD chua ghi nhan thanh tich trong nam.";
  show(<DanhGiaPhuLuc2Form criteriaList={[{ IdTieuChi: 1, TenTieuChi: "Thành tích đoàn thể", DiemToiDa: 5 }]}
    formData={{}} autoScores={{ 1: { CongThucTongHop: code, DiemTuDong: 0, LyDoDiemTuDong: reason, ApDungQuy: false,
      MinhChung: [{ LoaiNguon: 10, MaNguon: 8, TieuDe: "HC Đồng", MoTa: "Đại học Đà Nẵng" }] } }} tongDiemCoBan={0} laDongMoNhap={() => true} />);
  expect(screen.getByText(reason)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "HC Đồng" })).toHaveAttribute("href", "/thanh-tich-doan-the/8");
  expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  expect(document.querySelector('input[type="file"]')).toBeNull();
});

test("chi tiết đọc nguồn qua API riêng, hiển thị cơ quan và lịch sử", async () => {
  api.layChiTietDoanThe.mockResolvedValue({ Item: { ...item, CoQuanGhiNhan: "Đại học Đà Nẵng" }, LichSu: [{ Id: 7, HanhDong: 1, MoTa: "Ghi nhận huy chương", TenNguoiThucHien: "Tổ trưởng", NgayThucHien: "2026-05-10" }] });
  show(<ThanhTichDoanTheDetail id={8} />);
  expect(await screen.findByText("Đại học Đà Nẵng")).toBeInTheDocument();
  expect(screen.getByText("Ghi nhận huy chương")).toBeInTheDocument();
  expect(api.layChiTietDoanThe).toHaveBeenCalledWith(8);
});

test("phiếu cũ giữ ô điểm và minh chứng chấm tay sau khi mẫu đổi sang tự động", () => {
  const criteria = [{ IdTieuChi: 1, TenTieuChi: "Thành tích đoàn thể", LoaiNguonDiem: 2, LoaiThangDiem: 2, DiemToiDa: 5 }];
  const autoScores = ghepDiemTuDongPhieu({ 1: { CongThucTongHop: "TTDT_HUY_CHUONG", DiemTuDong: 5 } }, [{ IdTieuChi: 1, LoaiNguonDiem: 1 }], criteria);
  show(<DanhGiaPhuLuc2Form criteriaList={criteria} formData={{}} autoScores={autoScores} tongDiemCoBan={0} laDongMoNhap={() => true} />);
  expect(screen.getByRole("spinbutton")).toBeEnabled();
  expect(document.querySelector('input[type="file"]')).not.toBeNull();
});
