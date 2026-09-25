import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ChotHoSoKhoa from "./ChotHoSoKhoa";
import ChotHoSoPhong from "./ChotHoSoPhong";
import { useAuth } from "../../context/AuthContext";
import { fetchPhieuDetail, fetchXemTruocChot, khoaDuyetHoSo } from "../../utils/phieuApi";

jest.mock("react-router-dom", () => ({ useParams: () => ({ id: "1" }), useNavigate: () => jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("primereact/toast", () => {
  const React = require("react");
  return { Toast: React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ show: jest.fn() }));
    return null;
  }) };
});
jest.mock("../../utils/api", () => ({ apiFetch: async () => ({ ok: true, json: async () => [] }) }));
jest.mock("../../hooks/useNhanVienIndex", () => ({ useNhanVienIndex: () => ({ nhanVienIndex: new Map() }), thongTinNhanVien: () => ({ hoTen: "Nhân viên A" }) }));
jest.mock("../../hooks/useMinhChungPhieuPreview", () => ({ useMinhChungPhieuPreview: () => ({ preview: { isOpen: false } }) }));
jest.mock("../../utils/phieuApi", () => ({
  ...jest.requireActual("../../utils/phieuApi"),
  fetchPhieuDetail: jest.fn(), fetchXemTruocChot: jest.fn(), khoaDuyetHoSo: jest.fn(),
  fetchLichSuChamDiemPhieu: async () => [],
}));

test.each([["TP", ChotHoSoPhong], ["TK", ChotHoSoKhoa]])("màn chốt %s dựng mức 3 từ preview dù phiếu không có LoaiDoiTuong", async (role, Page) => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { MaChucVu: role, DonVi: [{ IdDonVi: 7, MaChucVu: role }] } });
  fetchPhieuDetail.mockResolvedValue({ IdPhieu: 1, IdDonVi: 7, IdNam: 2026, TrangThai: 3, ChiTiet: [], RowVersion: "v1" });
  fetchXemTruocChot.mockResolvedValue({ LoaiDoiTuong: 2, XepLoaiDeXuat: 3, CacMucChonDuoc: [1, 2, 3], TongDiemTichLuy: 101, SanSangChot: true, GiaiThichMucDeXuat: "Viên chức đủ 101 điểm" });
  render(<Page />);
  await screen.findByRole("button", { name: /Mức 3/ });
  await waitFor(() => expect(screen.getByRole("button", { name: /Mức 3/ }).disabled).toBe(false));
  expect(screen.queryByRole("button", { name: /Mức 4/ })).toBeNull();
  await waitFor(() => expect(fetchXemTruocChot).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByText(/Từ năm học 2025-2026, hồ sơ giảng viên bắt buộc/)).toBeNull());
});

const setupGiangVien = (saved = false, warning = null) => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { MaChucVu: "TK", DonVi: [{ IdDonVi: 7, MaChucVu: "TK" }] } });
  fetchPhieuDetail.mockResolvedValue({ IdPhieu: 1, IdDonVi: 7, IdNam: 2024, LoaiDoiTuong: 1, TrangThai: 3, ChiTiet: [], RowVersion: "v1" });
  fetchXemTruocChot.mockImplementation(async (_id, query) => {
    const enough = query.duNckh ?? saved;
    return { LoaiDoiTuong: 1, DuDinhMucGioNckhApDung: enough, XepLoaiDeXuat: enough ? 3 : 1,
      CacMucChonDuoc: enough ? [1, 2, 3] : [1], TongDiemTichLuy: 100,
      CanhBaoDinhMuc: warning, SanSangChot: !warning };
  });
};

test.each([true, false])("NCKH khởi tạo từ preview không truyền duNckh, đã lưu=%s", async (saved) => {
  setupGiangVien(saved);
  render(<ChotHoSoKhoa />);
  const checkbox = await screen.findByRole("checkbox", { name: /Đủ định mức giờ nghiên cứu khoa học/ });
  await waitFor(() => expect(checkbox.disabled).toBe(false));
  expect(fetchXemTruocChot.mock.calls[0][1].duNckh).toBeUndefined();
  expect(checkbox.checked).toBe(saved);
  expect(screen.queryByText(/Giờ NCKH thực tế \/ định mức/)).toBeNull();
  expect(screen.queryByText(/Hệ thống:.*Đạt/)).toBeNull();
});

test("tick và bỏ tick NCKH cập nhật mức chọn; chốt gửi quyết định tay", async () => {
  setupGiangVien(false);
  khoaDuyetHoSo.mockResolvedValue({ Success: true });
  render(<ChotHoSoKhoa />);
  const checkbox = await screen.findByRole("checkbox", { name: /Đủ định mức giờ nghiên cứu khoa học/ });
  await waitFor(() => expect(checkbox.disabled).toBe(false));
  expect(screen.queryByRole("button", { name: /Mức 3/ })).toBeNull();
  fireEvent.click(checkbox);
  await waitFor(() => expect(fetchXemTruocChot).toHaveBeenLastCalledWith("1", expect.objectContaining({ duNckh: true })));
  await waitFor(() => expect(screen.getByRole("button", { name: /Mức 3/ }).disabled).toBe(false));
  fireEvent.click(checkbox);
  await waitFor(() => expect(fetchXemTruocChot).toHaveBeenLastCalledWith("1", expect.objectContaining({ duNckh: false })));
  await waitFor(() => expect(screen.queryByRole("button", { name: /Mức 3/ })).toBeNull());
  fireEvent.click(checkbox);
  await waitFor(() => expect(screen.getByRole("button", { name: /Mức 3/ }).disabled).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: /Mức 3/ }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Chốt hồ sơ này" }).disabled).toBe(false));
  fireEvent.click(screen.getByRole("button", { name: "Chốt hồ sơ này" }));
  fireEvent.click(screen.getByRole("button", { name: "Chốt hồ sơ", exact: true }));
  await waitFor(() => expect(khoaDuyetHoSo).toHaveBeenCalledWith(1, expect.objectContaining({ duDinhMucGioNckh: true, xepLoaiKhoa: 3, rowVersion: "v1" })));
});

test("cảnh báo thiếu định mức giờ giảng vẫn hiển thị và chặn chốt", async () => {
  setupGiangVien(false, "Chưa có định mức giờ giảng");
  render(<ChotHoSoKhoa />);
  expect((await screen.findByRole("alert")).textContent).toBe("Chưa có định mức giờ giảng");
  expect(screen.getByRole("button", { name: "Chốt hồ sơ này" }).disabled).toBe(true);
});
