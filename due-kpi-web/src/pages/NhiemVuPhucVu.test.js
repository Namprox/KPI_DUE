import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Page from "./NhiemVuPhucVu";
import * as api from "../utils/nhiemVuPhucVuApi";
jest.mock("../hooks/useNamDanhGia", () => ({ useNamDanhGia: () => ({ namList: [{ IdNam: 2026 }], selectedNam: "2026", setSelectedNam: jest.fn(), dangTaiNam: false }) }));
jest.mock("../utils/nhiemVuPhucVuApi", () => ({ ...jest.requireActual("../utils/nhiemVuPhucVuApi"), layCauHinh: jest.fn(), layDanhSach: jest.fn(), layCuaToi: jest.fn(), layTongHop: jest.fn() }));
jest.mock("../components/NhiemVuPhucVu/NhiemVuPhucVuDetail", () => () => null);
const config = { LaBanGiamHieu: true, Khoa: [{ IdDonVi: 7, TenDonVi: "Khoa A" }, { IdDonVi: 8, TenDonVi: "Khoa B" }], Nhom: [] };
const show = (mode) => render(<MemoryRouter><Page mode={mode} /></MemoryRouter>);
beforeAll(() => { Element.prototype.scrollIntoView = jest.fn(); });
beforeEach(() => { jest.clearAllMocks(); api.layCauHinh.mockResolvedValue(config); api.layDanhSach.mockResolvedValue({ Items: [], TotalPages: 1 }); api.layCuaToi.mockResolvedValue({ Items: [], MoDangKy: [] }); api.layTongHop.mockResolvedValue({ Items: [] }); });
test("BGH tổng hợp luôn chọn một Khoa, không gửi yêu cầu thiếu idDonVi", async () => {
  show("summary");
  await waitFor(() => expect(api.layTongHop).toHaveBeenCalled());
  expect(api.layTongHop.mock.calls.every(([p]) => !!p.idDonVi)).toBe(true);
  fireEvent.click(screen.getByRole("combobox", { name: "Khoa" }));
  expect(screen.queryByRole("option", { name: "Tất cả Khoa" })).toBeNull();
  fireEvent.click(screen.getByRole("option", { name: "Khoa B" }));
  await waitFor(() => expect(api.layTongHop).toHaveBeenLastCalledWith({ idNam: "2026", idDonVi: "8" }));
});
test("Trưởng khoa kiêm nhiệm chỉ được chọn Khoa có quyền quản lý, không tự cấp theo đơn vị đầu", async () => {
  api.layCauHinh.mockResolvedValue({ ...config, LaBanGiamHieu: false, Khoa: [{ IdDonVi: 7, TenDonVi: "Khoa A", LaGiangVienKhoa: true }, { IdDonVi: 8, TenDonVi: "Khoa B", LaTruongKhoa: true }] });
  show("manage");
  await waitFor(() => expect(api.layDanhSach).toHaveBeenCalled());
  expect(api.layDanhSach).toHaveBeenLastCalledWith(expect.objectContaining({ idDonVi: "8" }));
  fireEvent.click(screen.getByRole("combobox", { name: "Khoa" }));
  expect(screen.queryByRole("option", { name: "Khoa A" })).toBeNull();
  expect(screen.getByRole("button", { name: "Tạo nhiệm vụ" })).toBeTruthy();
});
test("đổi bộ lọc loại bỏ phản hồi cũ đến muộn", async () => {
  let resolveOld;
  const old = new Promise((resolve) => { resolveOld = resolve; });
  api.layDanhSach.mockReturnValueOnce(old).mockResolvedValue({ Items: [{ IdNhiemVu: 2, TenNhiemVu: "Báo cáo mới", TrangThai: 4 }], TotalPages: 1 });
  show("manage");
  await waitFor(() => expect(api.layDanhSach).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "Chờ duyệt báo cáo" }));
  await screen.findByText("Báo cáo mới");
  await act(async () => { resolveOld({ Items: [{ IdNhiemVu: 1, TenNhiemVu: "Dữ liệu cũ" }] }); await old; });
  expect(screen.queryByText("Dữ liệu cũ")).toBeNull();
});
test("cá nhân dùng API cua-toi, hiện cả nhiệm vụ mở đăng ký hết suất", async () => {
  api.layCuaToi.mockResolvedValue({ Header: { TongDiemThucTe: 14, SoDangThamGia: 1 }, Items: [], MoDangKy: [{ IdNhiemVu: 3, TenNhiemVu: "Nhiệm vụ hết suất", TrangThai: 3, DangMoDangKy: true, ChoPhepDangKy: false }] });
  show("mine");
  await screen.findByText("Nhiệm vụ hết suất");
  expect(screen.getByText("Không còn suất đăng ký cho bạn")).toBeTruthy();
  expect(api.layCuaToi).toHaveBeenCalledWith("2026"); expect(api.layDanhSach).not.toHaveBeenCalled();
});
