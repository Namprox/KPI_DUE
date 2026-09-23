import {
  fetchChiTietMauDanhGia,
  fetchDanhSachPhieuQuy,
  fetchDiemTuDongMau,
  fetchPhieuQuyCuaToi,
  khoangDiemVienChuc,
  lapTieuChiMauTheoId,
  queryStringPhieuQuy,
  taoTieuChiHienThiQuy,
  trangThaiPhieuQuy,
} from "./phieuQuyApi";
import { apiFetch } from "./api";

jest.mock("./api", () => ({ apiFetch: jest.fn() }));

describe("quy tắc giao diện phiếu quý viên chức", () => {
  beforeEach(() => {
    apiFetch.mockReset();
  });

  test("suy đúng sàn và trần cho tiêu chí cộng điểm", () => {
    expect(khoangDiemVienChuc(10)).toEqual({ san: -10, tran: 10 });
  });

  test("suy đúng sàn và trần cho tiêu chí chỉ trừ điểm", () => {
    expect(khoangDiemVienChuc(-100)).toEqual({ san: -100, tran: 0 });
  });

  test("ưu tiên nhãn trạng thái API thay vì map số của FE", () => {
    expect(
      trangThaiPhieuQuy({
        TrangThai: 2,
        TrangThaiText: "Chờ Trưởng phòng duyệt",
      }),
    ).toBe("Chờ Trưởng phòng duyệt");
  });

  test("không gửi query rỗng và giữ đúng id đơn vị kiêm nhiệm", () => {
    expect(
      queryStringPhieuQuy({ idNam: 2026, quy: 4, idDonVi: 12, page: null }),
    ).toBe("?idNam=2026&quy=4&idDonVi=12");
  });

  test("gom giao diện theo TenNhom thay vì LoaiNhom", () => {
    const nhomCoBan = taoTieuChiHienThiQuy({
      IdNhom: 6,
      TenNhom: "I. Nhóm các tiêu chí liên quan đến nhiệm vụ cơ bản",
      LoaiNhom: 1,
    });
    const nhomVuotTroi = taoTieuChiHienThiQuy({
      IdNhom: 7,
      TenNhom: "II. Nhóm các tiêu chí liên quan đến thành tích vượt trội",
      LoaiNhom: 1,
    });

    expect(nhomCoBan.IdNhomCha).not.toBe(nhomVuotTroi.IdNhomCha);
    expect(nhomCoBan.TenNhomCha).toBe(nhomCoBan.TenNhom);
    expect(nhomVuotTroi.TenNhomCha).toBe(nhomVuotTroi.TenNhom);
    expect(nhomVuotTroi.LoaiNhom).toBe(1);
  });

  test("lấy điểm tự động đúng mẫu, nhân viên và quý", async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        Quy: 1,
        Items: [
          { IdTieuChi: 49, DiemTuDong: 65, ApDungQuy: true },
          { IdTieuChi: 50, DiemTuDong: 30, ApDungQuy: false },
        ],
      }),
    });

    await expect(
      fetchDiemTuDongMau({ idMau: 7, idNhanVien: 47, quy: 1 }),
    ).resolves.toEqual([
      { IdTieuChi: 49, DiemTuDong: 65, ApDungQuy: true, Quy: 1 },
      { IdTieuChi: 50, DiemTuDong: 30, ApDungQuy: false, Quy: 1 },
    ]);
    expect(apiFetch).toHaveBeenCalledWith(
      "maudanhgia/7/diem-tu-dong?idNhanVien=47&quy=1",
      undefined,
    );
  });

  test("đọc MoTa của tiêu chí trực tiếp và tiêu chí trong nhóm con", () => {
    const map = lapTieuChiMauTheoId({
      Nhom: [
        {
          TieuChi: [{ IdTieuChi: 49, MoTa: "Mô tả tiêu chí 49" }],
          NhomCon: [
            {
              TieuChi: [{ IdTieuChi: 50, MoTa: "Mô tả tiêu chí 50" }],
            },
          ],
        },
      ],
    });

    expect(map[49].MoTa).toBe("Mô tả tiêu chí 49");
    expect(map[50].MoTa).toBe("Mô tả tiêu chí 50");
  });

  test("gọi đúng endpoint chi tiết mẫu đánh giá", async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ Item: { IdMau: 7, Nhom: [] } }),
    });

    await expect(fetchChiTietMauDanhGia(7)).resolves.toEqual({
      IdMau: 7,
      Nhom: [],
    });
    expect(apiFetch).toHaveBeenCalledWith("maudanhgia/7/chi-tiet", undefined);
  });

  test("tải danh sách phiếu quý của đúng nhân viên và giữ thông tin phân trang", async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        Items: [{ IdPhieu: 31, IdNam: 2026, Quy: 3 }],
        TotalCount: 1,
      }),
    });

    await expect(
      fetchDanhSachPhieuQuy({
        idNam: 2026,
        idNhanVien: 47,
        quy: 3,
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toEqual({
      items: [{ IdPhieu: 31, IdNam: 2026, Quy: 3 }],
      total: 1,
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "phieu-quy?idNam=2026&idNhanVien=47&quy=3&page=1&pageSize=20",
      undefined,
    );
  });

  test("tải chi tiết phiếu quý của chính mình theo năm, quý và đơn vị", async () => {
    apiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        Item: { IdPhieu: 31, IdNam: 2026, Quy: 3, ChiTiet: [] },
      }),
    });

    await expect(
      fetchPhieuQuyCuaToi({ idNam: 2026, quy: 3, idDonVi: 12 }),
    ).resolves.toMatchObject({ IdPhieu: 31, Quy: 3, ChiTiet: [] });
    expect(apiFetch).toHaveBeenCalledWith(
      "phieu-quy/cua-toi?idNam=2026&quy=3&idDonVi=12",
      undefined,
    );
  });
});
