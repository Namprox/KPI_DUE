export const TEN_NHOM_XEP_HANG = {
  1: "Giảng viên",
  2: "Viên chức / NLĐ",
  3: "Cán bộ quản lý",
};

const CAC_COT = ["SoNguoi", "SoNguoiMuc3", "SoMauSo", "SoDuDieuKien", "HanNgach"];

export const laGoiLegacy = (goi) =>
  !goi?.Nhom?.length || (goi.NgayDongGoi != null && goi.SoNguoiMuc3 == null);

// Không suy mẫu số hay hạn ngạch từ đầu người; giữ nguyên các key vắng mặt.
export const nhomHanNgachHienThi = (goi) => {
  if (laGoiLegacy(goi)) return [];
  const hienTai = goi.NgayDongGoi == null;
  return goi.Nhom.map((nhom) => ({
    ...nhom,
    ...Object.fromEntries(CAC_COT.map((cot) => [cot, nhom[hienTai ? `${cot}HienTai` : cot]])),
    SoDat: hienTai ? undefined : nhom.SoDat,
  }));
};

export const snapshotHanNgachDaDoi = (goi) =>
  !laGoiLegacy(goi) && goi.NgayDongGoi != null &&
  goi.Nhom.some((nhom) => CAC_COT.some((cot) => {
    const cu = nhom[cot];
    const moi = nhom[`${cot}HienTai`];
    return (cu == null) !== (moi == null) || (cu != null && Number(cu) !== Number(moi));
  }));

export const nhomDongHang = (loi) => {
  const nhom = loi?.dongHangNhom?.length ? loi.dongHangNhom : loi?.dongHang ? [loi.dongHang] : [];
  return nhom.map((n) => ({
    ...n,
    HoSo: (loi.hoSo || []).filter((h) => Number(h.NhomXepHang) === Number(n.Nhom)),
  }));
};

export const daChonDuSuatMoiNhom = (nhom, daChon) =>
  nhom.length > 0 && nhom.every((n) =>
    n.HoSo.filter((h) => h.DuDieuKienXuatSac === true && daChon.includes(h.IdPhieu)).length === Number(n.SoSuatConLai));
