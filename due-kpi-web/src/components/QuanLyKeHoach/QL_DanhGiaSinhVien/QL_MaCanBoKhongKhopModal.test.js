import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import QL_MaCanBoKhongKhopModal from "./QL_MaCanBoKhongKhopModal";
import { apiFetch } from "../../../utils/api";

jest.mock("../../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("primereact/paginator", () => ({ Paginator: () => null }));

const show = (props = {}) =>
  render(
    <QL_MaCanBoKhongKhopModal
      isOpen
      idNam={2026}
      onClose={jest.fn()}
      onForbidden={jest.fn()}
      {...props}
    />,
  );

const traVe = (body, { ok = true, status = 200 } = {}) =>
  apiFetch.mockResolvedValue({ ok, status, json: async () => body });

beforeEach(() => jest.clearAllMocks());

test("liệt kê từng mã kèm họ tên theo file, số lượt và Khoa", async () => {
  traVe({
    Success: true,
    IdNam: 2026,
    SoMaKhongKhop: 2,
    // Server đếm DÒNG trả lời (12 dòng / lượt) dù tên trường là SoLuotDanhGia.
    SoLuotDanhGia: 16080,
    Items: [
      {
        MaCanBo: "2090217",
        HoTenGv: "Nguyen Van A",
        SoLuotDanhGia: 14400,
        DanhSachKhoa: [
          { IdDonVi: 3, TenDonVi: "Khoa Luat", SoLuotDanhGia: 10800 },
          { IdDonVi: 7, TenDonVi: "Khoa Kinh te", SoLuotDanhGia: 3600 },
        ],
      },
      {
        MaCanBo: "GV0999",
        SoLuotDanhGia: 1680,
        DanhSachKhoa: [{ SoLuotDanhGia: 1680 }],
      },
    ],
  });
  show();

  await waitFor(() =>
    expect(screen.getByText("2090217")).toBeInTheDocument(),
  );
  expect(apiFetch).toHaveBeenCalledWith(
    "diem-tb-phan-hoi-sv/khong-khop?idNam=2026",
  );
  // 16080 dòng / 12 câu = 1340 lượt - cùng quy đổi với màn điểm TB đã chốt.
  expect(
    screen.getByText(/2 mã · 1340 lượt đánh giá không được tính khi chốt/),
  ).toBeInTheDocument();
  expect(screen.getByText("Nguyen Van A")).toBeInTheDocument();
  expect(screen.getByText("1200")).toBeInTheDocument();
  expect(screen.getByText("Khoa Luat (900)")).toBeInTheDocument();
  // HoTenGv vắng (file để trống) thì để trống, không bịa tên từ danh mục.
  expect(screen.getByText("GV0999")).toBeInTheDocument();
  expect(screen.getByText("(Chưa gán Khoa) (140)")).toBeInTheDocument();
});

test("Items rỗng: báo mọi mã đều khớp", async () => {
  traVe({ Success: true, IdNam: 2026, SoMaKhongKhop: 0, Items: [] });
  show();

  await waitFor(() =>
    expect(
      screen.getByText(/đều khớp nhân viên/),
    ).toBeInTheDocument(),
  );
  expect(screen.getByText(/năm 2026/)).toBeInTheDocument();
});

test("403: ẩn khối, không hiện lỗi đỏ", async () => {
  traVe({ Success: false, Message: "Ban khong co quyen." }, { ok: false, status: 403 });
  const onClose = jest.fn();
  const onForbidden = jest.fn();
  show({ onClose, onForbidden });

  await waitFor(() => expect(onForbidden).toHaveBeenCalled());
  expect(onClose).toHaveBeenCalled();
  expect(screen.queryByText(/Ban khong co quyen/)).not.toBeInTheDocument();
});

test("404: báo năm không tồn tại", async () => {
  traVe({ Success: false, Message: "Nam khong ton tai." }, { ok: false, status: 404 });
  const onForbidden = jest.fn();
  show({ onForbidden });

  await waitFor(() =>
    expect(
      screen.getByText("Không tìm thấy năm đánh giá 2026."),
    ).toBeInTheDocument(),
  );
  expect(onForbidden).not.toHaveBeenCalled();
});

test("đóng rồi mở lại thì tải lại - dữ liệu thô có thể vừa đổi", async () => {
  traVe({ Success: true, IdNam: 2026, SoMaKhongKhop: 0, Items: [] });
  const { rerender } = show();
  await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1));

  rerender(
    <QL_MaCanBoKhongKhopModal
      isOpen={false}
      idNam={2026}
      onClose={jest.fn()}
      onForbidden={jest.fn()}
    />,
  );
  rerender(
    <QL_MaCanBoKhongKhopModal
      isOpen
      idNam={2026}
      onClose={jest.fn()}
      onForbidden={jest.fn()}
    />,
  );

  await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
});
