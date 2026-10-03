import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { ThanhTichDoanTheProvider, useQuyenDoanThe } from "./ThanhTichDoanTheContext";
import { useAuth } from "./AuthContext";
import { layQuyenDoanThe } from "../utils/thanhTichDoanTheApi";
jest.mock("./AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../utils/thanhTichDoanTheApi", () => ({ layQuyenDoanThe: jest.fn() }));
function View() {
  const { quyen, loading, error } = useQuyenDoanThe();
  const navigate = useNavigate();
  return <><div data-testid="permission">{loading ? "loading" : error || String(quyen?.DuocNhap === true)}</div><button onClick={() => navigate("/thanh-tich-doan-the")}>Vào module</button></>;
}
const show = () => <MemoryRouter><ThanhTichDoanTheProvider><View /></ThanhTichDoanTheProvider></MemoryRouter>;
beforeEach(() => { jest.clearAllMocks(); });
test("nạp quyền cho menu và nạp lại khi vào module", async () => {
  const user = { IdNhanVien: 5, MaChucVu: "GV" };
  useAuth.mockReturnValue({ user });
  layQuyenDoanThe.mockResolvedValueOnce({ Success: true, DuocNhap: true }).mockResolvedValueOnce({ Success: true, DuocNhap: false });
  render(show());
  await waitFor(() => expect(screen.getByTestId("permission").textContent).toBe("true"));
  fireEvent.click(screen.getByText("Vào module"));
  await waitFor(() => expect(screen.getByTestId("permission").textContent).toBe("false"));
  expect(layQuyenDoanThe).toHaveBeenCalledTimes(2);
});
test("đổi tài khoản loại bỏ quyền cũ; bỏ qua response cũ đến muộn", async () => {
  let resolveOld;
  const old = new Promise((resolve) => { resolveOld = resolve; });
  layQuyenDoanThe.mockReturnValueOnce(old).mockResolvedValueOnce({ Success: true, DuocNhap: false });
  useAuth.mockReturnValue({ user: { IdNhanVien: 5 } });
  const { rerender } = render(show());
  useAuth.mockReturnValue({ user: { IdNhanVien: 6 } });
  rerender(show());
  await waitFor(() => expect(screen.getByTestId("permission").textContent).toBe("false"));
  await act(async () => { resolveOld({ Success: true, DuocNhap: true }); await old; });
  expect(screen.getByTestId("permission").textContent).toBe("false");
});
test("lỗi tải quyền không mở quyền quản lý và không gọi API khi đăng xuất", async () => {
  useAuth.mockReturnValue({ user: { IdNhanVien: 5 } });
  layQuyenDoanThe.mockRejectedValue(new Error("Không tải được quyền"));
  const { rerender } = render(show());
  await screen.findByText("Không tải được quyền");
  useAuth.mockReturnValue({ user: null });
  rerender(show());
  expect(screen.getByTestId("permission").textContent).toBe("false");
  expect(layQuyenDoanThe).toHaveBeenCalledTimes(1);
});
