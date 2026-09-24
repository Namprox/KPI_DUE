import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import HocVuSinhVien from "./HocVuSinhVien";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { confirmDialog } from "primereact/confirmdialog";
import { canAccessPath, visibleGroups } from "../../config/menuConfig";

jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("primereact/confirmdialog", () => ({ confirmDialog: jest.fn() }));

const reply = (body, ok = true) => ({ ok, json: async () => body });

beforeEach(() => {
  jest.clearAllMocks();
  apiFetch.mockImplementation(async (endpoint) => {
    if (endpoint === "namdanhgia") return reply({ Items: [{ IdNam: 2025 }, { IdNam: 2026 }] });
    if (endpoint === "donvi") return reply({ Items: [
      { IdDonVi: 5, MaDonVi: "K_CNTT", CapDonVi: 2, TenDonVi: "Khoa Công nghệ thông tin" },
      { IdDonVi: 9, MaDonVi: "P_DTBDCL", CapDonVi: 2 },
    ] });
    if (endpoint === "hoc-vu/ty-le-khoa?idNam=2026") return reply({
      Success: true,
      XemTatCa: false,
      NamNhapHocTotNghiep: 2022,
      NamNhapHocCanhBaoTu: 2023,
      NamNhapHocCanhBaoDen: 2026,
      TongQuan: {
        SoSinhVien: 10,
        SoDongCanhBao: 2,
        SoSinhVienChuaAnhXa: 1,
        SoMaKhoaChuaAnhXa: 1,
      },
      Items: [{ IdDonVi: 5, TenDonVi: "Khoa Công nghệ thông tin", MaKhoaDaoTao: "202",
        SoTotNghiepDungHan: 0, SoSvKhoaTotNghiep: 0, SoThoiHocKhoaTotNghiep: 0,
        SoSvBiCanhBao: 1, SoSvKhoaCanhBao: 4, SoThoiHocKhoaCanhBao: 0,
        TyLeCanhBaoHocVu: 25 }],
    });
    if (endpoint === "hoc-vu/anh-xa-khoa") return reply({ Items: [{ MaKhoa: "202", TenKhoa: "CNTT", SoSinhVien: 10 }] });
    throw new Error(`Unexpected endpoint: ${endpoint}`);
  });
});

test("menu và URL Học vụ chỉ mở cho đúng vai trò, kể cả kiêm nhiệm", () => {
  const path = "/hoc-vu-sinh-vien";
  const allowed = [
    { MaChucVu: "ADMIN" }, { MaChucVu: "TK" }, { MaChucVu: "TKL" }, { MaChucVu: "TKK" },
    { MaChucVu: "TP", DonVi: [{ MaChucVu: "TP", MaDonVi: "P_DTBDCL" }] },
    { MaChucVu: "TK", DonVi: [{ MaChucVu: "TP", MaDonVi: "P_DTBDCL" }] },
  ];
  allowed.forEach((user) => {
    expect(canAccessPath(path, user)).toBe(true);
    expect(visibleGroups(user).some((group) => group.items.some((item) => item.path === path))).toBe(true);
  });
  [
    { MaChucVu: "GV" }, { MaChucVu: "TP", DonVi: [{ MaChucVu: "TP", MaDonVi: "P_KHHTQT" }] },
  ].forEach((user) => {
    expect(canAccessPath(path, user)).toBe(false);
    expect(visibleGroups(user).some((group) => group.items.some((item) => item.path === path))).toBe(false);
  });
});

test("người xem chỉ thấy tỷ lệ, không thể mở upload hoặc ánh xạ", async () => {
  useAuth.mockReturnValue({ user: { MaChucVu: "TK" } });
  render(<HocVuSinhVien />);

  expect(await screen.findByText("Khoa Công nghệ thông tin")).toBeInTheDocument();
  expect(screen.getByText("25,00%")).toBeInTheDocument();
  expect(screen.getByTitle("Chưa có dữ liệu")).toHaveTextContent("—");
  expect(screen.getByText("48")).toBeInTheDocument();
  expect(screen.getByText("49 - 52")).toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: "Upload dữ liệu" })).not.toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: "Ánh xạ Khoa" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Đến Ánh xạ Khoa/ })).not.toBeInTheDocument();
  expect(apiFetch).not.toHaveBeenCalledWith("hoc-vu/anh-xa-khoa");
});

test("ADMIN thấy upload và hiển thị Message khi API trả 403", async () => {
  useAuth.mockReturnValue({ user: { MaChucVu: "ADMIN" } });
  confirmDialog.mockImplementation(({ accept }) => accept());
  apiFetch.mockImplementation(async (endpoint) => {
    if (endpoint === "namdanhgia") return reply({ Items: [{ IdNam: 2026 }] });
    if (endpoint === "donvi") return reply({ Items: [{ IdDonVi: 9, MaDonVi: "P_DTBDCL" }] });
    if (endpoint === "hoc-vu/ty-le-khoa?idNam=2026") return reply({ Success: true, Items: [] });
    if (endpoint === "hoc-vu/import-sinh-vien") return reply({ Success: false, Message: "Không có quyền upload" }, false);
    throw new Error(`Unexpected endpoint: ${endpoint}`);
  });
  const { container } = render(<HocVuSinhVien />);
  fireEvent.click(await screen.findByRole("tab", { name: "Upload dữ liệu" }));
  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
  const fileInput = container.querySelector('input[type="file"]');
  fireEvent.change(fileInput, { target: { files: [new File(["x"], "danh-sach.xlsx")] } });
  fireEvent.click(screen.getAllByRole("button", { name: "Upload dữ liệu" })[0]);
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Không có quyền upload"));
});

test.each(["P_DTBDCL", "P_KHHTQT"])("TP của %s thấy đúng quyền quản lý", async (maDonVi) => {
  useAuth.mockReturnValue({ user: {
    MaChucVu: "TP",
    DonVi: [{ IdDonVi: 8, MaDonVi: maDonVi, MaChucVu: "TP" }],
  } });
  render(<HocVuSinhVien />);
  await screen.findByText("Khoa Công nghệ thông tin");
  if (maDonVi === "P_DTBDCL") {
    expect(screen.getByRole("tab", { name: "Upload dữ liệu" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Ánh xạ Khoa" })).toBeInTheDocument();
  } else {
    expect(screen.queryByRole("tab", { name: "Upload dữ liệu" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Ánh xạ Khoa" })).not.toBeInTheDocument();
  }
});

test("cấp Khoa đối chiếu cảnh báo theo trạng thái, không gửi idDonVi và không thấy TongQuan", async () => {
  useAuth.mockReturnValue({ user: { MaChucVu: "TKK" } });
  apiFetch.mockImplementation(async (endpoint) => {
    if (endpoint === "namdanhgia") return reply({ Items: [{ IdNam: 2026 }] });
    if (endpoint === "donvi") return reply({ Items: [] });
    if (endpoint === "hoc-vu/ty-le-khoa?idNam=2026") return reply({
      Success: true, XemTatCa: false, TongQuan: null,
      NamNhapHocTotNghiep: 2022, NamNhapHocCanhBaoTu: 2023, NamNhapHocCanhBaoDen: 2026,
      Items: [{ IdDonVi: 5, TenDonVi: "Khoa Công nghệ thông tin", SoSvBiCanhBao: 1,
        SoSvKhoaCanhBao: 4, SoThoiHocKhoaCanhBao: 0, TyLeCanhBaoHocVu: 25 }],
    });
    if (endpoint.startsWith("hoc-vu/sinh-vien?")) return reply({
      Success: true, SoTrangThai1: 1, SoTrangThai2: 3, SoTrangThai3: 1,
      Page: 1, PageSize: 20, TotalCount: 5, TotalPages: 1,
      Items: [{ MaSinhVien: "SV01", HoVaTen: "Nguyễn Văn A", Lop: "K48", NamNhapHoc: 2023,
        TrangThai: 1, SoDongCanhBao: 2, ChiTietCanhBao: "CB lan 1 - QD 123; CB lan 2 - QD 456" }],
    });
    throw new Error(`Unexpected endpoint: ${endpoint}`);
  });

  render(<HocVuSinhVien />);
  expect(await screen.findByText("Khoa Công nghệ thông tin")).toBeInTheDocument();
  expect(screen.getByText("48")).toBeInTheDocument();
  expect(screen.getByText("49 - 52")).toBeInTheDocument();
  expect(screen.queryByText("Tổng số sinh viên")).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Đối chiếu sinh viên" })[1]);
  expect(await screen.findByText("CB lan 1 - QD 123; CB lan 2 - QD 456")).toBeInTheDocument();
  expect(screen.getAllByText("25,00%", { selector: ".hoc-vu-detail-summary strong" })).toHaveLength(2);
  expect(screen.queryByRole("combobox", { name: "Khoa" })).not.toBeInTheDocument();
  const endpoints = apiFetch.mock.calls.map(([endpoint]) => endpoint).filter((endpoint) => endpoint.startsWith("hoc-vu/sinh-vien?"));
  expect(endpoints[0]).toContain("loai=canh-bao");
  expect(endpoints[0]).not.toContain("idDonVi=");
  fireEvent.click(screen.getByRole("button", { name: /Không bị cảnh báo 3/ }));
  await waitFor(() => expect(apiFetch.mock.calls.some(([endpoint]) => endpoint.includes("trangThai=2"))).toBe(true));
});

test("quản trị chọn Khoa từ tỷ lệ và lọc tìm sinh viên", async () => {
  useAuth.mockReturnValue({ user: { MaChucVu: "ADMIN" } });
  apiFetch.mockImplementation(async (endpoint) => {
    if (endpoint === "namdanhgia") return reply({ Items: [{ IdNam: 2026 }] });
    if (endpoint === "donvi") return reply({ Items: [] });
    if (endpoint === "hoc-vu/ty-le-khoa?idNam=2026") return reply({
      Success: true, XemTatCa: true, TongQuan: {}, Items: [{ IdDonVi: 5, TenDonVi: "Khoa CNTT" }],
    });
    if (endpoint.startsWith("hoc-vu/sinh-vien?")) return reply({
      Success: true, SoTrangThai1: 0, SoTrangThai2: 1, SoTrangThai3: 0,
      Page: Number(new URLSearchParams(endpoint.split("?")[1]).get("page")),
      PageSize: 20, TotalCount: 21, TotalPages: 2, Items: [],
    });
    throw new Error(`Unexpected endpoint: ${endpoint}`);
  });
  render(<HocVuSinhVien />);
  await screen.findByText("Khoa CNTT");
  fireEvent.click(screen.getAllByRole("button", { name: "Đối chiếu sinh viên" })[0]);
  await waitFor(() => expect(apiFetch.mock.calls.some(([endpoint]) => endpoint.includes("idDonVi=5"))).toBe(true));
  expect(screen.getByRole("combobox", { name: "Khoa" })).toHaveValue("5");
  fireEvent.change(screen.getByRole("textbox", { name: "Tìm sinh viên" }), { target: { value: "SV01" } });
  fireEvent.click(screen.getByRole("button", { name: "Tìm" }));
  await waitFor(() => expect(apiFetch.mock.calls.some(([endpoint]) => endpoint.includes("keyword=SV01"))).toBe(true));
  fireEvent.click(screen.getByRole("button", { name: "Sau" }));
  await waitFor(() => expect(apiFetch.mock.calls.some(([endpoint]) => endpoint.includes("page=2"))).toBe(true));
});

test("một nút lưu xử lý mọi dòng đã đổi, giữ dòng lỗi và chỉ hiện tên Khoa", async () => {
  useAuth.mockReturnValue({ user: { MaChucVu: "ADMIN" } });
  apiFetch.mockImplementation(async (endpoint) => {
    if (endpoint === "namdanhgia") return reply({ Items: [{ IdNam: 2026 }] });
    if (endpoint === "donvi") return reply({ Items: [
      { IdDonVi: 5, MaDonVi: "K_CNTT", CapDonVi: 2, TenDonVi: "Khoa Công nghệ thông tin" },
      { IdDonVi: 6, MaDonVi: "K_KT", CapDonVi: 2, TenDonVi: "Khoa Kinh tế" },
    ] });
    if (endpoint === "hoc-vu/ty-le-khoa?idNam=2026") return reply({ Success: true, Items: [] });
    if (endpoint === "hoc-vu/anh-xa-khoa") return reply({ Items: [
      { MaKhoa: "210", TenKhoa: "Kế toán", SoSinhVien: 10 },
      { MaKhoa: "211", TenKhoa: "Kinh tế", SoSinhVien: 20 },
    ] });
    throw new Error(`Unexpected endpoint: ${endpoint}`);
  });
  const postBodies = [];
  const originalImplementation = apiFetch.getMockImplementation();
  apiFetch.mockImplementation(async (endpoint, options) => {
    if (endpoint === "hoc-vu/anh-xa-khoa" && options?.method === "POST") {
      const body = JSON.parse(options.body);
      postBodies.push(body);
      return body.maKhoa === "211"
        ? reply({ Success: false, Message: "Không lưu được mã 211" }, false)
        : reply({ Success: true });
    }
    return originalImplementation(endpoint, options);
  });

  render(<HocVuSinhVien />);
  fireEvent.click(screen.getByRole("tab", { name: "Ánh xạ Khoa" }));
  const first = await screen.findByRole("combobox", { name: "Khoa trong hệ thống cho mã 210" });
  const second = screen.getByRole("combobox", { name: "Khoa trong hệ thống cho mã 211" });
  expect(within(first).getByRole("option", { name: "Khoa Công nghệ thông tin" })).toBeInTheDocument();
  expect(within(first).queryByRole("option", { name: /K_CNTT/ })).not.toBeInTheDocument();
  fireEvent.change(first, { target: { value: "5" } });
  fireEvent.change(second, { target: { value: "6" } });
  fireEvent.change(screen.getByPlaceholderText("Tìm mã hoặc tên Khoa..."), { target: { value: "Kế toán" } });
  expect(screen.getAllByRole("button", { name: "Lưu ánh xạ" })).toHaveLength(1);
  expect(screen.getByText("2 thay đổi chưa lưu")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Lưu ánh xạ" }));
  await waitFor(() => expect(postBodies).toEqual([
    { maKhoa: "210", idDonVi: 5 }, { maKhoa: "211", idDonVi: 6 },
  ]));
  expect(await screen.findByRole("alert")).toHaveTextContent("Không lưu được mã 211");
  expect(screen.getByText("1 thay đổi chưa lưu")).toBeInTheDocument();
});
