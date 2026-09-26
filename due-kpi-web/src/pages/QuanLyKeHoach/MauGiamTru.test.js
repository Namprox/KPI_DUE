import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { confirmDialog } from "primereact/confirmdialog";
import MauGiamTru from "./MauGiamTru";
import { apiFetch } from "../../utils/api";
import { canAccessPath, visibleGroups } from "../../config/menuConfig";

jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("primereact/confirmdialog", () => ({ confirmDialog: jest.fn() }));
const file = new File(["excel"], "Mau giam tru.xlsx");
beforeEach(() => {
  jest.clearAllMocks();
  apiFetch.mockImplementation(async (endpoint) => ({ ok: true, json: async () => endpoint === "namdanhgia"
    ? { Items: [{ IdNam: 2026 }, { IdNam: 2025 }] }
    : { Success: true, IdNam: 2026, GiamTruDaLuu: 12, Warnings: ["Dòng 5: ngày không hợp lệ"] } }));
});
const selectFile = async () => {
  await waitFor(() => expect(screen.getByLabelText("Năm đánh giá").value).toBe("2026"));
  fireEvent.change(screen.getByLabelText("File mẫu giảm trừ"), { target: { files: [file] } });
};
test.each(["ADMIN", "HT", "TP", "TK", "TKK", "NV", "GV"])("menu và URL chỉ cho ADMIN: %s", (role) => {
  const user = { MaChucVu: role };
  expect(canAccessPath("/mau-giam-tru", user)).toBe(role === "ADMIN");
  expect(visibleGroups(user).some((group) => group.items.some((item) => item.path === "/mau-giam-tru"))).toBe(role === "ADMIN");
});
test("ADMIN kiêm nhiệm vẫn truy cập được", () => {
  expect(canAccessPath("/mau-giam-tru", { MaChucVu: "NV", DonVi: [{ MaChucVu: "ADMIN" }] })).toBe(true);
});
test("upload gửi multipart đúng năm và chế độ, hiện kết quả cùng cảnh báo", async () => {
  confirmDialog.mockImplementation(({ accept }) => accept());
  render(<MauGiamTru />);
  await selectFile();
  fireEvent.click(screen.getByText("Upload dữ liệu"));
  await screen.findByText("Upload mẫu giảm trừ thành công.");
  const [endpoint, options] = apiFetch.mock.calls.find(([path]) => path === "giam-tru/import");
  expect(endpoint).toBe("giam-tru/import");
  expect(options.method).toBe("POST");
  expect(options.body.get("file")).toBe(file);
  expect(options.body.get("idNam")).toBe("2026");
  expect(options.body.get("capNhatNhanVien")).toBe("false");
  expect(screen.getByText("12")).toBeTruthy();
  expect(screen.getByText("Dòng 5: ngày không hợp lệ")).toBeTruthy();
});
test("không gửi trước khi xác nhận; đổi năm xóa file đang chọn", async () => {
  render(<MauGiamTru />);
  await selectFile();
  fireEvent.click(screen.getByText("Upload dữ liệu"));
  expect(apiFetch).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("Năm đánh giá"), { target: { value: "2025" } });
  expect(screen.queryByText(file.name)).toBeNull();
  expect(screen.getByText("Upload dữ liệu").disabled).toBe(true);
});
test("hiện chi tiết danh mục thiếu khi HTTP 400, gửi lựa chọn cập nhật nhân viên", async () => {
  confirmDialog.mockImplementation(({ accept }) => accept());
  render(<MauGiamTru />);
  await selectFile();
  apiFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ Success: false, ErrorCode: "DANH_MUC_THIEU",
    Message: "Cần bổ sung danh mục", ChiTiet: [{ Loai: "DON_VI", GiaTri: "Khoa mới", DongExcel: 8, SoDong: 2 }] }) });
  fireEvent.click(screen.getByLabelText(/Đồng thời cập nhật danh sách nhân viên/));
  fireEvent.click(screen.getByText("Upload dữ liệu"));
  await screen.findByText("Cần bổ sung danh mục");
  expect(screen.getByText("Khoa mới")).toBeTruthy();
  expect(screen.getByText("Thiếu đơn vị")).toBeTruthy();
  expect(apiFetch.mock.calls[1][1].body.get("capNhatNhanVien")).toBe("true");
});
test("file sai định dạng không được upload", async () => {
  render(<MauGiamTru />);
  await selectFile();
  fireEvent.change(screen.getByLabelText("File mẫu giảm trừ"), { target: { files: [new File(["x"], "a.pdf")] } });
  expect(screen.getByRole("alert").textContent).toMatch(/Excel/);
  expect(screen.getByText("Upload dữ liệu").disabled).toBe(true);
});
