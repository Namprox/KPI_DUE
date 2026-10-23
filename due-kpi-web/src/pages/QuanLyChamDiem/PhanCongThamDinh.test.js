import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import PhanCongThamDinh from "./PhanCongThamDinh";
import { canAccessPath, visibleGroups } from "../../config/menuConfig";
import { useQuyenThamDinh } from "../../context/PhanCongThamDinhContext";
import { apiFetch } from "../../utils/api";
import {
  buildChamContext, duocChamTieuChi, locTieuChiHienThi, lyDoKhoaONhap,
  THONG_BAO_TU_THAM_DINH, traThamDinhDuoc,
} from "../../utils/phieuChamPermissions";
import { fetchLichSuChamDiemQuaPhieu, TRANG_THAI_DONG } from "../../utils/phieuApi";

jest.mock("../../context/PhanCongThamDinhContext", () => ({ useQuyenThamDinh: jest.fn() }));
jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("primereact/dialog", () => ({ Dialog: ({ header, children }) => <div role="dialog" aria-label={header}>{children}</div> }));

const response = (body, status = 200) => ({ ok: status < 300, status, json: async () => body });
const menu = (user, quyen) =>
  visibleGroups(user, null, null, null, null, null, null, null, quyen).flatMap((g) => g.items.map((i) => i.path));
const access = (path, user, quyen) => canAccessPath(path, user, null, null, null, null, null, null, quyen);

const QUYEN = { Success: true, LaAdmin: false, LaTruongDonVi: false, DuocPhanCong: false, CoQuyenThamDinh: false, DonViQuanLy: [], DuocGiao: [] };
const GIAO_KHOA = { Id: 7, IdDonVi: 12, MaDonVi: "K_KT", TenDonVi: "Khoa Kế toán", TenNguoiCap: "Nguyễn Văn A" };
const PHO_KHOA = { IdNhanVien: 148, MaChucVu: "PTK", IdDonVi: 12, DonVi: [{ IdDonVi: 12, MaChucVu: "PTK", LaChinh: true }] };
const QUYEN_PHO_KHOA = { ...QUYEN, DuocPhanCong: true, CoQuyenThamDinh: true, DuocGiao: [GIAO_KHOA] };

describe("menu và route theo GET phan-cong-tham-dinh/quyen", () => {
  test("phó khoa được phân công thấy Chấm theo tiêu chí, mở được hồ sơ, không thấy màn phân công", () => {
    expect(menu(PHO_KHOA, QUYEN_PHO_KHOA)).toContain("/quan-ly/tham-dinh");
    expect(access("/quan-ly/phieu/5", PHO_KHOA, QUYEN_PHO_KHOA)).toBe(true);
    expect(menu(PHO_KHOA, QUYEN_PHO_KHOA)).not.toContain("/quan-ly/phan-cong-tham-dinh");
    // Hàng đợi theo hồ sơ, hồ sơ xuyên năm và giai đoạn 3 vẫn chỉ của trưởng đơn vị.
    ["/quan-ly/cho-cham", "/quan-ly/giang-vien/3", "/quan-ly/duyet-ho-so", "/quan-ly/to-trinh"].forEach((path) =>
      expect(access(path, PHO_KHOA, QUYEN_PHO_KHOA)).toBe(false));
  });

  test("bị thu hồi thì mất menu dù chức vụ không đổi", () => {
    expect(menu(PHO_KHOA, QUYEN)).not.toContain("/quan-ly/tham-dinh");
    expect(access("/quan-ly/phieu/5", PHO_KHOA, QUYEN)).toBe(false);
  });

  test("quyền server thắng token; chưa có quyền thì rơi về chức vụ trưởng", () => {
    const tk = { MaChucVu: "TK", IdDonVi: 12 };
    expect(menu(tk, { ...QUYEN, LaTruongDonVi: true, CoQuyenThamDinh: true })).toContain("/quan-ly/tham-dinh");
    expect(menu(tk, QUYEN)).not.toContain("/quan-ly/tham-dinh");
    expect(access("/quan-ly/tham-dinh", tk)).toBe(true);
    expect(access("/quan-ly/phieu/5", tk)).toBe(true);
    expect(access("/quan-ly/tham-dinh", PHO_KHOA)).toBe(false);
  });

  test("màn phân công: trưởng đơn vị hoặc ADMIN, chỉ theo quyền server", () => {
    const tk = { MaChucVu: "TK" };
    expect(menu(tk, { ...QUYEN, LaTruongDonVi: true })).toContain("/quan-ly/phan-cong-tham-dinh");
    expect(menu({ MaChucVu: "ADMIN" }, { ...QUYEN, LaAdmin: true })).toContain("/quan-ly/phan-cong-tham-dinh");
    expect(access("/quan-ly/phan-cong-tham-dinh", tk)).toBe(false);
    expect(access("/quan-ly/phan-cong-tham-dinh", { MaChucVu: "GV" }, QUYEN)).toBe(false);
  });

  test("ADMIN vẫn không có lối vào màn chấm một hồ sơ", () => {
    expect(access("/quan-ly/phieu/5", { MaChucVu: "ADMIN" }, { ...QUYEN, LaAdmin: true, CoQuyenThamDinh: true })).toBe(false);
  });
});

describe("luật chấm của người được phân công", () => {
  const ctx = (user, phieu, quyen) => buildChamContext({ user, phieu, phanQuyenRows: [], donViList: [], quyenThamDinh: quyen });
  const dong = { IdTieuChi: 1, TrangThaiDong: TRANG_THAI_DONG.CHO_THAM_DINH, LoaiNguonDiem: 1 };

  test("chấm được phiếu thuộc đơn vị được phân công, không chấm phiếu của chính mình", () => {
    expect(duocChamTieuChi(dong, ctx(PHO_KHOA, { IdDonVi: 12, IdNhanVien: 9 }, QUYEN_PHO_KHOA))).toBe(true);
    expect(duocChamTieuChi(dong, ctx(PHO_KHOA, { IdDonVi: 30, IdNhanVien: 9 }, QUYEN_PHO_KHOA))).toBe(false);
    const cuaToi = ctx(PHO_KHOA, { IdDonVi: 12, IdNhanVien: 148 }, QUYEN_PHO_KHOA);
    expect(duocChamTieuChi(dong, cuaToi)).toBe(false);
    expect(lyDoKhoaONhap(dong, cuaToi)).toBe(THONG_BAO_TU_THAM_DINH);
    expect(duocChamTieuChi(dong, ctx(PHO_KHOA, { IdDonVi: 12, IdNhanVien: 9 }, null))).toBe(false);
  });

  test("trưởng khoa vẫn chấm được phiếu của mình như trước", () => {
    const tk = { IdNhanVien: 177, MaChucVu: "TK", IdDonVi: 12, DonVi: [{ IdDonVi: 12, MaChucVu: "TK" }] };
    expect(duocChamTieuChi(dong, ctx(tk, { IdDonVi: 12, IdNhanVien: 177 }, { ...QUYEN, LaTruongDonVi: true }))).toBe(true);
  });

  test("phó khoa nhìn cả phiếu, phó phòng chỉ thấy phần được giao", () => {
    const rows = [{ IdTieuChi: 1 }, { IdTieuChi: 2 }];
    const phanQuyenRows = [{ IdTieuChi: 1, IdDonVi: 40 }, { IdTieuChi: 2, IdDonVi: 12 }];
    const phieu = { IdDonVi: 12, IdNhanVien: 9 };
    expect(locTieuChiHienThi(rows, buildChamContext({ user: PHO_KHOA, phieu, phanQuyenRows, donViList: [], quyenThamDinh: QUYEN_PHO_KHOA }))).toEqual(rows);
    const phoPhong = { IdNhanVien: 150, MaChucVu: "PTP", DonVi: [{ IdDonVi: 40, MaChucVu: "PTP" }] };
    const quyen = { ...QUYEN_PHO_KHOA, DuocGiao: [{ Id: 8, IdDonVi: 40, TenDonVi: "Phòng QLCL" }] };
    expect(locTieuChiHienThi(rows, buildChamContext({ user: phoPhong, phieu, phanQuyenRows, donViList: [], quyenThamDinh: quyen }))).toEqual([rows[0]]);
  });

  test("trả dòng về thẩm định lại ẩn khi CSDL nói không còn là trưởng đơn vị", () => {
    const tk = { MaChucVu: "TK" };
    const daChot = { TrangThaiDong: TRANG_THAI_DONG.DA_CHOT, LoaiNguonDiem: 1 };
    expect(traThamDinhDuoc(daChot, ctx(tk, {}, { ...QUYEN, LaTruongDonVi: true }))).toBe(true);
    expect(traThamDinhDuoc(daChot, ctx(tk, {}, QUYEN))).toBe(false);
    expect(traThamDinhDuoc(daChot, ctx(tk, {}, null))).toBe(true);
  });
});

test("lịch sử qua phieu/{id}?kemLichSu=true được gom đúng dạng nhóm", async () => {
  apiFetch.mockResolvedValue(response({ Item: { ChiTiet: [
    { IdChiTiet: 1, LichSu: [{ LanDanhGia: 1, Cap: 1, Diem: 5 }, { LanDanhGia: 1, Cap: 2, Diem: 4 }, { LanDanhGia: 1, Cap: 2, Diem: 3 }] },
    { IdChiTiet: 2 },
  ] } }));
  const nhom = await fetchLichSuChamDiemQuaPhieu(5);
  expect(apiFetch).toHaveBeenCalledWith("phieu/5?kemLichSu=true");
  expect(nhom).toEqual([
    { LanDanhGia: 1, IdChiTiet: 1, Cap: 1, Entries: [{ LanDanhGia: 1, Cap: 1, Diem: 5 }] },
    { LanDanhGia: 1, IdChiTiet: 1, Cap: 2, Entries: [{ LanDanhGia: 1, Cap: 2, Diem: 4 }, { LanDanhGia: 1, Cap: 2, Diem: 3 }] },
  ]);
});

describe("màn Phân công thẩm định", () => {
  let ghi;
  const PHAN_CONG = { Id: 7, IdDonVi: 12, IdNhanVien: 148, MaNhanVien: "GV148", HoTen: "Trần Phó Khoa", TenChucVu: "Phó trưởng khoa", TenNguoiCap: "Nguyễn Văn A", NgayCap: "2026-10-23T09:15:00", DaThuHoi: false, ConHieuLuc: true };
  const THOI_CHUC = { Id: 9, IdDonVi: 12, IdNhanVien: 160, HoTen: "Lê Cũ", TenNguoiCap: "Tiền nhiệm", DaThuHoi: false, ConHieuLuc: false };
  beforeEach(() => {
    jest.clearAllMocks();
    ghi = { body: { Success: true, Message: "Phan cong thanh cong.", Id: 10 }, status: 200 };
    useQuyenThamDinh.mockReturnValue({ quyen: { ...QUYEN, LaTruongDonVi: true, CoQuyenThamDinh: true, DonViQuanLy: [{ IdDonVi: 12, MaDonVi: "K_KT", TenDonVi: "Khoa Kế toán" }] }, loading: false, error: "", refresh: jest.fn() });
    apiFetch.mockImplementation(async (url, options = {}) => {
      if (options.method) return response(ghi.body, ghi.status);
      if (url.startsWith("phan-cong-tham-dinh/ung-vien")) return response({ Success: true, Items: [
        { IdNhanVien: 148, HoTen: "Trần Phó Khoa", TenChucVu: "Phó trưởng khoa", DaDuocPhanCong: true },
        { IdNhanVien: 149, HoTen: "Ngô Thư Ký", TenChucVu: "Thư ký khoa", DaDuocPhanCong: false },
      ] });
      return response({ Success: true, Items: [PHAN_CONG, THOI_CHUC] });
    });
  });

  test("một đơn vị thì chọn sẵn; hiện dòng hết hiệu lực và khóa ứng viên đã phân công", async () => {
    render(<PhanCongThamDinh />);
    expect(await screen.findByText("Lê Cũ")).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith("phan-cong-tham-dinh?idDonVi=12&baoGomDaThuHoi=false", undefined);
    expect(apiFetch).toHaveBeenCalledWith("phan-cong-tham-dinh/ung-vien?idDonVi=12", undefined);
    expect(screen.getByText("Đã thôi chức vụ - không còn hiệu lực")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đã phân công" })).toBeDisabled();
  });

  test("phân công gửi đúng body, thu hồi theo id phân công", async () => {
    render(<PhanCongThamDinh />);
    await screen.findByText("Ngô Thư Ký");
    fireEvent.click(screen.getByRole("button", { name: "Phân công" }));
    const dialog = screen.getByRole("dialog", { name: "Phân công thẩm định" });
    fireEvent.change(within(dialog).getByRole("textbox"), { target: { value: " Duyệt điểm GV " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận" }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("phan-cong-tham-dinh", {
      method: "POST", body: JSON.stringify({ IdDonVi: 12, IdNhanVien: 149, GhiChu: "Duyệt điểm GV" }),
    }));
    expect(await screen.findByRole("status")).toHaveTextContent("Phan cong thanh cong.");

    const table = screen.getByRole("table", { name: "Danh sách phân công thẩm định" });
    fireEvent.click(within(table).getAllByRole("button", { name: "Thu hồi" })[1]);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Xác nhận" }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("phan-cong-tham-dinh/9", { method: "DELETE" }));
  });

  test("409 DA_DUOC_PHAN_CONG đóng hộp thoại và tải lại danh sách", async () => {
    ghi = { body: { Success: false, ErrorCode: "DA_DUOC_PHAN_CONG", Message: "Da duoc phan cong" }, status: 409 };
    render(<PhanCongThamDinh />);
    await screen.findByText("Ngô Thư Ký");
    const soLanTai = apiFetch.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Phân công" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Xác nhận" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("đã được phân công thẩm định");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await waitFor(() => expect(apiFetch.mock.calls.length).toBeGreaterThanOrEqual(soLanTai + 3));
  });

  test("422 KHONG_DU_DIEU_KIEN giữ hộp thoại và báo lý do", async () => {
    ghi = { body: { Success: false, ErrorCode: "KHONG_DU_DIEU_KIEN" }, status: 422 };
    render(<PhanCongThamDinh />);
    await screen.findByText("Ngô Thư Ký");
    fireEvent.click(screen.getByRole("button", { name: "Phân công" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Xác nhận" }));
    expect(await within(screen.getByRole("dialog")).findByRole("alert")).toHaveTextContent("Người này không phải phó / thư ký của đơn vị.");
  });

  test("nhiều đơn vị thì chưa chọn sẵn và chưa gọi danh sách", () => {
    useQuyenThamDinh.mockReturnValue({ quyen: { ...QUYEN, LaAdmin: true, DonViQuanLy: [{ IdDonVi: 12, TenDonVi: "Khoa Kế toán" }, { IdDonVi: 13, TenDonVi: "Khoa Luật" }] }, loading: false, error: "" });
    render(<PhanCongThamDinh />);
    expect(screen.getByRole("combobox", { name: "Đơn vị" })).toHaveTextContent("-- Chọn đơn vị --");
    expect(apiFetch).not.toHaveBeenCalled();
  });
});
