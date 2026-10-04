import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { PhatTrienDoiNguProvider, useQuyenDoiNgu } from "./PhatTrienDoiNguContext";
import { useAuth } from "./AuthContext";
import { layQuyenDoiNgu } from "../utils/phatTrienDoiNguApi";
jest.mock("./AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../utils/phatTrienDoiNguApi", () => ({ layQuyenDoiNgu: jest.fn() }));
function View() {
  const { quyen, loading, error } = useQuyenDoiNgu();
  const navigate = useNavigate();
  return <><div data-testid="permission">{loading ? "loading" : error || String(quyen?.LaQuanLy === true)}</div><button onClick={() => navigate("/phat-trien-doi-ngu")}>Vào module</button></>;
}
const show = () => <MemoryRouter><PhatTrienDoiNguProvider><View /></PhatTrienDoiNguProvider></MemoryRouter>;
beforeEach(() => { jest.clearAllMocks(); });
test("nạp quyền cho menu và nạp lại khi vào module", async () => {
  const user = { IdNhanVien: 5, MaChucVu: "GV" };
  useAuth.mockReturnValue({ user });
  layQuyenDoiNgu.mockResolvedValueOnce({ Success: true, LaQuanLy: true }).mockResolvedValueOnce({ Success: true, LaQuanLy: false });
  render(show());
  await waitFor(() => expect(screen.getByTestId("permission").textContent).toBe("true"));
  fireEvent.click(screen.getByText("Vào module"));
  await waitFor(() => expect(screen.getByTestId("permission").textContent).toBe("false"));
  expect(layQuyenDoiNgu).toHaveBeenCalledTimes(2);
});
test("đổi tài khoản loại bỏ quyền cũ; bỏ qua response cũ đến muộn", async () => {
  let resolveOld;
  const old = new Promise((resolve) => { resolveOld = resolve; });
  layQuyenDoiNgu.mockReturnValueOnce(old).mockResolvedValueOnce({ Success: true, LaQuanLy: false });
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
  layQuyenDoiNgu.mockRejectedValue(new Error("Không tải được quyền"));
  const { rerender } = render(show());
  await screen.findByText("Không tải được quyền");
  useAuth.mockReturnValue({ user: null });
  rerender(show());
  expect(screen.getByTestId("permission").textContent).toBe("false");
  expect(layQuyenDoiNgu).toHaveBeenCalledTimes(1);
});
