import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ChiTietDuyetThanhTich from "./ChiTietDuyetThanhTich";
import { apiFetch } from "../../utils/api";

jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("primereact/toast", () => ({ Toast: () => null }));

const dong = (extra) => ({
  IdKeKhai: 12,
  IdMuc: 11,
  TenMuc: "Sáng kiến cấp Trường",
  DiemMuc: 5,
  Quy: 1,
  SoLuong: 1,
  DiemKeKhai: 5,
  ChoPhepSoLuong: true,
  YeuCauMinhChung: false,
  MinhChung: [],
  ...extra,
});

/**
 * Bản kê do HAI đơn vị cùng thẩm định - hình dạng mà gác quyền cấp DÒNG tạo ra.
 * Người đang đăng nhập chỉ xét được nhóm P.TCHC (`ChoPhepXet`).
 */
const banKe = () => ({
  IdKeKhai: 12,
  IdNam: 2026,
  HoTen: "Nguyễn Văn A",
  MaNhanVien: "CB01",
  TenDonVi: "Khoa CNTT",
  TrangThai: 2,
  ChoPhepDuyet: true,
  SoDong: 3,
  SoDongChoDuyet: 2,
  TongDiemKeKhai: 15,
  TongDiemDuyet: 5,
  TongHopTheoLoai: [],
  ChiTiet: [
    dong({
      IdChiTiet: 101,
      IdDonViDuyet: 7,
      TenDonViDuyet: "P.TCHC",
      TenThanhTich: "Khen thưởng chờ xét",
      TrangThaiDong: 1,
      ChoPhepXet: true,
    }),
    dong({
      IdChiTiet: 102,
      IdDonViDuyet: 7,
      TenDonViDuyet: "P.TCHC",
      TenThanhTich: "Khen thưởng đã chốt",
      TrangThaiDong: 2,
      SoLuongDuyet: 1,
      DiemDuyet: 5,
      ChoPhepXet: true,
    }),
    dong({
      IdChiTiet: 201,
      IdDonViDuyet: 9,
      TenDonViDuyet: "Khoa CNTT",
      TenThanhTich: "Sáng kiến của đơn vị khác",
      TrangThaiDong: 1,
      ChoPhepXet: false,
    }),
  ],
});

const mockApi = ({ item = banKe(), ghiDe } = {}) =>
  apiFetch.mockImplementation(async (url, options) => {
    if (options?.method && ghiDe) return ghiDe(url, options);
    if (String(url).endsWith("/lich-su")) {
      return { ok: true, json: async () => ({ Success: true, Items: [] }) };
    }
    return { ok: true, json: async () => ({ Success: true, Item: item }) };
  });

const goiApi = (url) =>
  apiFetch.mock.calls.find(
    ([duongDan, options]) => duongDan === url && options?.method,
  );

const mount = () =>
  render(
    <MemoryRouter initialEntries={["/quan-ly/ke-khai-thanh-tich/12"]}>
      <Routes>
        <Route
          path="/quan-ly/ke-khai-thanh-tich/:id"
          element={<ChiTietDuyetThanhTich />}
        />
      </Routes>
    </MemoryRouter>,
  );

/** Radio "Chốt" / "Trả về" của một dòng, tìm theo tên nhóm radio của dòng đó. */
const nutQuyetDinh = (idChiTiet) => [
  ...document.querySelectorAll(`input[name="qd-${idChiTiet}"]`),
];

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => jest.clearAllMocks());

test("chỉ dòng có ChoPhepXet mới thao tác được, không suy từ vai trò", async () => {
  mockApi();
  mount();

  await screen.findByText("Khen thưởng chờ xét");

  expect(nutQuyetDinh(101)).toHaveLength(2);
  expect(nutQuyetDinh(102)).toHaveLength(2);
  // Dòng của đơn vị khác: chỉ hiện badge trạng thái, không có ô quyết định.
  expect(nutQuyetDinh(201)).toHaveLength(0);

  // Nhãn theo thuật ngữ mới, và không còn thao tác cấp bản kê.
  expect(screen.getAllByText(/^Chốt$/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/^Trả về$/).length).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: /Chốt bản kê/ })).toBeNull();
  expect(
    screen.queryByRole("button", { name: /Trả lại cho nhân viên/ }),
  ).toBeNull();
  expect(screen.queryByText(/Duyệt giữ nguyên|Từ chối/)).toBeNull();
});

test("mỗi nhóm gửi riêng một request, chỉ chứa dòng của đơn vị mình", async () => {
  const ghiDe = jest.fn(async () => ({
    ok: true,
    json: async () => ({ Success: true, Item: banKe() }),
  }));
  mockApi({ ghiDe });
  mount();

  await screen.findByText("Khen thưởng chờ xét");

  // "Chốt N dòng chờ xét" chỉ đếm dòng CHƯA XÉT mà mình xét được (101).
  fireEvent.click(screen.getByRole("button", { name: /Chốt 1 dòng chờ xét/ }));
  fireEvent.click(screen.getByRole("button", { name: /Lưu quyết định/ }));

  await waitFor(() =>
    expect(goiApi("ke-khai-thanh-tich/12/duyet-chi-tiet")).toBeTruthy(),
  );
  const [, options] = goiApi("ke-khai-thanh-tich/12/duyet-chi-tiet");
  const payload = JSON.parse(options.body);

  expect(options.method).toBe("POST");
  expect(payload.QuyetDinh).toEqual([
    { IdChiTiet: 101, QuyetDinh: 2, SoLuongDuyet: 1, NhanXet: null },
  ]);
});

test("trả về thiếu lý do bị chặn ngay, có lý do thì gửi lên", async () => {
  const ghiDe = jest.fn(async () => ({
    ok: true,
    json: async () => ({ Success: true, Item: banKe() }),
  }));
  mockApi({ ghiDe });
  mount();

  await screen.findByText("Khen thưởng chờ xét");

  const [, oTraVe] = nutQuyetDinh(101);
  fireEvent.click(oTraVe);
  fireEvent.click(screen.getByRole("button", { name: /Lưu quyết định/ }));

  // Không gọi API: server sẽ trả 400 THIEU_LY_DO cho CẢ nhóm.
  await waitFor(() =>
    expect(goiApi("ke-khai-thanh-tich/12/duyet-chi-tiet")).toBeFalsy(),
  );

  const oLyDo = screen.getByPlaceholderText(/Bắt buộc: nêu rõ lý do trả về/);
  fireEvent.change(oLyDo, { target: { value: "Thiếu quyết định công nhận" } });
  fireEvent.click(screen.getByRole("button", { name: /Lưu quyết định/ }));

  await waitFor(() =>
    expect(goiApi("ke-khai-thanh-tich/12/duyet-chi-tiet")).toBeTruthy(),
  );
  const [, options] = goiApi("ke-khai-thanh-tich/12/duyet-chi-tiet");
  expect(JSON.parse(options.body).QuyetDinh).toEqual([
    {
      IdChiTiet: 101,
      QuyetDinh: 3,
      SoLuongDuyet: 1,
      NhanXet: "Thiếu quyết định công nhận",
    },
  ]);
});

test("dòng đã chốt mở lại được qua chính endpoint duyệt chi tiết", async () => {
  const ghiDe = jest.fn(async () => ({
    ok: true,
    json: async () => ({ Success: true, Item: banKe() }),
  }));
  mockApi({ ghiDe });
  mount();

  await screen.findByText("Khen thưởng đã chốt");
  // Gợi ý "mở lại" nằm ngay trên dòng đã chốt, không phải ở một nút riêng.
  expect(screen.getByText(/Dòng đã chốt - chọn/)).toBeTruthy();

  const [, oTraVe] = nutQuyetDinh(102);
  fireEvent.click(oTraVe);
  fireEvent.change(
    screen.getByPlaceholderText(/Bắt buộc: nêu rõ lý do trả về/),
    { target: { value: "Chốt nhầm, mở lại cho nhân viên sửa" } },
  );
  fireEvent.click(screen.getByRole("button", { name: /Lưu quyết định/ }));

  await waitFor(() =>
    expect(goiApi("ke-khai-thanh-tich/12/duyet-chi-tiet")).toBeTruthy(),
  );
  const [, options] = goiApi("ke-khai-thanh-tich/12/duyet-chi-tiet");
  expect(JSON.parse(options.body).QuyetDinh).toEqual([
    {
      IdChiTiet: 102,
      QuyetDinh: 3,
      SoLuongDuyet: 1,
      NhanXet: "Chốt nhầm, mở lại cho nhân viên sửa",
    },
  ]);
});

test("FORBIDDEN_DONG chỉ đúng dòng ngoài quyền và nói rõ chưa ghi gì", async () => {
  const ghiDe = jest.fn(async () => ({
    ok: false,
    status: 403,
    json: async () => ({
      Success: false,
      ErrorCode: "FORBIDDEN_DONG",
      Message: "Forbidden dong",
      DongCoVanDe: [
        {
          IdChiTiet: 101,
          TenThanhTich: "Khen thưởng chờ xét",
          TenDonVi: "P.KHHTQT",
        },
      ],
    }),
  }));
  mockApi({ ghiDe });
  mount();

  await screen.findByText("Khen thưởng chờ xét");
  fireEvent.click(screen.getByRole("button", { name: /Chốt 1 dòng chờ xét/ }));
  fireEvent.click(screen.getByRole("button", { name: /Lưu quyết định/ }));

  expect(
    await screen.findByText(/1 dòng thuộc quyền duyệt của đơn vị khác/),
  ).toBeTruthy();
  expect(screen.getByText(/Toàn bộ lần lưu đã bị huỷ/)).toBeTruthy();
});
