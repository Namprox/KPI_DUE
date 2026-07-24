import React from "react";
import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import ThongTinCaNhan from "./ThongTinCaNhan";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";

// Mock dependencies
jest.mock("../context/AuthContext");
jest.mock("../utils/api");

describe("ThongTinCaNhan Component", () => {
  const mockUser = {
    IdNhanVien: 12,
    MaNhanVien: "GV123",
    HoTen: "Nguyen Van A",
    Email: "nva@due.edu.vn",
    MaChucVu: "GV",
    RoleName: "Giảng viên",
  };

  const mockProfileResponse = {
    Items: [
      {
        IdNhanVien: 12,
        MaNhanVien: "GV123",
        HoTen: "Nguyen Van A",
        Email: "nva@due.edu.vn",
        TenDonVi: "Khoa CNTT",
        TenChucVu: "Giảng viên",
        TenChucDanh: "Giảng viên chính",
        GioiTinh: 1,
        NgaySinh: "1990-01-01T00:00:00",
        HeSoPhuCap: 0.25,
      },
    ],
  };

  beforeEach(() => {
    useAuth.mockReturnValue({
      user: mockUser,
      refreshUser: jest.fn().mockResolvedValue(true),
    });
    apiFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockProfileResponse),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renders loading spinner initially", async () => {
    let resolvePromise;
    const fetchPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    apiFetch.mockReturnValue(fetchPromise);

    const { container } = render(<ThongTinCaNhan setIsPassModalOpen={jest.fn()} />);
    
    // Spinner should be visible
    const spinner = container.querySelector(".fa-spinner");
    expect(spinner).toBeInTheDocument();

    // Clean up
    await act(async () => {
      resolvePromise({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProfileResponse),
      });
    });
  });

  test("renders profile details and locks editing of read-only fields", async () => {
    await act(async () => {
      render(<ThongTinCaNhan setIsPassModalOpen={jest.fn()} />);
    });

    // Check header text
    expect(screen.getByText("Hồ sơ của tôi")).toBeInTheDocument();
    
    // Check personal info fields
    expect(screen.getByDisplayValue("Nguyen Van A")).toBeInTheDocument();
    expect(screen.getByDisplayValue("GV123")).toBeInTheDocument();
    expect(screen.getByDisplayValue("nva@due.edu.vn")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Khoa CNTT")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Giảng viên chính")).toBeInTheDocument();

    // Check gender (1 -> Nam)
    const genderSelect = screen.getByRole("combobox");
    expect(genderSelect.value).toBe("1");

    // Check dob (1990-01-01)
    const dobInput = screen.getByLabelText(/Ngày sinh/i);
    expect(dobInput.value).toBe("1990-01-01");
  });
});
