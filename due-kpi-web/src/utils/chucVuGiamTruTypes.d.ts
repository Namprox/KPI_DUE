export type LoaiGiamTru = 'dinh_muc_phan_tram' | 'gio_chuan_co_dinh';
export interface ChucVuGiamTru {
  IdChucVu: number;
  MaChucVu: string;
  TenChucVu: string;
  TrangThai: boolean;
  IdNam: number;
  IdNamNguon: number | null;
  LaKeThua: boolean;
  DaCauHinh: boolean;
  ChoPhepSua: boolean;
  LoaiGiamTru: LoaiGiamTru | null;
  TyLeDinhMucGiang: number | null;
  GioGiamTruNam: number | null;
  GhiChuDieuKien: string | null;
  SaoChepTuNam: number | null;
  IdNguoiCapNhat: number | null;
  HoTenNguoiCapNhat: string | null;
  NgayCapNhat: string | null;
}
export interface NhanVienChucVuGiamTru {
  IdChucVu?: number | null;
  LoaiGiamTru: LoaiGiamTru | null;
  TyLeDinhMucGiang: number | null;
  GioGiamTruNam: number | null;
  IdNamGiamTru: number | null;
  IdNamNguonGiamTru: number | null;
}
export interface DinhMucApDung {
  GioGiangBase: number;
  GioGiangApDung: number;
  TenChucDanh?: string | null;
  IdChucVuApDung: number | null;
  TenChucVuApDung: string | null;
  TyLeGiangChucVu: number;
  LoaiGiamTruChucVu: LoaiGiamTru | null;
  GioGiamTruChucVu: number | null;
  IdNamNguonGiamTru: number | null;
  LyDoDieuChinh: string | null;
}
