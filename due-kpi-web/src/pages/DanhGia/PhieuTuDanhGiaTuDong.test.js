import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PhieuTuDanhGia from "./PhieuTuDanhGia";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("primereact/toast", () => ({ Toast: () => null }));
jest.mock("../../hooks/useMinhChungPhieuPreview", () => ({ useMinhChungPhieuPreview: () => ({ preview: { isOpen: false } }) }));

const criterion = { IdTieuChi: 77, TenTieuChi: "Hội đồng xây dựng CTĐT", LoaiNguonDiem: 2, DiemToiDa: 5, CongThucTongHop: "CTDT_HOI_DONG" };
const saved = { IdChiTiet: 9931, ...criterion, DiemChinhThuc: 0, TrangThaiDong: 3 };
const response = { IdPhieu: 812, Quy: 0, LaPhieuNhanTuDong: true, Items: [{ ...saved, DiemDaGhi: 0, DiemTuDong: 5, CanChamLai: true, MinhChung: [{ LoaiNguon: 9, MaNguon: 15, TieuDe: "CTĐT Kế toán" }] }] };
const setup = (autoResponse = response, status = 200) => {
  useAuth.mockReturnValue({ user: { IdNhanVien: 155, MaChucVu: "GV", DonVi: [{ IdDonVi: 7, LoaiDoiTuong: 1, LaChinh: true }] } });
  apiFetch.mockImplementation(async (endpoint) => {
    let body;
    if (endpoint === "namdanhgia") body = { Items: [{ IdNam: 2026 }] };
    else if (endpoint.startsWith("phieu/me/2026")) body = { Success: true, Item: { IdPhieu: 812, IdMau: 2, IdNam: 2026, TrangThai: 2, ChiTiet: [saved] } };
    else if (endpoint === "maudanhgia/2/chi-tiet") body = { Item: { Nhom: [{ IdNhom: 1, TenNhom: "Đào tạo", TieuChi: [criterion] }] } };
    else if (endpoint === "phieu/812/tu-dong") return { ok: status === 200, status, json: async () => autoResponse };
    else body = { Item: {}, Items: [] };
    return { ok: true, status: 200, json: async () => body };
  });
  render(<MemoryRouter initialEntries={["/danh-gia-kpi-giang-vien?year=2026"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <PhieuTuDanhGia loaiDoiTuong={1} duongDan="/danh-gia-kpi-giang-vien" tieuDe="Phiếu của tôi" />
  </MemoryRouter>);
};
beforeEach(() => jest.clearAllMocks());

test("phiếu của tôi gọi API theo phiếu sau me, giữ tổng điểm chính thức", async () => {
  setup();
  await screen.findByText(/điểm mới sẽ là 5/);
  expect(screen.getByRole("link", { name: "CTĐT Kế toán" })).toBeInTheDocument();
  expect(screen.getByText("0.00")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Tổng hợp tự động" })).not.toBeInTheDocument();
  const endpoints = apiFetch.mock.calls.map(([endpoint]) => endpoint);
  expect(endpoints.indexOf("phieu/812/tu-dong")).toBeGreaterThan(endpoints.findIndex((endpoint) => endpoint.startsWith("phieu/me/")));
  expect(endpoints.some((endpoint) => endpoint.includes("diem-tu-dong"))).toBe(false);
});
test("404 API tự động hiển thị đúng thông báo, không retry", async () => {
  setup({ Message: "Phiếu nằm ngoài phạm vi" }, 404);
  await screen.findByText("Không tìm thấy phiếu");
  await waitFor(() => expect(apiFetch.mock.calls.filter(([endpoint]) => endpoint === "phieu/812/tu-dong")).toHaveLength(1));
});
