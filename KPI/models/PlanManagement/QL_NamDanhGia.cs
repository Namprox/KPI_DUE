using System;

namespace KPI.Models
{
    public class QL_NamDanhGia
    {
        public int IdNam { get; set; }
        public DateTime NgayBatDau { get; set; }
        public DateTime NgayKetThuc { get; set; }
        public DateTime? NgayMoTuDanhGia { get; set; }
        public DateTime? NgayDongTuDanhGia { get; set; }
        public DateTime? NgayMoDanhGiaCapTren { get; set; }
        public DateTime? NgayDongDanhGiaCapTren { get; set; }
        public byte TrangThai { get; set; }
        public string GhiChu { get; set; }
    }
}