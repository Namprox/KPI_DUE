import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ChucVuUyQuyen from "./ChucVuUyQuyen";
import QL_NhanVienChiTiet from "./QL_NhanVienChiTiet";
import RequireRole from "../../components/RequireRole";
import { canAccessPath, visibleGroups } from "../../config/menuConfig";
import { useQuyenChucVu } from "../../context/NhanVienChucVuContext";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";
import { fetchAllNhanVien } from "../../utils/nhanVienApi";
import * as api from "../../utils/nhanVienChucVuApi";

jest.mock("../../context/NhanVienChucVuContext", () => ({ useQuyenChucVu: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../../utils/nhanVienApi", () => ({ fetchAllNhanVien: jest.fn() }));
jest.mock("primereact/dialog", () => ({ Dialog: ({ header, children }) => <div role="dialog" aria-label={header}>{children}</div> }));

const UY_QUYEN = "/quan-ly-chuc-vu/uy-quyen";
const GIAM_TRU = "/giam-tru-chuc-vu-theo-nam";
const future = { v7_startTransition: true, v7_relativeSplatPath: true };
const quyen = (extra) => ({ quyen: { Success: true, LaAdmin: false, LaQuanLy: false, DuocNhap: false, DuocUyQuyen: false, ...extra }, loading: false, error: "", refresh: jest.fn() });

const NGUOI_DUNG = { IdNhanVien: 9, MaNhanVien: "NV09", HoTen: "Người bị kê khai", Email: "nv09@due.edu.vn", IdChucDanh: 1, TrangThai: true };
const DONG = { IdNvChucVu: 50, IdNhanVien: 9, IdDonVi: 7, TenDonVi: "Khoa Kế toán", IdChucVu: 2, TenChucVu: "Trưởng khoa", LaChinh: true, TuNgay: "2026-01-01" };
let luu;
const response = (body, status = 200) => ({ ok: status < 300, status, json: async () => body });

beforeEach(() => {
  jest.clearAllMocks();
  Element.prototype.scrollIntoView = jest.fn();
  jest.spyOn(window, "alert").mockImplementation(() => {});
  jest.spyOn(window, "confirm").mockReturnValue(true);
  luu = null;
  useAuth.mockReturnValue({ user: { IdNhanVien: 5, MaChucVu: "NV" }, loading: false });
  useQuyenChucVu.mockReturnValue(quyen({ DuocNhap: true }));
  fetchAllNhanVien.mockResolvedValue([NGUOI_DUNG]);
  apiFetch.mockImplementation(async (url, options = {}) => {
    if (options.method && options.method !== "GET") return response(luu?.body ?? { Success: true }, luu?.status ?? 200);
    if (url === "donvi") return response({ Items: [{ IdDonVi: 7, TenDonVi: "Khoa Kế toán" }, { IdDonVi: 8, TenDonVi: "P. Tổ chức – Hành chính" }] });
    if (url === "chucvu") return response({ Items: [{ IdChucVu: 1, MaChucVu: "ADMIN", TenChucVu: "Quản trị hệ thống" }, { IdChucVu: 2, MaChucVu: "TK", TenChucVu: "Trưởng khoa" }] });
    if (url === "chuc-danh-nghe-nghiep") return response({ Items: [{ IdChucDanh: 1, TenChucDanh: "Giảng viên", TrangThai: true }] });
    if (url.startsWith("nhan-vien-chuc-danh/by-nhan-vien")) return response({ Items: [] });
    if (url.startsWith("nhan-vien-chuc-vu/by-nhan-vien")) return response({ Items: [DONG] });
    return response({ Items: [] });
  });
});
afterEach(() => { jest.restoreAllMocks(); });

const moChiTiet = async (idNhanVien = 9) => {
  render(<MemoryRouter future={future} initialEntries={[`/quan-ly-nguoi-dung/chi-tiet/${idNhanVien}`]}>
    <Routes><Route path="/quan-ly-nguoi-dung/chi-tiet/:id" element={<QL_NhanVienChiTiet />} /></Routes>
  </MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Đơn vị & Chức vụ/ }));
  return screen.findByText("Trưởng khoa");
};

// Menu và guard chỉ nghe GET api/nhan-vien-chuc-vu/quyen: chức vụ trong token
// (kể cả TP P_TCHC) và quyền của module khác không được mở màn ủy quyền.
test("màn ủy quyền gác bằng LaQuanLy của server, không suy từ chức vụ", () => {
  const tp = { MaChucVu: "NV", DonVi: [{ MaChucVu: "TP", MaDonVi: "P_TCHC" }] };
  expect(canAccessPath(UY_QUYEN, tp)).toBe(false);
  expect(canAccessPath(UY_QUYEN, tp, { LaQuanLy: true }, { LaQuanLy: true }, { LaQuanLy: true }, { LaQuanLy: true }, { LaQuanLy: true })).toBe(false);
  expect(canAccessPath(UY_QUYEN, tp, null, null, null, null, null, { LaQuanLy: true })).toBe(true);
  expect(canAccessPath(UY_QUYEN, { MaChucVu: "ADMIN" }, null, null, null, null, null, { LaQuanLy: false })).toBe(false);
  const menu = (q) => visibleGroups(tp, null, null, null, null, null, null, q).flatMap((g) => g.items.map((i) => i.path));
  expect(menu({ LaQuanLy: true })).toContain(UY_QUYEN);
  expect(menu({ LaQuanLy: false })).not.toContain(UY_QUYEN);
});

test("menu giảm trừ theo năm hiện với người DuocNhap, URL vẫn mở cho mọi người", () => {
  const cv = { MaChucVu: "NV", DonVi: [{ MaChucVu: "TP", MaDonVi: "P_TCHC" }] };
  const menu = (q) => visibleGroups(cv, null, null, null, null, null, null, q).flatMap((g) => g.items.map((i) => i.path));
  expect(menu({ DuocNhap: true })).toContain(GIAM_TRU);
  expect(menu({ DuocNhap: false })).not.toContain(GIAM_TRU);
  expect(menu(null)).not.toContain(GIAM_TRU);
  expect(visibleGroups({ MaChucVu: "PHT" }).flatMap((g) => g.items.map((i) => i.path))).toContain(GIAM_TRU);
  expect(canAccessPath(GIAM_TRU, cv)).toBe(true);
});

test("guard chặn URL ủy quyền khi LaQuanLy=false", () => {
  useQuyenChucVu.mockReturnValue(quyen({ LaQuanLy: false }));
  render(<MemoryRouter future={future} initialEntries={[UY_QUYEN]}><RequireRole><div>Nội dung ủy quyền</div></RequireRole></MemoryRouter>);
  expect(screen.getByText("Bạn không có quyền truy cập trang này")).toBeInTheDocument();
  expect(screen.queryByText("Nội dung ủy quyền")).not.toBeInTheDocument();
});

test("ủy quyền: cấp cho chuyên viên, khóa TP và người đã rời phòng", async () => {
  useQuyenChucVu.mockReturnValue(quyen({ LaQuanLy: true, DuocNhap: true }));
  jest.spyOn(api, "layNguoiNhapChucVu").mockResolvedValue({ Items: [{ IdNhanVien: 88, HoTen: "Nhân sự cũ", MaNhanVien: "NV88", ConThuocPhong: false, DaThuHoi: false }] });
  jest.spyOn(api, "layUngVienChucVu").mockResolvedValue({ Items: [
    { IdNhanVien: 5, HoTen: "Trưởng phòng", MaNhanVien: "NV05", TenChucVu: "Trưởng phòng", LaQuanLy: true },
    { IdNhanVien: 7, HoTen: "Chuyên viên", MaNhanVien: "NV07", DaDuocCap: false },
  ] });
  const cap = jest.spyOn(api, "capQuyenChucVu").mockResolvedValue({ Success: true, Message: "Đã cấp quyền." });
  render(<MemoryRouter future={future}><ChucVuUyQuyen /></MemoryRouter>);
  expect(await screen.findByRole("button", { name: "Đã có toàn quyền" })).toBeDisabled();
  expect(screen.getByText("Đã rời phòng – không còn hiệu lực")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cấp quyền" }));
  fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Phụ trách nhân sự" } });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
  await waitFor(() => expect(cap).toHaveBeenCalledWith({ IdNhanVien: 7, GhiChu: "Phụ trách nhân sự" }));
});

test("ủy quyền: lỗi 422 ngoài phòng hiện nguyên văn và không đóng hộp thoại", async () => {
  useQuyenChucVu.mockReturnValue(quyen({ LaQuanLy: true }));
  jest.spyOn(api, "layNguoiNhapChucVu").mockResolvedValue({ Items: [] });
  jest.spyOn(api, "layUngVienChucVu").mockResolvedValue({ Items: [{ IdNhanVien: 7, HoTen: "Chuyên viên", MaNhanVien: "NV07" }] });
  jest.spyOn(api, "capQuyenChucVu").mockRejectedValue(Object.assign(new Error("Người nhận không thuộc P_TCHC"), { status: 422, errorCode: "KHONG_THUOC_PHONG" }));
  render(<MemoryRouter future={future}><ChucVuUyQuyen /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Cấp quyền" }));
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Người nhận không thuộc P_TCHC");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

test("người không có DuocNhap chỉ xem, nói rõ lý do", async () => {
  useQuyenChucVu.mockReturnValue(quyen({ DuocNhap: false }));
  await moChiTiet();
  expect(screen.getByRole("status")).toHaveTextContent("Bạn không có quyền kê khai chức vụ");
  expect(screen.queryByRole("button", { name: /Thêm đơn vị \/ chức vụ mới/ })).not.toBeInTheDocument();
  expect(screen.queryByTitle("Chỉnh sửa")).not.toBeInTheDocument();
  expect(screen.queryByTitle("Xóa")).not.toBeInTheDocument();
});

test("ủy quyền còn nhưng đã rời phòng thì nói đúng lý do", async () => {
  useQuyenChucVu.mockReturnValue(quyen({ DuocNhap: false, DuocUyQuyen: true }));
  await moChiTiet();
  expect(screen.getByRole("status")).toHaveTextContent("đã rời Phòng Tổ chức – Hành chính");
});

// 403 TU_SUA: người không phải ADMIN không kê khai chức vụ cho chính mình, kể cả
// khi có DuocNhap (áp cả HT / PHT). ADMIN thì vẫn sửa được dòng của mình.
test("dòng của chính mình bị khóa khi không phải ADMIN", async () => {
  useAuth.mockReturnValue({ user: { IdNhanVien: 9, MaChucVu: "PHT" }, loading: false });
  useQuyenChucVu.mockReturnValue(quyen({ DuocNhap: true }));
  await moChiTiet(9);
  expect(screen.getByRole("status")).toHaveTextContent("Không tự kê khai chức vụ cho chính mình");
  expect(screen.queryByTitle("Chỉnh sửa")).not.toBeInTheDocument();
});

test("ADMIN vẫn kê khai được dòng của chính mình", async () => {
  useAuth.mockReturnValue({ user: { IdNhanVien: 9, MaChucVu: "ADMIN" }, loading: false });
  useQuyenChucVu.mockReturnValue(quyen({ LaAdmin: true, DuocNhap: true }));
  await moChiTiet(9);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByTitle("Chỉnh sửa")).toBeInTheDocument();
});

test("người DuocNhap đổi được đơn vị, đơn vị chính và không thấy chức vụ ADMIN", async () => {
  await moChiTiet();
  fireEvent.click(screen.getByRole("button", { name: /Thêm đơn vị \/ chức vụ mới/ }));
  expect(screen.getByLabelText(/Đặt làm Đơn vị chính/)).toBeInTheDocument();
  fireEvent.click(screen.getByTitle("Chỉnh sửa"));
  const boxes = screen.getAllByRole("combobox");
  fireEvent.click(boxes[boxes.length - 1]);
  expect(screen.getByRole("option", { name: "Trưởng khoa" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "Quản trị hệ thống" })).not.toBeInTheDocument();
});

test("ADMIN chọn được chức vụ ADMIN", async () => {
  useQuyenChucVu.mockReturnValue(quyen({ LaAdmin: true, DuocNhap: true }));
  await moChiTiet();
  fireEvent.click(screen.getByTitle("Chỉnh sửa"));
  const boxes = screen.getAllByRole("combobox");
  fireEvent.click(boxes[boxes.length - 1]);
  expect(screen.getByRole("option", { name: "Quản trị hệ thống" })).toBeInTheDocument();
});

test("PUT gửi cả IdDonVi / LaChinh cho người DuocNhap không phải ADMIN", async () => {
  await moChiTiet();
  fireEvent.click(screen.getByTitle("Chỉnh sửa"));
  fireEvent.click(screen.getByTitle("Lưu thay đổi"));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("nhan-vien-chuc-vu/50", expect.objectContaining({ method: "PUT" })));
  const [, options] = apiFetch.mock.calls.find(([url]) => url === "nhan-vien-chuc-vu/50");
  expect(JSON.parse(options.body)).toEqual({ DenNgay: null, GhiChu: null, IdDonVi: 7, IdChucVu: 2, LaChinh: true });
});

test.each([
  ["CHUC_VU_ADMIN", "Chỉ ADMIN được thao tác với chức vụ / tài khoản ADMIN."],
  ["TU_SUA", "Không tự kê khai chức vụ cho chính mình — nhờ người khác có quyền."],
  ["FORBIDDEN", "Bạn không có quyền kê khai chức vụ."],
])("403 %s hiện câu hướng dẫn thay cho Message của server", async (ErrorCode, thongBao) => {
  luu = { status: 403, body: { Success: false, ErrorCode, Message: "Khong co quyen." } };
  await moChiTiet();
  fireEvent.click(screen.getByTitle("Xóa"));
  await waitFor(() => expect(window.alert).toHaveBeenCalledWith(thongBao));
});

test("lỗi nghiệp vụ không có ErrorCode vẫn hiện Message của server", async () => {
  luu = { status: 409, body: { Success: false, Message: "Không thể xóa đơn vị chính cuối cùng." } };
  await moChiTiet();
  fireEvent.click(screen.getByTitle("Xóa"));
  await waitFor(() => expect(window.alert).toHaveBeenCalledWith("Không thể xóa đơn vị chính cuối cùng."));
});

test("bảng chỉ xem bỏ cột thao tác", async () => {
  useQuyenChucVu.mockReturnValue(quyen({ DuocNhap: false }));
  await moChiTiet();
  const bang = screen.getAllByRole("table").at(-1);
  expect(within(bang).queryByText("THAO TÁC")).not.toBeInTheDocument();
});
