namespace KPI.Models
{
    public class QL_TieuChi
    {
        public int IdTieuChi { get; set; }
        public string TenTieuChi { get; set; }
        public int IdNhom { get; set; }
        public int? IdNam { get; set; }
        public string MoTa { get; set; }
        public decimal DiemToiDa { get; set; }
        public byte LoaiThangDiem { get; set; }
        public byte? CapDanhGia { get; set; }
        public string CongThucTinhDiem { get; set; }
        public bool BatBuocMinhChung { get; set; }
        public bool CoTheDongBoScience { get; set; }
        public string BangNguonScience { get; set; }
        public int ThuTuHienThi { get; set; }
        public bool TrangThai { get; set; }
        public string TenNhom { get; set; }
    }
}