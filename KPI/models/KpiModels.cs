using System;
using System.Collections.Generic;

namespace KPI.Models
{
    public class TieuChiDanhGia
    {
        public int IdTieuChi { get; set; }
        public string TenTieuChi { get; set; }
        public int IdNhom { get; set; }
        public decimal DiemToiDa { get; set; }
        public byte LoaiThangDiem { get; set; }
        public byte? CapDanhGia { get; set; }
        public bool BatBuocMinhChung { get; set; }
        public List<ThangDiem> CacThangDiem { get; set; } = new List<ThangDiem>();
    }

    public class ThangDiem
    {
        public int IdThangDiem { get; set; }
        public decimal GiaTriDiem { get; set; }
        public string DieuKienDiem { get; set; }
    }

    public class PhieuDanhGia
    {
        public int IdPhieu { get; set; }
        public int IdNam { get; set; }
        public int IdNhanVien { get; set; }
        public int IdDonVi { get; set; }
        public decimal? TongDiemCoBan { get; set; }
        public decimal? TongDiemVuotTroi { get; set; }
        public decimal? TongDiemTichLuy { get; set; }
        public string XepLoai { get; set; }
        public byte TrangThai { get; set; }
        public List<ChiTietDanhGia> ChiTiet { get; set; } = new List<ChiTietDanhGia>();
    }

    public class ChiTietDanhGia
    {
        public int IdTieuChi { get; set; }
        public decimal? DiemTuDanhGia { get; set; }
        public decimal? DiemCapTren { get; set; }
        public int? IdThangDiemChon { get; set; }
        public string MoTaHoanThanh { get; set; }
    }
}