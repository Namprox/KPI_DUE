namespace KPI.Models
{
    public class QL_NhomTieuChi
    {
        public int IdNhom { get; set; }
        public string TenNhom { get; set; }
        public int? IdNhomCha { get; set; }
        public byte LoaiNhom { get; set; }
        public decimal? DiemToiDa { get; set; }
        public int ThuTuHienThi { get; set; }
        public bool TrangThai { get; set; }
        public string TenNhomCha { get; set; }
    }
}