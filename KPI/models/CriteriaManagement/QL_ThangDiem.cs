using System;

namespace KPI.Models
{
    public class QL_ThangDiem
    {
        public int IdThangDiem { get; set; }
        public int IdTieuChi { get; set; }
        public decimal GiaTriDiem { get; set; }
        public string DieuKienDiem { get; set; }
        public int ThuTuHienThi { get; set; }
        public string TenTieuChi { get; set; }
    }
}