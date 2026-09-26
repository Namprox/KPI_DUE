import * as XLSX from "xlsx";
import { taoMauGioGiangTkb } from "./gioGiangTkbTemplate";

test("file mẫu tải xuống có hai sheet với tên cột đúng hợp đồng", () => {
  const binary = XLSX.write(taoMauGioGiangTkb(), { type: "array", bookType: "xlsx" });
  const workbook = XLSX.read(binary, { type: "array" });
  expect(workbook.SheetNames).toEqual(["DH", "SDH"]);
  expect(XLSX.utils.sheet_to_json(workbook.Sheets.DH, { header: 1 })[0]).toEqual([
    "KY_HOC", "MA_LOP_TIN_CHI", "MA_HOC_PHAN", "TEN_HOC_PHAN", "HoLot", "Ten", "SLSV_DangKyHoc", "SoTiet", "LoaiHinhGiangDay", "TenKhoa",
  ]);
  expect(XLSX.utils.sheet_to_json(workbook.Sheets.SDH, { header: 1 })[0]).toEqual([
    "KYHOC", "Lop", "MA_HOC_PHAN", "TEN_HOC_PHAN", "Ho", "Ten", "SLSV_DangKyHoc", "SoTiet", "TenKhoa", "LoaiHinhGiangDay",
  ]);
});
