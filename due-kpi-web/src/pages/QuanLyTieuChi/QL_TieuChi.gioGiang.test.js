import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import QLTieuChi from "./QL_TieuChi";
import { apiFetch } from "../../utils/api";

jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { MaChucVu: "ADMIN" } }) }));
jest.mock("../../hooks/useConfirmDeleteDialog", () => ({ useConfirmDeleteDialog: () => ({ confirmDeleteDialog: jest.fn() }) }));
jest.mock("primereact/toast", () => ({ Toast: require("react").forwardRef((props, ref) => {
  require("react").useImperativeHandle(ref, () => ({ show: jest.fn() })); return null;
}) }));
jest.mock("../../components/Common/SearchSelect", () => ({ name, value, onChange, options, ariaLabel }) =>
  <select aria-label={ariaLabel || name} value={value} onChange={(e) => onChange(e.target.value)}><option value="">Chọn</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>);

test("tạo tiêu chí gửi đúng công thức, nguồn điểm và đối tượng giảng viên", async () => {
  apiFetch.mockImplementation(async (url, options) => ({ ok: true, json: async () => url.startsWith("nhomtieuchi")
    ? { Items: [{ IdNhom: 1, TenNhom: "Giảng dạy" }] } : options?.method === "POST" ? { Item: { IdTieuChi: 123 } } : { Items: [] } }));
  render(<MemoryRouter><QLTieuChi /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: /Thêm mới/ }));
  fireEvent.change(screen.getByPlaceholderText("Nhập nội dung tiêu chí"), { target: { value: "Hoàn thành định mức giờ giảng" } });
  fireEvent.change(screen.getByLabelText("Điểm tối đa"), { target: { value: "20" } });
  fireEvent.change(screen.getByLabelText("Nguồn điểm"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Công thức chấm tự động"), { target: { value: "GIO_GIANG_TY_LE" } });
  fireEvent.change(screen.getByLabelText("IdNhom"), { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: /Lưu/ }));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining("tieuchidanhgia"), expect.objectContaining({ method: "POST" })));
  const [, options] = apiFetch.mock.calls.find(([, opts]) => opts?.method === "POST");
  expect(JSON.parse(options.body)).toMatchObject({ TenTieuChi: "Hoàn thành định mức giờ giảng", DiemToiDa: 20, CongThucTongHop: "GIO_GIANG_TY_LE", LoaiNguonDiem: 2, LoaiDoiTuong: 1 });
});
