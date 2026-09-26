import * as XLSX from "xlsx";

export const COT_TKB = {
  DH: ["KY_HOC", "MA_LOP_TIN_CHI", "MA_HOC_PHAN", "TEN_HOC_PHAN", "HoLot", "Ten", "SLSV_DangKyHoc", "SoTiet", "LoaiHinhGiangDay", "TenKhoa"],
  SDH: ["KYHOC", "Lop", "MA_HOC_PHAN", "TEN_HOC_PHAN", "Ho", "Ten", "SLSV_DangKyHoc", "SoTiet", "TenKhoa", "LoaiHinhGiangDay"],
};

export const taoMauGioGiangTkb = () => {
  const workbook = XLSX.utils.book_new();
  Object.entries(COT_TKB).forEach(([name, columns]) => {
    const sheet = XLSX.utils.aoa_to_sheet([columns]);
    sheet["!cols"] = columns.map((column) => ({ wch: Math.max(column.length + 2, 18) }));
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  });
  return workbook;
};

export const taiMauGioGiangTkb = () =>
  XLSX.writeFile(taoMauGioGiangTkb(), "Mau_GioGiang_DH_SDH.xlsx");
