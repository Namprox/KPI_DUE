import {
  chonNamDanhGiaMacDinh,
  importThoiKhoaBieu,
  kiemTraFileThoiKhoaBieu,
  kiemTraImportTkb,
  quetAnhXaTuDong,
} from "./gioGiangTkbApi";
import { canAccessPath } from "../config/menuConfig";
import { apiFetch } from "./api";

jest.mock("./api", () => ({ apiFetch: jest.fn() }));

describe("gioGiangTkbApi validation", () => {
  beforeEach(() => jest.clearAllMocks());

  test("chỉ chấp nhận file Excel không quá 100 MB", () => {
    expect(kiemTraFileThoiKhoaBieu({ name: "tkb.xlsx" })).toBe("");
    expect(kiemTraFileThoiKhoaBieu({ name: "tkb.xls" })).toBe("");
    expect(kiemTraFileThoiKhoaBieu({ name: "tkb.pdf" })).toMatch(/\.xlsx/);
    expect(
      kiemTraFileThoiKhoaBieu({
        name: "tkb.xlsx",
        size: 101 * 1024 * 1024,
      }),
    ).toMatch(/100 MB/);
  });

  test("payload mới chỉ cần năm đánh giá và file Excel", () => {
    expect(
      kiemTraImportTkb({
        idNam: 2026,
        file: { name: "ThoiKhoaBieu.xlsx" },
      }),
    ).toBe("");
    expect(kiemTraImportTkb({ file: { name: "tkb.xlsx" } })).toMatch(
      /năm đánh giá/,
    );
  });

  test("mặc định chọn năm hiện tại, nếu chưa có thì chọn năm mới nhất", () => {
    const danhSachNam = [{ IdNam: 2027 }, { IdNam: 2026 }, { IdNam: 2025 }];

    expect(chonNamDanhGiaMacDinh(danhSachNam, 2026)).toBe("2026");
    expect(chonNamDanhGiaMacDinh(danhSachNam, 2028)).toBe("2027");
    expect(chonNamDanhGiaMacDinh([], 2026)).toBe("");
  });

  test("request import chỉ gửi file và idNam theo contract mới", async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ Success: true }),
    });
    const file = new File(["excel"], "tkb.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    await importThoiKhoaBieu({ file, idNam: 2026 });

    expect(apiFetch).toHaveBeenCalledTimes(1);
    const [endpoint, options] = apiFetch.mock.calls[0];
    expect(endpoint).toBe("gio-giang-tkb/import");
    expect(options.method).toBe("POST");
    expect(Array.from(options.body.keys())).toEqual(["file", "idNam"]);
    expect(options.body.get("idNam")).toBe("2026");
  });

  test("quét bổ sung ánh xạ gọi đúng endpoint và không gửi body", async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        Success: true,
        SoDongTuDongAnhXa: 3,
        SoDongChuaAnhXa: 2,
      }),
    });

    const result = await quetAnhXaTuDong(2026);

    expect(apiFetch).toHaveBeenCalledWith(
      "gio-giang-tkb/anh-xa/tu-dong?idNam=2026",
      { method: "POST" },
    );
    expect(result.SoDongTuDongAnhXa).toBe(3);
    expect(result.SoDongChuaAnhXa).toBe(2);
  });

  test("route quản lý khớp quyền import của API", () => {
    ["ADMIN", "HT"].forEach((role) => {
      expect(canAccessPath("/quan-ly-gio-giang", { MaChucVu: role })).toBe(true);
    });
    ["PHT", "TK", "TKL", "TP", "TBM"].forEach((role) => {
      expect(canAccessPath("/quan-ly-gio-giang", { MaChucVu: role })).toBe(false);
    });
  });
});
