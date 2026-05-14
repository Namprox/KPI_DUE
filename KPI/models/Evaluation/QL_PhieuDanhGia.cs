using System;
using System.Collections.Generic;

namespace KPI.Models
{
    public class QL_PhieuDanhGia
    {
        public int IdPhieu { get; set; }
        public int IdNam { get; set; }
        public int IdNhanVien { get; set; }
        public int IdDonVi { get; set; }
        public int? IdMau { get; set; }
        public int? IdNguoiDanhGia { get; set; }
        public byte TrangThai { get; set; }
        public decimal? TongDiemCoBan { get; set; }
        public decimal? TongDiemVuotTroi { get; set; }
        public decimal? TongDiemTichLuy { get; set; }
        public string XepLoai { get; set; }
        public string NhanXet { get; set; }
        public DateTime? NgayGui { get; set; }
        public DateTime? NgayDuyet { get; set; }
        public DateTime NgayTao { get; set; }
        public List<QL_ChiTietDanhGia> ChiTiet { get; set; }
    }
}