import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { NhiemVuPhucVuProvider, useQuyenNhiemVuPhucVu } from "./NhiemVuPhucVuContext";
import { useAuth } from "./AuthContext";
import { layCauHinh } from "../utils/nhiemVuPhucVuApi";
jest.mock("./AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../utils/nhiemVuPhucVuApi", () => ({ ...jest.requireActual("../utils/nhiemVuPhucVuApi"), layCauHinh: jest.fn() }));
function View() {
  const { quyen, loading, error } = useQuyenNhiemVuPhucVu();
  const navigate = useNavigate();
  return <><span data-testid="permission">{loading ? "loading" : error || String(quyen?.QuanLy === true)}</span><button onClick={() => navigate("/nhiem-vu-phuc-vu")}>Vào module</button></>;
}
const show = () => <MemoryRouter><NhiemVuPhucVuProvider><View /></NhiemVuPhucVuProvider></MemoryRouter>;
beforeEach(() => jest.clearAllMocks());
test("tải lại quyền đang hiệu lực khi vào module", async () => {
  useAuth.mockReturnValue({ user: { IdNhanVien: 1, MaChucVu: "TK" } });
  layCauHinh.mockResolvedValueOnce({ Khoa: [{ LaTruongKhoa: true }] }).mockResolvedValueOnce({ Khoa: [] });
  render(show());
  await waitFor(() => expect(screen.getByTestId("permission").textContent).toBe("true"));
  fireEvent.click(screen.getByText("Vào module"));
  await waitFor(() => expect(screen.getByTestId("permission").textContent).toBe("false"));
});
test("đổi tài khoản không dùng quyền cũ hoặc response đến muộn", async () => {
  let resolveOld;
  const old = new Promise((resolve) => { resolveOld = resolve; });
  layCauHinh.mockReturnValueOnce(old).mockResolvedValueOnce({ Khoa: [] });
  useAuth.mockReturnValue({ user: { IdNhanVien: 1 } });
  const view = render(show());
  useAuth.mockReturnValue({ user: { IdNhanVien: 2 } }); view.rerender(show());
  await waitFor(() => expect(screen.getByTestId("permission").textContent).toBe("false"));
  await act(async () => { resolveOld({ LaBanGiamHieu: true }); await old; });
  expect(screen.getByTestId("permission").textContent).toBe("false");
});
