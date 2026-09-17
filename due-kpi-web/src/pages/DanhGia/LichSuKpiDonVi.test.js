import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChiTietPhieuDonVi from "./ChiTietPhieuDonVi";
import ChiTietPhieuPhong from "./ChiTietPhieuPhong";
import ChiTietLichSuKpiDonVi from "./ChiTietLichSuKpiDonVi";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("primereact/toast", () => ({ Toast: () => null }));

const phieu = (trangThai) => ({
  IdPhieuDv: 7, IdDonVi: 10, IdNam: 2026, TenDonVi: "Đơn vị A", TrangThai: trangThai,
  RowVersion: "AAAA", LanDanhGia: 1,
  ChiTiet: [
    { IdChiTietDv: 1, IdTieuChi: 1, LoaiNguonDiem: 2, TenTieuChi: "Điểm tự động", TenNhom: "Nhóm 1", LoaiNhom: 1, DiemToiDa: 10, DiemTongHop: 5, MinhChung: [] },
    { IdChiTietDv: 2, IdTieuChi: 2, LoaiNguonDiem: 1, TenTieuChi: "Điểm thủ công", TenNhom: "Nhóm 1", LoaiNhom: 1, DiemToiDa: 10, DiemNhap: 6, MinhChung: [] },
  ],
  PheDuyet: [{ IdPheDuyet: 1, CapDuyet: 1, LanDanhGia: 1, NhanXet: "Đã kiểm tra" }],
});
beforeEach(() => jest.clearAllMocks());

test.each([1, 2, 3, 4, 5])("lịch sử Khoa trạng thái %s chỉ GET, khóa nhập và minh chứng", async (tt) => {
  useAuth.mockReturnValue({ user: { IdDonVi: 10, MaChucVu: "TKK" } });
  apiFetch.mockImplementation(async (url) => ({ ok: true, json: async () => url === "phieu-don-vi/7" ? { Item: phieu(tt) } : { Item: {}, Items: [] } }));
  const { container } = render(<MemoryRouter><ChiTietLichSuKpiDonVi idPhieu={7} loai="khoa" /></MemoryRouter>);
  await screen.findByRole("heading", { name: "Kết quả chấm điểm - năm học 2026" });
  expect(screen.queryByText("Tổng hợp KPI")).toBeNull();
  expect(screen.queryByText("Trình Trưởng đơn vị")).toBeNull();
  // File inputs have no implicit ARIA role; also audit hidden upload controls.
  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
  expect(container.querySelector('input[type="file"]')).toBeNull();
  expect(["spinbutton", "textbox", "radio"].flatMap((role) => screen.queryAllByRole(role)).every((el) => el.disabled || el.readOnly)).toBe(true);
  expect(screen.queryByText("Chuyển sang trang đánh giá") !== null).toBe(tt === 1);
  await waitFor(() => expect(apiFetch.mock.calls.every(([, options]) => !options?.method || options.method === "GET")).toBe(true));
});

test.each([1, 2, 3, 4, 5])("lịch sử Phòng trạng thái %s không cho ghi/duyệt dù người dùng có quyền", async (tt) => {
  useAuth.mockReturnValue({ user: { DonVi: [{ IdDonVi: 10, MaChucVu: "TKP" }, { IdDonVi: 10, MaChucVu: "TP" }] } });
  apiFetch.mockImplementation(async (url) => ({ ok: true, json: async () => url === "phieu-don-vi/7" ? { Item: phieu(tt) } : { Item: {}, Items: [] } }));
  const { container } = render(<MemoryRouter><ChiTietLichSuKpiDonVi idPhieu={7} loai="phong" /></MemoryRouter>);
  await screen.findByRole("heading", { name: "Kết quả chấm điểm - năm học 2026" });
  expect(screen.queryByRole("button", { name: /Duyệt giữ nguyên|Chỉnh sửa điểm|Trình phiếu|Duyệt phiếu|Lưu thay đổi|Chốt phiếu|Mở lại phiếu/ })).toBeNull();
  // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access
  expect(container.querySelector('input[type="file"]')).toBeNull();
  expect(["spinbutton", "textbox", "radio"].flatMap((role) => screen.queryAllByRole(role)).every((el) => el.disabled || el.readOnly)).toBe(true);
  expect(screen.queryByText("Chuyển sang trang đánh giá") !== null).toBe(tt <= 2);
  expect(apiFetch.mock.calls.every(([, options]) => !options?.method || options.method === "GET")).toBe(true);
});

test("trang đánh giá Khoa vẫn tổng hợp tự động khi có quyền đúng đơn vị", async () => {
  useAuth.mockReturnValue({ user: { IdDonVi: 10, MaChucVu: "TKK" } });
  apiFetch.mockImplementation(async () => ({ ok: true, json: async () => ({ Item: phieu(1) }) }));
  render(<MemoryRouter><ChiTietPhieuDonVi idPhieu={7} /></MemoryRouter>);
  await waitFor(() => expect(apiFetch.mock.calls.some(([url, opts]) => url === "phieu-don-vi/7/tong-hop-kpi" && opts?.method === "POST")).toBe(true));
});

test.each(["khoa", "phong"])("biểu mẫu %s lưu tuần tự dùng RowVersion mới và giữ thao tác trình", async (loai) => {
  useAuth.mockReturnValue({ user: { IdDonVi: 10, MaChucVu: loai === "khoa" ? "TKK" : "TKP" } });
  const item = phieu(1);
  item.ChiTiet = item.ChiTiet.map((ct) => ({ ...ct, LoaiNguonDiem: 1, DiemNhap: 2 }));
  apiFetch.mockImplementation(async (url, options) => ({ ok: true, json: async () => {
    if (options?.method === "PUT") {
      const index = url.includes("/1/") ? 0 : 1;
      item.ChiTiet[index].DiemNhap = JSON.parse(options.body).Diem;
      return { NewRowVersion: index === 0 ? "BBBB" : "CCCC" };
    }
    return { Item: item };
  } }));
  const Detail = loai === "khoa" ? ChiTietPhieuDonVi : ChiTietPhieuPhong;
  render(<MemoryRouter><Detail idPhieu={7} /></MemoryRouter>);
  const inputs = await screen.findAllByRole("spinbutton");
  fireEvent.change(inputs[0], { target: { value: "4" } });
  fireEvent.change(inputs[1], { target: { value: "6" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi (2)" }));
  await waitFor(() => expect(apiFetch.mock.calls.filter(([, options]) => options?.method === "PUT")).toHaveLength(2));
  const writes = apiFetch.mock.calls.filter(([, options]) => options?.method === "PUT");
  expect(JSON.parse(writes[0][1].body).RowVersion).toBe("AAAA");
  expect(JSON.parse(writes[1][1].body).RowVersion).toBe("BBBB");
  await waitFor(() => expect(screen.getByRole("button", { name: "Lưu thay đổi" }).disabled).toBe(true));
  expect(screen.getAllByRole("button", { name: loai === "khoa" ? "Trình Trưởng đơn vị" : "Trình phiếu" }).every((button) => !button.disabled)).toBe(true);
});


