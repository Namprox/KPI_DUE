import React from "react";
import "@testing-library/jest-dom";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useDiemTuDongPhieu } from "../../hooks/useDiemTuDongPhieu";
import { fetchDiemTuDongPhieu } from "../../utils/phieuTuDongApi";
import TieuChiChamCard from "./TieuChiChamCard";

jest.mock("../../utils/phieuTuDongApi", () => ({ fetchDiemTuDongPhieu: jest.fn() }));
const row = { IdChiTiet: 99, IdTieuChi: 7, TenTieuChi: "Sáng kiến", LoaiNguonDiem: 2, CongThucSnapshot: "SK_DOI_MOI_GIANG_DAY", DiemChinhThuc: 0, TrangThaiDong: 3, MinhChung: [], NhiemVuCongDong: [] };
const phieu = { IdPhieu: 812, ChiTiet: [row] };
const data = { Items: [{ IdChiTiet: 99, IdTieuChi: 7, DiemTuDong: 5, LyDoDiemTuDong: "Thông báo nguyên văn của backend", MinhChung: [{ LoaiNguon: 12, MaNguon: 12, TieuDe: "Sáng kiến NCKH", MoTa: "Cấp cơ sở + Cải tiến công việc" }] }] };
const View = ({ form }) => {
  const result = useDiemTuDongPhieu(form);
  return <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    {result.error && <p role="alert">{result.error.message}</p>}
    <TieuChiChamCard chiTiet={form.ChiTiet[0]} autoInfo={result.theoChiTiet[form.ChiTiet[0].IdChiTiet]} stt={1} />
  </MemoryRouter>;
};
beforeEach(() => jest.clearAllMocks());
test("màn xem/chấm phiếu nhận minh chứng Sáng kiến theo dòng và giữ điểm phiếu", async () => {
  fetchDiemTuDongPhieu.mockResolvedValue(data);
  render(<View form={phieu} />);
  expect(await screen.findByRole("link", { name: "Sáng kiến NCKH" })).toHaveAttribute("href", "/sang-kien/12");
  expect(screen.getByText("Thông báo nguyên văn của backend")).toBeInTheDocument();
  expect(fetchDiemTuDongPhieu).toHaveBeenCalledWith(812, expect.anything());
  expect(screen.getAllByText("0.00")).toHaveLength(2);
});
test("cùng tiêu chí nhưng khác IdChiTiet không ghép minh chứng", async () => {
  fetchDiemTuDongPhieu.mockResolvedValue({ Items: [{ ...data.Items[0], IdChiTiet: 100 }] });
  render(<View form={phieu} />);
  await act(async () => {});
  expect(screen.queryByRole("link", { name: "Sáng kiến NCKH" })).not.toBeInTheDocument();
});
test("đổi phiếu bỏ response cũ đến muộn và không tự retry 404", async () => {
  let resolve;
  fetchDiemTuDongPhieu.mockReturnValueOnce(new Promise((done) => { resolve = done; }))
    .mockRejectedValueOnce(Object.assign(new Error("Không tìm thấy phiếu"), { status: 404 }));
  const view = render(<View form={phieu} />);
  view.rerender(<View form={{ ...phieu, IdPhieu: 900 }} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Không tìm thấy phiếu");
  await act(async () => resolve(data));
  expect(screen.queryByRole("link", { name: "Sáng kiến NCKH" })).not.toBeInTheDocument();
  expect(fetchDiemTuDongPhieu).toHaveBeenCalledTimes(2);
});
