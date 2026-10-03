import { ghepDiemTuDongPhieu } from "./diemTuDongPhieu";

const preview = { 1: { CongThucTongHop: "TTDT_HUY_CHUONG", DiemTuDong: 5, MinhChung: [{ LoaiNguon: 10, MaNguon: 8 }] } };
const criteria = [{ IdTieuChi: 1, LoaiNguonDiem: 2, CongThucTongHop: "TTDT_HUY_CHUONG" }];

test("phiếu cũ chấm tay giữ nguồn snapshot dù mẫu vừa được gán công thức tự động", () => {
  expect(ghepDiemTuDongPhieu(preview, [{ IdTieuChi: 1, LoaiNguonDiem: 1 }], criteria)).toEqual({});
});

test.each([0, 3, null])("phiếu tự động giữ điểm chính thức %s, không tự tính lại theo dữ liệu mới", (score) => {
  expect(ghepDiemTuDongPhieu(preview, [{ IdTieuChi: 1, LoaiNguonDiem: 2, CongThucSnapshot: "TTDT_HUY_CHUONG", DiemChinhThuc: score }], criteria)[1])
    .toMatchObject({ DiemTuDong: score, MinhChung: preview[1].MinhChung });
});

test("API xem trước bị lỗi vẫn khoá nguồn tự động, không biến null thành 0", () => {
  expect(ghepDiemTuDongPhieu({}, [], criteria)[1]).toMatchObject({ DiemTuDong: null, CongThucTongHop: "TTDT_HUY_CHUONG" });
});
