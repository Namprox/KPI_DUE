import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { TongHopGioGiang } from "./GioGiangTkbPanels";
import { GiaiTrinhGioGiang } from "./GioGiangTyLeDetails";
import { apiFetch } from "../../utils/api";
import { moTaDienGiai, ngayDienGiai } from "../../utils/gioGiangDienGiai";

jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../../utils/donViApi", () => ({ fetchDonViList: async () => [] }));
const row = { IdNhanVien: 440, HoTen: "Giảng viên A", DinhMucGoc: 270, DinhMucApDung: 135, GiamTapSu: 110, GiamChuaVaoTruong: 25, GioTkb: 117, TongGio: 117, GiamNghi: 0, SoThangMien: 6, SoThangNam: 12 };
const dienGiai = [
  { IdNhanVien: 440, ThuTu: 1, KhoanMuc: "CHUA_VAO_TRUONG", TuNgay: "2026-01-01T00:00:00", DenNgay: "2026-01-31T00:00:00", NguonDenNgay: "2026-02-01T00:00:00", KhoiTuNgay: "2026-01-01T00:00:00", KhoiDenNgay: "2026-06-30T00:00:00", KhoiSoThang: 6, SoGio: 25 },
  { IdNhanVien: 440, ThuTu: 2, KhoanMuc: "TAP_SU", TuNgay: "2026-02-01T00:00:00", DenNgay: "2026-06-30T00:00:00", KhoiTuNgay: "2026-01-01T00:00:00", KhoiDenNgay: "2026-06-30T00:00:00", KhoiSoThang: 6, SoThang: 5, SoGio: 109.99, CongThuc: "Biểu thức API: 109,99", GhiChu: "DO_THEO_NGAY;MA_MOI" },
  { IdNhanVien: 440, ThuTu: 3, KhoanMuc: "CHUC_VU", TenNguon: "Trưởng khoa", TyLe: 0.7, NguonTuNgay: "2025-01-01T00:00:00", GhiChu: "KIEM_NHIEM_LAY_TY_LE_THAP_NHAT" },
  { IdNhanVien: 440, ThuTu: 4, KhoanMuc: "GIO_TKB", IdGioGiangTkb: 1234, TenNguon: "Giảng viên A - Luật", SoLop: 3, SoTiet: 90, SoGio: 117 },
];
const ok = (body) => ({ ok: true, json: async () => body });
beforeEach(() => {
  apiFetch.mockReset();
  apiFetch.mockImplementation(async (url) => {
    if (url.endsWith("/chi-tiet")) return ok({ Item: {}, ChiTiet: [] });
    return ok({ TyLeHoanThanh: [row], ...(url.includes("idNhanVien") ? { DienGiai: dienGiai } : {}) });
  });
});

test("lazy load theo người, nhóm dùng tổng API, công thức và khối miễn nguyên dữ liệu", async () => {
  render(<TongHopGioGiang idNam={2026} tyLe />);
  fireEvent.click(await screen.findByRole("button", { name: "Giải trình giờ giảng của Giảng viên A" }));
  const dialog = screen.getByRole("dialog");
  expect(await within(dialog).findByText("Biểu thức API: 109,99")).toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledWith("gio-giang-tkb/ty-le-hoan-thanh?idNam=2026&idNhanVien=440", expect.anything());
  expect(within(dialog).getByRole("row", { name: "Tập sự / thử việc 110" })).toBeInTheDocument();
  expect(within(dialog).getByText("109,99")).toBeInTheDocument();
  expect(within(dialog).getAllByText(/Gộp chung khối miễn từ 01\/01\/2026 đến 30\/06\/2026 \(6 tháng\)/)).toHaveLength(2);
  expect(within(dialog).getByText("MA_MOI")).toBeInTheDocument();
  expect(within(dialog).getByText(/áp tỷ lệ giảm nhiều nhất/)).toBeInTheDocument();
  expect(within(dialog).getByText(/Định mức giờ giảng giảm 30% \(còn 70%\); Giữ chức vụ từ 01\/01\/2025 đến nay/)).toBeInTheDocument();
  expect(within(dialog).queryByText("Nghỉ BHXH / theo BLLĐ")).not.toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "Xem chi tiết lớp TKB" }));
  expect(await screen.findByText("Chưa có chi tiết lớp.")).toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledWith("gio-giang-tkb/1234/chi-tiet", expect.anything());
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  expect(screen.getByText("Biểu thức API: 109,99")).toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledTimes(3);
});

test("tự xem luôn hiển thị DienGiai từ response ban đầu", async () => {
  render(<TongHopGioGiang idNam={2026} idNhanVien={440} tyLe />);
  expect(await screen.findByText("Biểu thức API: 109,99")).toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledTimes(1);
});

test("lỗi tải chi tiết có thử lại; đóng modal hủy request", async () => {
  apiFetch.mockResolvedValueOnce(ok({ TyLeHoanThanh: [row] })).mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ Message: "Không có quyền xem" }) });
  render(<TongHopGioGiang idNam={2026} tyLe />);
  fireEvent.click(await screen.findByRole("button", { name: "Giải trình giờ giảng của Giảng viên A" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Không có quyền xem");
  fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  await screen.findByText("Biểu thức API: 109,99");
  fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
  await waitFor(() => expect(apiFetch.mock.calls[2][1].signal.aborted).toBe(true));
});

test("thiếu DienGiai hoặc SoGio an toàn, không gộp số giờ hay trộn người", () => {
  const { rerender } = render(<GiaiTrinhGioGiang row={row} />);
  expect(screen.getByText(/Chưa có diễn giải chi tiết/)).toBeInTheDocument();
  rerender(<GiaiTrinhGioGiang row={row} dienGiai={[
    { IdNhanVien: 440, ThuTu: 1, KhoanMuc: "DAO_TAO", SoThang: 14, GhiChu: "THANG_MIEN_VUOT_NAM" },
    { IdNhanVien: 999, ThuTu: 2, KhoanMuc: "DAO_TAO", CongThuc: "KHONG_HIEN" },
  ]} />);
  expect(screen.getByRole("row", { name: /14 tháng/ })).toHaveTextContent("—");
  expect(screen.queryByText("KHONG_HIEN")).not.toBeInTheDocument();
});

test("ngày chỉ định dạng lịch; TKB và QNDB chỉ mô tả nguồn", () => {
  expect(ngayDienGiai("2026-01-01T00:00:00")).toBe("01/01/2026");
  expect(ngayDienGiai(undefined)).toBe("");
  expect(moTaDienGiai({ IdNhanVien: 1, ThuTu: 1, KhoanMuc: "GIO_TKB", TenNguon: "Giảng viên A - Luật", SoLop: 2, SoTiet: 10 }, {})).toBe("Giảng viên A - Luật; 2 lớp; 10 tiết");
  expect(moTaDienGiai({ IdNhanVien: 1, ThuTu: 1, KhoanMuc: "GIO_QNDB", SoNgay: 4 }, {})).toBe("4 ngày × 2,5 giờ");
});

test("contract chỉ có TKB và QNDB; tổng giờ, tỷ lệ và điểm lấy nguyên API", async () => {
  apiFetch.mockResolvedValue(ok({ TyLeHoanThanh: [{
    ...row, GioTkb: 117, GioQndb: 12.5, TongGio: 129.5,
    TyLeHoanThanh: 95.93, DiemDuKien: 15, DiemToiDa: 20,
  }], DienGiai: [...dienGiai, {
    IdNhanVien: 440, ThuTu: 5, KhoanMuc: "GIO_QNDB", SoNgay: 5, SoGio: 12.5,
  }] }));
  render(<TongHopGioGiang idNam={2026} idNhanVien={440} tyLe />);
  expect(await screen.findByText("95,93%")).toBeInTheDocument();
  expect(screen.getByText("15 / 20")).toBeInTheDocument();
  expect(screen.getByText(/Tổng giờ = Giờ TKB \+ Giờ QNDB/)).toBeInTheDocument();
  const table = screen.getByRole("table");
  expect(within(table).getByRole("row", { name: "Giờ theo TKB 117" })).toBeInTheDocument();
  expect(within(table).getByRole("row", { name: "Huấn luyện QNDB / tự vệ 12,5" })).toBeInTheDocument();
  expect(within(table).getByRole("row", { name: "Tổng giờ thực hiện 129,5" })).toBeInTheDocument();
  expect(within(table).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual([
    "Định mức gốc", "Trước ngày vào Trường", "Tập sự / thử việc", "Giảm theo chức vụ",
    "Định mức áp dụng",
    "Giờ theo TKB", "Huấn luyện QNDB / tự vệ", "Tổng giờ thực hiện",
  ]);
  expect(apiFetch).toHaveBeenCalledTimes(1);
  expect(apiFetch).toHaveBeenCalledWith("gio-giang-tkb/ty-le-hoan-thanh?idNam=2026&idNhanVien=440", expect.anything());
});
