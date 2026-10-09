import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DanhGiaPhuLuc2 from "./DanhGiaPhuLuc2";
import ViTriPhieuTrongKhoa from "../../components/DanhGia/DanhGiaPhuLuc2/ViTriPhieuTrongKhoa";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("primereact/toast", () => ({ Toast: () => null }));
jest.mock("../../hooks/useMinhChungPhieuPreview", () => ({ useMinhChungPhieuPreview: () => ({ preview: { isOpen: false } }) }));

const ranking = {
  Success: true, IdPhieu: 812, Hang: 12, TongSo: 60, NhomXepHangText: "Giảng viên",
  SoNguoiDongHang: 2, SoPhieuChuaNop: 7, LaTamTinh: true,
};
const response = (data, status = 200) => ({ ok: status === 200, status, json: async () => data });
const criterion = { IdTieuChi: 77, TenTieuChi: "Tiêu chí chấm tay", LoaiNguonDiem: 1, LoaiThangDiem: 2, DiemToiDa: 10 };
const saved = { IdChiTiet: 9931, ...criterion, DiemTuDanhGia: 5, TrangThaiDong: 1 };
const rankingCalls = () => apiFetch.mock.calls.filter(([endpoint]) => endpoint.endsWith("/xep-hang-tam-tinh"));
const widget = () => screen.getByLabelText("Vị trí của phiếu trong khoa");

beforeEach(() => jest.resetAllMocks());

test("mở Phụ lục 2 lấy hạng đúng phiếu, chỉ cập nhật sau khi lưu điểm thành công", async () => {
  let savedScore = false;
  useAuth.mockReturnValue({ user: { IdNhanVien: 155, DonVi: [{ IdDonVi: 7, TenDonVi: "Khoa Kế toán", LoaiDoiTuong: 1, LaChinh: true }] } });
  apiFetch.mockImplementation(async (endpoint, options) => {
    if (endpoint === "namdanhgia") return response({ Items: [{ IdNam: 2026 }] });
    if (endpoint.startsWith("phieu/me/2026")) return response({ Success: true, Item: { IdPhieu: 812, IdMau: 2, TrangThai: 1, ChiTiet: [saved] } });
    if (endpoint === "maudanhgia/2/chi-tiet") return response({ Item: { Nhom: [{ IdNhom: 1, TenNhom: "Đào tạo", TieuChi: [criterion] }] } });
    if (endpoint === "phieu/812/kiem-tra-hop-le") return response({ Item: { LaChuPhieu: true, QuaHan: false } });
    if (endpoint === "phieu/812/xep-hang-tam-tinh") return response({ ...ranking, Hang: savedScore ? 10 : 12 });
    if (endpoint === "chitiet/9931/tu-danh-gia" && options.method === "PUT") {
      savedScore = true;
      return response({ Success: true });
    }
    return response({ Items: [] });
  });
  render(<MemoryRouter initialEntries={["/danh-gia-phu-luc-2?year=2026"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <DanhGiaPhuLuc2 />
  </MemoryRouter>);
  await screen.findByText("Vị trí tạm tính");
  expect(widget()).toHaveTextContent("12/60");
  expect(widget()).toHaveTextContent("Vị trí 12 trên 60 phiếu trong nhóm");
  expect(widget()).toHaveTextContent("Nhóm: Giảng viên · Khoa Kế toán");
  expect(widget()).toHaveTextContent("Đồng hạng với 1 người");
  expect(screen.getByText("Vị trí tạm tính")).toHaveAttribute("title", "Thứ hạng thay đổi khi bạn hoặc đồng nghiệp cập nhật điểm.");
  expect(screen.queryByText("Tạm tính")).not.toBeInTheDocument();
  expect(widget()).not.toHaveTextContent("điền nháp");
  expect(rankingCalls()).toHaveLength(1);
  expect(screen.getByText("TỔNG ĐIỂM TÍCH LŨY")).toBeInTheDocument();

  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "8" } });
  expect(rankingCalls()).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
  await waitFor(() => expect(widget()).toHaveTextContent("10/60"));
  expect(rankingCalls()).toHaveLength(2);
});

test("ưu tiên hạng chính thức dù hạng sống khác, không gắn đồng hạng tạm tính vào hạng chính thức", async () => {
  apiFetch.mockResolvedValue(response({ ...ranking, HangChinhThuc: 11 }));
  render(<ViTriPhieuTrongKhoa idPhieu={812} tenDonVi="Khoa Kế toán" />);
  await screen.findByText("Hạng chính thức");
  expect(widget()).toHaveTextContent("11/60");
  expect(screen.queryByText("Tạm tính")).not.toBeInTheDocument();
  expect(screen.queryByText(/Đồng hạng/)).not.toBeInTheDocument();
});

test("chưa có phiếu vẫn hiện mục vị trí, Lưu nháp tạo phiếu dù chưa sửa điểm chấm tay", async () => {
  const autoCriterion = { ...criterion, LoaiNguonDiem: 2, CongThucTongHop: "GIO_GIANG" };
  const created = { IdPhieu: 812, IdMau: 2, IdNam: 2026, IdDonVi: 7, TrangThai: 1, ChiTiet: [] };
  useAuth.mockReturnValue({ user: { IdNhanVien: 155, DonVi: [{ IdDonVi: 7, TenDonVi: "Khoa Luật", LoaiDoiTuong: 1, LaChinh: true }] } });
  apiFetch.mockImplementation(async (endpoint, options) => {
    if (endpoint === "namdanhgia") return response({ Items: [{ IdNam: 2026, NgayMoTuDanhGia: "2020-01-01", NgayDongTuDanhGia: "2099-12-31" }] });
    if (endpoint.startsWith("phieu/me/2026")) return response({ Success: false }, 404);
    if (endpoint === "maudanhgia?loaiDoiTuong=1") return response({ Items: [{ IdMau: 2, IdNam: 2026, TrangThai: true }] });
    if (endpoint === "maudanhgia/2/chi-tiet") return response({ Item: { Nhom: [{ IdNhom: 1, TenNhom: "Đào tạo", TieuChi: [autoCriterion] }] } });
    if (endpoint.startsWith("maudanhgia/2/diem-tu-dong")) return response({ Items: [{ ...autoCriterion, DiemTuDong: 10 }] });
    if (endpoint === "phieu" && options?.method === "POST") return response({ Success: true, Item: created });
    if (endpoint === "phieu/812/kiem-tra-hop-le") return response({ Item: { LaChuPhieu: true, QuaHan: false } });
    if (endpoint === "phieu/812/xep-hang-tam-tinh") return response(ranking);
    return response({ Items: [] });
  });
  render(<MemoryRouter initialEntries={["/danh-gia-phu-luc-2?year=2026"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <DanhGiaPhuLuc2 />
  </MemoryRouter>);
  await screen.findByText("Lưu nháp phiếu để xem vị trí trong khoa.");
  expect(rankingCalls()).toHaveLength(0);
  expect(apiFetch.mock.calls.some(([endpoint]) => endpoint === "phieu")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
  await waitFor(() => expect(widget()).toHaveTextContent("12/60"));
  expect(apiFetch.mock.calls.filter(([endpoint]) => endpoint === "phieu")).toHaveLength(1);
  expect(apiFetch.mock.calls.find(([endpoint]) => endpoint === "phieu")[1]).toMatchObject({
    method: "POST", body: JSON.stringify({ IdNam: 2026, IdNhanVien: 155, IdMau: 2, IdDonVi: 7 }),
  });
  expect(rankingCalls()).toHaveLength(1);
  expect(apiFetch.mock.calls.some(([endpoint]) => endpoint.startsWith("chitiet/"))).toBe(false);
});

test("không hiện badge hay thông tin phiếu nháp; chỉ giải thích khả năng đổi hạng khi nhóm chưa chốt", async () => {
  apiFetch.mockResolvedValueOnce(response({ ...ranking, SoPhieuChuaNop: 0 }));
  const view = render(<ViTriPhieuTrongKhoa idPhieu={812} />);
  await screen.findByText("Vị trí tạm tính");
  expect(screen.getByText("Vị trí tạm tính").title).not.toMatch(/nháp/);
  expect(screen.queryByText("Tạm tính")).not.toBeInTheDocument();
  apiFetch.mockResolvedValueOnce(response({ ...ranking, LaTamTinh: false, SoNguoiDongHang: 1, SoPhieuChuaNop: 0 }));
  view.rerender(<ViTriPhieuTrongKhoa idPhieu={812} lanLamMoi={1} />);
  await screen.findByText("Vị trí tạm tính");
  expect(screen.getByText("Vị trí tạm tính")).not.toHaveAttribute("title");
  expect(screen.queryByText("Tạm tính")).not.toBeInTheDocument();
  expect(within(widget()).queryByText(/nháp|Đồng hạng/)).not.toBeInTheDocument();
});

test("404 ẩn hạng cũ và không retry; chưa có phiếu không gọi API", async () => {
  const view = render(<ViTriPhieuTrongKhoa idPhieu={null} />);
  expect(apiFetch).not.toHaveBeenCalled();
  expect(widget()).toHaveTextContent("Lưu nháp phiếu để xem vị trí trong khoa.");
  apiFetch.mockResolvedValueOnce(response(ranking));
  view.rerender(<ViTriPhieuTrongKhoa idPhieu={812} />);
  await screen.findByText("Vị trí tạm tính");
  apiFetch.mockResolvedValueOnce(response({ Success: false, ErrorCode: "NOT_FOUND" }, 404));
  view.rerender(<ViTriPhieuTrongKhoa idPhieu={812} lanLamMoi={1} />);
  await waitFor(() => expect(rankingCalls()).toHaveLength(2));
  expect(screen.queryByLabelText("Vị trí của phiếu trong khoa")).not.toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("đổi phiếu bỏ response cũ đến muộn, không hiện vị trí của đơn vị trước", async () => {
  let resolveOld;
  apiFetch.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }));
  const view = render(<ViTriPhieuTrongKhoa idPhieu={812} tenDonVi="Khoa cũ" />);
  apiFetch.mockResolvedValueOnce(response({ ...ranking, IdPhieu: 813, Hang: 2, TongSo: 20 }));
  view.rerender(<ViTriPhieuTrongKhoa idPhieu={813} tenDonVi="Khoa mới" />);
  await screen.findByText("Nhóm: Giảng viên · Khoa mới");
  await act(async () => resolveOld(response(ranking)));
  expect(widget()).toHaveTextContent("2/20");
  expect(widget()).not.toHaveTextContent("Khoa cũ");
});
