import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
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
  expect(apiFetch).toHaveBeenCalledWith("auth/me");
});
