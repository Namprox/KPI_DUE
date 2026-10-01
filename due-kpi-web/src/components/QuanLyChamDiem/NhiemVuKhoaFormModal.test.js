import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import NhiemVuKhoaFormModal from "./NhiemVuKhoaFormModal";
import { luuNhiemVu } from "../../utils/nhiemVuKhoaApi";

jest.mock("../../utils/nhiemVuKhoaApi", () => ({ ...jest.requireActual("../../utils/nhiemVuKhoaApi"), luuNhiemVu: jest.fn() }));
jest.mock("./MinhChungNhiemVuBox", () => () => null);
jest.mock("../Common/SearchSelect", () => ({ value, onChange, options }) => <select value={value} onChange={(e) => onChange(e.target.value)}>
  <option value="">Chọn</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
</select>);

test("gỡ người trong phân công cũ đã không còn trong picker rồi lưu được", async () => {
  luuNhiemVu.mockResolvedValueOnce({ IdNhiemVuKhoa: 12, PhanCong: [] });
  const onSaved = jest.fn();
  render(<NhiemVuKhoaFormModal isOpen choPhepSua idNam={2026} idDonVi={7} giangVien={[]}
    nhiemVu={{ IdNhiemVuKhoa: 12, IdNhomNv: 1, TenNhiemVu: "Nhiệm vụ cũ", PhanCong: [{ IdPhanCong: 2, IdNhanVien: 9, IdVaiTro: 1, HoTen: "Người HĐLĐ" }] }}
    cauHinh={{ Nhom: [{ IdNhomNv: 1, TenNhom: "Nhóm" }], VaiTro: [{ IdVaiTro: 1, MaVaiTro: "CT", TenVaiTro: "Chủ trì", DiemQuyDoi: 5 }] }}
    onSaved={onSaved} onError={jest.fn()} onSuccess={jest.fn()} onClose={jest.fn()} />);
  expect(screen.getByText(/Người HĐLĐ không còn trong danh sách/)).toBeTruthy();
  fireEvent.click(screen.getByTitle("Gỡ người này khỏi nhiệm vụ"));
  fireEvent.click(screen.getByRole("button", { name: /Lưu/ }));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  expect(luuNhiemVu).toHaveBeenCalledWith(expect.objectContaining({ id: 12, phanCong: [] }));
});
