import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NhiemVuKhoaCuaToi from "./NhiemVuKhoaCuaToi";
import {
  layNhiemVuCuaToi,
  layCauHinh,
  layGiangVien,
  layNhiemVu,
} from "../../utils/nhiemVuKhoaApi";
jest.mock("../../utils/nhiemVuKhoaApi", () => ({
  ...jest.requireActual("../../utils/nhiemVuKhoaApi"),
  layNhiemVuCuaToi: jest.fn(),
  layCauHinh: jest.fn(),
  layGiangVien: jest.fn(),
  layNhiemVu: jest.fn(),
}));
jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { IdNhanVien: 5 } }),
}));
jest.mock("../../hooks/useNamDanhGia", () => ({
  useNamDanhGia: () => ({
    namList: [{ IdNam: 2026 }],
    selectedNam: 2026,
    dangTaiNam: false,
    setSelectedNam: jest.fn(),
  }),
}));
jest.mock("../../hooks/useConfirmDeleteDialog", () => ({
  useConfirmDeleteDialog: () => ({ confirmDeleteDialog: jest.fn() }),
}));
const header = {
  IdDonVi: 7,
  CanKeKhai: true,
  SoNhiemVu: 1,
  SoChoDuyet: 1,
  SoTraVe: 1,
  TongDiemThucTe: 10,
  TongDiemQuyDoi: 10,
  TongDiemChoDuyet: 17,
  TranDiem: 20,
};
const chuTri = {
  IdNhiemVuKhoa: 501,
  TenNhiemVu: "Hội thảo khoa học sinh viên",
  TenNhom: "Hoạt động khoa học",
  LaChuTri: true,
  TrangThai: 3,
  ChoPhepSua: true,
  LyDoTraVe: "Bổ sung quyết định thành lập ban tổ chức",
  TenVaiTroSnapshot: "Chủ trì",
  DiemSnapshot: 10,
};
const phoiHop = {
  IdNhiemVuKhoa: 502,
  TenNhiemVu: "Tư vấn tuyển sinh",
  TenNhom: "Phục vụ cộng đồng",
  LaChuTri: false,
  TrangThai: 2,
  ChoPhepSua: false,
  TenVaiTroSnapshot: "Phối hợp",
  DiemSnapshot: 4,
};
beforeEach(() => {
  jest.clearAllMocks();
  layNhiemVuCuaToi.mockResolvedValue({
    Header: header,
    Items: [chuTri, phoiHop],
  });
  layCauHinh.mockResolvedValue({ Nhom: [], VaiTro: [] });
  layGiangVien.mockResolvedValue([]);
});

test("tách điểm chờ khỏi điểm đã duyệt, badge trả về và tab phối hợp", async () => {
  render(<NhiemVuKhoaCuaToi />);
  await screen.findByText(chuTri.TenNhiemVu);
  expect(
    screen.getByText(header.SoNhiemVu.toString(), { selector: ".stat-value" }),
  ).toBeTruthy();
  expect(
    screen
      .getByText("Điểm thực tế đã duyệt")
      .parentElement.querySelector(".stat-value").textContent,
  ).toBe("10.0");
  expect(screen.getByText("+17.0 điểm chờ duyệt")).toBeTruthy();
  expect(screen.getByText(chuTri.LyDoTraVe, { exact: false })).toBeTruthy();
  expect(screen.queryByText(phoiHop.TenNhiemVu)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Tôi phối hợp (1)" }));
  expect(screen.getByText(phoiHop.TenNhiemVu)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Sửa nhiệm vụ" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Gửi phản hồi/ })).toBeNull();
});

test("chưa có IdKy vẫn kê khai được với Header.IdDonVi", async () => {
  layNhiemVuCuaToi.mockResolvedValue({ Header: header, Items: [] });
  render(<NhiemVuKhoaCuaToi />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Kê khai nhiệm vụ" }),
  );
  await waitFor(() =>
    expect(layGiangVien).toHaveBeenCalledWith({ idNam: 2026, idDonVi: 7 }),
  );
  await screen.findByRole("button", { name: "Lưu nhiệm vụ" });
});

test("mở sửa đọc GET chi tiết; cờ mới đã khoá thì không ghi", async () => {
  layNhiemVu.mockResolvedValue({
    ...chuTri,
    ChoPhepSua: false,
    TrangThai: 2,
    PhanCong: [],
  });
  render(<NhiemVuKhoaCuaToi />);
  fireEvent.click(await screen.findByRole("button", { name: "Sửa nhiệm vụ" }));
  await screen.findByText("Chi tiết nhiệm vụ");
  expect(layNhiemVu).toHaveBeenCalledWith(501);
  expect(layGiangVien).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Lưu nhiệm vụ" })).toBeNull();
});

test.each([false, undefined])(
  "ẩn kê khai khi CanKeKhai=%s dù có IdDonVi",
  async (CanKeKhai) => {
    layNhiemVuCuaToi.mockResolvedValue({
      Header: { ...header, CanKeKhai },
      Items: [],
    });
    render(<NhiemVuKhoaCuaToi />);
    await screen.findByText("Chưa có nhiệm vụ trong danh sách này.");
    expect(
      screen.queryByRole("button", { name: "Kê khai nhiệm vụ" }),
    ).toBeNull();
  },
);
