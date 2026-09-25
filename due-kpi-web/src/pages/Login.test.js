import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Login from "./Login";
import { useAuth } from "../context/AuthContext";

const mockNavigate = jest.fn();

jest.mock("../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }));

beforeEach(() => {
  mockNavigate.mockClear();
  useAuth.mockReset();
});

test.each([
  ["  NV001  ", { MaNhanVien: "NV001", Password: "secret" }],
  ["  a@b.edu.vn  ", { Email: "a@b.edu.vn", Password: "secret" }],
])("đăng nhập với %s chỉ gửi một định danh", async (identifier, expected) => {
  const login = jest.fn().mockResolvedValue({ success: true });
  useAuth.mockReturnValue({ login });

  render(<Login />);
  fireEvent.change(screen.getByRole("textbox", { name: "Mã nhân viên hoặc email" }), {
    target: { value: identifier },
  });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), {
    target: { value: "secret" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

  await waitFor(() => expect(login).toHaveBeenCalledWith(expected));
  expect(Object.keys(login.mock.calls[0][0]).sort()).toEqual(
    Object.keys(expected).sort(),
  );
  expect(mockNavigate).toHaveBeenCalledWith("/");
});

test("không gửi định danh chỉ có khoảng trắng", () => {
  const login = jest.fn();
  useAuth.mockReturnValue({ login });

  render(<Login />);
  fireEvent.change(screen.getByRole("textbox", { name: "Mã nhân viên hoặc email" }), {
    target: { value: "   " },
  });
  fireEvent.change(screen.getByLabelText("Mật khẩu"), {
    target: { value: "secret" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));

  expect(login).not.toHaveBeenCalled();
  expect(screen.getByText("Vui lòng nhập mã nhân viên hoặc email.")).toBeTruthy();
});
