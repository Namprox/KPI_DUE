import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";
import { apiFetch, setSessionExpiredHandler } from "../utils/api";

jest.mock("../utils/api", () => ({
  apiFetch: jest.fn(),
  setSessionExpiredHandler: jest.fn(),
}));

const UserStatus = () => {
  const { user, loading } = useAuth();
  if (loading) return <span>Đang tải</span>;
  return <span>{user?.MaChucDanh || "Không có chức danh"}</span>;
};

beforeEach(() => {
  apiFetch.mockReset();
  setSessionExpiredHandler.mockReset();
});

test.each([
  [{ MaNhanVien: "NV001", MaChucDanh: "GV" }, "GV"],
  [{ MaNhanVien: "NV002" }, "Không có chức danh"],
])("giữ dữ liệu chức danh tùy chọn từ auth/me", async (user, expected) => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ Success: true, User: user }),
  });

  render(
    <AuthProvider>
      <UserStatus />
    </AuthProvider>,
  );

  await waitFor(() => expect(screen.getByText(expected)).toBeTruthy());
  expect(apiFetch).toHaveBeenCalledWith("auth/me", { cache: "no-store" });
});

const KpiStatus = () => {
  const { user, loading, login } = useAuth();
  const [result, setResult] = React.useState(null);
  return <>
    <span>{loading ? "Đang tải" : `Loại ${user?.DonVi?.[0]?.LoaiDoiTuong ?? "chưa có"}`}</span>
    <button onClick={async () => setResult(await login({ Identifier: "NV001", Password: "test" }))}>Đăng nhập</button>
    {result && <span>{result.success ? "Thành công" : result.message}</span>}
  </>;
};

const me = (LoaiDoiTuong) => ({ ok: true, json: async () => ({ User: { IdNhanVien: 7, DonVi: [{ LoaiDoiTuong }] } }) });

test("tải lại provider nạp phân loại 0 mới, không giữ store loại 1 cũ", async () => {
  apiFetch.mockResolvedValueOnce(me(1)).mockResolvedValueOnce(me(0));
  const view = render(<AuthProvider><KpiStatus /></AuthProvider>);
  await screen.findByText("Loại 1");
  view.unmount();
  render(<AuthProvider><KpiStatus /></AuthProvider>);
  await screen.findByText("Loại 0");
  expect(apiFetch.mock.calls).toEqual([
    ["auth/me", { cache: "no-store" }], ["auth/me", { cache: "no-store" }],
  ]);
});

test.each([true, false])("đăng nhập dùng auth/me mới, thành công khi tải hồ sơ = %s", async (success) => {
  apiFetch.mockResolvedValueOnce(me(1))
    .mockResolvedValueOnce({ ok: true, json: async () => ({ Success: true, User: { DonVi: [{ LoaiDoiTuong: 1 }] } }) })
    .mockResolvedValueOnce(success ? me(0) : { ok: false, status: 500 });
  render(<AuthProvider><KpiStatus /></AuthProvider>);
  await screen.findByText("Loại 1");
  fireEvent.click(screen.getByText("Đăng nhập"));
  await screen.findByText(success ? "Thành công" : "Không tải được thông tin tài khoản. Vui lòng đăng nhập lại.");
  expect(screen.getByText(success ? "Loại 0" : "Loại chưa có")).toBeTruthy();
});
