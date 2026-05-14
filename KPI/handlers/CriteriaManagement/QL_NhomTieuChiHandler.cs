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
    public class QL_NhomTieuChiHandler
    {
        public static string NhomTieuChiCacheVersion = Guid.NewGuid().ToString("N");
        public static void InvalidateCache() => NhomTieuChiCacheVersion = Guid.NewGuid().ToString("N");

        public void ProcessRequest(HttpListenerContext context)
        {
            var request = context.Request;
            var response = context.Response;
            string connString = ConfigurationManager.ConnectionStrings["DefaultConnection"].ConnectionString;
            var serializer = new JavaScriptSerializer();
            string method = request.HttpMethod;

            if (method == "GET")
            {
                try
                {
                    string cacheKey = $"NhomTieuChiList_{NhomTieuChiCacheVersion}";
                    ObjectCache cache = MemoryCache.Default;
                    if (cache.Contains(cacheKey))
                    {
                        BaseHandler.SendJsonResponse(response, cache.Get(cacheKey).ToString());
                        return;
                    }

                    List<QL_NhomTieuChi> list = new List<QL_NhomTieuChi>();
                    using (SqlConnection conn = new SqlConnection(connString))
                    {
                        conn.Open();
                        string sql = @"
                            SELECT child.id_nhom, child.ten_nhom, child.id_nhom_cha, child.loai_nhom, 
                                   child.diem_toi_da, child.thu_tu_hien_thi, child.trang_thai,
                                   parent.ten_nhom as TenNhomCha
                            FROM nhom_tieu_chi child
                            LEFT JOIN nhom_tieu_chi parent ON child.id_nhom_cha = parent.id_nhom
                            ORDER BY child.loai_nhom ASC, child.id_nhom_cha ASC, child.thu_tu_hien_thi ASC";

                        using (SqlCommand cmd = new SqlCommand(sql, conn))
                        using (SqlDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                list.Add(new QL_NhomTieuChi
                                {
                                    IdNhom = Convert.ToInt32(reader["id_nhom"]),
                                    TenNhom = reader["ten_nhom"].ToString(),
                                    IdNhomCha = reader["id_nhom_cha"] != DBNull.Value ? (int?)Convert.ToInt32(reader["id_nhom_cha"]) : null,
                                    LoaiNhom = Convert.ToByte(reader["loai_nhom"]),
                                    DiemToiDa = reader["diem_toi_da"] != DBNull.Value ? (decimal?)Convert.ToDecimal(reader["diem_toi_da"]) : null,
                                    ThuTuHienThi = reader["thu_tu_hien_thi"] != DBNull.Value ? Convert.ToInt32(reader["thu_tu_hien_thi"]) : 0,
                                    TrangThai = reader["trang_thai"] != DBNull.Value ? Convert.ToBoolean(reader["trang_thai"]) : true,
                                    TenNhomCha = reader["TenNhomCha"] != DBNull.Value ? reader["TenNhomCha"].ToString() : "Cấp cao nhất"
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
                                string tenNhom = payload.ContainsKey("TenNhom") && payload["TenNhom"] != null ? payload["TenNhom"].ToString() : "";
                                int? idNhomCha = payload.ContainsKey("IdNhomCha") && payload["IdNhomCha"] != null && payload["IdNhomCha"].ToString() != "" ? (int?)Convert.ToInt32(payload["IdNhomCha"]) : null;
                                byte loaiNhom = payload.ContainsKey("LoaiNhom") && payload["LoaiNhom"] != null ? Convert.ToByte(payload["LoaiNhom"]) : (byte)1;
                                decimal? diemToiDa = payload.ContainsKey("DiemToiDa") && payload["DiemToiDa"] != null && payload["DiemToiDa"].ToString() != "" ? (decimal?)Convert.ToDecimal(payload["DiemToiDa"]) : null;
                                int thuTu = payload.ContainsKey("ThuTuHienThi") && payload["ThuTuHienThi"] != null ? Convert.ToInt32(payload["ThuTuHienThi"]) : 0;
                                bool trangThai = payload.ContainsKey("TrangThai") && payload["TrangThai"] != null ? Convert.ToBoolean(payload["TrangThai"]) : true;

                                int id = payload.ContainsKey("IdNhom") && payload["IdNhom"] != null ? Convert.ToInt32(payload["IdNhom"]) : 0;

                                string sql = method == "POST"
                                    ? "INSERT INTO nhom_tieu_chi (ten_nhom, id_nhom_cha, loai_nhom, diem_toi_da, thu_tu_hien_thi, trang_thai) VALUES (@Ten, @IdCha, @Loai, @DiemToiDa, @ThuTu, @TrangThai)"
                                    : "UPDATE nhom_tieu_chi SET ten_nhom=@Ten, id_nhom_cha=@IdCha, loai_nhom=@Loai, diem_toi_da=@DiemToiDa, thu_tu_hien_thi=@ThuTu, trang_thai=@TrangThai WHERE id_nhom=@Id";

                                using (SqlCommand cmd = new SqlCommand(sql, conn))
                                {
                                    cmd.Parameters.AddWithValue("@Ten", tenNhom);
                                    cmd.Parameters.AddWithValue("@IdCha", idNhomCha ?? (object)DBNull.Value);
                                    cmd.Parameters.AddWithValue("@Loai", loaiNhom);
                                    cmd.Parameters.AddWithValue("@DiemToiDa", diemToiDa ?? (object)DBNull.Value);
                                    cmd.Parameters.AddWithValue("@ThuTu", thuTu);
                                    cmd.Parameters.AddWithValue("@TrangThai", trangThai);
                                    if (method == "PUT") cmd.Parameters.AddWithValue("@Id", id);
                                    cmd.ExecuteNonQuery();
                                }
                            }

                            InvalidateCache();
                            QL_TieuChiHandler.InvalidateTieuChiCache();
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
                BaseHandler.HandleDelete(request, response, connString, "nhom_tieu_chi", "id_nhom", () =>
                {
                    InvalidateCache();
                    QL_TieuChiHandler.InvalidateTieuChiCache();
                    ScoringHandler.InvalidateCache();
                });
            }
        }
    }
}