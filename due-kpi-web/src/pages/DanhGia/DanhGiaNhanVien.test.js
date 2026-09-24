import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DanhGiaNhanVien from "./DanhGiaNhanVien";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("./PhieuQuyCuaToi", () => () =>
  require("react").createElement("div", { "data-testid": "quarter-form" }),
);
jest.mock("./PhieuTuDanhGia", () => () =>
  require("react").createElement("div", { "data-testid": "annual-form" }),
);

const reply = (body) => ({ ok: true, json: async () => body });

test.each([
  [true, 2, "quarter-form"],
  [false, 2, "annual-form"],
  [true, 1, "annual-form"],
])("mục KPI nhân viên chọn đúng biểu mẫu khi ApDungPhieuQuy=%s và TrangThai=%s", async (flag, status, expectedForm) => {
  useAuth.mockReturnValue({ user: { DonVi: [{ LoaiDoiTuong: 2 }] } });
  apiFetch.mockImplementation(async (endpoint) =>
    endpoint === "namdanhgia"
      ? reply({ Items: [{ IdNam: 2026, ApDungPhieuQuy: flag, TrangThai: status }] })
      : reply({ Items: [{ IdNam: 2026, TrangThai: 1 }] }),
  );

  render(
    <MemoryRouter initialEntries={["/danh-gia-kpi-nhan-vien?year=2026"]}>
      <DanhGiaNhanVien />
    </MemoryRouter>,
  );

  expect(await screen.findByTestId(expectedForm)).toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledWith("namdanhgia");
  expect(apiFetch).toHaveBeenCalledWith("maudanhgia?loaiDoiTuong=2");
});
