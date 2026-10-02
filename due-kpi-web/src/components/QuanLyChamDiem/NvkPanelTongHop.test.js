import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NvkPanelTongHop from "./NvkPanelTongHop";
import { capNhatKy, layTongHop } from "../../utils/nhiemVuKhoaApi";
jest.mock("../../utils/nhiemVuKhoaApi", () => ({
  ...jest.requireActual("../../utils/nhiemVuKhoaApi"),
  capNhatKy: jest.fn(),
  layTongHop: jest.fn(),
}));
const props = {
  idNam: 2026,
  idDonVi: 7,
  ky: { TrangThai: 1, CanDuyet: true },
  onError: jest.fn(),
  onSuccess: jest.fn(),
  onLamMoiKy: jest.fn(),
};
beforeEach(() => {
  jest.clearAllMocks();
  layTongHop.mockResolvedValue({
    Header: { SoChoDuyet: 2, SoTraVe: 1, SoDaDuyet: 1 },
    Nhom: [],
    Items: [
      {
        IdNhanVien: 5,
        HoTen: "Giảng viên A",
        SoNhiemVu: 1,
        TongDiemThucTe: 10,
        TongDiemQuyDoi: 10,
        SoNhiemVuChoDuyet: 2,
        TongDiemChoDuyet: 17,
      },
    ],
  });
  capNhatKy.mockResolvedValue({});
});
test("tổng hợp chỉ đọc số liệu BE, điểm chờ riêng và không có kiểm tra/chốt kỳ", async () => {
  render(<NvkPanelTongHop {...props} />);
  await screen.findByText("Giảng viên A");
  expect(screen.getByText("+17.0 điểm chờ duyệt")).toBeTruthy();
  expect(screen.getAllByText("10.0")).toHaveLength(2);
  expect(screen.queryByText(/KIỂM TRA TRƯỚC KHI CHỐT/)).toBeNull();
  expect(screen.queryByRole("button", { name: "Chốt kỳ" })).toBeNull();
});
test("mở lại kỳ cũ bằng CanDuyet, bắt buộc lý do", async () => {
  render(
    <NvkPanelTongHop
      {...props}
      ky={{ TrangThai: 2, CanDuyet: true, CanChot: false }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Mở lại kỳ cũ" }));
  expect(capNhatKy).not.toHaveBeenCalled();
  expect(props.onError).toHaveBeenCalledWith(
    "Mở lại kỳ bắt buộc phải có lý do",
  );
  fireEvent.change(screen.getByLabelText("Lý do mở lại kỳ (bắt buộc)"), {
    target: { value: "Dùng luồng duyệt mới" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Mở lại kỳ cũ" }));
  await waitFor(() =>
    expect(capNhatKy).toHaveBeenCalledWith({
      idNam: 2026,
      idDonVi: 7,
      moLai: true,
      lyDo: "Dùng luồng duyệt mới",
    }),
  );
});
test("TLGVK không mở lại kỳ bằng cờ CanChot cũ", async () => {
  render(
    <NvkPanelTongHop
      {...props}
      ky={{ TrangThai: 2, CanDuyet: false, CanChot: true }}
    />,
  );
  await screen.findByText("Giảng viên A");
  expect(screen.queryByRole("button", { name: "Mở lại kỳ cũ" })).toBeNull();
});
