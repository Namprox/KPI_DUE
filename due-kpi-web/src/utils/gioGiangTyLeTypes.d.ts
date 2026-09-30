export interface TyLeHoanThanhGioGiang {
  IdNhanVien: number;
  MaNhanVien?: string | null;
  HoTen?: string | null;
  IdNam: number;
  IdDonVi?: number | null;
  MaDonVi?: string | null;
  TenDonVi?: string | null;
  MaChucDanh?: string | null;
  TenChucDanh?: string | null;
  DinhMucGoc?: number | null;
  DinhMucApDung?: number | null;
  SoThangNam?: number | null;
  SoThangMien?: number | null;
  TyLeHoanThanh?: number | null;
  DiemDuKien?: number | null;
  DiemToiDa: number;
  LyDo?: string | null;
  CanhBao?: string | null;
  GiamChuaVaoTruong: number;
  GiamTapSu: number;
  GiamNghi: number;
  GiamDaoTao: number;
  GiamChucVu: number;
  GiamConNho10: number;
  GiamCongDoan: number;
  GiamConNho40: number;
  GiamDacBietHt: number;
  DieuChinhSan0: number;
  GioTkb: number;
  GioKeKhai: number;
  GioQndb: number;
  TongGio: number;
}

/** Same response envelope as the existing teaching-hours routes. */
export interface GioGiangTkbResponse {
  Success: boolean;
  Message?: string;
  SoDongChuaAnhXa?: number;
  TyLeHoanThanh?: TyLeHoanThanhGioGiang[];
  DienGiai?: DienGiaiGioGiang[] | null;
}

export interface DienGiaiGioGiang {
  IdNhanVien: number;
  ThuTu: number;
  KhoanMuc: string;
  SoGio?: number | null;
  TuNgay?: string | null;
  DenNgay?: string | null;
  NguonTuNgay?: string | null;
  NguonDenNgay?: string | null;
  KhoiTuNgay?: string | null;
  KhoiDenNgay?: string | null;
  KhoiSoThang?: number | null;
  SoThang?: number | null;
  CongThuc?: string | null;
  GhiChu?: string | null;
  TenNguon?: string | null;
  TyLe?: number | null;
  GioNam?: number | null;
  NgaySinhCon?: string | null;
  IdGioGiangTkb?: number | null;
  SoLop?: number | null;
  SoTiet?: number | null;
  IdKeKhai?: number | null;
  IdChucVu?: number | null;
  MauSo?: number | null;
  SoNgay?: number | null;
}
