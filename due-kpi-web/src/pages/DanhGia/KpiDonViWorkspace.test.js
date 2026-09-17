import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import KpiDonViWorkspace from "./KpiDonViWorkspace";
import { useAuth } from "../../context/AuthContext";
import { fetchDonViList } from "../../utils/donViApi";
import { fetchPhieuDonViList, taoPhieuDonVi } from "../../utils/phieuDonViApi";

jest.mock("../../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../hooks/useNamDanhGia", () => ({ useNamDanhGia: () => ({ namList: [{ IdNam: 2026 }, { IdNam: 2025 }], selectedNam: "2026", dangTaiNam: false }) }));
jest.mock("../../utils/donViApi", () => ({ fetchDonViList: jest.fn() }));
jest.mock("../../utils/phieuDonViApi", () => ({ ...jest.requireActual("../../utils/phieuDonViApi"), fetchPhieuDonViList: jest.fn(), taoPhieuDonVi: jest.fn() }));
jest.mock("../../components/Common/SearchSelect", () => (props) => <select aria-label={props.options.some((o) => String(o.label).startsWith("Năm")) ? "Năm" : props.placeholder || "Trạng thái"} value={props.value} onChange={(e) => props.onChange(e.target.value)}>{!props.value && <option value="">Chọn</option>}{props.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>);
const mockSave = jest.fn();
let mockDirty = false;
jest.mock("./ChiTietPhieuDonVi", () => (props) => {
  require("react").useImperativeHandle(props.editorRef, () => ({ dirty: mockDirty, busy: false, save: mockSave }));
  return <div>Biểu mẫu {props.idPhieu}</div>;
});
jest.mock("./ChiTietPhieuPhong", () => () => <div>Biểu mẫu phòng</div>);
const user = { IdNhanVien: 1, DonVi: [{ IdDonVi: 10, MaChucVu: "TKK" }] };
const phieu = { IdPhieuDv: 7, IdDonVi: 10, IdNam: 2026, TrangThai: 1 };
function Location() { const location = useLocation(); return <><output data-testid="location">{location.search}</output><output data-testid="filters">{JSON.stringify(location.state?.kpiFilters)}</output></>; }
const mount = (props = {}, url = "/") => render(<MemoryRouter initialEntries={[url]}><KpiDonViWorkspace {...props} /><Location /></MemoryRouter>);
beforeEach(() => {
  jest.clearAllMocks(); mockDirty = false;
  useAuth.mockReturnValue({ user });
  fetchDonViList.mockResolvedValue([{ IdDonVi: 10, MaDonVi: "K_A", TenDonVi: "Khoa A" }, { IdDonVi: 11, MaDonVi: "K_B", TenDonVi: "Khoa B" }]);
  fetchPhieuDonViList.mockResolvedValue([phieu]);
  taoPhieuDonVi.mockResolvedValue(phieu);
});
test("một đơn vị mở trực tiếp; nhiều đơn vị cần chọn trước khi tra/tạo", async () => {
  const view = mount();
  await screen.findByText("Biểu mẫu 7");
  expect(taoPhieuDonVi).not.toHaveBeenCalled();
  view.unmount(); jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { ...user, DonVi: [...user.DonVi, { IdDonVi: 11, MaChucVu: "TKK" }] } });
  mount();
  await screen.findByText("Vui lòng chọn năm và đơn vị hợp lệ.");
  expect(fetchPhieuDonViList).not.toHaveBeenCalled();
  expect(taoPhieuDonVi).not.toHaveBeenCalled();
});
test("lịch sử truyền bộ lọc server, giữ bộ lọc trong state, URL sạch, không tạo", async () => {
  mount({ lichSu: true }, "/?idDonVi=10&idNam=&trangThai=1&page=2");
  const button = await screen.findByRole("button", { name: "Xem chi tiết" });
  expect(fetchPhieuDonViList).toHaveBeenCalledWith(expect.objectContaining({ idNam: undefined, idDonVi: "10", trangThai: "1", page: 2, pageSize: 20 }));
  fireEvent.click(button);
  expect(screen.getByTestId("location").textContent).toBe("");
  expect(JSON.parse(screen.getByTestId("filters").textContent)).toEqual({ idNam: "", idDonVi: "10", trangThai: "1", page: "2", sortBy: "ngay_tao" });
  expect(taoPhieuDonVi).not.toHaveBeenCalled();
});
test("đổi năm có bản nháp: lưu lỗi ở lại, lưu thành công mới chuyển", async () => {
  mockDirty = true; mockSave.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  mount();
  await screen.findByText("Biểu mẫu 7");
  fireEvent.change(screen.getByLabelText("Năm"), { target: { value: "2025" } });
  fireEvent.click(screen.getByText("Lưu và chuyển"));
  await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
  expect(screen.getByTestId("location").textContent).toBe("");
  fireEvent.click(await screen.findByText("Lưu và chuyển"));
  await waitFor(() => expect(JSON.parse(screen.getByTestId("filters").textContent).idNam).toBe("2025"));
});
test("kết quả cũ về muộn không thay phiếu mới và không tạo phiếu cũ", async () => {
  let finish;
  fetchPhieuDonViList.mockImplementation(({ idNam }) => idNam === "2026" ? new Promise((resolve) => { finish = resolve; }) : Promise.resolve([{ ...phieu, IdNam: 2025, IdPhieuDv: 8 }]));
  mount();
  await waitFor(() => expect(finish).toBeDefined());
  fireEvent.change(screen.getByLabelText("Năm"), { target: { value: "2025" } });
  await screen.findByText("Biểu mẫu 8");
  finish([]);
  await waitFor(() => expect(screen.queryByText("Biểu mẫu 7")).toBeNull());
  expect(taoPhieuDonVi).not.toHaveBeenCalled();
});

function HistoryBack() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Browser Back</button>;
}
test("Back khôi phục bộ lọc trước đó và tải lại bằng history state giữ URL sạch", async () => {
  render(<MemoryRouter initialEntries={[{ pathname: "/lich-su-danh-gia-khoa", state: { kpiFilters: { idNam: "2025", idDonVi: "10", page: "2" } } }]}>
    <KpiDonViWorkspace lichSu /><Location /><HistoryBack />
  </MemoryRouter>);
  await screen.findByRole("button", { name: "Xem chi tiết" });
  expect(screen.getByLabelText("Năm").value).toBe("2025");
  fireEvent.change(screen.getByLabelText("Năm"), { target: { value: "2026" } });
  await waitFor(() => expect(fetchPhieuDonViList).toHaveBeenLastCalledWith(expect.objectContaining({ idNam: "2026", page: 1 })));
  fireEvent.click(screen.getByText("Browser Back"));
  await waitFor(() => expect(fetchPhieuDonViList).toHaveBeenLastCalledWith(expect.objectContaining({ idNam: "2025", page: 2 })));
  expect(screen.getByTestId("location").textContent).toBe("");
});
