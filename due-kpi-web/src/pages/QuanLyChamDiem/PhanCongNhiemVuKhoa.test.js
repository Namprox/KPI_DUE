import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PhanCongNhiemVuKhoa from "./PhanCongNhiemVuKhoa";
import { apiFetch } from "../../utils/api";
import { layCauHinh, layKy } from "../../utils/nhiemVuKhoaApi";
jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../../utils/nhiemVuKhoaApi", () => ({
  ...jest.requireActual("../../utils/nhiemVuKhoaApi"),
  layCauHinh: jest.fn(),
  layKy: jest.fn(),
}));
const mockUser = {
  IdNhanVien: 5,
  MaChucVu: "TLGVK",
  IdDonVi: 7,
  DonVi: [
    { IdDonVi: 7, MaChucVu: "TLGVK" },
    { IdDonVi: 8, MaChucVu: "TK" },
  ],
};
jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));
jest.mock("../../hooks/useNamDanhGia", () => ({
  useNamDanhGia: () => ({
    namList: [{ IdNam: 2026 }],
    selectedNam: 2026,
    dangTaiNam: false,
    setSelectedNam: jest.fn(),
  }),
}));
jest.mock("../../components/QuanLyChamDiem/NvkPanelNhiemVu", () => (props) => (
  <div data-testid="hang-doi">
    {props.idDonVi}/{props.trangThai}
  </div>
));
jest.mock("../../components/QuanLyChamDiem/NvkPanelTongHop", () => () => (
  <div>Tổng hợp nhiệm vụ đã duyệt</div>
));
jest.mock("../../components/QuanLyChamDiem/NvkPanelPhanHoi", () => () => (
  <div>Phản hồi chỉ đọc</div>
));
jest.mock("../../components/QuanLyChamDiem/NvkPanelLichSu", () => () => null);
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});
beforeEach(() => {
  jest.clearAllMocks();
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      Items: [
        { IdDonVi: 7, CapDonVi: 2, MaDonVi: "K_A", TenDonVi: "Khoa A" },
        { IdDonVi: 8, CapDonVi: 2, MaDonVi: "K_B", TenDonVi: "Khoa B" },
      ],
    }),
  });
  layCauHinh.mockResolvedValue({});
  layKy.mockImplementation(async ({ idDonVi }) => ({
    ky: {
      IdDonVi: idDonVi,
      CanDuyet: true,
      CanKeKhai: false,
      CanNhap: true,
      SoChoDuyet: 2,
      SoDaDuyet: 1,
      SoTraVe: 1,
    },
    nhom: [],
  }));
});
test("ưu tiên Khoa kiêm nhiệm có TK, hàng đợi mặc định trạng thái 1, cờ cũ không cấp kê khai", async () => {
  render(<PhanCongNhiemVuKhoa />);
  expect((await screen.findByTestId("hang-doi")).textContent).toBe("8/1");
  expect(layKy).toHaveBeenCalledWith({ idNam: 2026, idDonVi: 8 });
  expect(screen.queryByRole("button", { name: "Kê khai nhiệm vụ" })).toBeNull();
  fireEvent.click(
    screen.getByRole("combobox", { name: "Trạng thái nhiệm vụ" }),
  );
  fireEvent.click(screen.getByRole("option", { name: "Đã duyệt" }));
  expect(screen.getByTestId("hang-doi").textContent).toBe("8/2");
});
test("badge chuyển sang hàng đợi đúng trạng thái, lưu trữ và tổng hợp không còn chốt kỳ", async () => {
  render(<PhanCongNhiemVuKhoa />);
  await screen.findByTestId("hang-doi");
  fireEvent.click(screen.getByRole("button", { name: "1 trả về" }));
  expect(screen.getByTestId("hang-doi").textContent).toBe("8/3");
  fireEvent.click(screen.getByRole("button", { name: "Tổng hợp" }));
  expect(screen.getByText("Tổng hợp nhiệm vụ đã duyệt")).toBeTruthy();
  expect(screen.queryByRole("button", { name: /chốt kỳ/i })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Lưu trữ phản hồi" }));
  expect(screen.getByText("Phản hồi chỉ đọc")).toBeTruthy();
});
test("nút kê khai lấy CanKeKhai của BE", async () => {
  layKy.mockResolvedValue({
    ky: { CanKeKhai: true, CanNhap: false, TrangThai: 1 },
    nhom: [],
  });
  render(<PhanCongNhiemVuKhoa />);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Kê khai nhiệm vụ" }),
    ).toBeTruthy(),
  );
});
