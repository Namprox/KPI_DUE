import { apiFetch } from "./api";
import { fetchPhieuDonViList, duocChamDuyetDv, quyenPhieuDonVi } from "./phieuDonViApi";
jest.mock("./api", () => ({ apiFetch: jest.fn() }));
test("queue sends choToiCham=true without own-unit restriction", async () => {
  apiFetch.mockResolvedValue({ ok: true, json: async () => ({ Items: [{ IdPhieuDv: 7 }] }) });
  expect(await fetchPhieuDonViList({ choToiCham: true })).toEqual([{ IdPhieuDv: 7 }]);
  const query = new URLSearchParams(apiFetch.mock.calls[0][0].split("?")[1]);
  expect(query.get("choToiCham")).toBe("true");
  expect(query.has("idDonVi")).toBe(false);
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
