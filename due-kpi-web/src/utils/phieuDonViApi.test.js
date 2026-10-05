import { apiFetch } from "./api";
import { fetchPhieuDonViList, fetchPhieuDonViKemLoai, duocChamDuyetDv, quyenPhieuDonVi } from "./phieuDonViApi";
jest.mock("./api", () => ({ apiFetch: jest.fn() }));
test("queue sends choToiCham=true without own-unit restriction", async () => {
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ Items: [{ IdPhieuDv: 7 }] }) });
  expect(await fetchPhieuDonViList({ choToiCham: true })).toEqual([{ IdPhieuDv: 7 }]);
  const query = new URLSearchParams(apiFetch.mock.calls[0][0].split("?")[1]);
  expect(query.get("choToiCham")).toBe("true");
  expect(query.has("idDonVi")).toBe(false);
});

describe("loại màn hình theo mẫu BE", () => {
  beforeEach(() => jest.clearAllMocks());
  test.each([[3, "khoa"], [4, "phong"]])("mẫu %s chọn %s kể cả tên đơn vị không cho biết loại", async (LoaiDoiTuong, loai) => {
    const phieu = { IdPhieuDv: 7, IdMau: 99, TenDonVi: "Đơn vị A" };
    apiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Item: phieu }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ Item: { LoaiDoiTuong } }) });
    expect(await fetchPhieuDonViKemLoai(7)).toEqual({ phieu, loai });
    expect(apiFetch.mock.calls.map(([url]) => url)).toEqual(["phieu-don-vi/7", "maudanhgia/99"]);
  });
  test.each([0, 1, 2, null, undefined])("loại mẫu %s không tự rơi về màn hình Khoa", async (LoaiDoiTuong) => {
    apiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Item: { IdMau: 99 } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ Item: { LoaiDoiTuong } }) });
    await expect(fetchPhieuDonViKemLoai(7)).rejects.toThrow("không thuộc loại KPI Khoa");
  });
  test.each([null, { IdPhieuDv: 7, IdMau: null }])("thiếu phiếu hoặc mẫu không gọi API mẫu", async (Item) => {
    apiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Item }) });
    await expect(fetchPhieuDonViKemLoai(7)).rejects.toThrow();
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });
  test("giữ lỗi quyền BE khi mẫu bị từ chối", async () => {
    apiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ Item: { IdMau: 99 } }) })
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({ Message: "Không được xem mẫu" }) });
    await expect(fetchPhieuDonViKemLoai(7)).rejects.toMatchObject({ message: "Không được xem mẫu", isForbidden: true });
  });
});
test.each([1, 3, 4, 5])("true flag does not allow editing in state %s", (TrangThai) => {
  expect(duocChamDuyetDv({ TrangThai }, { DuocChamDuyetDv: true })).toBe(false);
});
test("dual-role head can approve own unit and score only granted lines", () => {
  const p = { TrangThai: 2, IdDonVi: 10, ChiTiet: [{ DuocChamDuyetDv: true }, { DuocChamDuyetDv: false }] };
  const user = { DonVi: [{ IdDonVi: 20, MaChucVu: "TP" }, { IdDonVi: 10, MaChucVu: "TK" }] };
  const rights = quyenPhieuDonVi(p, user);
  expect(rights.coTheDuyetDv).toBe(true);
  expect(rights.coTheChamDuyetDv).toBe(true);
  expect(duocChamDuyetDv(p, p.ChiTiet[1])).toBe(false);
});
