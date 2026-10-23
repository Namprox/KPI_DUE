import React from "react";
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { confirmDialog } from "primereact/confirmdialog";
import DanhGiaPhuLuc2 from "./DanhGiaPhuLuc2";
import TuDeXuatXepLoai from "../../components/DanhGia/DanhGiaPhuLuc2/TuDeXuatXepLoai";
import { apiFetch } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("primereact/toast", () => ({ Toast: () => null }));
jest.mock("primereact/confirmdialog", () => ({ confirmDialog: jest.fn() }));
jest.mock("../../hooks/useMinhChungPhieuPreview", () => ({ useMinhChungPhieuPreview: () => ({ preview: { isOpen: false } }) }));

const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });
const criterion = { IdTieuChi: 77, TenTieuChi: "Tiêu chí chấm tay", LoaiNguonDiem: 1, LoaiThangDiem: 2, DiemToiDa: 10 };
const saved = { IdChiTiet: 9931, ...criterion, DiemTuDanhGia: 5, TrangThaiDong: 1 };
const TEXT = { 3: "Hoàn thành tốt nhiệm vụ", 4: "Hoàn thành xuất sắc nhiệm vụ" };

/**
 * Server giả giữ RowVersion thật: PUT đề xuất làm đổi RowVersion, submit chỉ
 * nhận đúng bản hiện hành - đủ để bắt lỗi "lưu đề xuất xong nộp ngay bị 409".
 */
const dungServer = ({ trangThai = 1, duoc = true, muc = 3, loiPut = null } = {}) => {
  const db = { rv: "RV1", muc, trangThai, lanPut: 0 };
  const item = () => ({
    IdPhieu: 812, IdMau: 2, IdNhanVien: 155, TrangThai: db.trangThai, RowVersion: db.rv,
    DuocTuDeXuatXepLoai: duoc, ChiTiet: [saved],
    ...(db.muc != null && { XepLoaiTuDeXuat: db.muc, XepLoaiTuDeXuatText: TEXT[db.muc], NgayTuDeXuat: "2026-10-23T09:15:02.143" }),
  });
  apiFetch.mockImplementation(async (endpoint, options = {}) => {
    if (endpoint === "namdanhgia") return response({ Items: [{ IdNam: 2026 }] });
    if (endpoint.startsWith("phieu/me/2026")) return response({ Success: true, Item: item() });
    if (endpoint === "maudanhgia/2/chi-tiet") return response({ Item: { Nhom: [{ IdNhom: 1, TenNhom: "Đào tạo", TieuChi: [criterion] }] } });
    if (endpoint === "phieu/812/kiem-tra-hop-le") return response({ Item: { LaChuPhieu: true, QuaHan: false } });
    if (endpoint === "phieu/812/tu-de-xuat-xep-loai" && options.method === "PUT") {
      db.lanPut += 1;
      if (loiPut) return response({ Success: false, ...loiPut.body }, loiPut.status);
      const body = JSON.parse(options.body);
      if (body.RowVersion !== db.rv) return response({ Success: false, ErrorCode: "CONCURRENCY_CONFLICT" }, 409);
      db.muc = body.XepLoai;
      db.rv = `RV${Number(db.rv.slice(2)) + 1}`;
      return response({
        Success: true, IdPhieu: 812, TrangThai: db.trangThai, RowVersion: db.rv,
        ...(db.muc != null && { XepLoaiTuDeXuat: db.muc, XepLoaiTuDeXuatText: TEXT[db.muc], NgayTuDeXuat: "2026-10-23T10:00:00" }),
      });
    }
    if (endpoint === "phieu/812/submit") {
      const body = JSON.parse(options.body);
      if (body.RowVersion !== db.rv) return response({ Success: false, ErrorCode: "CONCURRENCY_CONFLICT" }, 409);
      db.trangThai = 2;
      return response({ Success: true, Message: "Da nop" });
    }
    return response({ Items: [] });
  });
  return db;
};

const moTrang = () => render(
  <MemoryRouter initialEntries={["/danh-gia-phu-luc-2?year=2026"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <DanhGiaPhuLuc2 />
  </MemoryRouter>,
);
const oDeXuat = () => screen.findByRole("combobox", { name: "Đề xuất mức xếp loại" });
const cacLanPut = () => apiFetch.mock.calls.filter(([endpoint]) => endpoint === "phieu/812/tu-de-xuat-xep-loai");
const cacLanGetPhieu = () => apiFetch.mock.calls.filter(([endpoint]) => endpoint.startsWith("phieu/me/2026"));
const chon = async (nhan) => {
  fireEvent.click(await oDeXuat());
  fireEvent.click(screen.getByRole("option", { name: nhan }));
};

beforeAll(() => { Element.prototype.scrollIntoView = jest.fn(); });

beforeEach(() => {
  jest.resetAllMocks();
  useAuth.mockReturnValue({ user: { IdNhanVien: 155, DonVi: [{ IdDonVi: 7, TenDonVi: "Khoa Kế toán", LoaiDoiTuong: 1, LaChinh: true }] } });
});

test("chủ phiếu đổi mức thì lưu ngay, rồi nộp phiếu luôn không bị 409", async () => {
  const db = dungServer();
  moTrang();
  expect(await oDeXuat()).toHaveTextContent("Hoàn thành tốt nhiệm vụ");
  expect(screen.getByText(/Cập nhật lúc 23\/10\/2026 09:15/)).toBeInTheDocument();

  await chon("Hoàn thành xuất sắc nhiệm vụ");
  await waitFor(() => expect(cacLanPut()).toHaveLength(1));
  expect(JSON.parse(cacLanPut()[0][1].body)).toEqual({ XepLoai: 4, RowVersion: "RV1" });
  await waitFor(async () => expect(await oDeXuat()).toHaveTextContent("Hoàn thành xuất sắc nhiệm vụ"));
  expect(db.rv).toBe("RV2");

  fireEvent.click(screen.getByRole("button", { name: /Nộp Phiếu/ }));
  await act(async () => { confirmDialog.mock.calls[0][0].accept(); });
  await waitFor(() => expect(db.trangThai).toBe(2));
  const submit = apiFetch.mock.calls.find(([endpoint]) => endpoint === "phieu/812/submit");
  expect(JSON.parse(submit[1].body)).toEqual({ RowVersion: "RV2" });
});

test("chọn lại (Chưa đề xuất) hỏi xác nhận rồi gửi XepLoai: null", async () => {
  dungServer();
  moTrang();
  await chon("(Chưa đề xuất)");
  expect(cacLanPut()).toHaveLength(0);
  expect(confirmDialog.mock.calls[0][0].header).toBe("Xoá đề xuất?");
  await act(async () => { confirmDialog.mock.calls[0][0].accept(); });
  await waitFor(() => expect(cacLanPut()).toHaveLength(1));
  const body = JSON.parse(cacLanPut()[0][1].body);
  expect(body).toHaveProperty("XepLoai", null);
  await waitFor(async () => expect(await oDeXuat()).toHaveTextContent("(Chưa đề xuất)"));
  expect(screen.queryByText(/Cập nhật lúc/)).not.toBeInTheDocument();
});

test("409 CONCURRENCY_CONFLICT tải lại phiếu và giữ nguyên mức cũ", async () => {
  dungServer({ loiPut: { status: 409, body: { ErrorCode: "CONCURRENCY_CONFLICT" } } });
  moTrang();
  await oDeXuat();
  const truoc = cacLanGetPhieu().length;
  await chon("Hoàn thành xuất sắc nhiệm vụ");
  await waitFor(() => expect(cacLanPut()).toHaveLength(1));
  // Một lần lấy RowVersion trước khi ghi, một lần đồng bộ sau khi gặp 409.
  await waitFor(() => expect(cacLanGetPhieu().length).toBe(truoc + 2));
  expect(await oDeXuat()).toHaveTextContent("Hoàn thành tốt nhiệm vụ");
  expect(await oDeXuat()).not.toHaveAttribute("tabindex", "-1");
});

test("403 KHONG_THUOC_DIEN_DE_XUAT tải lại phiếu, ô ẩn theo cờ mới", async () => {
  const db = dungServer({ loiPut: { status: 403, body: { ErrorCode: "KHONG_THUOC_DIEN_DE_XUAT" } } });
  moTrang();
  await oDeXuat();
  apiFetch.mockImplementation(((goc) => async (endpoint, options) => {
    const res = await goc(endpoint, options);
    if (!endpoint.startsWith("phieu/me/2026") || db.lanPut === 0) return res;
    const data = await res.json();
    return response({ ...data, Item: { ...data.Item, DuocTuDeXuatXepLoai: false } });
  })(apiFetch.getMockImplementation()));
  await chon("Hoàn thành xuất sắc nhiệm vụ");
  await waitFor(() => expect(screen.queryByLabelText("Đề xuất mức xếp loại")).not.toBeInTheDocument());
});

test("không thuộc diện thì ẩn hẳn ô, kể cả khi còn giá trị cũ", async () => {
  dungServer({ duoc: false, muc: 3 });
  moTrang();
  await screen.findByText("TỔNG ĐIỂM TÍCH LŨY");
  expect(screen.queryByLabelText("Đề xuất mức xếp loại")).not.toBeInTheDocument();
  expect(screen.queryByText("Hoàn thành tốt nhiệm vụ")).not.toBeInTheDocument();
});

test("từ trạng thái 3 chủ phiếu chỉ xem text server trả", async () => {
  dungServer({ trangThai: 3 });
  moTrang();
  await screen.findByText("TỔNG ĐIỂM TÍCH LŨY");
  expect(screen.getByLabelText("Đề xuất mức xếp loại")).toHaveTextContent("Hoàn thành tốt nhiệm vụ");
  expect(screen.queryByRole("combobox", { name: "Đề xuất mức xếp loại" })).not.toBeInTheDocument();
});

describe("TuDeXuatXepLoai chỉ xem", () => {
  const deXuat = { DuocTuDeXuatXepLoai: true, XepLoaiTuDeXuat: 4, XepLoaiTuDeXuatText: "Hoàn thành xuất sắc nhiệm vụ" };

  test("người không phải chủ phiếu thấy 'Cá nhân đề xuất', không có dropdown dù phiếu còn nháp", () => {
    render(<TuDeXuatXepLoai deXuat={deXuat} laChuPhieu={false} trangThai={1} />);
    expect(screen.getByText("Cá nhân đề xuất: Hoàn thành xuất sắc nhiệm vụ")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  test("chưa đề xuất: người khác thấy 'Không đề xuất', chủ phiếu thấy 'Chưa đề xuất'", () => {
    const trong = { DuocTuDeXuatXepLoai: true, XepLoaiTuDeXuat: null };
    const { rerender } = render(<TuDeXuatXepLoai deXuat={trong} laChuPhieu={false} trangThai={4} />);
    expect(screen.getByText("Không đề xuất")).toBeInTheDocument();
    rerender(<TuDeXuatXepLoai deXuat={trong} laChuPhieu trangThai={4} />);
    expect(screen.getByText("Chưa đề xuất")).toBeInTheDocument();
  });
});
