import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ToTrinhKhoa from "./ToTrinhKhoa";
import { dongGoiToTrinh, fetchToTrinhDetail, fetchToTrinhList } from "../../utils/toTrinhApi";
import { datUuTienXuatSac } from "../../utils/phieuApi";

jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ user: { MaChucVu: "TP", DonVi: [{ IdDonVi: 7, MaChucVu: "TP" }] } }) }));
jest.mock("../../hooks/useNamDanhGia", () => ({ useNamDanhGia: () => ({ namList: [], selectedNam: "2026", dangTaiNam: false, setSelectedNam: jest.fn() }) }));
jest.mock("../../components/Common/SearchSelect", () => () => null);
jest.mock("primereact/toast", () => {
  const React = require("react");
  return { Toast: React.forwardRef((props, ref) => {
    React.useImperativeHandle(ref, () => ({ show: jest.fn() }));
    return null;
  }) };
});
jest.mock("../../utils/toTrinhApi", () => ({
  ...jest.requireActual("../../utils/toTrinhApi"),
  fetchToTrinhList: jest.fn(), fetchToTrinhDetail: jest.fn(), dongGoiToTrinh: jest.fn(),
}));
jest.mock("../../utils/phieuApi", () => ({
  ...jest.requireActual("../../utils/phieuApi"), datUuTienXuatSac: jest.fn(),
}));

test("hai nhóm đồng hạng: chặn chọn lệch nhóm, khóa người thiếu điều kiện, lưu rồi đóng gói với RowVersion mới", async () => {
  const goi = { IdToTrinh: 10, IdDonVi: 7, TrangThai: 1, RowVersion: "old", HoSo: [] };
  fetchToTrinhList.mockResolvedValue([goi]);
  fetchToTrinhDetail.mockResolvedValue(goi);
  const hoSo = [
    { IdPhieu: 1, HoTen: "A", NhomXepHang: 2, DuDieuKienXuatSac: true, RowVersion: "a" },
    { IdPhieu: 2, HoTen: "B", NhomXepHang: 2, DuDieuKienXuatSac: true, RowVersion: "b" },
    { IdPhieu: 3, HoTen: "C", NhomXepHang: 3, DuDieuKienXuatSac: false, RowVersion: "c" },
    { IdPhieu: 4, HoTen: "D", NhomXepHang: 3, DuDieuKienXuatSac: true, RowVersion: "d" },
  ];
  dongGoiToTrinh.mockRejectedValueOnce(Object.assign(new Error("Đồng hạng hai nhóm"), {
    errorCode: "DONG_HANG", hoSo,
    dongHangNhom: [{ Nhom: 2, TenNhom: "Viên chức / NLĐ", SoSuatConLai: 1 }, { Nhom: 3, TenNhom: "Cán bộ quản lý", SoSuatConLai: 1 }],
  })).mockResolvedValue({ message: "Đã đóng gói" });
  datUuTienXuatSac.mockResolvedValue({});
  const errorLog = jest.spyOn(console, "error").mockImplementation(() => {});
  render(<ToTrinhKhoa />);
  fireEvent.click(await screen.findByRole("button", { name: "Đóng gói tờ trình" }));
  const a = await screen.findByLabelText("Ưu tiên A");
  const b = screen.getByLabelText("Ưu tiên B");
  expect(screen.getByLabelText("Ưu tiên C").disabled).toBe(true);
  fireEvent.click(a); fireEvent.click(b);
  const confirm = screen.getByRole("button", { name: "Xác nhận & đóng gói lại" });
  expect(confirm.disabled).toBe(true);
  fireEvent.click(b); fireEvent.click(screen.getByLabelText("Ưu tiên D"));
  expect(confirm.disabled).toBe(false);
  fetchToTrinhDetail.mockResolvedValue({ ...goi, RowVersion: "fresh" });
  fireEvent.click(confirm);
  await waitFor(() => expect(dongGoiToTrinh).toHaveBeenCalledTimes(2));
  expect(datUuTienXuatSac.mock.calls).toEqual([[1, { uuTien: true, rowVersion: "a" }], [4, { uuTien: true, rowVersion: "d" }]]);
  expect(dongGoiToTrinh).toHaveBeenLastCalledWith(10, { tyLeXuatSac: null, rowVersion: "fresh" });
  await waitFor(() => expect(screen.queryByLabelText("Ưu tiên A")).toBeNull());
  errorLog.mockRestore();
});
