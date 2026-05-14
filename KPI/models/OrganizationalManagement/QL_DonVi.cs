namespace KPI.Models
{
    public class QL_DonVi
    {
        public int IdDonVi { get; set; }
        public string MaDonVi { get; set; }
        public string TenDonVi { get; set; }
        public int? IdDonViCha { get; set; }
        public byte CapDonVi { get; set; }
        public int? ScienceDeptId { get; set; }
        public bool TrangThai { get; set; }
        public string TenDonViCha { get; set; }
        public int TotalUsers { get; set; }
    }
}