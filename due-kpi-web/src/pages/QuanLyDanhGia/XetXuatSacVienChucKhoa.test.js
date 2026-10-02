import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import XetXuatSacVienChucKhoa from "./XetXuatSacVienChucKhoa";
import { useAuth } from "../../context/AuthContext";
import { useNamDanhGia } from "../../hooks/useNamDanhGia";
import { chotXetXuatSacVienChucKhoa, fetchXetXuatSacVienChucKhoa } from "../../utils/xetXuatSacVienChucKhoaApi";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../hooks/useNamDanhGia", () => ({ useNamDanhGia: jest.fn() }));
jest.mock("../../utils/xetXuatSacVienChucKhoaApi", () => ({ chotXetXuatSacVienChucKhoa: jest.fn(), fetchXetXuatSacVienChucKhoa: jest.fn() }));
const mockToast = jest.fn();
jest.mock("primereact/toast", () => {
  const React = require("react");
  return { Toast: React.forwardRef((props, ref) => { React.useImperativeHandle(ref, () => ({ show: mockToast })); return null; }) };
});

const data = {
  TongHop: { IdNam: 2026, DuDieuKienChot: true, SoUngVien: 3, SoChoXet: 2, SoDaChon: 1 },
  Khoa: [{ IdDonVi: 5, TenDonVi: "Khoa A", SoChuaDuyet: 0 }],
  // Cố ý khác thứ tự IdPhieu, đồng hạng, và thứ tự điểm: FE phải giữ thứ tự BE.
  UngVien: [
    { IdPhieu: 9, HoTen: "Người A", HangToanTruong: 1, TongDiemTichLuy: 90, DaChon: true, TrangThai: 5, XepLoaiText: "Xuất sắc từ BE", TrangThaiText: "Hoàn tất" },
    { IdPhieu: 2, HoTen: "Người B", HangToanTruong: 1, TongDiemTichLuy: 110, TrangThai: 4, XepLoai: 3, XepLoaiText: "Mức tạm không hiển thị", TrangThaiText: "Chờ Hiệu trưởng xét xuất sắc" },
    { IdPhieu: 8, HoTen: "Người C", HangToanTruong: 3, TrangThai: 4 },
  ],
};
beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { MaChucVu: "NV", DonVi: [{ MaChucVu: "HT", LaChinh: false }] } });
  useNamDanhGia.mockReturnValue({ selectedNam: "2026", namList: [{ IdNam: 2026 }, { IdNam: 2025 }], dangTaiNam: false, setSelectedNam: jest.fn() });
  fetchXetXuatSacVienChucKhoa.mockResolvedValue(data);
  chotXetXuatSacVienChucKhoa.mockResolvedValue({ ...data, Message: "Đã chốt theo BE", TongHop: { ...data.TongHop, LanChot: 1, RowVersion: "fresh" } });
});

const openAndConfirm = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "Chốt xét xuất sắc" }));
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận chốt" }));
};

test("HT kiêm nhiệm: tick DaChon, giữ thứ tự BE và đồng hạng, không coi mức tạm là kết quả cuối", async () => {
  render(<XetXuatSacVienChucKhoa />);
  expect((await screen.findByLabelText("Chọn xuất sắc Người A")).checked).toBe(true);
  expect(screen.getByLabelText("Chọn xuất sắc Người B").checked).toBe(false);
  expect(screen.getAllByRole("checkbox").map((c) => c.getAttribute("aria-label"))).toEqual(["Chọn xuất sắc Người A", "Chọn xuất sắc Người B", "Chọn xuất sắc Người C"]);
  expect(screen.queryByText("Mức tạm không hiển thị")).toBeNull();
  expect(screen.getByText(/Danh sách chưa được Hiệu trưởng chốt/)).toBeTruthy();
  expect(screen.getByText("Xuất sắc từ BE")).toBeTruthy();
});

test("không giới hạn lựa chọn; gửi toàn bộ và dùng RowVersion mới khi chốt lại", async () => {
  render(<XetXuatSacVienChucKhoa />);
  fireEvent.click(await screen.findByLabelText("Chọn xuất sắc Người B"));
  fireEvent.click(screen.getByLabelText("Chọn xuất sắc Người C"));
  await openAndConfirm();
  await waitFor(() => expect(chotXetXuatSacVienChucKhoa).toHaveBeenCalledWith({ idNam: "2026", idPhieuList: [9, 2, 8], ghiChu: "", rowVersion: undefined }));
  await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ detail: "Đã chốt theo BE" })));
  await openAndConfirm();
  await waitFor(() => expect(chotXetXuatSacVienChucKhoa).toHaveBeenLastCalledWith({ idNam: "2026", idPhieuList: [9], ghiChu: "", rowVersion: "fresh" }));
});

test("cho phép chốt không chọn ai, ghi chú tối đa 1000 ký tự", async () => {
  render(<XetXuatSacVienChucKhoa />);
  fireEvent.click(await screen.findByLabelText("Chọn xuất sắc Người A"));
  fireEvent.click(screen.getByRole("button", { name: "Chốt xét xuất sắc" }));
  expect(screen.getByText(/Không chọn ai xuất sắc/)).toBeTruthy();
  expect(screen.getByRole("textbox").maxLength).toBe(1000);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Biên bản" } });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận chốt" }));
  await waitFor(() => expect(chotXetXuatSacVienChucKhoa).toHaveBeenCalledWith(expect.objectContaining({ idPhieuList: [], ghiChu: "Biên bản" })));
});

test.each([false, undefined])("DuDieuKienChot=%s khóa nút và hiện hồ sơ/Khoa chặn", async (value) => {
  fetchXetXuatSacVienChucKhoa.mockResolvedValue({ ...data, TongHop: { ...data.TongHop, DuDieuKienChot: value, SoChuaDuyet: 1 }, HoSoChuaDuyet: [{ IdPhieu: 3, HoTen: "Đang chờ TK", TrangThaiText: "Đang thẩm định" }], Khoa: [{ IdDonVi: 5, TenDonVi: "Khoa A", SoChuaDuyet: 1 }] });
  render(<XetXuatSacVienChucKhoa />);
  await screen.findByText("Đang chờ TK");
  expect(screen.getByRole("button", { name: "Chốt xét xuất sắc" }).disabled).toBe(true);
  expect(screen.getByText(/Đang chờ Khoa duyệt/)).toBeTruthy();
});

test.each([
  ["CHUA_DU_HO_SO", { hoSoChuaDuyet: [{ IdPhieu: 3, HoTen: "Hồ sơ mới chưa duyệt" }] }, "Hồ sơ mới chưa duyệt"],
  ["HO_SO_KHONG_HOP_LE", { hoSoKhongHopLe: [{ IdPhieu: 9, HoTen: "Người A", LyDo: "Không còn đủ điều kiện" }] }, "Không còn đủ điều kiện"],
])("%s hiển thị payload và yêu cầu tải lại trước khi chốt tiếp", async (errorCode, details, text) => {
  chotXetXuatSacVienChucKhoa.mockRejectedValue(Object.assign(new Error("Lỗi từ BE"), { errorCode, ...details }));
  render(<XetXuatSacVienChucKhoa />);
  await screen.findByLabelText("Chọn xuất sắc Người A");
  await openAndConfirm();
  await screen.findByText(text);
  expect(screen.getByRole("button", { name: "Chốt xét xuất sắc" }).disabled).toBe(true);
});

test("CONCURRENCY_CONFLICT tải lại, reset lựa chọn từ DaChon và không tự chốt", async () => {
  chotXetXuatSacVienChucKhoa.mockRejectedValue(Object.assign(new Error("Có người vừa chốt"), { errorCode: "CONCURRENCY_CONFLICT" }));
  render(<XetXuatSacVienChucKhoa />);
  fireEvent.click(await screen.findByLabelText("Chọn xuất sắc Người B"));
  fetchXetXuatSacVienChucKhoa.mockResolvedValue({ ...data, TongHop: { ...data.TongHop, RowVersion: "new", LanChot: 2 }, UngVien: data.UngVien.map((h) => ({ ...h, DaChon: h.IdPhieu === 8 })) });
  await openAndConfirm();
  await waitFor(() => expect(fetchXetXuatSacVienChucKhoa).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByLabelText("Chọn xuất sắc Người C").checked).toBe(true));
  expect(screen.getByLabelText("Chọn xuất sắc Người B").checked).toBe(false);
  expect(chotXetXuatSacVienChucKhoa).toHaveBeenCalledTimes(1);
  expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ severity: "warn" }));
});

test("đổi năm không nhận response cũ trả muộn", async () => {
  let resolveOld;
  fetchXetXuatSacVienChucKhoa.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; }));
  const view = render(<XetXuatSacVienChucKhoa />);
  useNamDanhGia.mockReturnValue({ selectedNam: "2025", namList: [{ IdNam: 2025 }], dangTaiNam: false, setSelectedNam: jest.fn() });
  fetchXetXuatSacVienChucKhoa.mockResolvedValue({ TongHop: { IdNam: 2025, DuDieuKienChot: false }, UngVien: [] });
  view.rerender(<XetXuatSacVienChucKhoa />);
  await screen.findByText("Chưa có ứng viên để xét xuất sắc.");
  resolveOld(data);
  await waitFor(() => expect(screen.queryByLabelText("Chọn xuất sắc Người A")).toBeNull());
});

test("người không có quyền không gọi API", () => {
  useAuth.mockReturnValue({ user: { MaChucVu: "TK" } });
  render(<XetXuatSacVienChucKhoa />);
  expect(screen.getByText(/Bạn không có quyền/)).toBeTruthy();
  expect(fetchXetXuatSacVienChucKhoa).not.toHaveBeenCalled();
});
