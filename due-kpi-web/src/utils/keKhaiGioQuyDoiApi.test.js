import * as api from "./keKhaiGioQuyDoiApi";
import { apiFetch } from "./api";

jest.mock("./api", () => ({ apiFetch: jest.fn() }));

const thanhCong = (body) => {
  apiFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  });
};

describe("keKhaiGioQuyDoiApi - luồng duyệt theo dòng", () => {
  beforeEach(() => jest.clearAllMocks());

  test("dùng đúng trạng thái và thuật ngữ mới của từng dòng", () => {
    expect(api.TRANG_THAI_KE_KHAI).toEqual({
      KHONG_CO_DONG: 1,
      CON_CHO_DUYET: 2,
      TAT_CA_DA_CHOT: 3,
      CON_TRA_VE: 4,
    });
    expect(api.TRANG_THAI_DONG_KK).toEqual({
      CHO_DUYET: 1,
      DA_CHOT: 2,
      TRA_VE: 3,
    });
    expect(api.QUYET_DINH).toEqual({ CHOT: 2, TRA_VE: 3 });
    expect(api.TRANG_THAI_DONG_KK_META[2].label).toBe("Đã chốt");
    expect(api.TRANG_THAI_DONG_KK_META[3].label).toBe("Trả về");
  });

  test("chấp nhận header ảo IdKeKhai = 0 khi chỉ đọc bản kê", async () => {
    thanhCong({
      Success: true,
      Item: { IdKeKhai: 0, IdNam: 2026, ChiTiet: [] },
    });

    await expect(api.layBanKeCuaToi(2026)).resolves.toMatchObject({
      IdKeKhai: 0,
      ChiTiet: [],
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "ke-khai-gio-quy-doi/cua-toi?idNam=2026",
      undefined,
    );
  });

  test("lưu chi tiết không gửi RowVersion hay trạng thái header", async () => {
    thanhCong({ Success: true, Item: { IdKeKhai: 12 } });

    await api.luuChiTiet(2026, [
      { IdChiTiet: 7, IdCongViec: 3, SoLuong: 2 },
    ]);

    const [endpoint, options] = apiFetch.mock.calls[0];
    expect(endpoint).toBe("ke-khai-gio-quy-doi/chi-tiet");
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({
      IdNam: 2026,
      ChiTiet: [{ IdChiTiet: 7, IdCongViec: 3, SoLuong: 2 }],
    });
  });

  test("hàng đợi gửi chiConChoDuyet theo contract mới", async () => {
    thanhCong({ Success: true, Items: [], PhanTrang: { TongSo: 0 } });

    await api.layDanhSachChoDuyet({
      idNam: 2026,
      chiConChoDuyet: 1,
      page: 1,
      pageSize: 20,
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "ke-khai-gio-quy-doi/cho-duyet?idNam=2026&chiConChoDuyet=1&page=1&pageSize=20",
      undefined,
    );
  });

  test("chốt hoặc trả về chỉ qua endpoint duyệt chi tiết", async () => {
    thanhCong({ Success: true, Item: { IdKeKhai: 12 } });
    const quyetDinh = [
      { IdChiTiet: 7, QuyetDinh: 2, SoLuongDuyet: 2, NhanXet: null },
      { IdChiTiet: 8, QuyetDinh: 3, NhanXet: "Thiếu minh chứng" },
    ];

    await api.duyetChiTiet(12, quyetDinh);

    const [endpoint, options] = apiFetch.mock.calls[0];
    expect(endpoint).toBe("ke-khai-gio-quy-doi/12/duyet-chi-tiet");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ QuyetDinh: quyetDinh });
    expect(api.nopBanKe).toBeUndefined();
    expect(api.huyNopBanKe).toBeUndefined();
    expect(api.chotBanKe).toBeUndefined();
    expect(api.traLaiBanKe).toBeUndefined();
  });

  test("quyền sửa và xét fail-closed theo cờ từng dòng", () => {
    expect(api.choPhepSuaDong({ idChiTiet: null })).toBe(true);
    expect(api.choPhepSuaDong({ idChiTiet: 1, ChoPhepSua: true })).toBe(true);
    expect(api.choPhepSuaDong({ idChiTiet: 1, ChoPhepSua: false })).toBe(false);
    expect(api.choPhepXetDong({ ChoPhepXet: true })).toBe(true);
    expect(api.choPhepXetDong({})).toBe(false);
  });
});
