import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import ChotHoSoKhoa from "./ChotHoSoKhoa";
import ChotHoSoPhong from "./ChotHoSoPhong";
import { useAuth } from "../../context/AuthContext";
import { fetchPhieuDetail, fetchXemTruocChot } from "../../utils/phieuApi";

jest.mock("react-router-dom", () => ({ useParams: () => ({ id: "1" }), useNavigate: () => jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("primereact/toast", () => {
  const React = require("react");
  return { Toast: React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ show: jest.fn() }));
    return null;
  }) };
});
jest.mock("../../utils/api", () => ({ apiFetch: async () => ({ ok: true, json: async () => [] }) }));
jest.mock("../../hooks/useNhanVienIndex", () => ({ useNhanVienIndex: () => ({ nhanVienIndex: new Map() }), thongTinNhanVien: () => ({ hoTen: "Nhân viên A" }) }));
jest.mock("../../hooks/useMinhChungPhieuPreview", () => ({ useMinhChungPhieuPreview: () => ({ preview: { isOpen: false } }) }));
jest.mock("../../utils/phieuApi", () => ({
  ...jest.requireActual("../../utils/phieuApi"),
  fetchPhieuDetail: jest.fn(), fetchXemTruocChot: jest.fn(),
  fetchLichSuChamDiemPhieu: async () => [],
}));

test.each([["TP", ChotHoSoPhong], ["TK", ChotHoSoKhoa]])("màn chốt %s dựng mức 3 từ preview dù phiếu không có LoaiDoiTuong", async (role, Page) => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { MaChucVu: role, DonVi: [{ IdDonVi: 7, MaChucVu: role }] } });
  fetchPhieuDetail.mockResolvedValue({ IdPhieu: 1, IdDonVi: 7, IdNam: 2026, TrangThai: 3, ChiTiet: [], RowVersion: "v1" });
  fetchXemTruocChot.mockResolvedValue({ LoaiDoiTuong: 2, XepLoaiDeXuat: 3, CacMucChonDuoc: [1, 2, 3], TongDiemTichLuy: 101, SanSangChot: true, GiaiThichMucDeXuat: "Viên chức đủ 101 điểm" });
  render(<Page />);
  const muc3 = await screen.findByRole("button", { name: /Mức 3/ });
  await waitFor(() => expect(muc3.disabled).toBe(false));
  expect(screen.queryByRole("button", { name: /Mức 4/ })).toBeNull();
  await waitFor(() => expect(fetchXemTruocChot).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByText(/Từ năm học 2025-2026, hồ sơ giảng viên bắt buộc/)).toBeNull());
});
