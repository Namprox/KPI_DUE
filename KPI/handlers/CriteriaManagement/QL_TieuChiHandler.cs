using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.IO;
using System.Net;
using System.Text;
using System.Web.Script.Serialization;
using System.Runtime.Caching;
using KPI.Models;
using System.Configuration;

namespace KPI.handlers
{
    public class QL_TieuChiHandler
    {
        public static string TieuChiCacheVersion = Guid.NewGuid().ToString("N");
        public static void InvalidateTieuChiCache() => TieuChiCacheVersion = Guid.NewGuid().ToString("N");

        public void ProcessRequest(HttpListenerContext context)
        {
            var request = context.Request;
            var response = context.Response;
            string connString = ConfigurationManager.ConnectionStrings["DefaultConnection"].ConnectionString;
            var serializer = new JavaScriptSerializer();
            string method = request.HttpMethod;
            string type = BaseHandler.GetQueryParam(request, "type");
            if (method == "GET" && type == "nhom-tieu-chi")
            {
                try
                {
                    List<object> list = new List<object>();
                    using (SqlConnection conn = new SqlConnection(connString))
                    {
                        conn.Open();
                        using (SqlCommand cmd = new SqlCommand("SELECT id_nhom, ten_nhom FROM nhom_tieu_chi WHERE trang_thai = 1 ORDER BY thu_tu_hien_thi ASC", conn))
                        using (SqlDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                list.Add(new { IdNhom = reader["id_nhom"], TenNhom = reader["ten_nhom"].ToString() });
                            }
                        }
                    }
                    BaseHandler.SendJsonResponse(response, serializer.Serialize(list));
                    return;
                }
                catch { BaseHandler.SendJsonResponse(response, "[]"); return; }
            }

            if (method == "GET")
            {
                try
                {
                    string cacheKey = $"TieuChiList_{TieuChiCacheVersion}";
                    ObjectCache cache = MemoryCache.Default;
                    if (cache.Contains(cacheKey))
                    {
                        BaseHandler.SendJsonResponse(response, cache.Get(cacheKey).ToString());
                        return;
                    }

                    List<QL_TieuChi> list = new List<QL_TieuChi>();
                    using (SqlConnection conn = new SqlConnection(connString))
                    {
                        conn.Open();
                        string sql = @"SELECT tc.*, n.ten_nhom 
                                       FROM tieu_chi_danh_gia tc
                                       LEFT JOIN nhom_tieu_chi n ON tc.id_nhom = n.id_nhom
                                       ORDER BY n.thu_tu_hien_thi ASC, tc.thu_tu_hien_thi ASC";
                        using (SqlCommand cmd = new SqlCommand(sql, conn))
                        using (SqlDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                list.Add(new QL_TieuChi
                                {
                                    IdTieuChi = Convert.ToInt32(reader["id_tieu_chi"]),
                                    TenTieuChi = reader["ten_tieu_chi"].ToString(),
                                    IdNhom = Convert.ToInt32(reader["id_nhom"]),
                                    IdNam = reader["id_nam"] != DBNull.Value ? (int?)Convert.ToInt32(reader["id_nam"]) : null,
                                    MoTa = reader["mo_ta"] != DBNull.Value ? reader["mo_ta"].ToString() : "",
                                    DiemToiDa = Convert.ToDecimal(reader["diem_toi_da"]),
                                    LoaiThangDiem = reader["loai_thang_diem"] != DBNull.Value ? (byte?)Convert.ToByte(reader["loai_thang_diem"]) : (byte)1,
                                    CapDanhGia = reader["cap_danh_gia"] != DBNull.Value ? (byte?)Convert.ToByte(reader["cap_danh_gia"]) : null,
                                    CongThucTinhDiem = reader["cong_thuc_tinh_diem"] != DBNull.Value ? reader["cong_thuc_tinh_diem"].ToString() : "",
                                    BatBuocMinhChung = reader["bat_buoc_minh_chung"] != DBNull.Value && Convert.ToBoolean(reader["bat_buoc_minh_chung"]),
                                    ThuTuHienThi = reader["thu_tu_hien_thi"] != DBNull.Value ? Convert.ToInt32(reader["thu_tu_hien_thi"]) : 0,
                                    TrangThai = reader["trang_thai"] != DBNull.Value ? Convert.ToBoolean(reader["trang_thai"]) : true,
                                    TenNhom = reader["ten_nhom"] != DBNull.Value ? reader["ten_nhom"].ToString() : ""
                                });
                            }
                        }
                    }
                    string jsonResponse = serializer.Serialize(list);
                    cache.Set(cacheKey, jsonResponse, new CacheItemPolicy { AbsoluteExpiration = DateTimeOffset.Now.AddMinutes(15) });
                    BaseHandler.SendJsonResponse(response, jsonResponse);
                }
                catch (Exception ex) { BaseHandler.SendJsonResponse(response, $"{{\"status\":\"error\", \"message\":\"{ex.Message.Replace("\"", "'")}\"}}"); }
            }

            else if (method == "POST" || method == "PUT")
            {
                using (var reader = new StreamReader(request.InputStream, Encoding.UTF8))
                {
                    bool isSuccess = false;
                    string errorMessage = "";

                    for (int attempt = 0; attempt < 3; attempt++)
                    {
                        try
                        {
                            var body = reader.ReadToEnd();
                            var payload = serializer.Deserialize<Dictionary<string, object>>(body);

                            string tenTieuChi = payload.ContainsKey("TenTieuChi") && payload["TenTieuChi"] != null ? payload["TenTieuChi"].ToString() : "";
                            int idNhom = payload.ContainsKey("IdNhom") && payload["IdNhom"] != null ? Convert.ToInt32(payload["IdNhom"]) : 0;

                            int? idNam = null;
                            if (payload.ContainsKey("IdNam") && payload["IdNam"] != null && payload["IdNam"].ToString() != "")
                                idNam = Convert.ToInt32(payload["IdNam"]);

                            string moTa = payload.ContainsKey("MoTa") && payload["MoTa"] != null ? payload["MoTa"].ToString() : "";

                            decimal diemToiDa = 0;
                            if (payload.ContainsKey("DiemToiDa") && payload["DiemToiDa"] != null && payload["DiemToiDa"].ToString() != "")
                                diemToiDa = Convert.ToDecimal(payload["DiemToiDa"]);

                            byte loaiThangDiem = 1;
                            if (payload.ContainsKey("LoaiThangDiem") && payload["LoaiThangDiem"] != null && payload["LoaiThangDiem"].ToString() != "")
                                loaiThangDiem = Convert.ToByte(payload["LoaiThangDiem"]);

                            byte? capDanhGia = null;
                            if (payload.ContainsKey("CapDanhGia") && payload["CapDanhGia"] != null && payload["CapDanhGia"].ToString() != "")
                                capDanhGia = Convert.ToByte(payload["CapDanhGia"]);

                            string congThuc = payload.ContainsKey("CongThucTinhDiem") && payload["CongThucTinhDiem"] != null ? payload["CongThucTinhDiem"].ToString() : "";
                            bool batBuocMC = payload.ContainsKey("BatBuocMinhChung") && payload["BatBuocMinhChung"] != null ? Convert.ToBoolean(payload["BatBuocMinhChung"]) : false;
                            int thuTu = payload.ContainsKey("ThuTuHienThi") && payload["ThuTuHienThi"] != null ? Convert.ToInt32(payload["ThuTuHienThi"]) : 0;
                            bool trangThai = payload.ContainsKey("TrangThai") && payload["TrangThai"] != null ? Convert.ToBoolean(payload["TrangThai"]) : true;

                            int idTieuChi = payload.ContainsKey("IdTieuChi") && payload["IdTieuChi"] != null ? Convert.ToInt32(payload["IdTieuChi"]) : 0;

                            using (SqlConnection conn = new SqlConnection(connString))
                            {
                                conn.Open();
                                string sql = method == "POST"
                                    ? @"INSERT INTO tieu_chi_danh_gia (ten_tieu_chi, id_nhom, id_nam, mo_ta, diem_toi_da, loai_thang_diem, cap_danh_gia, cong_thuc_tinh_diem, bat_buoc_minh_chung, thu_tu_hien_thi, trang_thai) 
                                        VALUES (@Ten, @Nhom, @Nam, @MoTa, @Diem, @Loai, @Cap, @CongThuc, @MinhChung, @ThuTu, @TrangThai)"
                                    : @"UPDATE tieu_chi_danh_gia 
                                        SET ten_tieu_chi=@Ten, id_nhom=@Nhom, id_nam=@Nam, mo_ta=@MoTa, diem_toi_da=@Diem, loai_thang_diem=@Loai, cap_danh_gia=@Cap, cong_thuc_tinh_diem=@CongThuc, bat_buoc_minh_chung=@MinhChung, thu_tu_hien_thi=@ThuTu, trang_thai=@TrangThai 
                                        WHERE id_tieu_chi=@Id";

                                using (SqlCommand cmd = new SqlCommand(sql, conn))
                                {
                                    cmd.Parameters.AddWithValue("@Ten", tenTieuChi);
                                    cmd.Parameters.AddWithValue("@Nhom", idNhom);
                                    cmd.Parameters.AddWithValue("@Nam", idNam ?? (object)DBNull.Value);
                                    cmd.Parameters.AddWithValue("@MoTa", string.IsNullOrEmpty(moTa) ? (object)DBNull.Value : moTa);
                                    cmd.Parameters.AddWithValue("@Diem", diemToiDa);
                                    cmd.Parameters.AddWithValue("@Loai", loaiThangDiem);
                                    cmd.Parameters.AddWithValue("@Cap", capDanhGia ?? (object)DBNull.Value);
                                    cmd.Parameters.AddWithValue("@CongThuc", string.IsNullOrEmpty(congThuc) ? (object)DBNull.Value : congThuc);
                                    cmd.Parameters.AddWithValue("@MinhChung", batBuocMC);
                                    cmd.Parameters.AddWithValue("@ThuTu", thuTu);
                                    cmd.Parameters.AddWithValue("@TrangThai", trangThai);

                                    if (method == "PUT") cmd.Parameters.AddWithValue("@Id", idTieuChi);

                                    cmd.ExecuteNonQuery();
                                }
                            }
                            InvalidateTieuChiCache();
                            isSuccess = true;
                            BaseHandler.SendJsonResponse(response, "{\"status\":\"success\"}");
                            break;
                        }
                        catch (SqlException ex) when (ex.Number == 1205 && attempt < 2)
                        {
                            System.Threading.Thread.Sleep(50 * (attempt + 1));
                        }
                        catch (Exception ex)
                        {
                            errorMessage = ex.Message.Replace("\"", "'");
                            if (attempt == 2) isSuccess = false;
                        }
                    }

                    if (!isSuccess) BaseHandler.SendJsonResponse(response, $"{{\"status\":\"error\", \"message\":\"{errorMessage}\"}}");
                }
            }

            else if (method == "DELETE")
            {
                BaseHandler.HandleDelete(request, response, connString, "tieu_chi_danh_gia", "id_tieu_chi", () =>
                {
                    InvalidateTieuChiCache();
                });
            }
        }
    }
}