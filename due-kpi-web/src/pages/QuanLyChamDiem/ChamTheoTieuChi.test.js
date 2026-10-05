import React from "react";
import "@testing-library/jest-dom";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChamTheoTieuChi from "./ChamTheoTieuChi";
import { apiFetch } from "../../utils/api";

jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("primereact/toast", () => ({ Toast: () => null }));

const tc = { IdTieuChi: 57, TenTieuChi: "Chấp hành nội quy", TenNhom: "Phẩm chất", DiemToiDa: 10, LoaiThangDiem: 2, LoaiDoiTuong: 2, CoPhanQuyen: true, SoChoThamDinh: 3, SoDangBoSung: 1, SoDaChot: 2 };
const dong = (id, fields = {}) => ({ IdChiTiet: id, IdPhieu: id + 100, IdTieuChi: 57, TenTieuChi: tc.TenTieuChi, HoTen: `Cá nhân ${id}`, MaNhanVien: `NV${id}`, TenDonVi: "Khoa Kinh tế", DiemToiDa: 10, DiemTuDanhGia: 10, LoaiThangDiem: 2, TrangThaiDong: 2, RowVersion: `rv-${id}`, SoMinhChung: 1, ...fields });
const response = (data) => ({ ok: true, status: 200, json: async () => data });
let rows;
let tong;
let bulkResult;
let criteriaCalls;
let rowsCalls;

beforeAll(() => { Element.prototype.scrollIntoView = jest.fn(); });
beforeEach(() => {
  apiFetch.mockReset();
  rows = [dong(1), dong(2, { DiemTuDanhGia: null, SoMinhChung: 0, BatBuocMinhChung: true, NguonTraVe: 3, LyDoTraVe: "Đối chiếu lại" }), dong(3, { DiemTuDanhGia: 0 })];
  tong = 3;
  criteriaCalls = 0;
  rowsCalls = 0;
  bulkResult = { Success: true, Message: "Đã duyệt", KetQua: rows.map((r) => ({ IdChiTiet: r.IdChiTiet, Success: true })) };
  apiFetch.mockImplementation(async (url) => {
    if (url === "namdanhgia") return response({ Items: [{ IdNam: 2026 }, { IdNam: 2025 }] });
    if (url.startsWith("tham-dinh/tieu-chi?")) {
      criteriaCalls += 1;
      return response({ Items: [tc, { ...tc, IdTieuChi: 58, CoPhanQuyen: false, TenTieuChi: "Tiêu chí chủ quản" }] });
    }
    if (url.startsWith("tham-dinh/tieu-chi/57/ca-nhan?")) {
      rowsCalls += 1;
      return response({ Items: rows, TongSoDong: tong });
    }
    if (url === "tham-dinh/duyet-hang-loat") return response(bulkResult);
    if (/chitiet\/\d+\/minh-chung/.test(url)) return response({ Items: [{ IdMinhChung: 21, LoaiMinhChung: 2, TenHienThi: "Quyết định", DuongDan: "https://example.org/evidence" }] });
    if (/chitiet\//.test(url)) return response({ Success: true, NewRowVersion: "rv-new", TrangThaiPhieu: 3 });
    if (url.startsWith("thangdiem?")) return response({ Items: [{ IdThangDiem: 11, GiaTriDiem: 10, DieuKienDiem: "Hoàn thành" }, { IdThangDiem: 12, GiaTriDiem: 0, DieuKienDiem: "Không hoàn thành" }] });
    throw new Error(`Unexpected API: ${url}`);
  });
});

const mount = () => render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><ChamTheoTieuChi /></MemoryRouter>);
const openPeople = async () => {
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Xem cá nhân" }));
  await screen.findByText("Cá nhân 1");
};
const personRow = (id) => screen.getByText(`Cá nhân ${id}`).closest("tr");
const writes = () => apiFetch.mock.calls.filter(([, init]) => init?.method);
const confirmBulk = async (name = "Duyệt toàn bộ (3)") => {
  fireEvent.click(screen.getByRole("button", { name }));
  const title = screen.getByText("Xác nhận duyệt").closest(".modal-box");
  fireEvent.click(within(title).getByRole("button", { name: /Duyệt \d+ người/ }));
  await waitFor(() => expect(writes()).toHaveLength(1));
};

test("mặc định tiêu chí được phân công; có thể xem phần chủ quản trong phạm vi BE", async () => {
  mount();
  await screen.findByText(tc.TenTieuChi);
  expect(screen.queryByText("Tiêu chí chủ quản")).not.toBeInTheDocument();
  fireEvent.click(document.querySelectorAll('[role="combobox"]')[1]);
  fireEvent.click(screen.getByRole("option", { name: "Tất cả trong phạm vi thẩm định" }));
  expect(screen.getByText("Tiêu chí chủ quản")).toBeInTheDocument();
});

test("duyệt toàn bộ chỉ gửi dòng đang hiển thị sau tìm kiếm, có xác nhận và giữ RowVersion đã tải", async () => {
  await openPeople();
  fireEvent.change(screen.getByLabelText("Tìm nhanh"), { target: { value: "NV1" } });
  fireEvent.click(screen.getByRole("button", { name: "Duyệt toàn bộ (1)" }));
  expect(screen.getByText("Duyệt 1 người, giữ nguyên điểm tự đánh giá?")).toBeInTheDocument();
  expect(writes()).toHaveLength(0);
  fireEvent.change(document.querySelector(".modal-box textarea"), { target: { value: "Đã đối chiếu" } });
  fireEvent.click(screen.getByRole("button", { name: "Duyệt 1 người" }));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(JSON.parse(writes()[0][1].body)).toEqual({ Items: [{ IdChiTiet: 1, RowVersion: "rv-1" }], NhanXet: "Đã đối chiếu" });
  await waitFor(() => expect(screen.queryByText("Cá nhân 1")).not.toBeInTheDocument());
});

test("lô thành công một phần gỡ dòng thành công, giữ lỗi và yêu cầu xem lại sau khi tải", async () => {
  bulkResult = { Success: false, Message: "Đã duyệt 1/3", KetQua: [
    { IdChiTiet: 1, Success: true, TrangThaiPhieu: 3, IdPhieu: 101, NewRowVersion: "updated" },
    { IdChiTiet: 2, Success: false, Message: "Phiếu đã thay đổi", ErrorCode: "CONCURRENCY_CONFLICT" },
    { IdChiTiet: 3, Success: false, Message: "Lỗi hệ thống", ErrorCode: "SQL_ERROR" },
  ] };
  await openPeople();
  await confirmBulk();
  await screen.findByText("Đã duyệt 1 dòng; 2 dòng chưa duyệt.");
  expect(screen.queryByText("Cá nhân 1")).not.toBeInTheDocument();
  expect(within(personRow(2)).getByText("Phiếu đã thay đổi")).toBeInTheDocument();
  expect(within(personRow(2)).getByRole("button", { name: "Duyệt" })).toBeDisabled();
  await waitFor(() => expect(within(personRow(3)).getByRole("button", { name: "Duyệt" })).toBeEnabled());
  expect(criteriaCalls).toBe(2);
  expect(rowsCalls).toBe(1);
  rows = [dong(2, { RowVersion: "reviewed-new-version" })];
  fireEvent.click(screen.getByRole("button", { name: "Tải lại danh sách" }));
  await waitFor(() => expect(within(personRow(2)).getByRole("button", { name: "Duyệt" })).toBeEnabled());
  fireEvent.click(within(personRow(2)).getByRole("button", { name: "Duyệt" }));
  await waitFor(() => expect(writes()).toHaveLength(2));
  expect(JSON.parse(writes()[1][1].body).RowVersion).toBe("reviewed-new-version");
});

test("cảnh báo điểm null/0, minh chứng thiếu, dòng trả lại và giới hạn 500", async () => {
  tong = 701;
  await openPeople();
  expect(screen.getByText(/Mỗi lần tải tối đa 500 dòng/)).toBeInTheDocument();
  expect(screen.getByText("Chưa kê khai")).toBeInTheDocument();
  expect(screen.getByText("Thiếu minh chứng bắt buộc")).toBeInTheDocument();
  expect(personRow(2)).toHaveClass("cd-row-uu-tien");
  fireEvent.click(screen.getByRole("button", { name: "Duyệt toàn bộ (3)" }));
  expect(screen.getByText(/2 dòng chưa kê khai hoặc có điểm/)).toBeInTheDocument();
  expect(screen.getByText(/1 dòng thiếu minh chứng bắt buộc/)).toBeInTheDocument();
  expect(document.querySelector(".modal-box textarea")).toHaveAttribute("maxlength", "1000");
});

test("chỉ gửi các dòng tích chọn", async () => {
  await openPeople();
  fireEvent.click(screen.getByRole("checkbox", { name: "Chọn Cá nhân 2" }));
  await confirmBulk("Duyệt đã chọn (1)");
  expect(JSON.parse(writes()[0][1].body).Items).toEqual([{ IdChiTiet: 2, RowVersion: "rv-2" }]);
});

test("duyệt đơn dùng route cũ và RowVersion danh sách, không mở phiếu", async () => {
  await openPeople();
  fireEvent.click(within(personRow(1)).getByRole("button", { name: "Duyệt" }));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(writes()[0][0]).toBe("chitiet/1/tham-dinh/duyet");
  expect(JSON.parse(writes()[0][1].body)).toEqual({ NhanXet: null, RowVersion: "rv-1" });
  await waitFor(() => expect(screen.queryByText("Cá nhân 1")).not.toBeInTheDocument());
  expect(criteriaCalls).toBe(2);
});

test("trả về bắt buộc lý do, dùng route cũ và gỡ dòng thành công", async () => {
  await openPeople();
  fireEvent.click(within(personRow(1)).getByRole("button", { name: "Trả về" }));
  const modal = screen.getByText("Trả về cho cá nhân bổ sung").closest(".modal-box");
  fireEvent.click(within(modal).getByRole("button", { name: "Trả về" }));
  expect(writes()).toHaveLength(0);
  fireEvent.change(modal.querySelector("textarea"), { target: { value: "Bổ sung minh chứng" } });
  fireEvent.click(within(modal).getByRole("button", { name: "Trả về" }));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(writes()[0][0]).toBe("chitiet/1/tham-dinh/tra-ve");
  expect(JSON.parse(writes()[0][1].body)).toEqual({ LyDo: "Bổ sung minh chứng", RowVersion: "rv-1" });
});

test("đổi điểm từ chưa kê khai sang khác 0 phải có nhận xét", async () => {
  await openPeople();
  fireEvent.click(within(personRow(2)).getByRole("button", { name: "Sửa điểm" }));
  await screen.findByText("Chấm lại điểm tiêu chí");
  fireEvent.change(screen.getByLabelText("Điểm (0 – 10.00)"), { target: { value: "8" } });
  fireEvent.click(screen.getByRole("button", { name: "Chốt 8.00 điểm" }));
  expect(writes()).toHaveLength(0);
  expect(screen.getByText(/bắt buộc ghi lý do điều chỉnh/)).toBeInTheDocument();
  fireEvent.change(document.querySelector(".modal-box textarea"), { target: { value: "Đã kiểm tra" } });
  fireEvent.click(screen.getByRole("button", { name: "Chốt 8.00 điểm" }));
  await waitFor(() => expect(writes()).toHaveLength(1));
  expect(writes()[0][0]).toBe("chitiet/2/diem-khoa");
  expect(writes()[0][1].method).toBe("PUT");
  expect(JSON.parse(writes()[0][1].body)).toEqual({ Diem: 8, NhanXet: "Đã kiểm tra", RowVersion: "rv-2" });
});

test("sửa thang rời rạc lấy mức điểm, xem minh chứng ngay trong danh sách", async () => {
  rows[0].LoaiThangDiem = 1;
  await openPeople();
  fireEvent.click(within(personRow(1)).getByRole("button", { name: "Sửa điểm" }));
  await screen.findByText("Hoàn thành");
  expect(screen.getByRole("radio", { name: /10.00/ })).toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
  fireEvent.click(within(personRow(1)).getByRole("button", { name: "Xem (1)" }));
  const dialog = await screen.findByRole("dialog", { name: "Minh chứng tiêu chí" });
  expect(await within(dialog).findByRole("link", { name: "Quyết định" })).toHaveAttribute("href", "https://example.org/evidence");
  expect(apiFetch).toHaveBeenCalledWith("chitiet/1/minh-chung");
  expect(apiFetch.mock.calls.some(([url]) => url.startsWith("phieu/"))).toBe(false);
});

test("thiếu RowVersion khóa thao tác và cả lô toàn bộ; vẫn cho chọn dòng hợp lệ", async () => {
  delete rows[1].RowVersion;
  await openPeople();
  expect(within(personRow(2)).getByRole("button", { name: "Duyệt" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Duyệt toàn bộ (3)" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: "Chọn Cá nhân 1" }));
  expect(screen.getByRole("button", { name: "Duyệt đã chọn (1)" })).toBeEnabled();
});
