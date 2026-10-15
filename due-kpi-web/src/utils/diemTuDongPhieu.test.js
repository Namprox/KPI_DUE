import { diemHienThiTuDong, ghepDiemTuDongPhieu, thoiDiemGhiDiemTuDong, thongBaoLoiTongHopTuDong } from "./diemTuDongPhieu";

const item = { IdChiTiet: 10, IdTieuChi: 1, CongThucTongHop: "TTDT_HUY_CHUONG", DiemTuDong: 5, MinhChung: [{ LoaiNguon: 10, MaNguon: 8 }] };
const criteria = [{ IdTieuChi: 1, LoaiNguonDiem: 2, CongThucTongHop: "TTDT_HUY_CHUONG" }];
const snapshot = (extra) => ({ IdChiTiet: 10, IdTieuChi: 1, LoaiNguonDiem: 2, CongThucSnapshot: "TTDT_HUY_CHUONG", ...extra });

test("phiếu cũ chấm tay giữ nguồn snapshot dù mẫu vừa được gán công thức tự động", () => {
  expect(ghepDiemTuDongPhieu({ Items: [item] }, [{ IdChiTiet: 10, IdTieuChi: 1, LoaiNguonDiem: 1 }], criteria)).toEqual({});
});

test.each([0, 3, null])("phiếu tự động giữ điểm chính thức %s, không tự tính lại theo dữ liệu mới", (score) => {
  const response = { LaPhieuNhanTuDong: true, Items: [{ ...item, DiemDaGhi: score ?? 0, DiemChinhThuc: score ?? undefined, CanChamLai: true }] };
  const info = ghepDiemTuDongPhieu(response, [snapshot({ DiemChinhThuc: score })], criteria)[1];
  expect(diemHienThiTuDong(info)).toEqual({ diem: score, duKien: false });
  expect(info).toMatchObject({ DiemTuDong: 5, MinhChung: item.MinhChung, TuDongTheoPhieu: true });
});

test("API xem trước bị lỗi vẫn khoá nguồn tự động, không biến null thành 0", () => {
  const info = ghepDiemTuDongPhieu(undefined, [], criteria)[1];
  expect(info).toMatchObject({ CongThucTongHop: "TTDT_HUY_CHUONG" });
  expect(diemHienThiTuDong(info)).toEqual({ diem: null, duKien: false });
});

test("chưa có `/tu-dong` thì dùng điểm đã ghi trên ChiTiet, không phải dự kiến", () => {
  const info = ghepDiemTuDongPhieu(null, [snapshot({ DiemTuDong: 4 })])[1];
  expect(info.TuDongTheoPhieu).toBeUndefined();
  expect(diemHienThiTuDong(info)).toEqual({ diem: 4, duKien: false });
});

test("chưa có phiếu: xem trước theo mẫu ghép theo IdTieuChi và là điểm dự kiến", () => {
  const info = ghepDiemTuDongPhieu({ Items: [{ IdTieuChi: 1, DiemTuDong: 5 }] }, [], [{ IdTieuChi: 1 }])[1];
  expect(diemHienThiTuDong(info)).toEqual({ diem: 5, duKien: true });
});

test("phiếu không nhận điểm tự động ẩn lý do của BE", () => {
  const response = { LaPhieuNhanTuDong: false, Items: [{ IdChiTiet: 10, IdTieuChi: 1, MinhChung: [], LyDoDiemTuDong: "Không tìm thấy dữ liệu..." }] };
  const info = ghepDiemTuDongPhieu(response, [snapshot()])[1];
  expect(info.LyDoDiemTuDong).toBeUndefined();
  expect(info.LaPhieuNhanTuDong).toBe(false);
});

test.each([
  [0, 1, /khi nộp phiếu\./], [0, 2, /Tổng hợp tự động/], [0, 3, /không tự đổi.*Trưởng khoa/], [0, 5, /mở lại phiếu/],
  [2, 2, /Trưởng đơn vị chốt phiếu quý/], [2, 5, /không tự đổi/],
])("thời điểm ghi điểm theo phiếu quý %s, trạng thái %s", (Quy, TrangThaiPhieu, text) => {
  expect(thoiDiemGhiDiemTuDong({ Quy, TrangThaiPhieu })).toMatch(text);
});

test.each([
  [403, "Chi truong don vi hoac Admin moi duoc cham tu dong.", /trưởng đơn vị hoặc Admin/],
  [400, "Day la phieu theo quy, khong dung duoc thao tac cua phieu nam.", /Phiếu quý/],
  [400, "Khong co quyen cham tu dong cho phieu cua don vi nay.", /không có quyền.*đơn vị này/],
  [409, "Chi cham tu dong khi phieu dang nhap (1) hoac da nop (2).", /Nháp hoặc Đang thẩm định/],
  [409, "Diem tu dong cua nam nay da thuoc ve phieu #812 ...", /phiếu #812/],
  [400, "Loi CSDL", /thất bại/],
])("lỗi tổng hợp %s dùng câu của FE", (status, rawMessage, text) => {
  expect(thongBaoLoiTongHopTuDong({ status, rawMessage })).toMatch(text);
});
