import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChiTietPhieuPhong from "./ChiTietPhieuPhong";
import ChiTietPhieuDonVi from "./ChiTietPhieuDonVi";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../utils/api";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("primereact/toast", () => ({ Toast: () => null }));

/** Phiếu Khoa: một dòng hệ thống tự tổng hợp, một dòng thư ký gõ tay. */
const phieu = (trangThai) => ({
  IdPhieuDv: 7,
  IdDonVi: 10,
  IdNam: 2026,
  IdMau: 99,
  TenDonVi: "Khoa A",
  TrangThai: trangThai,
  RowVersion: "AAAA",
  LanDanhGia: 1,
  ChiTiet: [
    {
      DuocChamDuyetDv: true,
      IdChiTietDv: 1,
      IdTieuChi: 1,
      LoaiNguonDiem: 2,
      TenTieuChi: "Điểm tự động",
      TenNhom: "Nhóm 1",
      LoaiNhom: 1,
      DiemToiDa: 10,
      DiemTongHop: 5,
      MinhChung: [],
    },
    {
      DuocChamDuyetDv: true,
      IdChiTietDv: 2,
      IdTieuChi: 2,
      LoaiNguonDiem: 1,
      TenTieuChi: "Điểm thủ công",
      TenNhom: "Nhóm 1",
      LoaiNhom: 1,
      DiemToiDa: 10,
      DiemNhap: 6,
      MinhChung: [],
    },
  ],
});

const truongKhoa = { DonVi: [{ IdDonVi: 10, MaChucVu: "TK" }] };
const thuKyKhoa = { DonVi: [{ IdDonVi: 10, MaChucVu: "TKK" }] };

const chiTietMau = {
  Nhom: [
    {
      TenNhom: "Nhóm 1",
      LoaiNhom: 1,
      TieuChi: [
        {
          IdTieuChi: 1,
          MoTa: "Mô tả tiêu chí tự động",
          LoaiThangDiem: 2,
          ThangDiem: [],
        },
        {
          IdTieuChi: 2,
          MoTa: "Mô tả tiêu chí thủ công",
          LoaiThangDiem: 2,
          ThangDiem: [],
        },
      ],
    },
  ],
};

/** Mọi GET trả về `item`; các lệnh ghi trả rỗng để trang tự đọc lại phiếu. */
const mockApi = (item) =>
  apiFetch.mockImplementation(async (url, options) => ({
    ok: true,
    json: async () =>
      !options?.method || options.method === "GET"
        ? {
            Item:
              url === "phieu-don-vi/7"
                ? item
                : url === "maudanhgia/99/chi-tiet"
                  ? chiTietMau
                  : {},
            Items: [],
          }
        : {},
  }));

const ghiVao = (url) =>
  apiFetch.mock.calls.find(
    ([duongDan, options]) => duongDan === url && options?.method,
  );

const mount = () =>
  render(
    <MemoryRouter>
      <ChiTietPhieuDonVi idPhieu={7} />
    </MemoryRouter>,
  );

beforeEach(() => jest.clearAllMocks());

test("Trưởng Khoa duyệt từng tiêu chí ở trạng thái 2, dòng tự động không nằm trong hàng đợi", async () => {
  useAuth.mockReturnValue({ user: truongKhoa });
  mockApi(phieu(2));
  mount();

  const nutDuyet = await screen.findByRole("button", {
    name: /Duyệt giữ nguyên/,
  });
  // Chỉ dòng chấm tay mới có nút duyệt; dòng tự động không đề xuất gì để duyệt.
  expect(screen.getAllByRole("button", { name: /Duyệt giữ nguyên/ })).toHaveLength(1);
  expect(screen.getByText("Điểm thủ công", { exact: false })).toBeTruthy();
  expect(screen.getByText("Mô tả tiêu chí thủ công")).toBeTruthy();

  fireEvent.click(nutDuyet);
  await waitFor(() => expect(ghiVao("chi-tiet-don-vi/2/diem-duyet-dv")).toBeTruthy());
  const [, options] = ghiVao("chi-tiet-don-vi/2/diem-duyet-dv");
  expect(options.method).toBe("PUT");
  expect(JSON.parse(options.body)).toMatchObject({ Diem: 6, RowVersion: "AAAA" });

  // Không có endpoint trả phiếu về cho thư ký - màn hình cũng không được bày nút đó.
  expect(screen.queryByRole("button", { name: /Trả lại|Trả về/ })).toBeNull();
});

test("Trưởng Khoa duyệt cả phiếu qua hộp thoại xác nhận", async () => {
  useAuth.mockReturnValue({ user: truongKhoa });
  mockApi(phieu(2));
  mount();

  fireEvent.click(await screen.findByRole("button", { name: "Duyệt phiếu" }));
  const nutXacNhan = screen
    .getAllByRole("button", { name: "Duyệt phiếu" })
    .pop();
  fireEvent.click(nutXacNhan);

  await waitFor(() => expect(ghiVao("phieu-don-vi/7/duyet-dv")).toBeTruthy());
  const [, options] = ghiVao("phieu-don-vi/7/duyet-dv");
  expect(options.method).toBe("POST");
  expect(JSON.parse(options.body).RowVersion).toBe("AAAA");
});

test("thư ký Khoa xem bước duyệt ở chế độ chỉ đọc, không tự tổng hợp lại", async () => {
  useAuth.mockReturnValue({ user: thuKyKhoa });
  const item = phieu(2);
  item.ChiTiet.forEach((ct) => { ct.DuocChamDuyetDv = false; });
  mockApi(item);
  mount();

  await screen.findByText(/Bạn không được giao chấm/);
  expect(screen.queryByRole("button", { name: /Duyệt giữ nguyên|Duyệt phiếu/ })).toBeNull();
  await waitFor(() => expect(apiFetch).toHaveBeenCalled());
  expect(
    apiFetch.mock.calls.every(([, options]) => !options?.method || options.method === "GET"),
  ).toBe(true);
});

test("Trưởng Khoa ở trạng thái 1 chỉ xem, phần việc nhập vẫn là của thư ký", async () => {
  useAuth.mockReturnValue({ user: truongKhoa });
  mockApi(phieu(1));
  mount();

  await screen.findAllByText("Thư ký đang nhập", { exact: false });
  expect(screen.queryByRole("button", { name: /Lưu thay đổi|Trình Trưởng đơn vị|Tổng hợp KPI/ })).toBeNull();
  expect(
    apiFetch.mock.calls.every(([, options]) => !options?.method || options.method === "GET"),
  ).toBe(true);
});

test("thư ký trình được phiếu sau khi API tổng hợp trả Item null", async () => {
  useAuth.mockReturnValue({ user: thuKyKhoa });
  let soLanTongHop = 0;
  const rowVersions = ["AAAA", "BBBB", "CCCC"];
  apiFetch.mockImplementation(async (url, options) => ({
    ok: true,
    json: async () => {
      if (url === "phieu-don-vi/7/tong-hop-kpi") {
        soLanTongHop += 1;
        return { Success: true, Item: null, TongHop: { SoPhieuThanhVien: 1 } };
      }
      if (url === "phieu-don-vi/7/submit") {
        return { Item: { ...phieu(2), RowVersion: "DDDD" } };
      }
      if (url === "phieu-don-vi/7") {
        return { Item: { ...phieu(1), RowVersion: rowVersions[soLanTongHop] } };
      }
      if (url === "maudanhgia/99/chi-tiet") return { Item: chiTietMau };
      return { Item: {}, Items: [] };
    },
  }));
  mount();

  // Lần tổng hợp tự động khi mở phiếu đã đổi RowVersion lần đầu.
  await waitFor(() => expect(soLanTongHop).toBe(1));
  await waitFor(() =>
    expect(
      apiFetch.mock.calls.filter(([url]) => url === "phieu-don-vi/7"),
    ).toHaveLength(2),
  );
  expect(screen.queryByRole("button", { name: "Tổng hợp KPI" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Trình Trưởng đơn vị" }));
  fireEvent.click(screen.getByRole("button", { name: "Trình phiếu" }));

  await waitFor(() => expect(ghiVao("phieu-don-vi/7/submit")).toBeTruthy());
  expect(soLanTongHop).toBe(2);
  expect(JSON.parse(ghiVao("phieu-don-vi/7/submit")[1].body)).toMatchObject({
    RowVersion: "CCCC",
  });
});


describe.each([["Khoa", ChiTietPhieuDonVi, "TK"], ["Phòng", ChiTietPhieuPhong, "TP"]])("phân quyền mới %s", (_, Page, role) => {
  const open = () => render(<MemoryRouter><Page idPhieu={7} /></MemoryRouter>);
  test.each([false, undefined])("cờ %s khóa dòng kể cả trưởng đơn vị, chặn duyệt khi còn tiêu chí được giao", async (flag) => {
    useAuth.mockReturnValue({ user: { DonVi: [{ IdDonVi: 10, MaChucVu: role }] } });
    const item = phieu(2);
    item.SoTieuChiGiaoChuaCham = 1;
    item.ChiTiet = [{ ...item.ChiTiet[1], DuocChamDuyetDv: flag, CoPhanQuyen: true, TenDonViCham: "Phòng Đào tạo" }];
    mockApi(item); open();
    expect(await screen.findByText("Đơn vị thẩm định: Phòng Đào tạo")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Chỉnh sửa điểm|Duyệt giữ nguyên/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Duyệt phiếu" }).disabled).toBe(true);
    expect(screen.getByText("Còn 1 tiêu chí chờ đơn vị được giao chấm")).toBeTruthy();
  });
  test("trưởng đơn vị khác xác nhận điểm tự động 0, không duyệt cả phiếu", async () => {
    useAuth.mockReturnValue({ user: { DonVi: [{ IdDonVi: 20, MaChucVu: "TP" }] } });
    const item = phieu(2);
    item.ChiTiet = [{ ...item.ChiTiet[0], CoPhanQuyen: true, DiemTongHop: 0 }];
    mockApi(item); open();
    await screen.findAllByText(/Năm học/);
    const tab = screen.queryByRole("button", { name: /Hệ thống tự chấm/ });
    if (tab) fireEvent.click(tab);
    fireEvent.click(await screen.findByRole("button", { name: /Xác nhận 0/ }));
    await waitFor(() => expect(ghiVao("chi-tiet-don-vi/1/diem-duyet-dv")).toBeTruthy());
    expect(JSON.parse(ghiVao("chi-tiet-don-vi/1/diem-duyet-dv")[1].body)).toMatchObject({ Diem: 0, RowVersion: "AAAA" });
    expect(screen.queryByRole("button", { name: "Duyệt phiếu" })).toBeNull();
  });
  test("đã chấm vẫn sửa được khi cờ true và trạng thái 2", async () => {
    useAuth.mockReturnValue({ user: { DonVi: [{ IdDonVi: 20, MaChucVu: "TP" }] } });
    const item = phieu(2); item.ChiTiet = [{ ...item.ChiTiet[1], DiemDuyetDv: 4 }];
    mockApi(item); open();
    fireEvent.click(await screen.findByRole("button", { name: /Đã duyệt/ }));
    expect(screen.getByRole("button", { name: "Chỉnh sửa điểm" })).toBeTruthy();
  });
});


test.each([403, 409, 422])("lỗi %s tải lại phiếu và quyền backend", async (status) => {
  useAuth.mockReturnValue({ user: truongKhoa });
  let gets = 0;
  apiFetch.mockImplementation(async (url, options) => {
    if (options?.method === "POST") return { ok: false, status, json: async () => ({ Message: "Con 1 tieu chi da phan quyen chua duoc don vi duoc giao cham." }) };
    if (url === "phieu-don-vi/7") {
      gets++;
      const item = phieu(2);
      item.SoTieuChiGiaoChuaCham = gets > 1 ? 1 : 0;
      item.ChiTiet[1].CoPhanQuyen = true;
      return { ok: true, json: async () => ({ Item: item }) };
    }
    return { ok: true, json: async () => ({ Item: {}, Items: [] }) };
  });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Duyệt phiếu" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Duyệt phiếu" }).pop());
  await screen.findByText("Còn 1 tiêu chí chờ đơn vị được giao chấm");
  expect(gets).toBe(2);
  expect(screen.getByText("Chờ đơn vị được giao chấm")).toBeTruthy();
});


test("sau PUT, thao tác duyệt phiếu gửi RowVersion mới", async () => {
  useAuth.mockReturnValue({ user: truongKhoa });
  let saved = false;
  apiFetch.mockImplementation(async (url, options) => {
    if (options?.method === "PUT") { saved = true; return { ok: true, json: async () => ({ NewRowVersion: "BBBB" }) }; }
    const item = phieu(2); item.RowVersion = saved ? "BBBB" : "AAAA";
    if (saved) item.ChiTiet[1].DiemDuyetDv = 6;
    return { ok: true, json: async () => ({ Item: url === "phieu-don-vi/7" ? item : {}, Items: [] }) };
  });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: /Duyệt giữ nguyên/ }));
  await waitFor(() => expect(screen.queryByRole("button", { name: /Duyệt giữ nguyên/ })).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: "Duyệt phiếu" }));
  fireEvent.click(screen.getAllByRole("button", { name: "Duyệt phiếu" }).pop());
  await waitFor(() => expect(ghiVao("phieu-don-vi/7/duyet-dv")).toBeTruthy());
  expect(JSON.parse(ghiVao("phieu-don-vi/7/duyet-dv")[1].body).RowVersion).toBe("BBBB");
});
