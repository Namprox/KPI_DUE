using System;

namespace KPI.Models
{
    public class QL_NhanVien
    {
        public int IdNhanVien { get; set; }
        public string MaNhanVien { get; set; }
        public string HoTen { get; set; }
        public string Email { get; set; }
        public string MatKhau { get; set; }
        public int IdDonVi { get; set; }
        public int? IdChucVu { get; set; }
        public int? IdQuanLyTrucTiep { get; set; }
        public int? IdChucDanh { get; set; }
        public int? ScienceUserId { get; set; }
        public bool TrangThai { get; set; }
        public DateTime NgayTao { get; set; }
        public string RefreshTokenHash { get; set; }
        public DateTime? RefreshTokenHetHan { get; set; }
        public string TenDonVi { get; set; }
        public string TenChucVu { get; set; }
        public string TenChucDanh { get; set; }
    }
}