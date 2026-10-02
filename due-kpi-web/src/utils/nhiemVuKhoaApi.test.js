import { apiFetch } from "./api";
import {
  layDanhSachNhiemVu,
  layGiangVien,
  layNhiemVuCuaToi,
  luuNhiemVu,
  xetNhiemVu,
  canKeKhaiNhiemVu,
  canSuaNhiemVu,
  canXetNhiemVu,
  canXoaNhiemVu,
} from "./nhiemVuKhoaApi";
jest.mock("./api", () => ({ apiFetch: jest.fn() }));
const ok = (body) => ({
  ok: true,
  json: async () => ({ Success: true, ...body }),
});
beforeEach(() => apiFetch.mockReset());

test("lọc hàng đợi bằng trangThai; bỏ trống là tất cả", async () => {
  apiFetch.mockResolvedValue(ok({ Items: [] }));
  await layDanhSachNhiemVu({ idNam: 2026, idDonVi: 7, trangThai: 1 });
  expect(apiFetch.mock.calls[0][0]).toBe(
    "nhiem-vu-khoa?idNam=2026&idDonVi=7&trangThai=1",
  );
  await layDanhSachNhiemVu({ idNam: 2026, idDonVi: 7, trangThai: "" });
  expect(apiFetch.mock.calls[1][0]).not.toContain("trangThai");
});

test.each([undefined, 501])(
  "lưu id=%s chỉ gửi DTO phối hợp, giữ Item/Message",
  async (id) => {
    const envelope = {
      Item: { IdNhiemVuKhoa: 501, TrangThai: 3 },
      Message: "Khong co thay doi",
    };
    apiFetch.mockResolvedValue(ok(envelope));
    expect(
      await luuNhiemVu({
        id,
        idNam: 2026,
        idDonVi: 7,
        idNhomNv: 3,
        tenNhiemVu: " Hội thảo ",
        phanCong: [
          { IdNhanVien: 5, IdVaiTro: 3, LaChuTri: true },
          {
            IdNhanVien: "88",
            IdVaiTro: "2",
            GhiChu: " Nội dung ",
            DiemSnapshot: 99,
          },
        ],
      }),
    ).toMatchObject(envelope);
    const [url, options] = apiFetch.mock.calls[0];
    expect(url).toBe(id ? "nhiem-vu-khoa/501" : "nhiem-vu-khoa");
    expect(options.method).toBe(id ? "PUT" : "POST");
    expect(JSON.parse(options.body)).toEqual({
      IdNam: 2026,
      IdDonVi: 7,
      IdNhomNv: 3,
      TenNhiemVu: "Hội thảo",
      MoTa: null,
      PhanCong: [{ IdNhanVien: 88, IdVaiTro: 2, GhiChu: "Nội dung" }],
    });
  },
);

test.each([
  [2, undefined, { TrangThai: 2 }],
  [3, " Thiếu minh chứng ", { TrangThai: 3, LyDo: "Thiếu minh chứng" }],
])("xét %s gửi POST PascalCase", async (trangThai, lyDo, body) => {
  apiFetch.mockResolvedValue(ok({ Item: { TrangThai: trangThai } }));
  expect(await xetNhiemVu(501, { trangThai, lyDo })).toEqual({
    TrangThai: trangThai,
  });
  expect(apiFetch).toHaveBeenCalledWith("nhiem-vu-khoa/501/xet", {
    method: "POST",
    body: JSON.stringify(body),
  });
});

test("điểm vắng mặt không biến thành 0; Header chưa có IdKy vẫn kê khai được", async () => {
  apiFetch.mockResolvedValueOnce(
    ok({ Items: [{ IdNhanVien: 88, HoTen: "A" }] }),
  );
  expect(await layGiangVien({ idNam: 2026, idDonVi: 7 })).toEqual([
    { IdNhanVien: 88, HoTen: "A" },
  ]);
  apiFetch.mockResolvedValueOnce(
    ok({ Item: { Header: { IdDonVi: 7, CanKeKhai: true } } }),
  );
  const result = await layNhiemVuCuaToi(2026);
  expect(result.Items).toEqual([]);
  expect(canKeKhaiNhiemVu(result.Header)).toBe(true);
});

test("quyền ghi fail closed, không suy từ chức vụ hay cờ cũ", () => {
  expect(canSuaNhiemVu({ MaChucVu: "TK", TrangThai: 1 })).toBe(false);
  expect(canXetNhiemVu({ MaChucVu: "TK", TrangThai: 1 })).toBe(false);
  expect(canKeKhaiNhiemVu({ CanNhap: true })).toBe(false);
  expect(canXoaNhiemVu({}, { CanChot: true })).toBe(false);
  expect(
    canXoaNhiemVu({ ChoPhepSua: false }, { CanDuyet: true, TrangThai: 1 }),
  ).toBe(true);
  expect(
    canXoaNhiemVu({ ChoPhepSua: true }, { CanDuyet: true, TrangThai: 2 }),
  ).toBe(false);
});
