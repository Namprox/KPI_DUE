using System;
using System.Collections.Generic;

namespace KPI.Models
{
    public class QL_MauDanhGia
    {
        public int IdMau { get; set; }
        public string TenMau { get; set; }
        public int IdNam { get; set; }
        public string MoTa { get; set; }
        public bool TrangThai { get; set; }
        public List<int> DanhSachIdTieuChi { get; set; } = new List<int>();
    }
}