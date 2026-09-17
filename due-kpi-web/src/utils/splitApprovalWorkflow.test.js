import React from "react";
import { render, screen } from "@testing-library/react";
import { apiFetch } from "./api";
import { PHIEU_ERROR_MESSAGES } from "./apiError";
import { TRANG_THAI_META } from "./phieuApi";
import { ROLE, ROLE_SETS } from "./roles";
import { canAccessPath } from "../config/menuConfig";
import { laTruongKhoa, laTruongPhongCuaPhieu } from "./phieuChamPermissions";
import {
  dongGoiToTrinh,
  HANH_DONG_TO_TRINH,
  htDuyetToTrinh,
  TEN_HANH_DONG_TO_TRINH,
} from "./toTrinhApi";
import BangHoSoToTrinh from "../components/QuanLyChamDiem/BangHoSoToTrinh";
import {
  TrangThaiBadge,
  TrangThaiToTrinhBadge,
} from "../components/QuanLyChamDiem/TrangThaiBadge";

jest.mock("./api", () => ({ apiFetch: jest.fn() }));

const okJson = (body) => ({
  ok: true,
  status: 200,
  json: async () => body,
});

beforeEach(() => jest.clearAllMocks());

test("đóng gói giữ nguyên Message và hai bộ đếm PascalCase từ backend", async () => {
  apiFetch.mockResolvedValue(
    okJson({
      Message: "Thông điệp do backend sinh",
      SoHoSoHoanTat: 28,
      SoHoSoChoHt: 3,
      Item: { IdToTrinh: 9, TrangThai: 2 },
      HoSo: [{ IdPhieu: 1, CanHtDuyet: false, TrangThai: 5 }],
    }),
  );

  await expect(
    dongGoiToTrinh(9, { tyLeXuatSac: 0.2, rowVersion: "rv" }),
  ).resolves.toMatchObject({
    message: "Thông điệp do backend sinh",
    soHoSoHoanTat: 28,
    soHoSoChoHt: 3,
    item: { TrangThai: 2 },
  });
});

test("duyệt gói trả số hồ sơ lãnh đạo vừa hoàn tất", async () => {
  apiFetch.mockResolvedValue(
    okJson({
      Message: "Đã duyệt 2 hồ sơ lãnh đạo",
      SoHoSoHoanTat: 2,
      Item: { IdToTrinh: 9, TrangThai: 4 },
    }),
  );

  await expect(
    htDuyetToTrinh(9, { nhanXet: "", rowVersion: "rv" }),
  ).resolves.toMatchObject({
    message: "Đã duyệt 2 hồ sơ lãnh đạo",
    soHoSoHoanTat: 2,
    item: { TrangThai: 4 },
  });
});

test("hằng số mới mô tả đúng trạng thái và hành động tự động hoàn tất", () => {
  expect(TRANG_THAI_META[4].label).toBe("Chờ Hiệu trưởng duyệt");
  expect(HANH_DONG_TO_TRINH.TU_DONG_HOAN_TAT).toBe(6);
  expect(TEN_HANH_DONG_TO_TRINH[6]).toMatch(/Tự động hoàn tất/);
  expect(PHIEU_ERROR_MESSAGES.KHONG_CO_HO_SO_LANH_DAO).toMatch(
    /đóng gói lại/,
  );
});

test("cấp phó được nhận diện nhưng không nằm trong tập có quyền chốt hồ sơ", () => {
  expect([ROLE.PHO_TRUONG_KHOA, ROLE.PHO_TRUONG_KHOA_LON]).toEqual([
    "PTK",
    "PTKL",
  ]);
  expect(ROLE.PHO_TRUONG_PHONG).toBe("PTP");
  ["PTK", "PTKL", "PTP"].forEach((role) => {
    expect(ROLE_SETS.TRUONG_KHOA).not.toContain(role);
    expect(ROLE_SETS.DUYET_HO_SO_NHAN_VIEN).not.toContain(role);
  });
  expect(canAccessPath("/quan-ly/duyet-ho-so/10", { MaChucVu: "PTK" })).toBe(
    false,
  );
  expect(
    canAccessPath("/quan-ly/ho-so-nhan-vien/10", { MaChucVu: "PTP" }),
  ).toBe(false);
  expect(laTruongKhoa({ MaChucVu: "PTKL" })).toBe(false);
  expect(
    laTruongPhongCuaPhieu(
      { MaChucVu: "PTP", IdDonVi: 8, DonVi: [{ IdDonVi: 8, MaChucVu: "PTP" }] },
      { IdDonVi: 8 },
    ),
  ).toBe(false);
});

test("bảng gói chỉ cho chọn hồ sơ trạng thái 4 và hiển thị nguồn hoàn tất", () => {
  const { container } = render(
    <BangHoSoToTrinh
      chonDuoc
      daChon={[]}
      onDoiChon={() => {}}
      hoSo={[
        {
          IdPhieu: 1,
          HoTen: "Lãnh đạo",
          TrangThai: 4,
          CanHtDuyet: true,
        },
        {
          IdPhieu: 2,
          HoTen: "Giảng viên",
          TrangThai: 5,
          CanHtDuyet: false,
        },
        {
          IdPhieu: 3,
          HoTen: "Dữ liệu cũ",
          TrangThai: 4,
          CanHtDuyet: false,
        },
      ]}
    />,
  );

  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  expect(checkboxes).toHaveLength(3);
  expect(checkboxes[0].disabled).toBe(false);
  expect(checkboxes[1].disabled).toBe(true);
  expect(checkboxes[2].disabled).toBe(false);
  expect(screen.getByText("Chờ Hiệu trưởng")).toBeTruthy();
  expect(screen.getByText("Hoàn tất (TK duyệt)")).toBeTruthy();
  expect(screen.getByText("Dữ liệu cũ - cần đóng gói lại")).toBeTruthy();
});

test("badge phân biệt dữ liệu tồn và gói tự động hoàn tất", () => {
  const { rerender } = render(
    <TrangThaiBadge trangThai={4} canHtDuyet={false} />,
  );
  expect(screen.getByText("Dữ liệu cũ - cần đóng gói lại")).toBeTruthy();

  rerender(<TrangThaiToTrinhBadge trangThai={4} idNguoiDuyet={null} />);
  expect(screen.getByText("Tự động hoàn tất")).toBeTruthy();
});
