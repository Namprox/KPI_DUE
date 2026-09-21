import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChiTietPhieuDonVi from "./ChiTietPhieuDonVi";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("primereact/toast", () => ({ Toast: () => null }));

/** Phiếu Khoa: một dòng hệ thống tự tổng hợp, một dòng thư ký gõ tay. */
const phieu = (trangThai) => ({
  IdPhieuDv: 7,
  IdDonVi: 10,
  IdNam: 2026,
  IdMau: 99,
  TenDonVi: "Khoa A",
  TrangThai: trangThai,
  RowVersion: "AAAA",
  LanDanhGia: 1,
  ChiTiet: [
    {
      IdChiTietDv: 1,
      IdTieuChi: 1,
      LoaiNguonDiem: 2,
      TenTieuChi: "Điểm tự động",
      TenNhom: "Nhóm 1",
      LoaiNhom: 1,
      DiemToiDa: 10,
      DiemTongHop: 5,
      MinhChung: [],
    },
    {
      IdChiTietDv: 2,
      IdTieuChi: 2,
      LoaiNguonDiem: 1,
      TenTieuChi: "Điểm thủ công",
      TenNhom: "Nhóm 1",
      LoaiNhom: 1,
      DiemToiDa: 10,
      DiemNhap: 6,
      MinhChung: [],
    },
  ],
});

const truongKhoa = { DonVi: [{ IdDonVi: 10, MaChucVu: "TK" }] };
const thuKyKhoa = { DonVi: [{ IdDonVi: 10, MaChucVu: "TKK" }] };

const chiTietMau = {
  Nhom: [
    {
      TenNhom: "Nhóm 1",
      LoaiNhom: 1,
      TieuChi: [
        {
          IdTieuChi: 1,
          MoTa: "Mô tả tiêu chí tự động",
          LoaiThangDiem: 2,
          ThangDiem: [],
        },
        {
          IdTieuChi: 2,
          MoTa: "Mô tả tiêu chí thủ công",
          LoaiThangDiem: 2,
          ThangDiem: [],
        },
      ],
    },
  ],
};

/** Mọi GET trả về `item`; các lệnh ghi trả rỗng để trang tự đọc lại phiếu. */
const mockApi = (item) =>
  apiFetch.mockImplementation(async (url, options) => ({
    ok: true,
    json: async () =>
      !options?.method || options.method === "GET"
        ? {
            Item:
              url === "phieu-don-vi/7"
                ? item
                : url === "maudanhgia/99/chi-tiet"
                  ? chiTietMau
                  : {},
            Items: [],
          }
        : {},
  }));

const ghiVao = (url) =>
  apiFetch.mock.calls.find(
    ([duongDan, options]) => duongDan === url && options?.method,
  );

const mount = () =>
  render(
    <MemoryRouter>
      <ChiTietPhieuDonVi idPhieu={7} />
    </MemoryRouter>,
  );

beforeEach(() => jest.clearAllMocks());

test("Trưởng Khoa duyệt từng tiêu chí ở trạng thái 2, dòng tự động không nằm trong hàng đợi", async () => {
  useAuth.mockReturnValue({ user: truongKhoa });
  mockApi(phieu(2));
  mount();

  const nutDuyet = await screen.findByRole("button", {
    name: /Duyệt giữ nguyên/,
  });
  // Chỉ dòng chấm tay mới có nút duyệt; dòng tự động không đề xuất gì để duyệt.
  expect(screen.getAllByRole("button", { name: /Duyệt giữ nguyên/ })).toHaveLength(1);
  expect(screen.getByText("Điểm thủ công", { exact: false })).toBeTruthy();
  expect(screen.getByText("Mô tả tiêu chí thủ công")).toBeTruthy();

  fireEvent.click(nutDuyet);
  await waitFor(() => expect(ghiVao("chi-tiet-don-vi/2/diem-duyet-dv")).toBeTruthy());
  const [, options] = ghiVao("chi-tiet-don-vi/2/diem-duyet-dv");
  expect(options.method).toBe("PUT");
  expect(JSON.parse(options.body)).toMatchObject({ Diem: 6, RowVersion: "AAAA" });

  // Không có endpoint trả phiếu về cho thư ký - màn hình cũng không được bày nút đó.
  expect(screen.queryByRole("button", { name: /Trả lại|Trả về/ })).toBeNull();
});

test("Trưởng Khoa duyệt cả phiếu qua hộp thoại xác nhận", async () => {
  useAuth.mockReturnValue({ user: truongKhoa });
  mockApi(phieu(2));
  mount();

  fireEvent.click(await screen.findByRole("button", { name: "Duyệt phiếu" }));
  const nutXacNhan = screen
    .getAllByRole("button", { name: "Duyệt phiếu" })
    .pop();
  fireEvent.click(nutXacNhan);

  await waitFor(() => expect(ghiVao("phieu-don-vi/7/duyet-dv")).toBeTruthy());
  const [, options] = ghiVao("phieu-don-vi/7/duyet-dv");
  expect(options.method).toBe("POST");
  expect(JSON.parse(options.body).RowVersion).toBe("AAAA");
});

test("thư ký Khoa xem bước duyệt ở chế độ chỉ đọc, không tự tổng hợp lại", async () => {
  useAuth.mockReturnValue({ user: thuKyKhoa });
  mockApi(phieu(2));
  mount();

  await screen.findByText(/Bạn không phải Trưởng đơn vị/);
  expect(screen.queryByRole("button", { name: /Duyệt giữ nguyên|Duyệt phiếu/ })).toBeNull();
  await waitFor(() => expect(apiFetch).toHaveBeenCalled());
  expect(
    apiFetch.mock.calls.every(([, options]) => !options?.method || options.method === "GET"),
  ).toBe(true);
});

test("Trưởng Khoa ở trạng thái 1 chỉ xem, phần việc nhập vẫn là của thư ký", async () => {
  useAuth.mockReturnValue({ user: truongKhoa });
  mockApi(phieu(1));
  mount();

  await screen.findAllByText("Thư ký đang nhập", { exact: false });
  expect(screen.queryByRole("button", { name: /Lưu thay đổi|Trình Trưởng đơn vị|Tổng hợp KPI/ })).toBeNull();
  expect(
    apiFetch.mock.calls.every(([, options]) => !options?.method || options.method === "GET"),
  ).toBe(true);
});
