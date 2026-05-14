using System.Collections.Generic;

namespace KPI.Models
{
    public class TieuChiDanhGiaDTO
    {
        public int IdTieuChi { get; set; }
        public string TenTieuChi { get; set; }
        public int IdNhom { get; set; }
        public string TenNhom { get; set; }
        public decimal DiemToiDa { get; set; }
        public byte LoaiThangDiem { get; set; }
        public byte? CapDanhGia { get; set; }
        public bool BatBuocMinhChung { get; set; }
        public List<ThangDiemDTO> CacThangDiem { get; set; }
    }

    public class ThangDiemDTO
    {
        public int IdThangDiem { get; set; }
        public decimal GiaTriDiem { get; set; }
        public string DieuKienDiem { get; set; }
    }
}