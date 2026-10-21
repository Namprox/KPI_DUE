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
let dong;
const response = (body, status = 200) => ({ ok: status < 300, status, json: async () => body });

beforeEach(() => {
  jest.clearAllMocks();
  Element.prototype.scrollIntoView = jest.fn();
  jest.spyOn(window, "alert").mockImplementation(() => {});
  jest.spyOn(window, "confirm").mockReturnValue(true);
  luu = null;
  dong = [DONG];
  useAuth.mockReturnValue({ user: { IdNhanVien: 5, MaChucVu: "NV" }, loading: false });
  useQuyenChucVu.mockReturnValue(quyen({ DuocNhap: true }));
  fetchAllNhanVien.mockResolvedValue([NGUOI_DUNG]);
  apiFetch.mockImplementation(async (url, options = {}) => {
    if (options.method && options.method !== "GET") return response(luu?.body ?? { Success: true }, luu?.status ?? 200);
    if (url === "donvi") return response({ Items: [{ IdDonVi: 7, TenDonVi: "Khoa Kế toán" }, { IdDonVi: 8, TenDonVi: "P. Tổ chức – Hành chính" }] });
    if (url === "chucvu") return response({ Items: [{ IdChucVu: 1, MaChucVu: "ADMIN", TenChucVu: "Quản trị hệ thống" }, { IdChucVu: 2, MaChucVu: "TK", TenChucVu: "Trưởng khoa" }] });
    if (url === "chuc-danh-nghe-nghiep") return response({ Items: [{ IdChucDanh: 1, TenChucDanh: "Giảng viên", TrangThai: true }] });
    if (url.startsWith("nhan-vien-chuc-danh/by-nhan-vien")) return response({ Items: [] });
    if (url.startsWith("nhan-vien-chuc-vu/by-nhan-vien")) return response({ Items: dong });
    return response({ Items: [] });
  });
});
afterEach(() => { jest.restoreAllMocks(); });

const moChiTiet = async (idNhanVien = 9) => {
  render(<MemoryRouter future={future} initialEntries={[`/quan-ly-nguoi-dung/chi-tiet/${idNhanVien}`]}>
    <Routes><Route path="/quan-ly-nguoi-dung/chi-tiet/:id" element={<QL_NhanVienChiTiet />} /></Routes>
  </MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Đơn vị & Chức vụ/ }));
  return screen.findByText("Khoa Kế toán");
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
  expect(screen.queryByRole("button", { name: /Thêm đơn vị \/ chức vụ/ })).not.toBeInTheDocument();
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
  fireEvent.click(screen.getByTitle("Chỉnh sửa"));
  expect(screen.getByRole("combobox", { name: "Đơn vị công tác" })).toBeInTheDocument();
  expect(screen.getByLabelText("Đặt làm đơn vị chính")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("combobox", { name: "Chức vụ" }));
  expect(screen.getByRole("option", { name: "Trưởng khoa" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "Quản trị hệ thống" })).not.toBeInTheDocument();
});

test("ADMIN chọn được chức vụ ADMIN", async () => {
  useQuyenChucVu.mockReturnValue(quyen({ LaAdmin: true, DuocNhap: true }));
  await moChiTiet();
  fireEvent.click(screen.getByTitle("Chỉnh sửa"));
  fireEvent.click(screen.getByRole("combobox", { name: "Chức vụ" }));
  expect(screen.getByRole("option", { name: "Quản trị hệ thống" })).toBeInTheDocument();
});

// Đánh dấu đơn vị chính phải xóa ngày kết thúc: đơn vị chính không có nhiệm kỳ đóng.
test("đặt làm đơn vị chính thì khóa và xóa ô Đến ngày", async () => {
  dong = [{ ...DONG, LaChinh: false, DenNgay: "2026-06-30" }];
  await moChiTiet();
  fireEvent.click(screen.getByTitle("Chỉnh sửa"));
  const denNgay = screen.getByLabelText("Đến ngày");
  expect(denNgay).toHaveValue("2026-06-30");
  fireEvent.click(screen.getByLabelText("Đặt làm đơn vị chính"));
  expect(denNgay).toBeDisabled();
  expect(denNgay).toHaveValue("");
  expect(screen.getByText("Đơn vị chính không đặt ngày kết thúc.")).toBeInTheDocument();
});

test("PUT gửi cả IdDonVi / LaChinh cho người DuocNhap không phải ADMIN", async () => {
  await moChiTiet();
  fireEvent.click(screen.getByTitle("Chỉnh sửa"));
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("nhan-vien-chuc-vu/50", expect.objectContaining({ method: "PUT" })));
  const [, options] = apiFetch.mock.calls.find(([url]) => url === "nhan-vien-chuc-vu/50");
  expect(JSON.parse(options.body)).toEqual({ TuNgay: "2026-01-01", DenNgay: null, GhiChu: null, IdDonVi: 7, IdChucVu: 2, LaChinh: true });
});

// Mục 6 bàn giao 2026-10-20: PUT mới sửa được Từ ngày. DenNgay / GhiChu vẫn là
// ghi đè trực tiếp nên form luôn gửi lại giá trị đang lưu, dù chỉ đổi Từ ngày.
test("ô Từ ngày mặc định bằng giá trị đang lưu; sửa nó vẫn gửi kèm Đến ngày và Ghi chú", async () => {
  dong = [{ ...DONG, LaChinh: false, DenNgay: "2026-06-30", GhiChu: "Kiêm nhiệm" }];
  await moChiTiet();
  fireEvent.click(screen.getByTitle("Chỉnh sửa"));
  const tuNgay = screen.getByLabelText("Từ ngày");
  expect(tuNgay).toHaveValue("2026-01-01");
  fireEvent.change(tuNgay, { target: { value: "2025-09-01" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("nhan-vien-chuc-vu/50", expect.objectContaining({ method: "PUT" })));
  const [, options] = apiFetch.mock.calls.find(([url]) => url === "nhan-vien-chuc-vu/50");
  expect(JSON.parse(options.body)).toEqual({ TuNgay: "2025-09-01", DenNgay: "2026-06-30", GhiChu: "Kiêm nhiệm", IdDonVi: 7, IdChucVu: 2, LaChinh: false });
});

test("đổi Từ ngày phải xác nhận, hủy thì không gọi API", async () => {
  window.confirm.mockReturnValue(false);
  await moChiTiet();
  fireEvent.click(screen.getByTitle("Chỉnh sửa"));
  fireEvent.change(screen.getByLabelText("Từ ngày"), { target: { value: "2025-09-01" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Đổi Từ ngày từ 01/01/2026 sang 01/09/2025"));
  // Khoảng ảnh hưởng tính từ ngày nhỏ đến ngày lớn, không theo thứ tự cũ → mới.
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("Người bị kê khai trong khoảng 01/09/2025 – 01/01/2026"));
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining("kể cả các năm đã đánh giá"));
  expect(apiFetch).not.toHaveBeenCalledWith("nhan-vien-chuc-vu/50", expect.objectContaining({ method: "PUT" }));
});

test("không đổi Từ ngày thì lưu luôn, không hỏi xác nhận", async () => {
  await moChiTiet();
  fireEvent.click(screen.getByTitle("Chỉnh sửa"));
  fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Bổ nhiệm lại" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("nhan-vien-chuc-vu/50", expect.objectContaining({ method: "PUT" })));
  expect(window.confirm).not.toHaveBeenCalled();
});

test("Đến ngày trước Từ ngày bị chặn ở FE, không gọi API", async () => {
  dong = [{ ...DONG, LaChinh: false, DenNgay: "2026-06-30" }];
  await moChiTiet();
  fireEvent.click(screen.getByTitle("Chỉnh sửa"));
  fireEvent.change(screen.getByLabelText("Từ ngày"), { target: { value: "2026-12-01" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  expect(window.alert).toHaveBeenCalledWith("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.");
  expect(window.confirm).not.toHaveBeenCalled();
  expect(apiFetch).not.toHaveBeenCalledWith("nhan-vien-chuc-vu/50", expect.objectContaining({ method: "PUT" }));
});

test("bỏ trống Từ ngày bị chặn, không gửi PUT xoá ngày", async () => {
  await moChiTiet();
  fireEvent.click(screen.getByTitle("Chỉnh sửa"));
  fireEvent.change(screen.getByLabelText("Từ ngày"), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
  expect(window.alert).toHaveBeenCalledWith("Ngày bắt đầu là bắt buộc.");
  expect(apiFetch).not.toHaveBeenCalledWith("nhan-vien-chuc-vu/50", expect.objectContaining({ method: "PUT" }));
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
  const cot = within(bang).getAllByRole("columnheader").map((th) => th.textContent);
  expect(cot).toEqual(["Đơn vị", "Chức vụ", "Nhiệm kỳ", "Ghi chú"]);
});

// Bảng gộp Từ ngày / Đến ngày thành một cột "Thời gian" và bỏ cột định mức giờ
// (nó là mức GIẢM TRỪ của chức vụ, rỗng với mọi dòng không giữ chức vụ).
test("cột Nhiệm kỳ gộp hai ngày, giảm trừ nằm dưới tên chức vụ", async () => {
  await moChiTiet();
  const bang = screen.getAllByRole("table").at(-1);
  const cot = within(bang).getAllByRole("columnheader").map((th) => th.textContent);
  expect(cot).toEqual(["Đơn vị", "Chức vụ", "Nhiệm kỳ", "Ghi chú", "Thao tác"]);
  expect(bang).toHaveTextContent("01/01/2026 → nay");
  expect(within(bang).getByText("Đang công tác")).toBeInTheDocument();
  expect(within(bang).getByText("Chưa cấu hình")).toBeInTheDocument();
});

test("dòng đã kết thúc hiện khoảng ngày đầy đủ; dòng không chức vụ có nhãn rõ", async () => {
  dong = [{ ...DONG, DenNgay: "2026-06-30", IdChucVu: null, TenChucVu: null, LaChinh: false }];
  await moChiTiet();
  const bang = screen.getAllByRole("table").at(-1);
  expect(bang).toHaveTextContent("01/01/2026 → 30/06/2026");
  expect(within(bang).getByText("Đã kết thúc")).toBeInTheDocument();
  expect(within(bang).getByText("Không giữ chức vụ")).toBeInTheDocument();
  expect(within(bang).queryByText("Chưa cấu hình")).not.toBeInTheDocument();
});

// Trang này sửa hồ sơ của NGƯỜI KHÁC nên phải nói rõ là ai ngay ở đầu trang;
// và chỉ một lối quay lại (trước đây có cả ở đầu trang lẫn thanh dưới).
test("đầu trang nêu họ tên cán bộ, cả trang chỉ một nút Quay lại", async () => {
  await moChiTiet();
  expect(screen.getByText("Người bị kê khai")).toBeInTheDocument();
  expect(screen.getByText(/NV09/)).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /Quay lại/ })).toHaveLength(1);
});
