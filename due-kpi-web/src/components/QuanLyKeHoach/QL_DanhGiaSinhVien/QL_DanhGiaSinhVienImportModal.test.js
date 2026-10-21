import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import QL_DanhGiaSinhVienImportModal from "./QL_DanhGiaSinhVienImportModal";
import { apiFetch } from "../../../utils/api";
import { confirmDialog } from "primereact/confirmdialog";

jest.mock("../../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("primereact/confirmdialog", () => ({ confirmDialog: jest.fn() }));
jest.mock("../../Common/SearchSelect", () => ({ value, onChange, options, placeholder }) =>
  <select aria-label={placeholder} value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">{placeholder}</option>
    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>);

const namList = [{ IdNam: 2026 }];
const show = () => render(<QL_DanhGiaSinhVienImportModal isOpen onClose={jest.fn()} onSuccess={jest.fn()}
  namList={namList} />);
const chonFile = (container, ten = "phanhoi.xlsx") =>
  fireEvent.change(container.querySelector("#excelFileInput"), { target: { files: [new File(["excel"], ten)] } });
const guiFile = async (container) => {
  chonFile(container);
  fireEvent.click(screen.getByRole("button", { name: /Nhập dữ liệu/ }));
  await act(async () => { confirmDialog.mock.calls.at(-1)[0].accept(); });
};

beforeEach(() => {
  jest.clearAllMocks();
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ Success: true, ValidRows: 120 }) });
});

test("chỉ import sau khi xác nhận; hộp thoại nêu Khoa lấy từ cột H, không nhắc đơn vị đã chọn", async () => {
  const { container } = show();
  chonFile(container);
  fireEvent.click(screen.getByRole("button", { name: /Nhập dữ liệu/ }));

  expect(apiFetch).not.toHaveBeenCalled();
  const xacNhan = confirmDialog.mock.calls.at(-1)[0];
  expect(xacNhan.header).toBe("Xác nhận nhập dữ liệu đánh giá sinh viên");
  expect(xacNhan.message).toContain("phanhoi.xlsx");
  expect(xacNhan.message).toContain("cột H");
  expect(xacNhan.message).toMatch(/sẽ bị ghi đè/);
  // Khoa không có trong file giữ nguyên - phải nói rõ vì trước đây ghi đè theo đơn vị đã chọn.
  expect(xacNhan.message).toMatch(/không có trong file giữ nguyên/);
  // Modal dùng z-index 10000 nên hộp xác nhận phải nằm trên nó.
  expect(xacNhan.baseZIndex).toBeGreaterThan(10000);

  await act(async () => { xacNhan.accept(); });
  expect(apiFetch).toHaveBeenCalledWith("phanhoisinhvien/import", expect.objectContaining({ method: "POST" }));
  const formData = apiFetch.mock.calls[0][1].body;
  expect(formData.get("namHoc")).toBe("26");
  // Từ 2026-10-21 backend bỏ qua maDonVi; không gửi nữa để khỏi hiểu sai là còn lọc theo đơn vị.
  expect(formData.has("maDonVi")).toBe(false);
});

test("không còn ô chọn đơn vị (Khoa)", () => {
  show();
  expect(screen.getByRole("combobox", { name: "-- Chọn năm học --" })).toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: /Khoa/ })).not.toBeInTheDocument();
  expect(screen.getByText(/cột H \(ngành\/khoa\)/)).toBeInTheDocument();
});

test("huỷ xác nhận thì không gọi API", () => {
  const { container } = show();
  chonFile(container);
  fireEvent.click(screen.getByRole("button", { name: /Nhập dữ liệu/ }));
  expect(confirmDialog).toHaveBeenCalledTimes(1);
  expect(apiFetch).not.toHaveBeenCalled();
});

test("thiếu file thì báo lỗi và không mở hộp xác nhận", () => {
  show();
  const submit = screen.getByRole("button", { name: /Nhập dữ liệu/ });
  expect(submit).toBeDisabled();
  fireEvent.submit(document.getElementById("importDanhGiaSinhVienForm"));
  expect(screen.getByText("Vui lòng chọn file Excel để import!")).toBeInTheDocument();
  expect(confirmDialog).not.toHaveBeenCalled();
});

test("KHOA_KHONG_KHOP: liệt kê giá trị cột H cần sửa và nói rõ chưa ghi gì", async () => {
  apiFetch.mockResolvedValue({
    ok: false,
    json: async () => ({
      Success: false, ErrorCode: "KHOA_KHONG_KHOP", Message: "Cot H co ten Khoa khong khop.",
      KhoaKhongKhop: [
        { GiaTriCotH: "Khoa Kinh te", SoDong: 42, SoKhoaKhop: 0 },
        { GiaTriCotH: "Khoa Luat", SoDong: 5, SoKhoaKhop: 2 },
        { GiaTriCotH: null, SoDong: 3, SoKhoaKhop: 0 },
      ],
    }),
  });
  const { container } = show();
  await guiFile(container);

  expect(screen.getByText("Cot H co ten Khoa khong khop.")).toBeInTheDocument();
  const danhSach = screen.getByRole("alert");
  expect(danhSach).toHaveTextContent("Chưa có dữ liệu nào bị thay đổi");
  expect(danhSach).toHaveTextContent("Khoa Kinh te");
  expect(danhSach).toHaveTextContent("42 dòng");
  expect(danhSach).toHaveTextContent("không khớp Khoa nào");
  expect(danhSach).toHaveTextContent("trùng tên 2 Khoa");
  expect(danhSach).toHaveTextContent("(để trống)");
});

test("lỗi khác chỉ hiện Message, không hiện khối sửa cột H", async () => {
  apiFetch.mockResolvedValue({
    ok: false,
    json: async () => ({ Success: false, ErrorCode: "FORBIDDEN", Message: "Ban khong co quyen import." }),
  });
  const { container } = show();
  await guiFile(container);

  expect(screen.getByText("Ban khong co quyen import.")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
