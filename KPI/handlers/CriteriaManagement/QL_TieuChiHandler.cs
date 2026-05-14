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
            var serializer = new JavaScriptSerializer() { MaxJsonLength = Int32.MaxValue };
            string method = request.HttpMethod;
            string type = BaseHandler.GetQueryParam(request, "type") ?? request.QueryString["type"];

            if (method == "GET")
            {
                if (type == "nhom-tieu-chi")
                {
                    string nhomCacheKey = $"NhomTieuChiList_{TieuChiCacheVersion}";
                    ObjectCache nhomCache = MemoryCache.Default;
                    if (nhomCache.Contains(nhomCacheKey))
                    {
                        BaseHandler.SendJsonResponse(response, nhomCache.Get(nhomCacheKey).ToString());
                        return;
                    }

                    List<object> nhomList = new List<object>();
                    using (SqlConnection conn = new SqlConnection(connString))
                    {
                        conn.Open();
                        using (SqlCommand cmd = new SqlCommand("SELECT id_nhom, ten_nhom FROM nhom_tieu_chi WHERE trang_thai = 1 ORDER BY loai_nhom, thu_tu_hien_thi", conn))
                        using (SqlDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                nhomList.Add(new { IdNhom = (int)reader["id_nhom"], TenNhom = reader["ten_nhom"].ToString() });
                            }
                        }
                    }
                    string nhomJson = serializer.Serialize(nhomList);
                    nhomCache.Set(nhomCacheKey, nhomJson, new CacheItemPolicy { AbsoluteExpiration = DateTimeOffset.Now.AddMinutes(30) });
                    BaseHandler.SendJsonResponse(response, nhomJson);
                    return;
                }

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
                        string sql = @"
                            SELECT tc.*, ntc.ten_nhom as TenNhom
                            FROM tieu_chi_danh_gia tc
                            LEFT JOIN nhom_tieu_chi ntc ON tc.id_nhom = ntc.id_nhom
                            ORDER BY ntc.thu_tu_hien_thi ASC, tc.thu_tu_hien_thi ASC";

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
                                    LoaiThangDiem = Convert.ToByte(reader["loai_thang_diem"]),
                                    CapDanhGia = reader["cap_danh_gia"] != DBNull.Value ? (byte?)Convert.ToByte(reader["cap_danh_gia"]) : null,
                                    CongThucTinhDiem = reader["cong_thuc_tinh_diem"] != DBNull.Value ? reader["cong_thuc_tinh_diem"].ToString() : "",
                                    BatBuocMinhChung = reader["bat_buoc_minh_chung"] != DBNull.Value && Convert.ToBoolean(reader["bat_buoc_minh_chung"]),
                                    CoTheDongBoScience = reader["co_the_dong_bo_science"] != DBNull.Value && Convert.ToBoolean(reader["co_the_dong_bo_science"]),
                                    BangNguonScience = reader["bang_nguon_science"] != DBNull.Value ? reader["bang_nguon_science"].ToString() : "",
                                    ThuTuHienThi = reader["thu_tu_hien_thi"] != DBNull.Value ? Convert.ToInt32(reader["thu_tu_hien_thi"]) : 0,
                                    TrangThai = reader["trang_thai"] != DBNull.Value && Convert.ToBoolean(reader["trang_thai"]),
                                    TenNhom = reader["TenNhom"] != DBNull.Value ? reader["TenNhom"].ToString() : "Chưa rõ"
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
                            var payload = serializer.Deserialize<Dictionary<string, object>>(reader.ReadToEnd());
                            using (SqlConnection conn = new SqlConnection(connString))
                            {
                                conn.Open();

                                int id = payload.ContainsKey("IdTieuChi") && payload["IdTieuChi"] != null ? Convert.ToInt32(payload["IdTieuChi"]) : 0;
                                string ten = payload.ContainsKey("TenTieuChi") && payload["TenTieuChi"] != null ? payload["TenTieuChi"].ToString() : "";
                                int idNhom = payload.ContainsKey("IdNhom") && payload["IdNhom"] != null ? Convert.ToInt32(payload["IdNhom"]) : 0;
                                decimal diemToiDa = payload.ContainsKey("DiemToiDa") && payload["DiemToiDa"] != null ? Convert.ToDecimal(payload["DiemToiDa"]) : 0;
                                byte loaiThang = payload.ContainsKey("LoaiThangDiem") && payload["LoaiThangDiem"] != null ? Convert.ToByte(payload["LoaiThangDiem"]) : (byte)1;
                                string moTa = payload.ContainsKey("MoTa") && payload["MoTa"] != null ? payload["MoTa"].ToString() : "";
                                bool bbMc = payload.ContainsKey("BatBuocMinhChung") && payload["BatBuocMinhChung"] != null && Convert.ToBoolean(payload["BatBuocMinhChung"]);
                                bool syncSc = payload.ContainsKey("CoTheDongBoScience") && payload["CoTheDongBoScience"] != null && Convert.ToBoolean(payload["CoTheDongBoScience"]);
                                int thuTu = payload.ContainsKey("ThuTuHienThi") && payload["ThuTuHienThi"] != null ? Convert.ToInt32(payload["ThuTuHienThi"]) : 0;
                                bool trangThai = payload.ContainsKey("TrangThai") && payload["TrangThai"] != null ? Convert.ToBoolean(payload["TrangThai"]) : true;
                                int? idNam = payload.ContainsKey("IdNam") && payload["IdNam"] != null && payload["IdNam"].ToString() != "" ? (int?)Convert.ToInt32(payload["IdNam"]) : null;
                                byte? capDanhGia = payload.ContainsKey("CapDanhGia") && payload["CapDanhGia"] != null && payload["CapDanhGia"].ToString() != "" ? (byte?)Convert.ToByte(payload["CapDanhGia"]) : null;
                                string congThuc = payload.ContainsKey("CongThucTinhDiem") && payload["CongThucTinhDiem"] != null ? payload["CongThucTinhDiem"].ToString() : "";
                                string bangNguon = payload.ContainsKey("BangNguonScience") && payload["BangNguonScience"] != null ? payload["BangNguonScience"].ToString() : "";

                                string sql = method == "POST"
                                    ? @"INSERT INTO tieu_chi_danh_gia 
                                        (ten_tieu_chi, id_nhom, id_nam, mo_ta, diem_toi_da, loai_thang_diem, cap_danh_gia, cong_thuc_tinh_diem, bat_buoc_minh_chung, co_the_dong_bo_science, bang_nguon_science, thu_tu_hien_thi, trang_thai) 
                                        VALUES (@Ten, @IdNhom, @IdNam, @MoTa, @Diem, @Loai, @Cap, @CongThuc, @Bb, @Sync, @BangNguon, @ThuTu, @Tt)"
                                    : @"UPDATE tieu_chi_danh_gia 
                                        SET ten_tieu_chi=@Ten, id_nhom=@IdNhom, id_nam=@IdNam, mo_ta=@MoTa, diem_toi_da=@Diem, loai_thang_diem=@Loai, cap_danh_gia=@Cap, cong_thuc_tinh_diem=@CongThuc, bat_buoc_minh_chung=@Bb, co_the_dong_bo_science=@Sync, bang_nguon_science=@BangNguon, thu_tu_hien_thi=@ThuTu, trang_thai=@Tt 
                                        WHERE id_tieu_chi=@Id";

                                using (SqlCommand cmd = new SqlCommand(sql, conn))
                                {
                                    cmd.Parameters.AddWithValue("@Ten", ten);
                                    cmd.Parameters.AddWithValue("@IdNhom", idNhom);
                                    cmd.Parameters.AddWithValue("@IdNam", idNam ?? (object)DBNull.Value);
                                    cmd.Parameters.AddWithValue("@MoTa", moTa);
                                    cmd.Parameters.AddWithValue("@Diem", diemToiDa);
                                    cmd.Parameters.AddWithValue("@Loai", loaiThang);
                                    cmd.Parameters.AddWithValue("@Cap", capDanhGia ?? (object)DBNull.Value);
                                    cmd.Parameters.AddWithValue("@CongThuc", string.IsNullOrEmpty(congThuc) ? (object)DBNull.Value : congThuc);
                                    cmd.Parameters.AddWithValue("@Bb", bbMc);
                                    cmd.Parameters.AddWithValue("@Sync", syncSc);
                                    cmd.Parameters.AddWithValue("@BangNguon", string.IsNullOrEmpty(bangNguon) ? (object)DBNull.Value : bangNguon);
                                    cmd.Parameters.AddWithValue("@ThuTu", thuTu);
                                    cmd.Parameters.AddWithValue("@Tt", trangThai);

                                    if (method == "PUT") cmd.Parameters.AddWithValue("@Id", id);
                                    cmd.ExecuteNonQuery();
                                }
                            }

                            InvalidateTieuChiCache();
                            ScoringHandler.InvalidateCache();

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
                    ScoringHandler.InvalidateCache();
                });
            }
        }
    }
}