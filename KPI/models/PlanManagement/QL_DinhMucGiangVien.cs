namespace KPI.Models
{
    public class QL_DinhMucGiangVien
    {
        public int IdDinhMuc { get; set; }
        public int IdNhomGv { get; set; }
        public int IdNam { get; set; }
        public decimal GioGiangLyThuyet { get; set; }
        public decimal GioNckh { get; set; }
        public string MoTa { get; set; }
        public string TenNhomGv { get; set; }
    }
}