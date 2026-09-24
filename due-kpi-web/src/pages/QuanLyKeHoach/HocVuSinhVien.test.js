import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import HocVuSinhVien from "./HocVuSinhVien";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { confirmDialog } from "primereact/confirmdialog";

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
      TongQuan: {
        SoSinhVien: 10,
        SoDongCanhBao: 2,
        SoSinhVienChuaAnhXa: 1,
        SoMaKhoaChuaAnhXa: 1,
        NamNhapHocTotNghiep: 2022,
        NamNhapHocCanhBaoTu: 2023,
        NamNhapHocCanhBaoDen: 2026,
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

test.each(["P_DTBDCL", "P_KHHTQT"])("TP của %s không thấy upload và ánh xạ", async (maDonVi) => {
  useAuth.mockReturnValue({ user: {
    MaChucVu: "TP",
    DonVi: [{ IdDonVi: 8, MaDonVi: maDonVi, MaChucVu: "TP" }],
  } });
  render(<HocVuSinhVien />);
  await screen.findByText("Khoa Công nghệ thông tin");
  expect(screen.queryByRole("tab", { name: "Upload dữ liệu" })).not.toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: "Ánh xạ Khoa" })).not.toBeInTheDocument();
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
