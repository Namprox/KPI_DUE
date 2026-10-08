import React from "react";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PhieuTuDanhGia from "./PhieuTuDanhGia";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("primereact/toast", () => ({ Toast: () => null }));
jest.mock("../../hooks/useMinhChungPhieuPreview", () => ({ useMinhChungPhieuPreview: () => ({ preview: { isOpen: false } }) }));

const criterion = { IdTieuChi: 77, TenTieuChi: "Đổi mới giảng dạy", LoaiNguonDiem: 2, DiemToiDa: 5, CongThucTongHop: "SK_DOI_MOI_GIANG_DAY" };
// DTO chi tiết mẫu thực tế không trả LoaiNguonDiem / CongThucTongHop.
const templateCriterion = { IdTieuChi: 77, TenTieuChi: criterion.TenTieuChi, DiemToiDa: 5, LoaiThangDiem: 2 };
const manualCriterion = { IdTieuChi: 78, TenTieuChi: "Tiêu chí nhập tay", DiemToiDa: 10, LoaiThangDiem: 2 };
let previewStatus;
beforeEach(() => jest.clearAllMocks());
const setup = (existing, score = 5, status = 200) => {
  previewStatus = status;
  useAuth.mockReturnValue({ user: { IdNhanVien: 155, MaChucVu: "GV", DonVi: [{ IdDonVi: 7, LoaiDoiTuong: 1, LaChinh: true }] } });
  apiFetch.mockImplementation(async (endpoint) => {
    let body = { Item: {}, Items: [] };
    if (endpoint === "namdanhgia") body = { Items: [{ IdNam: 2026 }] };
    else if (endpoint.startsWith("phieu/me/2026")) body = existing ? { Success: true, Item: { IdPhieu: 812, IdMau: 2, TrangThai: 2, ChiTiet: [{ ...criterion, IdChiTiet: 9931, CongThucSnapshot: "SK_DOI_MOI_GIANG_DAY", DiemChinhThuc: 0 }] } } : {};
    else if (endpoint.startsWith("maudanhgia?")) body = { Items: [{ IdMau: 2, IdNam: 2026, TrangThai: true }] };
    else if (endpoint === "maudanhgia/2/chi-tiet") body = { Item: { Nhom: [{ IdNhom: 1, TenNhom: "Giảng dạy", TieuChi: [templateCriterion, manualCriterion] }] } };
    else if (endpoint === "maudanhgia/2/diem-tu-dong?idNhanVien=155&quy=0") return {
      ok: previewStatus === 200, status: previewStatus,
      json: async () => previewStatus === 200 ? { Items: [{ IdTieuChi: 77, CongThucTongHop: "SK_DOI_MOI_GIANG_DAY", DiemTuDong: score }] } : { Message: "Lỗi tải điểm" },
    };
    else if (endpoint === "phieu/812/tu-dong") body = { Success: true, Items: [{ IdChiTiet: 9931, IdTieuChi: 77, DiemDaGhi: 0, DiemTuDong: 5, MinhChung: [{ LoaiNguon: 12, MaNguon: 12, TieuDe: "Sáng kiến từ NCKH", MoTa: "Quyết định công nhận" }] }] };
    return { ok: true, status: 200, json: async () => body };
  });
  render(<MemoryRouter initialEntries={["/danh-gia-phu-luc-2?year=2026"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <PhieuTuDanhGia loaiDoiTuong={1} duongDan="/danh-gia-phu-luc-2" tieuDe="Phiếu của tôi" />
  </MemoryRouter>);
};
test("phiếu năm lấy minh chứng nguồn 12 qua phiếu và giữ điểm chính thức", async () => {
  setup(true);
  expect(await screen.findByRole("link", { name: "Sáng kiến từ NCKH" })).toHaveAttribute("href", "/sang-kien/12");
  expect(screen.getByText("0.00")).toBeInTheDocument();
  expect(apiFetch.mock.calls.map(([endpoint]) => endpoint)).toContain("phieu/812/tu-dong");
  expect(apiFetch.mock.calls.some(([endpoint]) => endpoint.includes("diem-tu-dong"))).toBe(false);
});
test.each([5, 0, null])("chưa có phiếu: preview %s nhận diện nguồn tự động dù DTO mẫu thiếu LoaiNguonDiem", async (score) => {
  setup(false, score);
  await screen.findByText(score == null ? "Chưa tính" : `${score}.00`);
  const autoCard = screen.getByText(criterion.TenTieuChi).closest(".pl2-criteria");
  expect(autoCard).not.toBeNull();
  expect(within(autoCard).queryByRole("spinbutton")).not.toBeInTheDocument();
  expect(screen.getAllByRole("spinbutton")).toHaveLength(1);
  expect(apiFetch.mock.calls.map(([endpoint]) => endpoint)).toContain("maudanhgia/2/diem-tu-dong?idNhanVien=155&quy=0");
  expect(apiFetch.mock.calls.some(([endpoint]) => endpoint.includes("/tu-dong"))).toBe(false);
});

test("preview lỗi không mở ô nhập nhầm; thử lại tải được điểm", async () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    setup(false, 5, 500);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không tải được điểm tự động");
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Lưu nháp/ })).not.toBeInTheDocument();
    previewStatus = 200;
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await screen.findByText("5.00");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  } finally {
    log.mockRestore();
  }
});
