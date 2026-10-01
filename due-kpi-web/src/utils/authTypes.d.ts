export interface AuthUserDonVi {
  IdDonVi: number;
  MaDonVi?: string;
  TenDonVi?: string;
  MaChucVu?: string;
  LaChinh?: boolean;
  /** 0: miễn KPI; null/vắng: chưa có phân loại từ DB. */
  LoaiDoiTuong?: 0 | 1 | 2 | null;
}

export interface AuthUser {
  IdNhanVien: number;
  MaNhanVien?: string;
  MaChucDanh?: string | null;
  MaChucVu?: string;
  DonVi?: AuthUserDonVi[];
}
