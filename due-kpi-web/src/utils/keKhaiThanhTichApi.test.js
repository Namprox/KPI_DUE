import * as api from "./keKhaiThanhTichApi";
import { apiFetch } from "./api";

jest.mock("./api", () => ({ apiFetch: jest.fn() }));

const thanhCong = (body) => {
  apiFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  });
};

const thatBai = (status, body) => {
  apiFetch.mockResolvedValue({
    ok: false,
    status,
    json: async () => body,
  });
};

describe("keKhaiThanhTichApi - luồng xét theo dòng", () => {
  beforeEach(() => jest.clearAllMocks());

  test("dùng đúng trạng thái và thuật ngữ mới của từng dòng", () => {
    expect(api.TRANG_THAI_KE_KHAI).toEqual({
      KHONG_CO_DONG: 1,
      CON_CHO_DUYET: 2,
      TAT_CA_DA_CHOT: 3,
      CON_TRA_VE: 4,
    });
    expect(api.TRANG_THAI_DONG_TT).toEqual({
      CHO_DUYET: 1,
      DA_CHOT: 2,
      TRA_VE: 3,
    });
    expect(api.QUYET_DINH).toEqual({ CHOT: 2, TRA_VE: 3 });

    // Nhãn header là NHÃN DẪN XUẤT, không còn là bước trong vòng đời.
    expect(api.TRANG_THAI_KE_KHAI_META[1].label).toBe("Chưa có dòng");
    expect(api.TRANG_THAI_KE_KHAI_META[3].label).toBe("Tất cả đã chốt");
    expect(api.TRANG_THAI_KE_KHAI_META[4].label).toBe("Có dòng trả về");
    expect(api.TRANG_THAI_DONG_TT_META[2].label).toBe("Đã chốt");
    expect(api.TRANG_THAI_DONG_TT_META[3].label).toBe("Trả về");
  });

  test("nhật ký có 'Mở lại dòng đã chốt' và vẫn dịch được hành động cũ", () => {
    expect(api.HANH_DONG_TT.MO_LAI_DONG).toBe(10);
    expect(api.TEN_HANH_DONG_TT[5]).toBe("Chốt dòng");
    expect(api.TEN_HANH_DONG_TT[6]).toBe("Trả về dòng");
    expect(api.TEN_HANH_DONG_TT[10]).toBe("Mở lại dòng đã chốt");
    // Dữ liệu CŨ vẫn phải đọc được, nếu không nhật ký năm trước thành vô nghĩa.
    expect(api.TEN_HANH_DONG_TT[4]).toBe("Nộp bản kê");
    expect(api.TEN_HANH_DONG_TT[7]).toBe("Chốt bản kê");
  });

  test("chấp nhận bản kê ảo IdKeKhai = 0 khi chưa kê gì", async () => {
    thanhCong({
      Success: true,
      Item: { IdKeKhai: 0, IdNam: 2026, ChiTiet: [], TongHopTheoLoai: [] },
    });

    await expect(api.layBanKeCuaToi(2026)).resolves.toMatchObject({
      IdKeKhai: 0,
      ChiTiet: [],
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "ke-khai-thanh-tich/cua-toi?idNam=2026",
      undefined,
    );
  });

  test("bốn endpoint cấp bản kê của luồng nộp đã bị gỡ hẳn", () => {
    expect(api.nopBanKe).toBeUndefined();
    expect(api.huyNopBanKe).toBeUndefined();
    expect(api.chotBanKe).toBeUndefined();
    expect(api.traLaiBanKe).toBeUndefined();
  });

  test("upload kho tạm gắn đúng idNam và trả DTO có IdChiTiet = null", async () => {
    thanhCong({
      Success: true,
      Item: { IdMinhChungTt: 88, IdChiTiet: null, TenFileGoc: "qd.pdf" },
    });
    const file = new File(["%PDF-1.4"], "qd.pdf", { type: "application/pdf" });

    await expect(api.themMinhChungTam(2026, file)).resolves.toMatchObject({
      IdMinhChungTt: 88,
      IdChiTiet: null,
    });

    const [endpoint, options] = apiFetch.mock.calls[0];
    expect(endpoint).toBe("ke-khai-thanh-tich/minh-chung-tam?idNam=2026");
    expect(options.method).toBe("POST");
    expect(options.body.get("file")).toBe(file);
  });

  test("lưu chi tiết gửi IdMinhChung[] và không gửi điểm hay RowVersion", async () => {
    thanhCong({ Success: true, Item: { IdKeKhai: 12 } });

    await api.luuChiTiet(2026, [
      {
        IdChiTiet: null,
        IdMuc: 3,
        Quy: 2,
        TenThanhTich: "Sáng kiến A",
        SoLuong: 1,
        IdMinhChung: [88],
      },
    ]);

    const [endpoint, options] = apiFetch.mock.calls[0];
    expect(endpoint).toBe("ke-khai-thanh-tich/chi-tiet");
    expect(options.method).toBe("PUT");
    expect(JSON.parse(options.body)).toEqual({
      IdNam: 2026,
      ChiTiet: [
        {
          IdChiTiet: null,
          IdMuc: 3,
          Quy: 2,
          TenThanhTich: "Sáng kiến A",
          SoLuong: 1,
          IdMinhChung: [88],
        },
      ],
    });
  });

  test("THIEU_MINH_CHUNG mang theo DongCoVanDe kèm ThuTu của dòng mới", async () => {
    thatBai(422, {
      Success: false,
      ErrorCode: "THIEU_MINH_CHUNG",
      Message: "Thieu minh chung",
      DongCoVanDe: [
        {
          IdChiTiet: 0,
          ThuTu: 1,
          TenThanhTich: "Sáng kiến B",
          TenMuc: "Cấp Bộ",
        },
      ],
    });

    const error = await api.luuChiTiet(2026, []).catch((e) => e);
    expect(error.errorCode).toBe("THIEU_MINH_CHUNG");
    expect(error.dongCoVanDe).toEqual([
      { IdChiTiet: 0, ThuTu: 1, TenThanhTich: "Sáng kiến B", TenMuc: "Cấp Bộ" },
    ]);
  });

  test("có thông điệp tiếng Việt cho DONG_DA_CHOT và THIEU_LY_DO", async () => {
    expect(api.KKTT_ERROR_MESSAGES.DONG_DA_CHOT).toMatch(/đã được chốt/);
    expect(api.KKTT_ERROR_MESSAGES.THIEU_LY_DO).toMatch(/lý do/);

    thatBai(409, { Success: false, ErrorCode: "DONG_DA_CHOT", Message: "x" });
    const error = await api.luuChiTiet(2026, []).catch((e) => e);
    expect(error.message).toBe(api.KKTT_ERROR_MESSAGES.DONG_DA_CHOT);
    // FORBIDDEN_DONG vẫn phải mang DongCoVanDe dù lần này không có.
    expect(error.dongCoVanDe).toEqual([]);
  });

  test("hàng đợi truyền chiConChoDuyet theo contract mới", async () => {
    thanhCong({ Success: true, Items: [], PhanTrang: { TongSo: 0 } });

    await api.layDanhSachChoDuyet({
      idNam: 2026,
      chiConChoDuyet: 1,
      page: 1,
      pageSize: 20,
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "ke-khai-thanh-tich/cho-duyet?idNam=2026&chiConChoDuyet=1&page=1&pageSize=20",
      undefined,
    );

    // 0 là giá trị có nghĩa ("lấy hết"), không được rơi vào nhánh bỏ trống.
    await api.layDanhSachChoDuyet({ idNam: 2026, chiConChoDuyet: 0 });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "ke-khai-thanh-tich/cho-duyet?idNam=2026&chiConChoDuyet=0",
      undefined,
    );
  });

  test("chốt / trả về / mở lại đều đi qua endpoint duyệt chi tiết", async () => {
    thanhCong({ Success: true, Item: { IdKeKhai: 12 } });
    const quyetDinh = [
      { IdChiTiet: 7, QuyetDinh: 2, SoLuongDuyet: 2, NhanXet: null },
      { IdChiTiet: 8, QuyetDinh: 3, NhanXet: "Thiếu quyết định công nhận" },
    ];

    await api.duyetChiTiet(12, quyetDinh);

    const [endpoint, options] = apiFetch.mock.calls[0];
    expect(endpoint).toBe("ke-khai-thanh-tich/12/duyet-chi-tiet");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ QuyetDinh: quyetDinh });
  });

  test("quyền sửa và xét của từng dòng fail-closed khi thiếu cờ", () => {
    // Dòng mới ở client chưa có id nên luôn sửa được.
    expect(api.choPhepSuaDong({ idChiTiet: null })).toBe(true);
    expect(api.choPhepSuaDong({ idChiTiet: 1, ChoPhepSua: true })).toBe(true);
    expect(api.choPhepSuaDong({ idChiTiet: 1, choPhepSua: true })).toBe(true);
    expect(api.choPhepSuaDong({ idChiTiet: 1, ChoPhepSua: false })).toBe(false);
    // Thiếu cờ = khoá, không đoán theo trạng thái.
    expect(api.choPhepSuaDong({ idChiTiet: 1 })).toBe(false);

    expect(api.choPhepXetDong({ ChoPhepXet: true })).toBe(true);
    expect(api.choPhepXetDong({ ChoPhepXet: false })).toBe(false);
    expect(api.choPhepXetDong({})).toBe(false);

    expect(api.choPhepSua({ ChoPhepSua: true })).toBe(true);
    expect(api.choPhepSua({})).toBe(false);
    expect(api.choPhepDuyet({ ChoPhepDuyet: true })).toBe(true);
    expect(api.choPhepDuyet({})).toBe(false);
  });
});
