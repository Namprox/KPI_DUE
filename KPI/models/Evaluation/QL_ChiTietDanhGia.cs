using System;

namespace KPI.Models
{
    public class QL_ChiTietDanhGia
    {
        public int IdChiTiet { get; set; }
        public int IdPhieu { get; set; }
        public int IdTieuChi { get; set; }
        public decimal? DiemTuDanhGia { get; set; }
        public decimal? DiemCapTren { get; set; }
        public decimal? DiemChinhThuc { get; set; }
        public int? IdThangDiemChon { get; set; }
        public string MoTaHoanThanh { get; set; }
        public string NhanXet { get; set; }
        public bool LaTruongHopDacBiet { get; set; }
        public string LyDoDacBiet { get; set; }
        public DateTime NgayTao { get; set; }
    }
}