import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MinhChungRow } from "../QuanLyChamDiem/TieuChiChamCard";
import DanhGiaPhuLuc2Form from "./DanhGiaPhuLuc2/DanhGiaPhuLuc2Form";
jest.mock("../NhiemVuPhucVu/NhiemVuPhucVuDetail", () => ({ __esModule: true, default: ({ id }) => <div>Chi tiết nhiệm vụ {id}</div> }));
const show = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);
const source = { LoaiNguon: 6, MaNguon: 120, TieuDe: "Tư vấn tuyển sinh", MoTa: "Chủ trì · 10 điểm" };
test("card chấm điểm mở nhiệm vụ mới đúng MaNguon", async () => {
  show(<MinhChungRow mc={source} />);
  expect(screen.getByRole("link", { name: source.TieuDe }).getAttribute("href")).toBe("/nhiem-vu-phuc-vu/120");
  fireEvent.click(screen.getByRole("link", { name: source.TieuDe }));
  await screen.findByText("Chi tiết nhiệm vụ 120");
});
test("card chấm điểm giữ nguồn 14 thành văn bản dù có MaNguon và DuongDan", () => {
  show(<MinhChungRow mc={{ ...source, LoaiNguon: 14, DuongDan: "/old/120" }} />);
  expect(screen.getByText(source.TieuDe)).toBeTruthy(); expect(screen.queryByRole("link")).toBeNull();
});
test.each([6, 14])("phiếu Phụ lục 2 hiển thị nguồn %s đúng kiểu liên kết", (LoaiNguon) => {
  const criterion = { IdTieuChi: 57, TenTieuChi: "Nhiệm vụ Khoa", TenNhom: "Nhóm III", LoaiNguonDiem: 2, DiemToiDa: 20 };
  show(<DanhGiaPhuLuc2Form criteriaList={[criterion]} formData={{}} autoScores={{ 57: { ...criterion, CongThucTongHop: "NVK_PHAN_CONG_KHOA", DiemTuDong: 10, MinhChung: [{ ...source, LoaiNguon }] } }} tongDiemCoBan={0} />);
  expect(screen.getByText(source.TieuDe)).toBeTruthy();
  expect(!!screen.queryByRole("link", { name: source.TieuDe })).toBe(LoaiNguon === 6);
});
