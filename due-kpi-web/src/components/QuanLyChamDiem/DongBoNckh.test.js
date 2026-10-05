import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import DongBoNckh from "./DongBoNckh";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("primereact/dialog", () => ({ Dialog: ({ header, children, footer, onHide, closable }) => <div role="dialog" aria-label={header}>
  {closable && <button onClick={onHide}>Đóng hộp thoại</button>}{children}{footer}
</div> }));

const props = { idNam: "2026", namList: [{ IdNam: 2026 }, { IdNam: 2025 }], dangTaiNam: false };
const appointment = (MaChucVu, MaDonVi = "P_KH") => ({ MaChucVu, MaDonVi });
const show = () => render(<DongBoNckh {...props} />);
const open = () => fireEvent.click(screen.getByRole("button", { name: "Đồng bộ dữ liệu NCKH" }));
const confirm = () => fireEvent.click(screen.getByRole("button", { name: "Xác nhận đồng bộ", exact: true }));
const reply = (body = {}, status = 200) => ({ ok: status === 200, status, json: async () => ({ Success: status === 200, ...body }) });
beforeEach(() => {
  jest.clearAllMocks();
  Element.prototype.scrollIntoView = jest.fn();
  useAuth.mockReturnValue({ user: { IdNhanVien: 1, MaChucVu: "ADMIN" } });
  apiFetch.mockResolvedValue(reply());
});

test.each([
  { MaChucVu: " admin " },
  { DonVi: [appointment("TP")] },
  { DonVi: [appointment(" qtp ", " p_kh ")] },
  { MaChucVu: "TK", DonVi: [appointment("TK", "K_KT"), appointment("QTP")] },
  { MaChucVu: "TP", MaDonVi: "P_KH" },
])("ADMIN hoặc TP/QTP P_KH gồm kiêm nhiệm thấy nút %#", (user) => {
  useAuth.mockReturnValue({ user });
  show();
  expect(screen.getByRole("button", { name: "Đồng bộ dữ liệu NCKH" })).toBeEnabled();
});

test.each([
  null, { MaChucVu: "HT" },
  { DonVi: [appointment("PTP")] },
  { DonVi: [appointment("GD")] },
  { DonVi: [appointment("TP", "P_TCHC")] },
  { MaChucVu: "TP", MaDonVi: "P_KH", DonVi: [appointment("TP", "P_TCHC"), appointment("NV")] },
  { DonVi: [appointment("TP", "P_DTBDCL"), appointment("NV")] },
])("ẩn nút khi không đúng chức vụ và phòng trên cùng một dòng %#", (user) => {
  useAuth.mockReturnValue({ user });
  show();
  expect(screen.queryByRole("button", { name: "Đồng bộ dữ liệu NCKH" })).not.toBeInTheDocument();
  expect(apiFetch).not.toHaveBeenCalled();
});

test("mở confirm nêu phạm vi mọi năm, hủy không gọi API", () => {
  show(); open();
  expect(screen.getByRole("dialog", { name: "Xác nhận đồng bộ dữ liệu NCKH" })).toBeInTheDocument();
  expect(screen.getByText(/Giờ NCKH ghi đè dữ liệu của mọi năm/)).toBeInTheDocument();
  expect(screen.getByText(/đánh dấu sáng kiến không còn ở nguồn/)).toBeInTheDocument();
  expect(apiFetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(apiFetch).not.toHaveBeenCalled();
});

test("chọn năm trong confirm, chạy tuần tự đủ 4 POST; giữ số dòng bằng 0", async () => {
  let finishFirst;
  apiFetch.mockImplementation((url) => url.startsWith("nckh/dong-bo")
    ? new Promise((resolve) => { finishFirst = resolve; })
    : Promise.resolve(reply({ GioNckhCount: 0, BaiBaoQuocTeCount: 3, SoSangKien: 4 })));
  show(); open();
  fireEvent.click(screen.getByRole("combobox", { name: "Năm đồng bộ NCKH" }));
  fireEvent.click(screen.getByRole("option", { name: "2025", exact: true }));
  confirm();
  expect(apiFetch).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Đang đồng bộ...", exact: true })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Hủy" })).toBeDisabled();
  fireEvent.click(screen.getByRole("combobox", { name: "Năm đồng bộ NCKH" }));
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  finishFirst(reply({ HoSoCount: 2 }));
  await screen.findByText("Đồng bộ thành công cả 4 nhóm dữ liệu.");
  expect(apiFetch.mock.calls).toEqual([
    ["nckh/dong-bo?id_nam=2025", { method: "POST" }],
    ["nckh/gio-nckh/dong-bo", { method: "POST" }],
    ["nckh/bai-bao-quoc-te/dong-bo?id_nam=2025", { method: "POST" }],
    ["sang-kien/dong-bo", { method: "POST" }],
  ]);
  expect(screen.getByText("Số dòng giờ NCKH: 0")).toBeInTheDocument();
  expect(screen.getAllByText("Thành công")).toHaveLength(4);
});

test("lỗi một API giữ thành công đã có và tiếp tục các mục độc lập", async () => {
  apiFetch.mockResolvedValueOnce(reply({ HoSoCount: 3 }))
    .mockResolvedValueOnce(reply({ Message: "NCKH nguồn đang lỗi" }, 502));
  show(); open(); confirm();
  await screen.findByText("Đã đồng bộ thành công 3/4 nhóm dữ liệu. Xem kết quả từng mục ở trên.");
  expect(apiFetch).toHaveBeenCalledTimes(4);
  expect(screen.getByText("NCKH nguồn đang lỗi")).toBeInTheDocument();
  expect(screen.getAllByText("Thành công")).toHaveLength(3);
  expect(screen.getByText("Hồ sơ: 3")).toBeInTheDocument();
});

test.each([401, 403])("HTTP %s dừng các POST còn lại và hiển thị chưa chạy", async (status) => {
  apiFetch.mockResolvedValueOnce(reply({ Message: "Không còn quyền đồng bộ" }, status));
  show(); open(); confirm();
  await screen.findByText("Không còn quyền đồng bộ");
  expect(apiFetch).toHaveBeenCalledTimes(1);
  expect(screen.getAllByText("Chưa chạy")).toHaveLength(3);
});

test("đổi tài khoản giữa chừng không chạy API kế tiếp", async () => {
  let finishFirst;
  apiFetch.mockReturnValue(new Promise((resolve) => { finishFirst = resolve; }));
  const view = show(); open(); confirm();
  useAuth.mockReturnValue({ user: { MaChucVu: "HT" } });
  view.rerender(<DongBoNckh {...props} />);
  finishFirst(reply());
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(apiFetch).toHaveBeenCalledTimes(1);
});

test("không chạy khi danh mục không có năm đã chọn", () => {
  render(<DongBoNckh {...props} idNam="2030" />); open();
  expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Xác nhận đồng bộ" })).toBeDisabled();
  expect(apiFetch).not.toHaveBeenCalled();
});
