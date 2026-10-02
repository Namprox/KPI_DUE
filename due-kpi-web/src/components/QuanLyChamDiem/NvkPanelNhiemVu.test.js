import React from "react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import NvkPanelNhiemVu from "./NvkPanelNhiemVu";
import { layDanhSachNhiemVu, xetNhiemVu } from "../../utils/nhiemVuKhoaApi";
jest.mock("../../utils/nhiemVuKhoaApi", () => ({
  ...jest.requireActual("../../utils/nhiemVuKhoaApi"),
  layDanhSachNhiemVu: jest.fn(),
  xetNhiemVu: jest.fn(),
}));
jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ user: { IdNhanVien: 5, MaChucVu: "TKK" } }),
}));
jest.mock("../../hooks/useConfirmDeleteDialog", () => ({
  useConfirmDeleteDialog: () => ({ confirmDeleteDialog: jest.fn() }),
}));
jest.mock("./NhiemVuKhoaFormModal", () => () => null);
const props = {
  idNam: 2026,
  idDonVi: 7,
  ky: { CanDuyet: true, TrangThai: 1 },
  trangThai: "1",
  onLamMoiKy: jest.fn(),
  onError: jest.fn(),
  onSuccess: jest.fn(),
};
const nv = (id, TrangThai, flags = {}) => ({
  IdNhiemVuKhoa: id,
  TenNhiemVu: `Nhiệm vụ ${id}`,
  TrangThai,
  ChoPhepXet: true,
  ChoPhepSua: false,
  PhanCong: [],
  ...flags,
});
beforeEach(() => {
  jest.clearAllMocks();
  xetNhiemVu.mockResolvedValue({});
});

test("nút xét theo 3 trạng thái, quyền server cho người có chức vụ chính khác TK", async () => {
  layDanhSachNhiemVu.mockResolvedValue([nv(1, 1), nv(2, 2), nv(3, 3)]);
  render(<NvkPanelNhiemVu {...props} />);
  await screen.findByText("Nhiệm vụ 1");
  expect(layDanhSachNhiemVu).toHaveBeenCalledWith(
    expect.objectContaining({ trangThai: "1", idDonVi: 7 }),
  );
  const rows = screen.getAllByRole("row").slice(1);
  expect(within(rows[0]).getByRole("button", { name: "Duyệt" })).toBeTruthy();
  expect(within(rows[0]).getByRole("button", { name: "Trả về" })).toBeTruthy();
  expect(within(rows[1]).getByRole("button", { name: "Mở lại" })).toBeTruthy();
  expect(within(rows[1]).queryByRole("button", { name: "Duyệt" })).toBeNull();
  expect(within(rows[2]).getByRole("button", { name: "Duyệt" })).toBeTruthy();
  expect(within(rows[2]).queryByRole("button", { name: "Trả về" })).toBeNull();
  fireEvent.click(within(rows[2]).getByRole("button", { name: "Duyệt" }));
  await waitFor(() =>
    expect(xetNhiemVu).toHaveBeenCalledWith(3, { trangThai: 2, lyDo: "" }),
  );
  expect(props.onSuccess).toHaveBeenCalledWith(
    expect.stringContaining("làm mới điểm"),
  );
  expect(props.onLamMoiKy).toHaveBeenCalled();
});

test.each([
  [1, "Trả về"],
  [2, "Mở lại"],
])("trạng thái %s bắt buộc lý do %s", async (TrangThai, action) => {
  layDanhSachNhiemVu.mockResolvedValue([nv(1, TrangThai)]);
  render(<NvkPanelNhiemVu {...props} />);
  fireEvent.click(await screen.findByRole("button", { name: action }));
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
  expect(xetNhiemVu).not.toHaveBeenCalled();
  expect(screen.getByRole("alert").textContent).toBe("Vui lòng nhập lý do");
  fireEvent.change(screen.getByLabelText("Lý do (bắt buộc)"), {
    target: { value: "Thiếu quyết định" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
  await waitFor(() =>
    expect(xetNhiemVu).toHaveBeenCalledWith(1, {
      trangThai: 3,
      lyDo: "Thiếu quyết định",
    }),
  );
});

test("TLGVK hoặc thiếu cờ quyền chỉ xem, không hiện mọi nút ghi", async () => {
  layDanhSachNhiemVu.mockResolvedValue([
    nv(1, 1, { ChoPhepXet: false }),
    nv(2, 2, { ChoPhepXet: undefined }),
  ]);
  render(
    <NvkPanelNhiemVu {...props} ky={{ CanDuyet: false, CanKeKhai: false }} />,
  );
  await screen.findByText("Nhiệm vụ 1");
  expect(
    screen.queryByRole("button", {
      name: /Duyệt|Trả về|Mở lại|Xoá|Sửa nhiệm vụ/,
    }),
  ).toBeNull();
  expect(screen.getAllByRole("button", { name: "Xem chi tiết" })).toHaveLength(
    2,
  );
});

test("409 xét nhiệm vụ tải lại trạng thái và quyền mới", async () => {
  layDanhSachNhiemVu
    .mockResolvedValueOnce([nv(1, 1)])
    .mockResolvedValue([nv(1, 2, { ChoPhepXet: false })]);
  xetNhiemVu.mockRejectedValueOnce(
    Object.assign(new Error("Đã thay đổi"), { status: 409 }),
  );
  render(<NvkPanelNhiemVu {...props} />);
  fireEvent.click(await screen.findByRole("button", { name: "Duyệt" }));
  await waitFor(() =>
    expect(props.onError).toHaveBeenCalledWith("Đã thay đổi"),
  );
  await screen.findByText("Đã duyệt");
  expect(screen.queryByRole("button", { name: "Duyệt" })).toBeNull();
  expect(props.onLamMoiKy).toHaveBeenCalled();
});
