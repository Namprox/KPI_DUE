using System;
using System.Collections;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.IO;
using System.Net;
using System.Text;
using System.Web.Script.Serialization;
using KPI.Models;
using System.Configuration;
using System.Linq;
using System.Runtime.Caching;

namespace KPI.handlers
{
    public class ScoringHandler
    {
        public static string ScoringCacheVersion = Guid.NewGuid().ToString("N");
        public static void InvalidateCache() => ScoringCacheVersion = Guid.NewGuid().ToString("N");

        public void ProcessRequest(HttpListenerContext context)
        {
            var request = context.Request;
            var response = context.Response;
            string connString = ConfigurationManager.ConnectionStrings["DefaultConnection"].ConnectionString;
            var serializer = new JavaScriptSerializer() { MaxJsonLength = Int32.MaxValue };
            string method = request.HttpMethod;

            try
            {
                if (method == "GET")
                {
                    string actionParam = BaseHandler.GetQueryParam(request, "action") ?? request.QueryString["action"];
                    string idNhanVienParam = BaseHandler.GetQueryParam(request, "idNhanVien") ?? request.QueryString["idNhanVien"];

                    string idNamParam = BaseHandler.GetQueryParam(request, "idNam") ?? request.QueryString["idNam"];
                    int currentIdNam = 0;
                    int.TryParse(idNamParam, out currentIdNam);
                    if (currentIdNam == 0) currentIdNam = DateTime.Now.Year;

                    if (actionParam == "history" && !string.IsNullOrEmpty(idNhanVienParam))
                    {
                        List<object> historyList = new List<object>();
                        using (SqlConnection conn = new SqlConnection(connString))
                        {
                            conn.Open();
                            string sqlHistory = @"
                                SELECT id_phieu, id_nam, tong_diem_tich_luy, trang_thai, ngay_gui 
                                FROM phieu_danh_gia 
                                WHERE id_nhan_vien = @IdNhanVien 
                                ORDER BY id_nam DESC";
                            using (SqlCommand cmd = new SqlCommand(sqlHistory, conn))
                            {
                                cmd.Parameters.AddWithValue("@IdNhanVien", int.Parse(idNhanVienParam));
                                using (SqlDataReader dr = cmd.ExecuteReader())
                                {
                                    while (dr.Read())
                                    {
                                        historyList.Add(new
                                        {
                                            IdPhieu = Convert.ToInt32(dr["id_phieu"]),
                                            IdNam = Convert.ToInt32(dr["id_nam"]),
                                            TongDiemTichLuy = Convert.ToDecimal(dr["tong_diem_tich_luy"]),
                                            TrangThai = Convert.ToInt32(dr["trang_thai"]),
                                            NgayGui = dr["ngay_gui"] != DBNull.Value ? dr["ngay_gui"].ToString() : null
                                        });
                                    }
                                }
                            }
                        }
                        BaseHandler.SendJsonResponse(response, serializer.Serialize(new { success = true, data = historyList }));
                        return;
                    }

                    string cacheKey = $"ScoringCriteriaObj_{currentIdNam}_{ScoringCacheVersion}";
                    ObjectCache cache = MemoryCache.Default;
                    List<TieuChiDanhGiaDTO> criteriaList = cache.Get(cacheKey) as List<TieuChiDanhGiaDTO>;

                    if (criteriaList == null)
                    {
                        var criteriaDict = new Dictionary<int, TieuChiDanhGiaDTO>();
                        using (SqlConnection conn = new SqlConnection(connString))
                        {
                            conn.Open();
                            string sql = @"
                                SELECT tc.id_tieu_chi, tc.ten_tieu_chi, tc.id_nhom, ntc.ten_nhom, tc.diem_toi_da, 
                                       tc.loai_thang_diem, tc.cap_danh_gia, tc.bat_buoc_minh_chung,
                                       td.id_thang_diem, td.gia_tri_diem, td.dieu_kien_diem
                                FROM tieu_chi_danh_gia tc
                                JOIN nhom_tieu_chi ntc ON tc.id_nhom = ntc.id_nhom
                                LEFT JOIN thang_diem td ON tc.id_tieu_chi = td.id_tieu_chi
                                WHERE tc.trang_thai = 1 
                                  AND (tc.id_nam IS NULL OR tc.id_nam = @IdNam)
                                ORDER BY ntc.thu_tu_hien_thi, tc.thu_tu_hien_thi, td.thu_tu_hien_thi";

                            using (SqlCommand cmd = new SqlCommand(sql, conn))
                            {
                                cmd.Parameters.AddWithValue("@IdNam", currentIdNam);
                                using (SqlDataReader reader = cmd.ExecuteReader())
                                {
                                    while (reader.Read())
                                    {
                                        int idTieuChi = (int)reader["id_tieu_chi"];
                                        if (!criteriaDict.ContainsKey(idTieuChi))
                                        {
                                            criteriaDict[idTieuChi] = new TieuChiDanhGiaDTO
                                            {
                                                IdTieuChi = idTieuChi,
                                                TenTieuChi = reader["ten_tieu_chi"].ToString(),
                                                IdNhom = (int)reader["id_nhom"],
                                                TenNhom = reader["ten_nhom"].ToString(),
                                                DiemToiDa = (decimal)reader["diem_toi_da"],
                                                LoaiThangDiem = (byte)reader["loai_thang_diem"],
                                                CapDanhGia = reader["cap_danh_gia"] != DBNull.Value ? (byte?)reader["cap_danh_gia"] : null,
                                                BatBuocMinhChung = (bool)reader["bat_buoc_minh_chung"],
                                                CacThangDiem = new List<ThangDiemDTO>()
                                            };
                                        }
                                        if (reader["id_thang_diem"] != DBNull.Value)
                                        {
                                            criteriaDict[idTieuChi].CacThangDiem.Add(new ThangDiemDTO
                                            {
                                                IdThangDiem = (int)reader["id_thang_diem"],
                                                GiaTriDiem = (decimal)reader["gia_tri_diem"],
                                                DieuKienDiem = reader["dieu_kien_diem"].ToString()
                                            });
                                        }
                                    }
                                }
                            }
                        }
                        criteriaList = criteriaDict.Values.ToList();
                        cache.Set(cacheKey, criteriaList, new CacheItemPolicy { AbsoluteExpiration = DateTimeOffset.Now.AddMinutes(30) });
                    }

                    object phieuData = null;
                    List<object> chiTietData = new List<object>();

                    if (!string.IsNullOrEmpty(idNamParam) && !string.IsNullOrEmpty(idNhanVienParam))
                    {
                        using (SqlConnection conn = new SqlConnection(connString))
                        {
                            conn.Open();
                            int idPhieu = 0;
                            int trangThai = 0;
                            string lyDoTraVe = "";

                            string checkPhieuSql = "SELECT id_phieu, trang_thai, tong_diem_co_ban, tong_diem_vuot_troi, tong_diem_tich_luy FROM phieu_danh_gia WHERE id_nam = @IdNam AND id_nhan_vien = @IdNhanVien";
                            using (SqlCommand cmd = new SqlCommand(checkPhieuSql, conn))
                            {
                                cmd.Parameters.AddWithValue("@IdNam", currentIdNam);
                                cmd.Parameters.AddWithValue("@IdNhanVien", int.Parse(idNhanVienParam));
                                using (SqlDataReader dr = cmd.ExecuteReader())
                                {
                                    if (dr.Read())
                                    {
                                        idPhieu = Convert.ToInt32(dr["id_phieu"]);
                                        trangThai = Convert.ToInt32(dr["trang_thai"]);

                                        phieuData = new
                                        {
                                            IdPhieu = idPhieu,
                                            TrangThai = trangThai,
                                            TongDiemCoBan = Convert.ToDecimal(dr["tong_diem_co_ban"]),
                                            TongDiemVuotTroi = dr["tong_diem_vuot_troi"] != DBNull.Value ? Convert.ToDecimal(dr["tong_diem_vuot_troi"]) : 0,
                                            TongDiemTichLuy = Convert.ToDecimal(dr["tong_diem_tich_luy"]),
                                            LyDoTraVe = ""
                                        };
                                    }
                                }
                            }

                            if (idPhieu > 0 && trangThai == 1)
                            {
                                string logSql = "SELECT TOP 1 mo_ta FROM nhat_ky WHERE id_phieu = @IdPhieu AND hanh_dong = 'REJECT' ORDER BY ngay_tao DESC";
                                using (SqlCommand cmdLog = new SqlCommand(logSql, conn))
                                {
                                    cmdLog.Parameters.AddWithValue("@IdPhieu", idPhieu);
                                    using (SqlDataReader drLog = cmdLog.ExecuteReader())
                                    {
                                        if (drLog.Read())
                                        {
                                            lyDoTraVe = drLog["mo_ta"] != DBNull.Value ? drLog["mo_ta"].ToString() : "";
                                        }
                                    }
                                }

                                if (phieuData != null)
                                {
                                    var dict = new Dictionary<string, object>();
                                    foreach (System.Reflection.PropertyInfo prop in phieuData.GetType().GetProperties())
                                    {
                                        dict.Add(prop.Name, prop.GetValue(phieuData, null));
                                    }
                                    dict["LyDoTraVe"] = lyDoTraVe;
                                    phieuData = dict;
                                }
                            }

                            if (idPhieu > 0)
                            {
                                // 1. LẤY DỮ LIỆU FILE CỨNG
                                string checkChiTietSql = @"
                                    SELECT c.id_chi_tiet, c.id_tieu_chi, c.diem_tu_danh_gia, c.id_thang_diem_chon, c.mo_ta_hoan_thanh,
                                           m.ten_file, m.ten_file_goc, m.loai_file, m.kich_thuoc_kb
                                    FROM chi_tiet_danh_gia c
                                    LEFT JOIN minh_chung m ON c.id_chi_tiet = m.id_chi_tiet
                                    WHERE c.id_phieu = @IdPhieu";
                                using (SqlCommand cmd = new SqlCommand(checkChiTietSql, conn))
                                {
                                    cmd.Parameters.AddWithValue("@IdPhieu", idPhieu);
                                    using (SqlDataReader dr = cmd.ExecuteReader())
                                    {
                                        while (dr.Read())
                                        {
                                            chiTietData.Add(new
                                            {
                                                IdTieuChi = Convert.ToInt32(dr["id_tieu_chi"]),
                                                DiemTuDanhGia = Convert.ToDecimal(dr["diem_tu_danh_gia"]),
                                                IdThangDiemChon = dr["id_thang_diem_chon"] != DBNull.Value ? (int?)Convert.ToInt32(dr["id_thang_diem_chon"]) : null,
                                                MoTaHoanThanh = dr["mo_ta_hoan_thanh"] != DBNull.Value ? dr["mo_ta_hoan_thanh"].ToString() : "",
                                                TenFile = dr["ten_file"] != DBNull.Value ? dr["ten_file"].ToString() : null,
                                                TenFileGoc = dr["ten_file_goc"] != DBNull.Value ? dr["ten_file_goc"].ToString() : null,
                                                LoaiFile = dr["loai_file"] != DBNull.Value ? dr["loai_file"].ToString() : null,
                                                KichThuocKB = dr["kich_thuoc_kb"] != DBNull.Value ? Convert.ToInt32(dr["kich_thuoc_kb"]) : 0
                                            });
                                        }
                                    }
                                }

                                // 2. LẤY DỮ LIỆU LIÊN KẾT NCKH VÀ ĐẨY VÀO MẢNG
                                string checkNckhSql = @"
                                    SELECT c.id_tieu_chi, n.science_record_id, n.bang_nguon, n.mo_ta, n.diem_ap_dung
                                    FROM chi_tiet_danh_gia c
                                    INNER JOIN chung_minh_tu_science_db n ON c.id_chi_tiet = n.id_chi_tiet
                                    WHERE c.id_phieu = @IdPhieu";
                                using (SqlCommand cmdNckh = new SqlCommand(checkNckhSql, conn))
                                {
                                    cmdNckh.Parameters.AddWithValue("@IdPhieu", idPhieu);
                                    using (SqlDataReader drNckh = cmdNckh.ExecuteReader())
                                    {
                                        while (drNckh.Read())
                                        {
                                            chiTietData.Add(new
                                            {
                                                IdTieuChi = Convert.ToInt32(drNckh["id_tieu_chi"]),
                                                DiemTuDanhGia = 0m, // Frontend sẽ tự bỏ qua do đã map ở trên
                                                ScienceRecordId = Convert.ToInt32(drNckh["science_record_id"]),
                                                BangNguon = drNckh["bang_nguon"].ToString(),
                                                MoTaNckh = drNckh["mo_ta"] != DBNull.Value ? drNckh["mo_ta"].ToString() : "",
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }

                    string finalJsonResponse = serializer.Serialize(new { success = true, data = criteriaList, phieu = phieuData, chiTiet = chiTietData });
                    BaseHandler.SendJsonResponse(response, finalJsonResponse);
                }
                else if (method == "POST")
                {
                    using (var reader = new StreamReader(request.InputStream, Encoding.UTF8))
                    {
                        var jsonString = reader.ReadToEnd();
                        if (string.IsNullOrWhiteSpace(jsonString)) throw new Exception("Không nhận được dữ liệu phiếu đánh giá.");

                        var payload = serializer.Deserialize<Dictionary<string, object>>(jsonString);
                        string actionType = payload.ContainsKey("Action") && payload["Action"] != null ? payload["Action"].ToString().ToUpper() : "";

                        int idNam = Convert.ToInt32(payload["IdNam"]);
                        int idNhanVien = Convert.ToInt32(payload["IdNhanVien"]);

                        bool isSuccess = false;
                        string errorMessage = "";
                        string successMessage = "";

                        for (int attempt = 0; attempt < 3; attempt++)
                        {
                            try
                            {
                                using (SqlConnection conn = new SqlConnection(connString))
                                {
                                    conn.Open();
                                    using (SqlTransaction transaction = conn.BeginTransaction())
                                    {
                                        try
                                        {
                                            int idPhieu = 0;
                                            int trangThaiHienTai = 0;

                                            string checkSql = "SELECT id_phieu, trang_thai FROM phieu_danh_gia WHERE id_nam = @IdNam AND id_nhan_vien = @IdNhanVien";
                                            using (SqlCommand checkCmd = new SqlCommand(checkSql, conn, transaction))
                                            {
                                                checkCmd.Parameters.AddWithValue("@IdNam", idNam);
                                                checkCmd.Parameters.AddWithValue("@IdNhanVien", idNhanVien);
                                                using (SqlDataReader dr = checkCmd.ExecuteReader())
                                                {
                                                    if (dr.Read())
                                                    {
                                                        idPhieu = Convert.ToInt32(dr["id_phieu"]);
                                                        trangThaiHienTai = Convert.ToInt32(dr["trang_thai"]);
                                                    }
                                                }
                                            }

                                            if (actionType == "RECALL")
                                            {
                                                if (idPhieu == 0) throw new InvalidOperationException("Không tìm thấy phiếu đánh giá để thu hồi.");
                                                if (trangThaiHienTai >= 3) throw new InvalidOperationException("Phiếu đã được cấp trên duyệt, không thể thu hồi!");
                                                if (trangThaiHienTai == 1) throw new InvalidOperationException("Phiếu đang ở trạng thái nháp, không cần thu hồi.");

                                                string recallSql = "UPDATE phieu_danh_gia SET trang_thai = 1, ngay_cap_nhat = GETDATE() WHERE id_phieu = @IdPhieu";
                                                using (SqlCommand cmd = new SqlCommand(recallSql, conn, transaction))
                                                {
                                                    cmd.Parameters.AddWithValue("@IdPhieu", idPhieu);
                                                    cmd.ExecuteNonQuery();
                                                }

                                                string recallLogSql = @"INSERT INTO nhat_ky (id_phieu, id_nhan_vien, hanh_dong, mo_ta) 
                                                                        VALUES (@IdPhieu, @IdNhanVien, 'RECALL', N'Giảng viên thu hồi phiếu đánh giá để chỉnh sửa')";
                                                using (SqlCommand cmdLog = new SqlCommand(recallLogSql, conn, transaction))
                                                {
                                                    cmdLog.Parameters.AddWithValue("@IdPhieu", idPhieu);
                                                    cmdLog.Parameters.AddWithValue("@IdNhanVien", idNhanVien);
                                                    cmdLog.ExecuteNonQuery();
                                                }

                                                transaction.Commit();
                                                successMessage = "Đã thu hồi phiếu đánh giá thành công!";
                                            }
                                            else
                                            {
                                                if (idPhieu > 0 && trangThaiHienTai >= 2)
                                                {
                                                    throw new InvalidOperationException("Phiếu đánh giá đã được gửi duyệt, không thể chỉnh sửa!");
                                                }

                                                int idDonVi = Convert.ToInt32(payload["IdDonVi"]);
                                                int trangThaiMoi = Convert.ToInt32(payload["TrangThai"]);
                                                decimal tongCoBan = Convert.ToDecimal(payload["TongDiemCoBan"]);
                                                decimal tongVuotTroi = payload.ContainsKey("TongDiemVuotTroi") && payload["TongDiemVuotTroi"] != null ? Convert.ToDecimal(payload["TongDiemVuotTroi"]) : 0;
                                                decimal tongTichLuy = Convert.ToDecimal(payload["TongDiemTichLuy"]);
                                                ArrayList chiTietList = payload.ContainsKey("ChiTiet") && payload["ChiTiet"] != null ? (ArrayList)payload["ChiTiet"] : new ArrayList();

                                                if (idPhieu > 0)
                                                {
                                                    string updateSql = @"UPDATE phieu_danh_gia 
                                                                         SET id_don_vi=@IdDonVi, tong_diem_co_ban=@TCoBan, tong_diem_vuot_troi=@TVuotTroi, 
                                                                             tong_diem_tich_luy=@TTichLuy, trang_thai=@TrangThai, 
                                                                             ngay_gui = CASE WHEN @TrangThai = 2 THEN GETDATE() ELSE ngay_gui END,
                                                                             ngay_cap_nhat=GETDATE()
                                                                         WHERE id_phieu=@IdPhieu";
                                                    using (SqlCommand cmd = new SqlCommand(updateSql, conn, transaction))
                                                    {
                                                        cmd.Parameters.AddWithValue("@IdDonVi", idDonVi);
                                                        cmd.Parameters.AddWithValue("@TCoBan", tongCoBan);
                                                        cmd.Parameters.AddWithValue("@TVuotTroi", tongVuotTroi);
                                                        cmd.Parameters.AddWithValue("@TTichLuy", tongTichLuy);
                                                        cmd.Parameters.AddWithValue("@TrangThai", trangThaiMoi);
                                                        cmd.Parameters.AddWithValue("@IdPhieu", idPhieu);
                                                        cmd.ExecuteNonQuery();
                                                    }

                                                    // Xóa chi tiết cũ sẽ tự động trigger ON DELETE CASCADE xóa luôn file và NCKH
                                                    using (SqlCommand cmdDel = new SqlCommand("DELETE FROM chi_tiet_danh_gia WHERE id_phieu=@IdPhieu", conn, transaction))
                                                    {
                                                        cmdDel.Parameters.AddWithValue("@IdPhieu", idPhieu);
                                                        cmdDel.ExecuteNonQuery();
                                                    }
                                                }
                                                else
                                                {
                                                    string insertSql = @"INSERT INTO phieu_danh_gia (id_nam, id_nhan_vien, id_don_vi, tong_diem_co_ban, tong_diem_vuot_troi, tong_diem_tich_luy, trang_thai, ngay_gui) 
                                                                         OUTPUT INSERTED.id_phieu 
                                                                         VALUES (@IdNam, @IdNhanVien, @IdDonVi, @TCoBan, @TVuotTroi, @TTichLuy, @TrangThai, CASE WHEN @TrangThai = 2 THEN GETDATE() ELSE NULL END)";
                                                    using (SqlCommand cmd = new SqlCommand(insertSql, conn, transaction))
                                                    {
                                                        cmd.Parameters.AddWithValue("@IdNam", idNam);
                                                        cmd.Parameters.AddWithValue("@IdNhanVien", idNhanVien);
                                                        cmd.Parameters.AddWithValue("@IdDonVi", idDonVi);
                                                        cmd.Parameters.AddWithValue("@TCoBan", tongCoBan);
                                                        cmd.Parameters.AddWithValue("@TVuotTroi", tongVuotTroi);
                                                        cmd.Parameters.AddWithValue("@TTichLuy", tongTichLuy);
                                                        cmd.Parameters.AddWithValue("@TrangThai", trangThaiMoi);
                                                        idPhieu = (int)cmd.ExecuteScalar();
                                                    }
                                                }

                                                string insertDetailSql = @"INSERT INTO chi_tiet_danh_gia (id_phieu, id_tieu_chi, diem_tu_danh_gia, id_thang_diem_chon, mo_ta_hoan_thanh) 
                                                                           OUTPUT INSERTED.id_chi_tiet 
                                                                           VALUES (@IdPhieu, @IdTieuChi, @Diem, @IdThangDiem, @MoTa)";

                                                string insertFileSql = @"INSERT INTO minh_chung (id_chi_tiet, ten_file, ten_file_goc, duong_dan, loai_file, kich_thuoc_kb, nguoi_tai_len) 
                                                                         VALUES (@IdChiTiet, @TenFile, @TenFileGoc, @DuongDan, @LoaiFile, @KichThuoc, @NguoiTaiLen)";

                                                string insertNckhSql = @"INSERT INTO chung_minh_tu_science_db (id_chi_tiet, bang_nguon, science_record_id, mo_ta) 
                                                                         VALUES (@IdChiTiet, @BangNguon, @ScienceRecordId, @MoTa)";

                                                foreach (Dictionary<string, object> item in chiTietList)
                                                {
                                                    int newIdChiTiet = 0;
                                                    using (SqlCommand cmd = new SqlCommand(insertDetailSql, conn, transaction))
                                                    {
                                                        cmd.Parameters.AddWithValue("@IdPhieu", idPhieu);
                                                        cmd.Parameters.AddWithValue("@IdTieuChi", Convert.ToInt32(item["IdTieuChi"]));
                                                        cmd.Parameters.AddWithValue("@Diem", Convert.ToDecimal(item["DiemTuDanhGia"]));

                                                        if (item.ContainsKey("IdThangDiemChon") && item["IdThangDiemChon"] != null && item["IdThangDiemChon"].ToString() != "")
                                                            cmd.Parameters.AddWithValue("@IdThangDiem", Convert.ToInt32(item["IdThangDiemChon"]));
                                                        else
                                                            cmd.Parameters.AddWithValue("@IdThangDiem", DBNull.Value);

                                                        if (item.ContainsKey("MoTaHoanThanh") && item["MoTaHoanThanh"] != null && item["MoTaHoanThanh"].ToString() != "")
                                                            cmd.Parameters.AddWithValue("@MoTa", item["MoTaHoanThanh"].ToString());
                                                        else
                                                            cmd.Parameters.AddWithValue("@MoTa", DBNull.Value);

                                                        newIdChiTiet = (int)cmd.ExecuteScalar();
                                                    }

                                                    // Lưu file cứng
                                                    if (item.ContainsKey("DanhSachFile") && item["DanhSachFile"] != null)
                                                    {
                                                        ArrayList files = (ArrayList)item["DanhSachFile"];
                                                        foreach (Dictionary<string, object> f in files)
                                                        {
                                                            using (SqlCommand cmdF = new SqlCommand(insertFileSql, conn, transaction))
                                                            {
                                                                cmdF.Parameters.AddWithValue("@IdChiTiet", newIdChiTiet);
                                                                cmdF.Parameters.AddWithValue("@TenFile", f["fileName"]);
                                                                cmdF.Parameters.AddWithValue("@TenFileGoc", f["originalName"]);
                                                                cmdF.Parameters.AddWithValue("@DuongDan", "/uploads/minh_chung/" + f["fileName"]);
                                                                cmdF.Parameters.AddWithValue("@LoaiFile", f.ContainsKey("fileType") && f["fileType"] != null ? f["fileType"] : "");
                                                                cmdF.Parameters.AddWithValue("@KichThuoc", f.ContainsKey("fileSizeKB") && f["fileSizeKB"] != null ? Convert.ToInt32(f["fileSizeKB"]) : 0);
                                                                cmdF.Parameters.AddWithValue("@NguoiTaiLen", idNhanVien);
                                                                cmdF.ExecuteNonQuery();
                                                            }
                                                        }
                                                    }

                                                    // LƯU MINH CHỨNG TỪ NCKH
                                                    if (item.ContainsKey("DanhSachNCKH") && item["DanhSachNCKH"] != null)
                                                    {
                                                        ArrayList nckhList = (ArrayList)item["DanhSachNCKH"];
                                                        foreach (Dictionary<string, object> nckh in nckhList)
                                                        {
                                                            using (SqlCommand cmdNckh = new SqlCommand(insertNckhSql, conn, transaction))
                                                            {
                                                                cmdNckh.Parameters.AddWithValue("@IdChiTiet", newIdChiTiet);
                                                                cmdNckh.Parameters.AddWithValue("@BangNguon", nckh.ContainsKey("BangNguon") && nckh["BangNguon"] != null ? nckh["BangNguon"].ToString() : "ScientificArticles");
                                                                cmdNckh.Parameters.AddWithValue("@ScienceRecordId", Convert.ToInt32(nckh["ScienceRecordId"]));
                                                                cmdNckh.Parameters.AddWithValue("@MoTa", nckh.ContainsKey("MoTa") && nckh["MoTa"] != null ? nckh["MoTa"].ToString() : (object)DBNull.Value);
                                                                cmdNckh.ExecuteNonQuery();
                                                            }
                                                        }
                                                    }
                                                }

                                                string actionLog = trangThaiMoi == 1 ? "UPDATE_DRAFT" : "SUBMIT";
                                                string descLog = trangThaiMoi == 1 ? "Lưu nháp Phiếu đánh giá" : "Nộp Phiếu đánh giá KPI";
                                                string insertLogSql = @"INSERT INTO nhat_ky (id_phieu, id_nhan_vien, hanh_dong, mo_ta) 
                                                                        VALUES (@IdPhieu, @IdNhanVien, @HanhDong, @MoTa)";
                                                using (SqlCommand cmdLog = new SqlCommand(insertLogSql, conn, transaction))
                                                {
                                                    cmdLog.Parameters.AddWithValue("@IdPhieu", idPhieu);
                                                    cmdLog.Parameters.AddWithValue("@IdNhanVien", idNhanVien);
                                                    cmdLog.Parameters.AddWithValue("@HanhDong", actionLog);
                                                    cmdLog.Parameters.AddWithValue("@MoTa", descLog);
                                                    cmdLog.ExecuteNonQuery();
                                                }

                                                transaction.Commit();
                                                successMessage = trangThaiMoi == 1 ? "Đã lưu nháp Phiếu đánh giá thành công!" : "Đã nộp Phiếu đánh giá thành công!";
                                            }
                                        }
                                        catch (Exception)
                                        {
                                            transaction.Rollback();
                                            throw;
                                        }
                                    }
                                }

                                isSuccess = true;
                                BaseHandler.SendJsonResponse(response, $"{{\"status\":\"success\", \"message\":\"{successMessage}\"}}");
                                break;
                            }
                            catch (SqlException ex) when (ex.Number == 1205 && attempt < 2)
                            {
                                System.Threading.Thread.Sleep(50 * (attempt + 1));
                            }
                            catch (InvalidOperationException ex)
                            {
                                errorMessage = ex.Message;
                                if (attempt == 2) isSuccess = false;
                                break;
                            }
                            catch (Exception ex)
                            {
                                errorMessage = ex.Message.Replace("\"", "'");
                                if (attempt == 2) isSuccess = false;
                                break;
                            }
                        }

                        if (!isSuccess) BaseHandler.SendJsonResponse(response, $"{{\"status\":\"error\", \"message\":\"Lỗi hệ thống: {errorMessage}\"}}");
                    }
                }
                else
                {
                    BaseHandler.SendJsonResponse(response, "{\"status\":\"error\", \"message\": \"Method Not Allowed\"}", 405);
                }
            }
            catch (Exception ex)
            {
                BaseHandler.SendJsonResponse(response, $"{{\"status\":\"error\", \"message\":\"Lỗi server: {ex.Message.Replace("\"", "'")}\"}}", 500);
            }
        }
    }
}