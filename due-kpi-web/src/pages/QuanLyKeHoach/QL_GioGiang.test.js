import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import QL_GioGiang from "./QL_GioGiang";
import { apiFetch } from "../../utils/api";

jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("primereact/toast", () => ({ Toast: require("react").forwardRef(() => null) }));
jest.mock("../../components/Common/SearchSelect", () => ({ value, onChange, options, name }) =>
  <select aria-label={name || "Bộ lọc"} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>);

const rows = [
  { IdGioGiangTkb: 5, HoTen: "Nguyễn Văn An", HoTenChuan: "NGUYEN VAN AN", TenKhoa: "Kế toán", KhoaChuan: "KE TOAN", GioChuanDaiHoc: 33, GioChuanSauDaiHoc: 17, GioChuanTrongNam: 50, SoNguoiKhopTen: 2, SoNguoiKhopKhoa: 0 },
  { IdGioGiangTkb: 6, HoTen: "Nguyễn Văn An", HoTenChuan: "NGUYEN VAN AN", TenKhoa: "Kinh tế", KhoaChuan: "KINH TE", GioChuanDaiHoc: 10, GioChuanSauDaiHoc: 20, GioChuanTrongNam: 30, IdNhanVien: 7, HoTenNhanVien: "Nguyễn Văn An", MaNhanVien: "NV7" },
];
const ok = (body) => ({ ok: true, json: async () => body });
beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(async (url) => {
    if (url === "namdanhgia") return ok({ Items: [{ IdNam: 2026 }] });
    if (url.startsWith("gio-giang-tkb?idNam=")) return ok({ Items: rows, SoDongChuaAnhXa: 1 });
    if (url.startsWith("gio-giang-tkb/tong-hop")) return ok({ TongHop: [{ IdNhanVien: 7, HoTen: "Nguyễn Văn An", GioTkbDaiHoc: 10, GioTkbSauDaiHoc: 20, GioTkb: 30, GioDaiHoc: 41, GioSauDaiHoc: 52, TongGio: 123 }], SoDongChuaAnhXa: 1 });
    if (url.startsWith("nhan-vien?")) return ok({ Items: [{ IdNhanVien: 8, HoTen: "Nguyễn Văn An", MaNhanVien: "NV8", TenDonVi: "Khoa Kế toán" }], TotalCount: 1 });
    if (url.endsWith("/chi-tiet")) return ok({ Item: rows[0], ChiTiet: [{ IdChiTiet: 1, HeDaoTao: "SDH", GiangTiengAnh: true, MaLopTinChi: "Lop SDH", HeSo: 2, GioChuanTrongNam: 17 }] });
    if (url === "gio-giang-tkb/anh-xa") return ok({ Success: true });
    throw new Error(`Unexpected endpoint: ${url}`);
  });
});

test("hai dòng trùng tên ánh xạ và gỡ đúng khoa; tổng hợp tách riêng giờ Phụ lục II", async () => {
  render(<QL_GioGiang />);
  const buttons = await screen.findAllByRole("button", { name: "Ánh xạ", exact: true });
  expect(buttons).toHaveLength(2);
  expect(screen.queryByRole("columnheader", { name: "Giảng dạy ĐH" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Tổng hợp giờ giảng" }));
  const summary = await screen.findByRole("columnheader", { name: "Giảng dạy ĐH" });
  const table = summary.closest("table");
  expect(within(table).getByText("41")).toBeInTheDocument();
  expect(within(table).getByText("52")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Ánh xạ", exact: true })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "Dữ liệu TKB" }));
  expect(screen.getByText(/Trùng tên, không ai thuộc khoa này/)).toBeInTheDocument();
  fireEvent.click(buttons[0]);
  fireEvent.click(await screen.findByRole("radio", { name: "Chọn NV8" }));
  fireEvent.click(screen.getByRole("button", { name: "Lưu ánh xạ" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  const save = apiFetch.mock.calls.find(([url]) => url === "gio-giang-tkb/anh-xa");
  expect(JSON.parse(save[1].body)).toEqual({ HoTenChuan: "NGUYEN VAN AN", KhoaChuan: "KE TOAN", IdNhanVien: 8 });
  fireEvent.click(screen.getAllByRole("button", { name: "Ánh xạ", exact: true })[1]);
  fireEvent.click(screen.getByRole("button", { name: "Gỡ ánh xạ" }));
  await waitFor(() => expect(apiFetch.mock.calls.filter(([url]) => url === "gio-giang-tkb/anh-xa")).toHaveLength(2));
  const remove = apiFetch.mock.calls.filter(([url]) => url === "gio-giang-tkb/anh-xa")[1];
  expect(JSON.parse(remove[1].body)).toEqual({ HoTenChuan: "NGUYEN VAN AN", KhoaChuan: "KINH TE", IdNhanVien: null });
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});

test("chi tiết hiện hệ đào tạo, lớp SDH và badge tiếng Anh", async () => {
  render(<QL_GioGiang />);
  fireEvent.click((await screen.findAllByRole("button", { name: "Chi tiết" }))[0]);
  const dialog = screen.getByRole("dialog");
  expect(await within(dialog).findByText("Tiếng Anh")).toBeInTheDocument();
  expect(within(dialog).getByText("Lop SDH")).toBeInTheDocument();
  expect(within(dialog).getByText("SĐH")).toBeInTheDocument();
  expect(within(dialog).getByText("2")).toBeInTheDocument();
});

test("upload hiện lỗi 400 từng dòng, số dòng mỗi hệ và cảnh báo cùng số dòng khác sheet", async () => {
  render(<QL_GioGiang />);
  await screen.findAllByRole("button", { name: "Chi tiết" });
  fireEvent.click(screen.getByRole("button", { name: "Upload thời khóa biểu" }));
  expect(screen.getByRole("button", { name: "Tải file mẫu DH + SDH" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/File Excel thời khóa biểu/), { target: { files: [new File(["excel"], "tkb.xlsx")] } });
  apiFetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ Message: "Sheet DH dong 2: loi | Sheet SDH dong 3: loi" }) });
  fireEvent.click(screen.getByRole("button", { name: "Upload và tính giờ" }));
  expect(await screen.findByText("Sheet DH dong 2: loi")).toBeInTheDocument();
  expect(screen.getByText("Sheet SDH dong 3: loi")).toBeInTheDocument();
  apiFetch.mockResolvedValueOnce(ok({ Success: true, SoDongDaiHoc: 12, SoDongSauDaiHoc: 4, CanhBao: [{ HeDaoTao: "DH", SoDongExcel: 2, ThongDiep: "Cảnh báo DH" }, { HeDaoTao: "SDH", SoDongExcel: 2, ThongDiep: "Cảnh báo SDH" }] }));
  fireEvent.click(screen.getByRole("button", { name: "Upload và tính giờ" }));
  expect(await screen.findByText("DH: 12 dòng đã lưu")).toBeInTheDocument();
  expect(screen.getByText("SDH: 4 dòng đã lưu")).toBeInTheDocument();
  const warningTable = screen.getByRole("columnheader", { name: "Sheet" }).closest("table");
  expect(within(warningTable).getAllByRole("row")).toHaveLength(3);
  expect(within(warningTable).getByText("DH")).toBeInTheDocument();
  expect(within(warningTable).getByText("SDH")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
});
