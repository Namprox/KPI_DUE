import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { SangKienProvider, useQuyenSangKien } from "./SangKienContext";
import { useAuth } from "./AuthContext";
import { layQuyenSangKien } from "../utils/sangKienApi";
jest.mock("./AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../utils/sangKienApi", () => ({ layQuyenSangKien: jest.fn() }));
function View() {
  const { quyen, loading, error } = useQuyenSangKien();
  const navigate = useNavigate();
  return <><div data-testid="permission">{loading ? "loading" : error || String(quyen?.LaQuanLy === true)}</div><button onClick={() => navigate("/sang-kien")}>Vào module</button></>;
}
const show = () => <MemoryRouter><SangKienProvider><View /></SangKienProvider></MemoryRouter>;
beforeEach(() => { jest.clearAllMocks(); });
test("nạp quyền cho menu và nạp lại khi vào module", async () => {
  const user = { IdNhanVien: 5, MaChucVu: "GV" };
  useAuth.mockReturnValue({ user });
  layQuyenSangKien.mockResolvedValueOnce({ Success: true, LaQuanLy: true }).mockResolvedValueOnce({ Success: true, LaQuanLy: false });
  render(show());
  await waitFor(() => expect(screen.getByTestId("permission").textContent).toBe("true"));
  fireEvent.click(screen.getByText("Vào module"));
  await waitFor(() => expect(screen.getByTestId("permission").textContent).toBe("false"));
  expect(layQuyenSangKien).toHaveBeenCalledTimes(2);
});
test("đổi tài khoản loại bỏ quyền cũ; bỏ qua response cũ đến muộn", async () => {
  let resolveOld;
  const old = new Promise((resolve) => { resolveOld = resolve; });
  layQuyenSangKien.mockReturnValueOnce(old).mockResolvedValueOnce({ Success: true, LaQuanLy: false });
  useAuth.mockReturnValue({ user: { IdNhanVien: 5 } });
  const { rerender } = render(show());
  useAuth.mockReturnValue({ user: { IdNhanVien: 6 } });
  rerender(show());
  await waitFor(() => expect(screen.getByTestId("permission").textContent).toBe("false"));
  await act(async () => { resolveOld({ Success: true, LaQuanLy: true }); await old; });
  expect(screen.getByTestId("permission").textContent).toBe("false");
});
test("lỗi tải quyền không mở quyền quản lý và không gọi API khi đăng xuất", async () => {
  useAuth.mockReturnValue({ user: { IdNhanVien: 5 } });
  layQuyenSangKien.mockRejectedValue(new Error("Không tải được quyền"));
  const { rerender } = render(show());
  await screen.findByText("Không tải được quyền");
  useAuth.mockReturnValue({ user: null });
  rerender(show());
  expect(screen.getByTestId("permission").textContent).toBe("false");
  expect(layQuyenSangKien).toHaveBeenCalledTimes(1);
});
