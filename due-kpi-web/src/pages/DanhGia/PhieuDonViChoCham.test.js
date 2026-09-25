import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PhieuDonViChoCham from "./PhieuDonViChoCham";
import { fetchPhieuDonViList } from "../../utils/phieuDonViApi";
jest.mock("../../utils/phieuDonViApi", () => ({ ...jest.requireActual("../../utils/phieuDonViApi"), fetchPhieuDonViList: jest.fn() }));
jest.mock("./ChiTietPhieuDonVi", () => () => <div>Chi tiết được giao</div>);
test("hàng đợi không lọc đơn vị, quay lại tải mới và có tab xem phiếu sau khi chấm", async () => {
  fetchPhieuDonViList.mockResolvedValueOnce([{ IdPhieuDv: 7, IdDonVi: 10, TenDonVi: "Khoa khác", TrangThai: 2 }]).mockResolvedValue([]);
  render(<MemoryRouter initialEntries={["/phieu-don-vi-cho-cham"]}><Routes>
    <Route path="/phieu-don-vi-cho-cham" element={<PhieuDonViChoCham />} />
    <Route path="/phieu-don-vi-cho-cham/:id" element={<PhieuDonViChoCham />} />
  </Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole("link", { name: "Mở phiếu" }));
  expect(screen.getByText("Chi tiết được giao")).toBeTruthy();
  fireEvent.click(screen.getByRole("link", { name: "Về danh sách phiếu đơn vị" }));
  await screen.findByText("Không có phiếu trong mục này.");
  expect(fetchPhieuDonViList).toHaveBeenCalledTimes(2);
  expect(fetchPhieuDonViList).toHaveBeenLastCalledWith({ choToiCham: true, page: 1, pageSize: 20 });
  fireEvent.click(screen.getByRole("button", { name: "Tất cả phiếu được xem" }));
  await waitFor(() => expect(fetchPhieuDonViList).toHaveBeenLastCalledWith({ choToiCham: undefined, page: 1, pageSize: 20 }));
});
