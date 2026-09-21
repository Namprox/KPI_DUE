import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DuyetKeKhaiThanhTich from "./DuyetKeKhaiThanhTich";
import { apiFetch } from "../../utils/api";

jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("primereact/toast", () => ({ Toast: () => null }));

const NAM = 2026;

const hangDoi = [
  {
    IdKeKhai: 12,
    IdNhanVien: 5,
    MaNhanVien: "CB01",
    HoTen: "Nguyễn Văn A",
    TenDonVi: "Khoa CNTT",
    IdNam: NAM,
    TrangThai: 2,
    TongDiemKeKhai: 15,
    TongDiemDuyet: 5,
    // Dữ liệu CŨ còn NgayNop, nhưng màn hình không được hiện nó nữa.
    NgayNop: "2026-03-01T08:00:00",
    SoDong: 3,
    SoDongChoDuyet: 2,
    SoDongChoDuyetCuaToi: 1,
  },
];

const mockApi = () =>
  apiFetch.mockImplementation(async (url) => {
    if (url === "namdanhgia") {
      return { ok: true, json: async () => ({ Items: [{ IdNam: NAM }] }) };
    }
    if (String(url).startsWith("donvi")) {
      return { ok: true, json: async () => ({ Items: [] }) };
    }
    return {
      ok: true,
      json: async () => ({
        Success: true,
        Items: hangDoi,
        PhanTrang: { TongSo: 1, Trang: 1, SoDongMoiTrang: 20, TongSoTrang: 1 },
      }),
    };
  });

const goiChoDuyet = () =>
  apiFetch.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.startsWith("ke-khai-thanh-tich/cho-duyet"));

const mount = () =>
  render(
    <MemoryRouter>
      <DuyetKeKhaiThanhTich />
    </MemoryRouter>,
  );

// jsdom không có scrollIntoView, mà SearchSelect gọi nó khi mở bảng chọn.
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => jest.clearAllMocks());

test("mặc định chỉ lấy bản kê còn dòng chờ chính mình xét", async () => {
  mockApi();
  mount();

  await waitFor(() => expect(goiChoDuyet().length).toBeGreaterThan(0));
  const url = goiChoDuyet().at(-1);

  expect(url).toContain("chiConChoDuyet=1");
  // "Còn dòng chờ bạn xét" không phải nhãn trạng thái nên không gửi trangThai.
  expect(url).not.toContain("trangThai=");
});

test("các chế độ xem khác gửi chiConChoDuyet=0", async () => {
  mockApi();
  mount();

  await waitFor(() => expect(goiChoDuyet().length).toBeGreaterThan(0));

  fireEvent.click(document.querySelectorAll('[role="combobox"]')[3]);
  fireEvent.click(
    [...document.querySelectorAll('.select-panel [role="option"]')].find(
      (li) => li.textContent === "Tất cả bản kê",
    ),
  );

  await waitFor(() =>
    expect(goiChoDuyet().at(-1)).toContain("chiConChoDuyet=0"),
  );
});

test("bỏ cột Ngày nộp, giữ số dòng chờ chính mình xét", async () => {
  mockApi();
  mount();

  await screen.findByText("Nguyễn Văn A");

  expect(screen.queryByText("Ngày nộp")).toBeNull();
  expect(screen.getByText(/1 chờ bạn/)).toBeTruthy();
  // Phần của đơn vị khác được nói rõ là không xét thay được.
  expect(screen.getByText(/\+1 dòng của đơn vị khác/)).toBeTruthy();
  // Trạng thái bản kê chỉ còn là nhãn tổng hợp.
  expect(screen.getByText("Còn dòng chờ duyệt")).toBeTruthy();
});
