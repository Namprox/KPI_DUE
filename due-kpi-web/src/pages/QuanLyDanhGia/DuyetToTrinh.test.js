import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import DuyetToTrinh from "./DuyetToTrinh";
import { fetchToTrinhDetail, fetchToTrinhList, htTraLaiToTrinh } from "../../utils/toTrinhApi";

jest.mock("../../hooks/useNamDanhGia", () => ({ useNamDanhGia: () => ({ selectedNam: "2026", namList: [], dangTaiNam: false, setSelectedNam: jest.fn() }) }));
jest.mock("../../components/Common/SearchSelect", () => () => null);
jest.mock("../../utils/toTrinhApi", () => ({ ...jest.requireActual("../../utils/toTrinhApi"), fetchToTrinhDetail: jest.fn(), fetchToTrinhList: jest.fn(), htTraLaiToTrinh: jest.fn() }));
jest.mock("primereact/toast", () => {
  const React = require("react");
  return { Toast: React.forwardRef((props, ref) => { React.useImperativeHandle(ref, () => ({ show: jest.fn() })); return null; }) };
});

test("HT chỉ trả về lãnh đạo; loại hồ sơ chờ xét Trường khỏi lựa chọn và request", async () => {
  const goi = { IdToTrinh: 10, TrangThai: 3, RowVersion: "goi-version", HoSo: [
    { IdPhieu: 1, HoTen: "Lãnh đạo thử", TrangThai: 4, CanHtDuyet: true },
    { IdPhieu: 2, HoTen: "Chờ xét thử", TrangThai: 4, CanHtDuyet: true, ChoXetXuatSacTruong: true, XetXuatSacCapTruong: true },
  ] };
  fetchToTrinhList.mockResolvedValue([goi]);
  fetchToTrinhDetail.mockResolvedValue(goi);
  htTraLaiToTrinh.mockResolvedValue({ hoSo: [goi.HoSo[0]] });
  render(<DuyetToTrinh />);
  const leadership = (await screen.findByText("Lãnh đạo thử")).closest("tr");
  expect(within(screen.getByText("Chờ xét thử").closest("tr")).getByRole("checkbox").disabled).toBe(true);
  fireEvent.click(within(leadership).getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: /Trả lại 1 hồ sơ đã chọn/ }));
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Rà soát lãnh đạo" } });
  fireEvent.click(screen.getByRole("button", { name: "Trả lại hồ sơ" }));
  await waitFor(() => expect(htTraLaiToTrinh).toHaveBeenCalledWith(10, { idPhieuList: [1], lyDo: "Rà soát lãnh đạo", rowVersion: "goi-version" }));
});
