import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NhiemVuKhoaFormModal from "./NhiemVuKhoaFormModal";
import { luuNhiemVu } from "../../utils/nhiemVuKhoaApi";
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});
jest.mock("../../utils/nhiemVuKhoaApi", () => ({
  ...jest.requireActual("../../utils/nhiemVuKhoaApi"),
  luuNhiemVu: jest.fn(),
}));
jest.mock(
  "./MinhChungNhiemVuBox",
  () =>
    ({ choPhepSua }) =>
      choPhepSua ? (
        <button>Tải minh chứng</button>
      ) : (
        <span>Minh chứng chỉ đọc</span>
      ),
);
const cauHinh = {
  Nhom: [{ IdNhomNv: 1, TenNhom: "Nhóm" }],
  VaiTro: [
    { IdVaiTro: 3, MaVaiTro: "CT", TenVaiTro: "Chủ trì", DiemQuyDoi: 10 },
    {
      IdVaiTro: 2,
      MaVaiTro: "PHC",
      TenVaiTro: "Phối hợp chính",
      DiemQuyDoi: 7,
    },
    { IdVaiTro: 1, MaVaiTro: "PH", TenVaiTro: "Phối hợp", DiemQuyDoi: 4 },
  ],
};
const chuTri = {
  IdPhanCong: 1,
  IdNhanVien: 5,
  IdVaiTro: 3,
  LaChuTri: true,
  HoTen: "Tôi",
  MaVaiTroSnapshot: "CT",
};
const phoiHop = {
  IdPhanCong: 2,
  IdNhanVien: 9,
  IdVaiTro: 1,
  HoTen: "Người HĐLĐ",
  TenVaiTroSnapshot: "Phối hợp",
  DiemSnapshot: 3,
};
const props = {
  isOpen: true,
  choPhepSua: true,
  idNam: 2026,
  idDonVi: 7,
  idNhanVien: 5,
  giangVien: [
    { IdNhanVien: 5, HoTen: "Tôi", MaNhanVien: "NV5" },
    { IdNhanVien: 9, HoTen: "Đồng nghiệp", MaNhanVien: "NV9" },
  ],
  cauHinh,
  onSaved: jest.fn(),
  onError: jest.fn(),
  onSuccess: jest.fn(),
  onClose: jest.fn(),
  onConflict: jest.fn(),
};
beforeEach(() => jest.clearAllMocks());
const nv = (extra = {}) => ({
  IdNhiemVuKhoa: 12,
  IdNhomNv: 1,
  TenNhiemVu: "Nhiệm vụ cũ",
  ChoPhepSua: true,
  TrangThai: 1,
  PhanCong: [chuTri, phoiHop],
  ...extra,
});
test("gỡ phối hợp cũ ngoài picker rồi gửi danh sách rỗng, không gửi chủ trì", async () => {
  luuNhiemVu.mockResolvedValueOnce({ Item: nv({ PhanCong: [chuTri] }) });
  render(<NhiemVuKhoaFormModal {...props} giangVien={[]} nhiemVu={nv()} />);
  expect(screen.getByText(/Người HĐLĐ không còn trong danh sách/)).toBeTruthy();
  expect(screen.getAllByTitle("Gỡ người này khỏi nhiệm vụ")).toHaveLength(1);
  fireEvent.click(screen.getByTitle("Gỡ người này khỏi nhiệm vụ"));
  fireEvent.click(screen.getByRole("button", { name: /Lưu nhiệm vụ/ }));
  await waitFor(() => expect(props.onSaved).toHaveBeenCalled());
  expect(luuNhiemVu).toHaveBeenCalledWith(
    expect.objectContaining({ id: 12, phanCong: [] }),
  );
});
test("picker loại chính mình, ẩn CT và không dựng điểm khi BE bỏ field", () => {
  render(<NhiemVuKhoaFormModal {...props} />);
  fireEvent.click(screen.getByRole("button", { name: /Thêm người/ }));
  fireEvent.click(screen.getByRole("combobox", { name: "Người phối hợp" }));
  expect(screen.queryByRole("option", { name: /Tôi/ })).toBeNull();
  expect(
    screen.getByRole("option", { name: "Đồng nghiệp (NV9)" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("option", { name: "Đồng nghiệp (NV9)" }));
  fireEvent.click(screen.getByRole("combobox", { name: "Vai trò phối hợp" }));
  expect(screen.queryByRole("option", { name: /Chủ trì/ })).toBeNull();
  expect(screen.getAllByRole("option")).toHaveLength(2);
  expect(screen.queryByText(/undefined|NaN/)).toBeNull();
});
test("kê khai chỉ có chủ trì gửi IdDonVi và PhanCong rỗng", async () => {
  luuNhiemVu.mockResolvedValueOnce({ Item: nv() });
  render(<NhiemVuKhoaFormModal {...props} nhomGoiY="1" />);
  fireEvent.change(screen.getByPlaceholderText(/Ví dụ/), {
    target: { value: "Hội thảo" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu nhiệm vụ" }));
  await waitFor(() =>
    expect(luuNhiemVu).toHaveBeenCalledWith(
      expect.objectContaining({
        idDonVi: 7,
        idNam: 2026,
        tenNhiemVu: "Hội thảo",
        phanCong: [],
      }),
    ),
  );
});

test("chọn giảng viên cùng khoa không cảnh báo, chọn vai trò có điểm và lưu được", async () => {
  luuNhiemVu.mockResolvedValueOnce({ Item: nv() });
  render(<NhiemVuKhoaFormModal {...props} nhomGoiY="1" />);
  fireEvent.change(screen.getByPlaceholderText(/Ví dụ/), {
    target: { value: "Hội thảo" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Thêm người/ }));
  fireEvent.click(screen.getByRole("combobox", { name: "Người phối hợp" }));
  fireEvent.click(screen.getByRole("option", { name: "Đồng nghiệp (NV9)" }));
  expect(screen.queryByText(/không còn trong danh sách giảng viên/)).toBeNull();
  fireEvent.click(screen.getByRole("combobox", { name: "Vai trò phối hợp" }));
  fireEvent.click(screen.getByRole("option", { name: "Phối hợp - 4.0 điểm" }));
  expect(screen.getByText("4.0đ")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Lưu nhiệm vụ" }));
  await waitFor(() =>
    expect(luuNhiemVu).toHaveBeenCalledWith(
      expect.objectContaining({
        phanCong: [{ IdNhanVien: "9", IdVaiTro: "1", GhiChu: "" }],
      }),
    ),
  );
});

test("chọn lại người đã được phân công phát hiện trùng và chặn lưu", () => {
  render(<NhiemVuKhoaFormModal {...props} nhiemVu={nv()} />);
  fireEvent.click(screen.getByRole("button", { name: /Thêm người/ }));
  fireEvent.click(
    screen.getAllByRole("combobox", { name: "Người phối hợp" })[1],
  );
  fireEvent.click(screen.getByRole("option", { name: "Đồng nghiệp (NV9)" }));
  fireEvent.click(
    screen.getAllByRole("combobox", { name: "Vai trò phối hợp" })[1],
  );
  fireEvent.click(screen.getByRole("option", { name: "Phối hợp - 4.0 điểm" }));
  expect(
    screen.getAllByText("Giảng viên này đã có trong nhiệm vụ."),
  ).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Lưu nhiệm vụ" }));
  expect(
    screen.getByText(/Một giảng viên chỉ được xuất hiện một lần/),
  ).toBeTruthy();
  expect(luuNhiemVu).not.toHaveBeenCalled();
});
test("gửi toàn bộ phối hợp còn lại và giữ snapshot điểm khi không đổi vai trò", async () => {
  luuNhiemVu.mockResolvedValueOnce({ Item: nv() });
  render(<NhiemVuKhoaFormModal {...props} nhiemVu={nv()} />);
  expect(screen.getByText("3.0đ")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Lưu nhiệm vụ" }));
  await waitFor(() =>
    expect(luuNhiemVu).toHaveBeenCalledWith(
      expect.objectContaining({
        phanCong: [{ IdNhanVien: "9", IdVaiTro: "1", GhiChu: "" }],
      }),
    ),
  );
});
test.each([false, undefined])(
  "quyền sửa chi tiết = %s ghi đè quyền tạo; chỉ đọc snapshot",
  (ChoPhepSua) => {
    render(
      <NhiemVuKhoaFormModal
        {...props}
        nhiemVu={nv({ ChoPhepSua, TrangThai: 2 })}
      />,
    );
    expect(
      screen.queryByRole("button", {
        name: /Lưu nhiệm vụ|Tải minh chứng|Thêm người/,
      }),
    ).toBeNull();
    expect(screen.getByText("Người HĐLĐ")).toBeTruthy();
    expect(screen.getByText("3.0đ")).toBeTruthy();
  },
);
test("lưu không đổi giữ TrangThai=3 và Message từ BE", async () => {
  const item = nv({ TrangThai: 3, LyDoTraVe: "Thiếu quyết định" });
  luuNhiemVu.mockResolvedValueOnce({
    Item: item,
    Message: "Khong co thay doi nao duoc ghi nhan.",
  });
  render(<NhiemVuKhoaFormModal {...props} nhiemVu={item} />);
  fireEvent.click(screen.getByRole("button", { name: "Lưu nhiệm vụ" }));
  await waitFor(() => expect(props.onSaved).toHaveBeenCalledWith(item));
  expect(props.onSuccess).toHaveBeenCalledWith(
    "Khong co thay doi nao duoc ghi nhan.",
  );
});
test("409 khi sửa đóng form và tải lại quyền BE", async () => {
  luuNhiemVu.mockRejectedValueOnce(
    Object.assign(new Error("Đã duyệt"), { status: 409 }),
  );
  render(<NhiemVuKhoaFormModal {...props} nhiemVu={nv()} />);
  fireEvent.click(screen.getByRole("button", { name: "Lưu nhiệm vụ" }));
  await waitFor(() => expect(props.onConflict).toHaveBeenCalled());
  expect(props.onClose).toHaveBeenCalled();
});
