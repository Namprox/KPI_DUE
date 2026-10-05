import React from "react";
import "@testing-library/jest-dom";
import { render as renderView, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import KeKhaiThanhTich from "./KeKhaiThanhTich";
import { apiFetch } from "../../utils/api";

jest.mock("../../utils/api", () => ({ apiFetch: jest.fn() }));
jest.mock("primereact/toast", () => ({ Toast: () => null }));

const NAM = 2026;
const render = (view) => renderView(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{view}</MemoryRouter>);

/**
 * Danh mục Nhóm II là cây ĐÚNG HAI CẤP: gốc = tiêu chí (không kê được), lá =
 * mức quy đổi. Picker dựng cột trái từ gốc và cột phải từ lá của gốc đó, nên
 * fixture phải có đủ cả hai tầng.
 */
const TEN_LA = "Khen thưởng cấp Trường";

const danhMucMacDinh = (laExtra = {}) => [
  {
    IdMuc: 1,
    MaMuc: "TT1",
    TenMuc: "Khen thưởng",
    IdCha: null,
    LaLa: false,
    LoaiThanhTich: 2,
    TrangThai: true,
    TranDiem: 30,
  },
  {
    IdMuc: 11,
    MaMuc: "TT1.1",
    TenMuc: TEN_LA,
    IdCha: 1,
    LaLa: true,
    LoaiThanhTich: 2,
    TrangThai: true,
    DiemQuyDoi: 5,
    ChoPhepSoLuong: true,
    YeuCauMinhChung: false,
    TenDonVi: "P.TCHC",
    ...laExtra,
  },
];

/**
 * Bản kê có đủ ba loại dòng: chờ duyệt (sửa được), đã chốt (khoá riêng) và
 * trả về (sửa được, kèm lý do). Đây là hình dạng mà vòng đời theo DÒNG tạo ra
 * và thiết kế cũ "khoá cả bản kê" không bao giờ dựng nổi.
 */
const banKe = () => ({
  IdKeKhai: 12,
  IdNam: NAM,
  TrangThai: 4,
  ChoPhepSua: true,
  SoDong: 3,
  TongDiemKeKhai: 15,
  TongDiemDuyet: 5,
  TongDiemDuocTinh: 5,
  TongHopTheoLoai: [],
  ChiTiet: [
    {
      IdChiTiet: 101,
      IdKeKhai: 12,
      IdMuc: 11,
      TenMuc: TEN_LA,
      DiemMuc: 5,
      Quy: 1,
      TenThanhTich: "Thành tích chờ duyệt",
      SoLuong: 1,
      DiemKeKhai: 5,
      TrangThaiDong: 1,
      ChoPhepSua: true,
      ChoPhepSoLuong: true,
      YeuCauMinhChung: false,
      MinhChung: [],
    },
    {
      IdChiTiet: 102,
      IdKeKhai: 12,
      IdMuc: 11,
      TenMuc: TEN_LA,
      DiemMuc: 5,
      Quy: 2,
      TenThanhTich: "Thành tích đã chốt",
      SoLuong: 1,
      DiemKeKhai: 5,
      SoLuongDuyet: 1,
      DiemDuyet: 5,
      TrangThaiDong: 2,
      ChoPhepSua: false,
      ChoPhepSoLuong: true,
      YeuCauMinhChung: false,
      MinhChung: [
        {
          IdMinhChungTt: 9,
          IdChiTiet: 102,
          TenHienThi: "qd-chot.pdf",
          TenFileGoc: "qd-chot.pdf",
        },
      ],
    },
    {
      IdChiTiet: 103,
      IdKeKhai: 12,
      IdMuc: 11,
      TenMuc: TEN_LA,
      DiemMuc: 5,
      Quy: 3,
      TenThanhTich: "Thành tích bị trả về",
      SoLuong: 1,
      DiemKeKhai: 5,
      TrangThaiDong: 3,
      NhanXetDuyet: "Thiếu quyết định công nhận",
      ChoPhepSua: true,
      ChoPhepSoLuong: true,
      YeuCauMinhChung: false,
      MinhChung: [],
    },
  ],
});

/**
 * Mọi GET trả dữ liệu tĩnh; các lệnh ghi đi qua `ghiDe` để từng test tự quyết.
 */
const mockApi = ({ item = banKe(), danhMuc = danhMucMacDinh(), ghiDe } = {}) =>
  apiFetch.mockImplementation(async (url, options) => {
    if (options?.method && ghiDe) return ghiDe(url, options);
    if (url === "namdanhgia") {
      return { ok: true, json: async () => ({ Items: [{ IdNam: NAM }] }) };
    }
    if (String(url).startsWith("danh-muc-thanh-tich")) {
      return {
        ok: true,
        json: async () => ({ Success: true, Items: danhMuc }),
      };
    }
    return { ok: true, json: async () => ({ Success: true, Item: item }) };
  });

/**
 * Chọn quý cho dòng CUỐI bảng. `Quy` là trường bắt buộc của module,
 * nên dòng mới không chọn quý thì lần lưu bị chặn ngay ở FE.
 */
const chonQuyDongCuoi = (nhan) => {
  const o = [...document.querySelectorAll(".kkt-cell-kyhoc")].at(-1);
  fireEvent.click(o.querySelector('[role="combobox"]'));
  // Phải tìm TRONG bảng chọn đang mở: nhãn "Quý I" cũng là giá trị đang hiện
  // của những dòng đã kê ở quý đó.
  const chon = [...document.querySelectorAll('.select-panel [role="option"]')];
  fireEvent.click(chon.find((li) => li.textContent === nhan));
};

const goiApi = (url) =>
  apiFetch.mock.calls.find(
    ([duongDan, options]) => duongDan === url && options?.method,
  );

// jsdom không có scrollIntoView, mà cả SearchSelect lẫn banner lỗi đều gọi nó.
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => jest.clearAllMocks());

test("sáng kiến cũ vẫn hiển thị, khoá sửa và không chọn loại 1 khi thêm dòng", async () => {
  const item = banKe();
  item.ChiTiet[0] = { ...item.ChiTiet[0], LoaiThanhTich: 1, TenThanhTich: "Sáng kiến cũ", TenMuc: "Sáng kiến cấp Bộ" };
  item.TongHopTheoLoai = [{ LoaiThanhTich: 1, DiemDuocTinh: 0, TranDiem: 30, MaCanhBao: "SANG_KIEN_DA_CHUYEN", CanhBao: "Sáng kiến đã chuyển sang nguồn P_KH." }];
  const danhMuc = [...danhMucMacDinh(), { IdMuc: 2, LoaiThanhTich: 1, TenMuc: "Sáng kiến, cải tiến", LaLa: false }, { IdMuc: 21, IdCha: 2, LoaiThanhTich: 1, TenMuc: "Sáng kiến cấp Bộ", LaLa: true }];
  mockApi({ item, danhMuc });
  render(<KeKhaiThanhTich />);
  expect(await screen.findByDisplayValue("Sáng kiến cũ")).toBeDisabled();
  expect(screen.getByText("Sáng kiến đã chuyển sang nguồn P_KH.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Xem sáng kiến của tôi" })).toHaveAttribute("href", "/sang-kien");
  fireEvent.click(screen.getByRole("button", { name: /Kê khai thành tích/ }));
  expect(screen.queryByRole("button", { name: /Sáng kiến cấp Bộ/ })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: new RegExp(TEN_LA) })).toBeEnabled();
});

test("lưu thành tích khác giữ nguyên sáng kiến cũ chưa chốt trong payload để không bị xoá", async () => {
  const item = banKe();
  item.ChiTiet[0] = { ...item.ChiTiet[0], LoaiThanhTich: 1, TenThanhTich: "Sáng kiến cũ", SoQuyetDinh: "QĐ 12", NgayDatDuoc: "2026-02-10" };
  mockApi({ item, ghiDe: async () => ({ ok: true, json: async () => ({ Success: true, Item: item }) }) });
  render(<KeKhaiThanhTich />);
  fireEvent.change(await screen.findByDisplayValue("Thành tích bị trả về"), { target: { value: "Thành tích khác được sửa" } });
  fireEvent.click(screen.getByRole("button", { name: /^\s*Lưu\s*$/ }));
  await waitFor(() => expect(goiApi("ke-khai-thanh-tich/chi-tiet")).toBeTruthy());
  const body = JSON.parse(goiApi("ke-khai-thanh-tich/chi-tiet")[1].body);
  expect(body.ChiTiet.find((r) => r.IdChiTiet === 101)).toMatchObject({ IdMuc: 11, Quy: 1, TenThanhTich: "Sáng kiến cũ", SoQuyetDinh: "QĐ 12", NgayDatDuoc: "2026-02-10", SoLuong: 1 });
  expect(body.ChiTiet.find((r) => r.IdChiTiet === 103).TenThanhTich).toBe("Thành tích khác được sửa");
});

test("dòng chờ duyệt, đã chốt và trả về cùng nằm trên một bảng", async () => {
  mockApi();
  render(<KeKhaiThanhTich />);

  await screen.findByDisplayValue("Thành tích chờ duyệt");
  expect(screen.getByDisplayValue("Thành tích đã chốt")).toBeTruthy();
  expect(screen.getByDisplayValue("Thành tích bị trả về")).toBeTruthy();

  // Lý do trả về đọc được ngay tại dòng, không phải banner chung của bản kê.
  expect(screen.getByText(/Thiếu quyết định công nhận/)).toBeTruthy();
  expect(screen.getByText(/1 dòng được trả về để sửa/)).toBeTruthy();

  // Không còn dấu vết của luồng nộp.
  expect(screen.queryByRole("button", { name: /Nộp bản kê/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /Huỷ nộp/ })).toBeNull();
});

test("dòng đã chốt bị khoá nhưng vẫn kê thêm được thành tích mới", async () => {
  mockApi();
  render(<KeKhaiThanhTich />);

  const oChoDuyet = await screen.findByDisplayValue("Thành tích chờ duyệt");
  const oDaChot = screen.getByDisplayValue("Thành tích đã chốt");
  const oTraVe = screen.getByDisplayValue("Thành tích bị trả về");

  expect(oChoDuyet.disabled).toBe(false);
  expect(oTraVe.disabled).toBe(false);
  expect(oDaChot.disabled).toBe(true);

  // Chỉ hai dòng còn sửa được mới có nút gỡ; dòng đã chốt hiện ổ khoá.
  expect(screen.getAllByTitle(/Gỡ dòng này/)).toHaveLength(2);
  expect(
    screen.getAllByTitle(/Dòng đã chốt; cần đơn vị phụ trách mở lại/),
  ).toHaveLength(1);

  // Dòng đã chốt cũng không đính kèm / gỡ minh chứng được.
  expect(screen.queryByRole("button", { name: /Gỡ$/ })).toBeNull();

  // Nút kê khai thêm KHÔNG bị khoá bởi việc đã có dòng chốt.
  expect(
    screen.getByRole("button", { name: /Kê khai thành tích/ }).disabled,
  ).toBe(false);
});

test("dòng đã chốt bị loại khỏi payload lưu, chỉ gửi dòng còn sửa được", async () => {
  const ghiDe = jest.fn(async () => ({
    ok: true,
    json: async () => ({ Success: true, Item: banKe() }),
  }));
  mockApi({ ghiDe });
  render(<KeKhaiThanhTich />);

  const oTraVe = await screen.findByDisplayValue("Thành tích bị trả về");
  fireEvent.change(oTraVe, { target: { value: "Thành tích đã sửa" } });

  fireEvent.click(screen.getByRole("button", { name: /^\s*Lưu\s*$/ }));

  await waitFor(() =>
    expect(goiApi("ke-khai-thanh-tich/chi-tiet")).toBeTruthy(),
  );
  const [, options] = goiApi("ke-khai-thanh-tich/chi-tiet");
  const payload = JSON.parse(options.body);

  expect(options.method).toBe("PUT");
  expect(payload.ChiTiet.map((c) => c.IdChiTiet)).toEqual([101, 103]);
  expect(payload.ChiTiet[1].TenThanhTich).toBe("Thành tích đã sửa");
  // Không gửi điểm: server tự tính từ snapshot của mức.
  expect(payload.ChiTiet[0].DiemKeKhai).toBeUndefined();
});

test("minh chứng của dòng mới lên kho tạm rồi được gắn trong chính lần lưu", async () => {
  const ghiDe = jest.fn(async (url) => {
    if (url.startsWith("ke-khai-thanh-tich/minh-chung-tam")) {
      return {
        ok: true,
        json: async () => ({
          Success: true,
          Item: {
            IdMinhChungTt: 77,
            IdChiTiet: null,
            TenHienThi: "minh-chung.pdf",
            TenFileGoc: "minh-chung.pdf",
            KichThuocKb: 12,
          },
        }),
      };
    }
    return { ok: true, json: async () => ({ Success: true, Item: banKe() }) };
  });
  mockApi({
    item: { ...banKe(), ChiTiet: [], SoDong: 0, TrangThai: 1 },
    danhMuc: danhMucMacDinh({ YeuCauMinhChung: true }),
    ghiDe,
  });
  render(<KeKhaiThanhTich />);

  fireEvent.click(
    await screen.findByRole("button", { name: /Kê khai thành tích/ }),
  );
  fireEvent.click(
    await screen.findByRole("button", { name: new RegExp(TEN_LA) }),
  );

  // Dòng vừa thêm nằm CUỐI bảng, sau các dòng đã có sẵn của bản kê.
  const oTenMoi = screen.getAllByPlaceholderText(/Tên thành tích/).at(-1);
  fireEvent.change(oTenMoi, { target: { value: "Thành tích mới" } });
  chonQuyDongCuoi("Quý I");

  const file = new File(["%PDF-1.4"], "minh-chung.pdf", {
    type: "application/pdf",
  });
  const oFile = [...document.querySelectorAll('input[type="file"]')].at(-1);
  fireEvent.change(oFile, { target: { files: [file] } });

  await waitFor(() =>
    expect(
      goiApi(`ke-khai-thanh-tich/minh-chung-tam?idNam=${NAM}`),
    ).toBeTruthy(),
  );
  // Tệp đã nằm trên máy chủ nhưng CHƯA thuộc dòng nào.
  expect(await screen.findByText(/gắn vào dòng khi bấm Lưu/)).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: /^\s*Lưu\s*$/ }));

  await waitFor(() =>
    expect(goiApi("ke-khai-thanh-tich/chi-tiet")).toBeTruthy(),
  );
  const [, options] = goiApi("ke-khai-thanh-tich/chi-tiet");
  expect(JSON.parse(options.body).ChiTiet[0].IdMinhChung).toEqual([77]);
});

test("THIEU_MINH_CHUNG dùng ThuTu zero-based để trỏ đúng dòng mới", async () => {
  const ghiDe = jest.fn(async (url) => {
    if (url === "ke-khai-thanh-tich/chi-tiet") {
      return {
        ok: false,
        status: 422,
        json: async () => ({
          Success: false,
          ErrorCode: "THIEU_MINH_CHUNG",
          Message: "Thieu minh chung",
          // Dòng MỚI là phần tử thứ 2 của payload (101, 103, dòng mới) ⇒ ThuTu 2.
          DongCoVanDe: [
            { IdChiTiet: 0, ThuTu: 2, TenThanhTich: "Thành tích mới" },
          ],
        }),
      };
    }
    return { ok: true, json: async () => ({ Success: true, Item: banKe() }) };
  });
  mockApi({ danhMuc: danhMucMacDinh({ YeuCauMinhChung: true }), ghiDe });
  render(<KeKhaiThanhTich />);

  fireEvent.click(
    await screen.findByRole("button", { name: /Kê khai thành tích/ }),
  );
  fireEvent.click(
    await screen.findByRole("button", { name: new RegExp(TEN_LA) }),
  );
  // Dòng vừa thêm nằm CUỐI bảng, sau các dòng đã có sẵn của bản kê.
  const oTenMoi = screen.getAllByPlaceholderText(/Tên thành tích/).at(-1);
  fireEvent.change(oTenMoi, { target: { value: "Thành tích mới" } });
  chonQuyDongCuoi("Quý I");

  fireEvent.click(screen.getByRole("button", { name: /^\s*Lưu\s*$/ }));

  // Banner chỉ đích danh dòng, và dòng MỚI (không có IdChiTiet) được đánh dấu.
  const item = await screen.findByRole("button", { name: /Thành tích mới/ });
  expect(item).toBeTruthy();

  const oTen = screen.getByDisplayValue("Thành tích mới");
  const dongLoi = oTen.closest("tr");
  expect(dongLoi.className).toContain("kkt-row-loi");
  // Dòng đã có id thì KHÔNG bị đánh dấu nhầm.
  expect(
    screen.getByDisplayValue("Thành tích chờ duyệt").closest("tr").className,
  ).not.toContain("kkt-row-loi");
});
