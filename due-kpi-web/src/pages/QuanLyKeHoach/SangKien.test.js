import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SangKien from "./SangKien";
import SangKienUyQuyen from "./SangKienUyQuyen";
import SangKienDetail from "../../components/SangKien/SangKienDetail";
import DanhGiaPhuLuc2Form from "../../components/DanhGia/DanhGiaPhuLuc2/DanhGiaPhuLuc2Form";
import { MinhChungRow } from "../../components/QuanLyChamDiem/TieuChiChamCard";
import RequireRole from "../../components/RequireRole";
import { useQuyenSangKien } from "../../context/SangKienContext";
import { useAuth } from "../../context/AuthContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import * as api from "../../utils/sangKienApi";
import { canAccessPath, visibleGroups } from "../../config/menuConfig";
import { ghepDiemTuDongPhieu } from "../../utils/diemTuDongPhieu";

jest.mock("../../context/SangKienContext", () => ({ useQuyenSangKien: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../hooks/useNamDanhGia", () => ({ useNamDanhGia: jest.fn() }));
jest.mock("../../utils/sangKienApi");
jest.mock("primereact/dialog", () => ({ Dialog: ({ header, children, footer }) => <div role="dialog" aria-label={header}>{children}{footer}</div> }));

const author = { IdNhanVien: 201, MaNhanVien: "VC0201", HoTen: "Nguyễn Văn A", LaVienChuc: true, TenDonVi: "Phòng Khoa học" };
const catalog = { DiemCaiTienCongViec: 5, Cap: [{ IdCap: 1, TenCap: "Cấp cơ sở (ĐHĐN)" }, { IdCap: 2, TenCap: "Cấp cơ sở (Trường)" }, { IdCap: 3, TenCap: "Cấp Bộ trở lên" }], LoaiGiaiPhap: [{ IdLoai: 7, TenLoai: "Khác" }] };
const synced = { IdSangKien: 12, TenSangKien: "Học liệu số", Nguon: 1, IdCap: 2, TenCap: "Cấp cơ sở (Trường)", IdNamDanhGia: 2026, NgayCongNhan: "2026-04-10T00:00:00", ChoPhepXet: true, ChoPhepXetCaiTien: true, ConONguon: true, TacGia: [author] };
const restricted = { ...synced, IdSangKien: 13, TenSangKien: "Số hoá hồ sơ", ChoPhepXet: false, ChoPhepXetCaiTien: false };
const show = (view, path = "/sang-kien") => render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{view}</MemoryRouter>);
const choose = (label, option) => { fireEvent.click(screen.getByRole("combobox", { name: label })); fireEvent.click(screen.getByRole("option", { name: option, exact: true })); };
beforeAll(() => { Element.prototype.scrollIntoView = jest.fn(); });
beforeEach(() => {
  jest.clearAllMocks();
  useQuyenSangKien.mockReturnValue({ quyen: { DuocNhap: true, XemTatCa: true, LaQuanLy: true }, loading: false, refresh: jest.fn() });
  useAuth.mockReturnValue({ user: { MaChucVu: "GV" }, loading: false });
  useNamDanhGia.mockReturnValue({ namList: [{ IdNam: 2026 }], selectedNam: "2026", dangTaiNam: false });
  api.layDanhMucSangKien.mockResolvedValue(catalog);
  api.laySangKien.mockResolvedValue({ Items: [synced, restricted], Page: 1, PageSize: 20, TotalCount: 21, TotalPages: 2 });
  api.layChiTietSangKien.mockResolvedValue({ Item: synced, LichSu: [] });
  api.xetGiangDaySangKien.mockResolvedValue({ Success: true, SoCapNhat: 1 });
  api.xetCaiTienSangKien.mockResolvedValue({ Success: true, SoCapNhat: 1 });
});
test("menu / URL ủy quyền chỉ nhận quyền Sáng kiến, mọi tài khoản có lối vào cá nhân", () => {
  const user = { MaChucVu: "ADMIN" };
  expect(canAccessPath("/sang-kien/uy-quyen", user, { LaQuanLy: true }, { LaQuanLy: true })).toBe(false);
  expect(canAccessPath("/sang-kien/uy-quyen", { MaChucVu: "GV" }, null, null, { LaQuanLy: true })).toBe(true);
  expect(canAccessPath("/sang-kien/12", { DonVi: [{ LoaiDoiTuong: 0 }] })).toBe(true);
  const menu = (p) => visibleGroups(user, null, null, null, p).flatMap((g) => g.items);
  expect(menu({}).find((i) => i.path === "/sang-kien").name).toBe("Sáng kiến của tôi");
  expect(menu({ XemTheoDonVi: true }).find((i) => i.path === "/sang-kien").name).toBe("Sáng kiến");
  expect(menu({}).some((i) => i.path === "/sang-kien/uy-quyen")).toBe(false);
});
test("guard chặn URL ủy quyền dù chức vụ ADMIN khi server không cấp quyền", () => {
  useAuth.mockReturnValue({ user: { MaChucVu: "ADMIN" } });
  useQuyenSangKien.mockReturnValue({ quyen: { LaQuanLy: false } });
  show(<RequireRole><p>Nội dung ủy quyền</p></RequireRole>, "/sang-kien/uy-quyen");
  expect(screen.getByText("Bạn không có quyền truy cập trang này")).toBeInTheDocument();
  expect(screen.queryByText("Nội dung ủy quyền")).not.toBeInTheDocument();
});
test("mặc định chọn năm hiện tại dù danh mục có năm mới hơn và IdNam là chuỗi", async () => {
  const year = new Date().getFullYear();
  useNamDanhGia.mockReturnValue({ namList: [{ IdNam: year + 1 }, { IdNam: String(year) }], selectedNam: String(year + 1), dangTaiNam: false });
  show(<SangKien />);
  await screen.findByRole("button", { name: synced.TenSangKien });
  expect(screen.getByRole("combobox", { name: "Năm đánh giá" })).toHaveTextContent(String(year));
  expect(api.laySangKien).toHaveBeenLastCalledWith(expect.objectContaining({ idNam: String(year) }), expect.anything());
});
test("hiển thị năm hiện tại trong lúc tải danh mục, chỉ tải sáng kiến sau khi có danh mục", async () => {
  const year = new Date().getFullYear();
  useNamDanhGia.mockReturnValue({ namList: [], selectedNam: "", dangTaiNam: true });
  const wrapper = ({ children }) => <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}</MemoryRouter>;
  const view = render(<SangKien />, { wrapper });
  const select = screen.getByRole("combobox", { name: "Năm đánh giá" });
  expect(select).toHaveTextContent(String(year));
  expect(api.laySangKien).not.toHaveBeenCalled();
  useNamDanhGia.mockReturnValue({ namList: [{ IdNam: year }], selectedNam: String(year), dangTaiNam: false });
  view.rerender(<SangKien />);
  await screen.findByRole("button", { name: synced.TenSangKien });
  expect(select).toHaveTextContent(String(year));
  expect(api.laySangKien).toHaveBeenLastCalledWith(expect.objectContaining({ idNam: String(year) }), expect.anything());
});
test.each([false, true])("liên kết chọn mọi năm=%s giữ lựa chọn thay vì đổi về năm hiện tại", async (allYears) => {
  const year = new Date().getFullYear();
  const value = allYears ? "" : String(year - 1);
  useNamDanhGia.mockReturnValue({ namList: [{ IdNam: year }, { IdNam: year - 1 }], selectedNam: String(year), dangTaiNam: false });
  show(<SangKien />, `/sang-kien?idNam=${value}`);
  await screen.findByRole("button", { name: synced.TenSangKien });
  expect(screen.getByRole("combobox", { name: "Năm đánh giá" })).toHaveTextContent(allYears ? "Mọi năm" : value);
  expect(api.laySangKien).toHaveBeenLastCalledWith(expect.objectContaining({ idNam: value }), expect.anything());
});
test("list dùng cờ từng dòng, lọc cấp 0 / chưa xét 0 và cho xem mọi năm", async () => {
  show(<SangKien />);
  await screen.findByRole("button", { name: synced.TenSangKien });
  const table = screen.getByRole("table", { name: "Danh sách sáng kiến" });
  expect(within(table).queryByRole("button", { name: "Sửa" })).not.toBeInTheDocument();
  expect(within(table).getAllByRole("button", { name: "Xét giảng dạy" })).toHaveLength(1);
  choose("Lọc cấp công nhận", "Chưa xác định cấp");
  choose("Trạng thái xét giảng dạy", "Chưa xét");
  choose("Năm đánh giá", "Mọi năm");
  await waitFor(() => expect(api.laySangKien).toHaveBeenLastCalledWith(expect.objectContaining({ idNam: "", idCap: "0", trangThaiXet: "0", page: 1 }), expect.anything()));
});
test("người chỉ xem không thấy đồng bộ, nhập tay, xét và ủy quyền", async () => {
  useQuyenSangKien.mockReturnValue({ quyen: { XemTheoDonVi: true, DuocUyQuyen: true, DuocNhap: false } });
  show(<SangKien />);
  await screen.findByRole("button", { name: synced.TenSangKien });
  expect(screen.queryByRole("button", { name: "Đồng bộ NCKH" })).not.toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: "Xét đổi mới giảng dạy" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Sửa" })).not.toBeInTheDocument();
  expect(screen.getByText(/Ủy quyền nhập liệu không còn hiệu lực/)).toBeInTheDocument();
});
test("lọc ghép theo họ tên từ URL, đổi bộ lọc về trang đầu và giữ các bộ lọc khác", async () => {
  show(<SangKien />, "/sang-kien?idNam=&nguon=1&ghepTheoHoTen=true&chuaKhopTacGia=true&page=2");
  await screen.findByRole("button", { name: synced.TenSangKien });
  const box = screen.getByRole("checkbox", { name: "Ghép tạm theo họ tên (cần rà soát)" });
  expect(box).toBeChecked();
  expect(api.laySangKien).toHaveBeenLastCalledWith(expect.objectContaining({ idNam: "", ghepTheoHoTen: true, chuaKhopTacGia: true, page: 2 }), expect.anything());
  fireEvent.click(box);
  await waitFor(() => expect(api.laySangKien).toHaveBeenLastCalledWith(expect.objectContaining({ idNam: "", ghepTheoHoTen: false, chuaKhopTacGia: true, page: 1 }), expect.anything()));
  expect(box).not.toBeChecked();
  fireEvent.click(box);
  await waitFor(() => expect(api.laySangKien).toHaveBeenLastCalledWith(expect.objectContaining({ ghepTheoHoTen: true, page: 1 }), expect.anything()));
});
test.each([false, true])("cách ghép tác giả trên trang chi tiết=%s phân biệt ghép tạm và chưa khớp", async (detail) => {
  const people = [
    { ...author, IdNhanVien: 1, HoTen: "Tác giả email", CachGhep: 1 },
    { ...author, IdNhanVien: 2, HoTen: "Tác giả ghép tạm", CachGhep: 2 },
    { HoTenNguon: "Tác giả chưa khớp" },
    { ...author, IdNhanVien: 5, HoTen: "Tác giả dữ liệu cũ" },
  ];
  api.laySangKien.mockResolvedValue({ Items: [{ ...synced, TacGia: people }], Page: 1, TotalCount: 1, TotalPages: 1 });
  api.layChiTietSangKien.mockResolvedValue({ Item: { ...synced, TacGia: people }, LichSu: [] });
  show(detail ? <SangKienDetail id={12} onClose={jest.fn()} /> : <SangKien />);
  await screen.findByText("Tác giả ghép tạm");
  const authors = (name) => within(screen.getByText(name).closest("li"));
  expect(authors("Tác giả email").getByText("Ghép theo email")).toBeInTheDocument();
  expect(authors("Tác giả ghép tạm").getByText("Ghép tạm theo họ tên — cần rà soát")).toBeInTheDocument();
  expect(screen.getByText("Tác giả ghép tạm").closest("li")).toHaveClass("sk-name-match");
  expect(authors("Tác giả ghép tạm").queryByText(/không được tính điểm/)).not.toBeInTheDocument();
  expect(authors("Tác giả chưa khớp").getByText(/Chưa khớp nhân sự — không được tính điểm/)).toBeInTheDocument();
  expect(authors("Tác giả dữ liệu cũ").queryByText(/Ghép theo email|Ghép tạm theo họ tên|P_KH nhập tay/)).not.toBeInTheDocument();
});
test.each([true, false, null])("xét giảng dạy gửi %s tường minh, chỉ chọn dòng được server cho phép", async (value) => {
  show(<SangKien />);
  await screen.findByRole("button", { name: synced.TenSangKien });
  fireEvent.click(screen.getByRole("tab", { name: "Xét đổi mới giảng dạy" }));
  await screen.findByRole("checkbox", { name: `Chọn ${synced.TenSangKien}` });
  expect(screen.getByRole("checkbox", { name: `Chọn ${restricted.TenSangKien}` })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: "Chọn tất cả sáng kiến được xét trên trang" }));
  fireEvent.click(screen.getByRole("button", { name: value === true ? "Có đổi mới giảng dạy" : value === false ? "Không phải đổi mới" : "Bỏ xét" }));
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
  await waitFor(() => expect(api.xetGiangDaySangKien).toHaveBeenCalledWith([{ IdSangKien: 12, LaDoiMoiGiangDay: value, GhiChuXet: null }]));
});
test("tab xét chọn được tất cả trạng thái và xoá lựa chọn khi đổi bộ lọc", async () => {
  show(<SangKien />, "/sang-kien?tab=giang-day");
  const box = await screen.findByRole("checkbox", { name: `Chọn ${synced.TenSangKien}` });
  fireEvent.click(box);
  choose("Trạng thái xét giảng dạy", "Tất cả trạng thái");
  await waitFor(() => expect(api.laySangKien).toHaveBeenLastCalledWith(expect.objectContaining({ trangThaiXet: "", doiTuong: 1 }), expect.anything()));
  expect(await screen.findByRole("checkbox", { name: `Chọn ${synced.TenSangKien}` })).not.toBeChecked();
});
test("đồng bộ khoá nút khi chờ, hiển thị các cảnh báo và link lọc không giới hạn năm", async () => {
  let finish;
  api.dongBoSangKien.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  show(<SangKien />);
  const button = await screen.findByRole("button", { name: "Đồng bộ NCKH" });
  fireEvent.click(button);
  expect(screen.getByRole("button", { name: "Đang đồng bộ NCKH..." })).toBeDisabled();
  finish({ Success: true, SoSangKien: 15, SoTacGiaChuaKhop: 2, SoTacGiaGhepHoTen: 8, SoCapKhongNhanDien: 1, SoThieuNgayCongNhan: 3 });
  const link = await screen.findByRole("link", { name: "Xem sáng kiến chưa xác định cấp" });
  expect(screen.getByRole("link", { name: "Xem sáng kiến chưa khớp tác giả" })).toHaveAttribute("href", "/sang-kien?idNam=&chuaKhopTacGia=true");
  expect(screen.getByRole("link", { name: "Xem sáng kiến ghép theo họ tên" })).toHaveAttribute("href", "/sang-kien?idNam=&ghepTheoHoTen=true");
  expect(screen.getByText(/8 tác giả tạm ghép theo họ tên/)).toHaveTextContent("vẫn được tính điểm theo quy tắc sáng kiến và cần rà soát");
  expect(screen.getByText(/8 tác giả tạm ghép theo họ tên/)).toHaveTextContent("Sửa email nhân sự cho khớp NCKH rồi đồng bộ lại");
  expect(screen.getByText(/3 sáng kiến thiếu/)).toBeInTheDocument();
  fireEvent.click(link);
  await waitFor(() => expect(api.laySangKien).toHaveBeenLastCalledWith(expect.objectContaining({ idNam: "", idCap: "0" }), expect.anything()));
  fireEvent.click(screen.getByRole("link", { name: "Xem sáng kiến ghép theo họ tên" }));
  await waitFor(() => expect(api.laySangKien).toHaveBeenLastCalledWith(expect.objectContaining({ idNam: "", ghepTheoHoTen: true, idCap: "", chuaKhopTacGia: false }), expect.anything()));
  expect(screen.getByRole("checkbox", { name: "Ghép tạm theo họ tên (cần rà soát)" })).toBeChecked();
});
test("gỡ toàn bộ nhập tay kể cả URL nguồn cũ và dữ liệu còn cờ sửa", async () => {
  api.laySangKien.mockResolvedValue({ Items: [{ ...synced, ChoPhepSua: true }], TotalPages: 1 });
  show(<SangKien />, "/sang-kien?nguon=2");
  await screen.findByRole("button", { name: synced.TenSangKien });
  expect(screen.queryByRole("button", { name: /Thêm|Sửa|Xoá/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "Lọc nguồn" })).not.toBeInTheDocument();
  expect(api.laySangKien.mock.calls.at(-1)[0]).not.toHaveProperty("nguon");
});
test.each([true, false, null])("trưởng đơn vị xét cải tiến %s với GhiChu và chỉ dòng có quyền", async (value) => {
  useQuyenSangKien.mockReturnValue({ quyen: { XemTheoDonVi: true, DuocXetCaiTien: true, DuocNhap: false } });
  show(<SangKien />, "/sang-kien?tab=cai-tien");
  const box = await screen.findByRole("checkbox", { name: `Chọn ${synced.TenSangKien}` });
  expect(box).toBeEnabled();
  expect(screen.getByRole("checkbox", { name: `Chọn ${restricted.TenSangKien}` })).toBeDisabled();
  expect(screen.queryByRole("button", { name: "Đồng bộ NCKH" })).not.toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: "Xét đổi mới giảng dạy" })).not.toBeInTheDocument();
  expect(api.laySangKien).toHaveBeenLastCalledWith(expect.objectContaining({ doiTuong: 2, trangThaiCaiTien: 0 }), expect.anything());
  fireEvent.click(screen.getByRole("checkbox", { name: "Chọn tất cả sáng kiến được xét trên trang" }));
  fireEvent.click(screen.getByRole("button", { name: value === true ? "Có cải tiến công việc" : value === false ? "Không phải cải tiến" : "Bỏ xét" }));
  fireEvent.change(screen.getByLabelText("Ghi chú xét (tuỳ chọn)"), { target: { value: "  QĐ 45 công nhận cải tiến  " } });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
  await waitFor(() => expect(api.xetCaiTienSangKien).toHaveBeenCalledWith([{ IdSangKien: 12, LaCaiTienCongViec: value, GhiChu: "QĐ 45 công nhận cải tiến" }]));
  expect(api.xetGiangDaySangKien).not.toHaveBeenCalled();
});
test("URL tab cải tiến không mở quyền khi GET quyen không cấp", async () => {
  show(<SangKien />, "/sang-kien?tab=cai-tien");
  await screen.findByRole("button", { name: synced.TenSangKien });
  expect(screen.queryByRole("tab", { name: "Xét cải tiến công việc" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Xét cải tiến" })).not.toBeInTheDocument();
  expect(screen.queryByRole("checkbox", { name: `Chọn ${synced.TenSangKien}` })).not.toBeInTheDocument();
});
test("đổi tab xoá lựa chọn; lọc tất cả trạng thái cải tiến giữ giá trị rỗng", async () => {
  useQuyenSangKien.mockReturnValue({ quyen: { DuocNhap: true, DuocXetCaiTien: true } });
  show(<SangKien />, "/sang-kien?tab=giang-day&trangThaiCaiTien=1");
  fireEvent.click(await screen.findByRole("checkbox", { name: `Chọn ${synced.TenSangKien}` }));
  fireEvent.click(screen.getByRole("tab", { name: "Xét cải tiến công việc" }));
  expect(await screen.findByRole("checkbox", { name: `Chọn ${synced.TenSangKien}` })).not.toBeChecked();
  choose("Trạng thái cải tiến", "Tất cả trạng thái");
  await waitFor(() => expect(api.laySangKien).toHaveBeenLastCalledWith(expect.objectContaining({ doiTuong: 2, trangThaiXet: "", trangThaiCaiTien: "" }), expect.anything()));
});
test("403 xét cải tiến giữ thông báo, lựa chọn và ghi chú để xử lý", async () => {
  useQuyenSangKien.mockReturnValue({ quyen: { DuocXetCaiTien: true } });
  api.xetCaiTienSangKien.mockRejectedValue(Object.assign(new Error("Không có quyền xét: Học liệu số"), { status: 403 }));
  show(<SangKien />, "/sang-kien?tab=cai-tien");
  fireEvent.click(await screen.findByRole("checkbox", { name: `Chọn ${synced.TenSangKien}` }));
  fireEvent.click(screen.getByRole("button", { name: "Có cải tiến công việc" }));
  fireEvent.change(screen.getByLabelText("Ghi chú xét (tuỳ chọn)"), { target: { value: "QĐ 45" } });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Không có quyền xét: Học liệu số");
  expect(screen.getByDisplayValue("QĐ 45")).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: `Chọn ${synced.TenSangKien}` })).toBeChecked();
  expect(screen.queryByText(/Đã cập nhật/)).not.toBeInTheDocument();
});
test("xét từng dòng nạp cờ và ghi chú cải tiến hiện tại", async () => {
  useQuyenSangKien.mockReturnValue({ quyen: { DuocXetCaiTien: true } });
  api.laySangKien.mockResolvedValue({ Items: [{ ...synced, LaCaiTienCongViec: false, GhiChuXetCaiTien: "QĐ cũ" }], TotalPages: 1 });
  show(<SangKien />);
  fireEvent.click(await screen.findByRole("button", { name: "Xét cải tiến" }));
  expect(screen.getByDisplayValue("QĐ cũ")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Kết quả xét" })).toHaveTextContent("Không phải cải tiến công việc");
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
  await waitFor(() => expect(api.xetCaiTienSangKien).toHaveBeenCalledWith([{ IdSangKien: 12, LaCaiTienCongViec: false, GhiChu: "QĐ cũ" }]));
});
test("chi tiết hiển thị field thiếu, tác giả chưa khớp, không còn nguồn và lịch sử xét", async () => {
  api.layChiTietSangKien.mockResolvedValue({ Item: { ...synced, IdCap: undefined, IdNamDanhGia: undefined, ConONguon: false, TacGia: [{ HoTenNguon: "Tác giả NCKH", EmailNguon: "nguon@example.test" }] }, LichSu: [{ Id: 1, HanhDong: 4, MoTa: "Đánh dấu giảng dạy" }] });
  show(<SangKienDetail id={12} onClose={jest.fn()} />);
  await screen.findByText("Tác giả NCKH");
  expect(screen.getByText(/Chưa khớp nhân sự/)).toBeInTheDocument();
  expect(screen.getByText(/Không còn trên NCKH/)).toBeInTheDocument();
  expect(screen.getByText("Đánh dấu giảng dạy")).toBeInTheDocument();
  expect(screen.getAllByText("Chưa xét")).toHaveLength(2);
});
test.each([false, true])("danh sách / chi tiết=%s hiện điểm cải tiến từ danh mục khi không xác định cấp", async (detail) => {
  const item = { ...synced, IdCap: undefined, DiemVienChuc: undefined, LaCaiTienCongViec: true, TenNguoiXetCaiTien: "Trưởng phòng A", NgayXetCaiTien: "2026-10-06T09:00:00", GhiChuXetCaiTien: "Quyết định cải tiến 45" };
  api.layDanhMucSangKien.mockResolvedValue({ ...catalog, DiemCaiTienCongViec: 7 });
  api.laySangKien.mockResolvedValue({ Items: [item], TotalPages: 1 });
  api.layChiTietSangKien.mockResolvedValue({ Item: item, LichSu: [{ Id: 1, HanhDong: 8, MoTa: "Đánh dấu cải tiến 45" }] });
  show(detail ? <SangKienDetail id={12} onClose={jest.fn()} /> : <SangKien />);
  expect(await screen.findByText(/Cải tiến công việc: \+7 điểm/)).toBeInTheDocument();
  expect(screen.getByText("Quyết định cải tiến 45")).toBeInTheDocument();
  expect(screen.getByText(/Trưởng phòng A/)).toBeInTheDocument();
  if (detail) expect(screen.getByText("Xét cải tiến công việc")).toBeInTheDocument();
  else expect(screen.getByText("Cải tiến +7")).toBeInTheDocument();
});
test("ủy quyền hiện người rời phòng và cấp / thu hồi theo backend", async () => {
  api.layNguoiNhapSangKien.mockResolvedValue({ Items: [{ ...author, DaThuHoi: false, ConThuocPhong: false }] });
  api.layUngVienSangKien.mockResolvedValue({ Items: [{ ...author, IdNhanVien: 202, HoTen: "Trần Thị B", LaQuanLy: false, DaDuocCap: false }] });
  api.capQuyenSangKien.mockResolvedValue({ Success: true });
  api.thuHoiQuyenSangKien.mockResolvedValue({ Success: true });
  show(<SangKienUyQuyen />);
  await screen.findByText("Đã rời phòng – không còn hiệu lực");
  fireEvent.click(screen.getByRole("button", { name: "Cấp quyền" }));
  fireEvent.change(screen.getByLabelText("Ghi chú"), { target: { value: "Nhập sáng kiến" } });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
  await waitFor(() => expect(api.capQuyenSangKien).toHaveBeenCalledWith({ IdNhanVien: 202, GhiChu: "Nhập sáng kiến" }));
  fireEvent.click(await screen.findByRole("button", { name: "Thu hồi" }));
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
  await waitFor(() => expect(api.thuHoiQuyenSangKien).toHaveBeenCalledWith(201));
});
test.each(["SK_DOI_MOI_GIANG_DAY", "TTVT_SANG_KIEN"])("%s giữ điểm phiếu cũ, null khác 0, minh chứng nguồn 12 và khoá nhập", (code) => {
  const criteria = [{ IdTieuChi: 1, TenTieuChi: "Sáng kiến", LoaiNguonDiem: 2, DiemToiDa: 30 }];
  const mc = { LoaiNguon: 12, MaNguon: 12, TieuDe: "Sáng kiến từ NCKH", MoTa: "Cấp cơ sở (Trường) - 10 điểm" };
  const preview = { 1: { CongThucTongHop: code, DiemTuDong: 10, LyDoDiemTuDong: "Lý do backend trả", MinhChung: [mc] } };
  const snapshot = { ...criteria[0], CongThucSnapshot: code, DiemChinhThuc: 0 };
  const autoScores = ghepDiemTuDongPhieu(preview, [snapshot], criteria);
  expect(autoScores[1].DiemTuDong).toBe(0);
  expect(ghepDiemTuDongPhieu(preview, [{ ...snapshot, DiemChinhThuc: null }], criteria)[1].DiemTuDong).toBeNull();
  show(<DanhGiaPhuLuc2Form criteriaList={criteria} formData={{}} autoScores={autoScores} tongDiemCoBan={0} laDongMoNhap={() => true} />);
  expect(screen.getByText("Lý do backend trả")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: mc.TieuDe })).toHaveAttribute("href", "/sang-kien/12");
  expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
});
test("minh chứng của màn thẩm định mở đúng chi tiết sáng kiến", () => {
  show(<MinhChungRow mc={{ LoaiNguon: 12, MaNguon: 12, TieuDe: "Sáng kiến", MoTa: "Cấp Bộ" }} />);
  expect(screen.getByRole("link", { name: "Sáng kiến" })).toHaveAttribute("href", "/sang-kien/12");
});
