import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import PhieuDonViChoCham from "./PhieuDonViChoCham";
import { fetchPhieuDonViList, fetchPhieuDonViKemLoai } from "../../utils/phieuDonViApi";
jest.mock("../../utils/phieuDonViApi", () => ({ ...jest.requireActual("../../utils/phieuDonViApi"), fetchPhieuDonViList: jest.fn(), fetchPhieuDonViKemLoai: jest.fn() }));
jest.mock("./ChiTietPhieuDonVi", () => () => <div>Chi tiết được giao</div>);
jest.mock("./ChiTietPhieuPhong", () => () => <div>Chi tiết phiếu Phòng</div>);

beforeEach(() => {
  jest.clearAllMocks();
  fetchPhieuDonViKemLoai.mockResolvedValue({ phieu: { IdPhieuDv: 7 }, loai: "khoa" });
});
test("hàng đợi không lọc đơn vị, quay lại tải mới và có tab xem phiếu sau khi chấm", async () => {
  fetchPhieuDonViList.mockResolvedValueOnce([{ IdPhieuDv: 7, IdDonVi: 10, TenDonVi: "Khoa khác", TrangThai: 2 }]).mockResolvedValue([]);
  render(<MemoryRouter initialEntries={["/phieu-don-vi-cho-cham"]}><Routes>
    <Route path="/phieu-don-vi-cho-cham" element={<PhieuDonViChoCham />} />
    <Route path="/phieu-don-vi-cho-cham/:id" element={<PhieuDonViChoCham />} />
  </Routes></MemoryRouter>);
  fireEvent.click(await screen.findByRole("link", { name: "Mở phiếu" }));
  await screen.findByText("Chi tiết được giao");
  fireEvent.click(screen.getByRole("link", { name: "Về danh sách phiếu đơn vị" }));
  await screen.findByText("Không có phiếu trong mục này.");
  expect(fetchPhieuDonViList).toHaveBeenCalledTimes(2);
  expect(fetchPhieuDonViList).toHaveBeenLastCalledWith({ choToiCham: true, page: 1, pageSize: 20 });
  fireEvent.click(screen.getByRole("button", { name: "Tất cả phiếu được xem" }));
  await waitFor(() => expect(fetchPhieuDonViList).toHaveBeenLastCalledWith({ choToiCham: undefined, page: 1, pageSize: 20 }));
});

test("URL trực tiếp phiếu Phòng chọn màn hình Phòng và giữ lối quay lại hàng đợi", async () => {
  fetchPhieuDonViKemLoai.mockResolvedValue({ phieu: { IdPhieuDv: 7 }, loai: "phong" });
  render(<MemoryRouter initialEntries={["/phieu-don-vi-cho-cham/7"]}><Routes>
    <Route path="/phieu-don-vi-cho-cham/:id" element={<PhieuDonViChoCham />} />
  </Routes></MemoryRouter>);
  await screen.findByText("Chi tiết phiếu Phòng");
  expect(screen.queryByText("Chi tiết được giao")).toBeNull();
  expect(fetchPhieuDonViList).not.toHaveBeenCalled();
  expect(fetchPhieuDonViKemLoai).toHaveBeenCalledWith("7");
  expect(screen.getByRole("link", { name: "Về danh sách phiếu đơn vị" }).getAttribute("href")).toBe("/phieu-don-vi-cho-cham");
});

test("lỗi đọc loại không mở màn hình chấm và có thể thử lại", async () => {
  fetchPhieuDonViKemLoai.mockRejectedValueOnce(new Error("Không được xem mẫu"));
  render(<MemoryRouter initialEntries={["/phieu-don-vi-cho-cham/7"]}><Routes>
    <Route path="/phieu-don-vi-cho-cham/:id" element={<PhieuDonViChoCham />} />
  </Routes></MemoryRouter>);
  await screen.findByRole("alert");
  expect(screen.queryByText("Chi tiết được giao")).toBeNull();
  expect(screen.queryByText("Chi tiết phiếu Phòng")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
  await screen.findByText("Chi tiết được giao");
  expect(fetchPhieuDonViKemLoai).toHaveBeenCalledTimes(2);
});
