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
    public class QL_ThangDiemHandler
    {
        public static string ThangDiemCacheVersion = Guid.NewGuid().ToString("N");
        public static void InvalidateCache() => ThangDiemCacheVersion = Guid.NewGuid().ToString("N");

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
                    string idTieuChiParam = BaseHandler.GetQueryParam(request, "idTieuChi") ?? request.QueryString["idTieuChi"];
                    string cacheKey = string.IsNullOrEmpty(idTieuChiParam)
                        ? $"ThangDiemList_All_{ThangDiemCacheVersion}"
                        : $"ThangDiemList_TC{idTieuChiParam}_{ThangDiemCacheVersion}";

                    ObjectCache cache = MemoryCache.Default;
                    if (cache.Contains(cacheKey))
                    {
                        BaseHandler.SendJsonResponse(response, cache.Get(cacheKey).ToString());
                        return;
                    }

                    List<QL_ThangDiem> list = new List<QL_ThangDiem>();
                    using (SqlConnection conn = new SqlConnection(connString))
                    {
                        conn.Open();
                        string sql = @"
                            SELECT td.*, tc.ten_tieu_chi 
                            FROM thang_diem td
                            INNER JOIN tieu_chi_danh_gia tc ON td.id_tieu_chi = tc.id_tieu_chi
                            WHERE 1=1 ";

                        if (!string.IsNullOrEmpty(idTieuChiParam))
                        {
                            sql += " AND td.id_tieu_chi = @IdTieuChi ";
                        }
                        sql += " ORDER BY tc.id_tieu_chi DESC, td.thu_tu_hien_thi ASC";

                        using (SqlCommand cmd = new SqlCommand(sql, conn))
                        {
                            if (!string.IsNullOrEmpty(idTieuChiParam))
                            {
                                cmd.Parameters.AddWithValue("@IdTieuChi", idTieuChiParam);
                            }

                            using (SqlDataReader reader = cmd.ExecuteReader())
                            {
                                while (reader.Read())
                                {
                                    list.Add(new QL_ThangDiem
                                    {
                                        IdThangDiem = Convert.ToInt32(reader["id_thang_diem"]),
                                        IdTieuChi = Convert.ToInt32(reader["id_tieu_chi"]),
                                        GiaTriDiem = Convert.ToDecimal(reader["gia_tri_diem"]),
                                        DieuKienDiem = reader["dieu_kien_diem"] != DBNull.Value ? reader["dieu_kien_diem"].ToString() : "",
                                        ThuTuHienThi = reader["thu_tu_hien_thi"] != DBNull.Value ? Convert.ToInt32(reader["thu_tu_hien_thi"]) : 0,
                                        TenTieuChi = reader["ten_tieu_chi"].ToString()
                                    });
                                }
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
                                int idTieuChi = Convert.ToInt32(payload["IdTieuChi"]);
                                decimal giaTriDiem = Convert.ToDecimal(payload["GiaTriDiem"]);
                                string dieuKienDiem = payload.ContainsKey("DieuKienDiem") && payload["DieuKienDiem"] != null ? payload["DieuKienDiem"].ToString() : "";
                                int thuTu = payload.ContainsKey("ThuTuHienThi") && payload["ThuTuHienThi"] != null ? Convert.ToInt32(payload["ThuTuHienThi"]) : 0;

                                string sql = method == "POST"
                                    ? @"INSERT INTO thang_diem (id_tieu_chi, gia_tri_diem, dieu_kien_diem, thu_tu_hien_thi) 
                                        VALUES (@IdTieuChi, @GiaTriDiem, @DieuKienDiem, @ThuTu)"
                                    : @"UPDATE thang_diem 
                                        SET id_tieu_chi=@IdTieuChi, gia_tri_diem=@GiaTriDiem, dieu_kien_diem=@DieuKienDiem, thu_tu_hien_thi=@ThuTu 
                                        WHERE id_thang_diem=@IdThangDiem";

                                using (SqlCommand cmd = new SqlCommand(sql, conn))
                                {
                                    cmd.Parameters.AddWithValue("@IdTieuChi", idTieuChi);
                                    cmd.Parameters.AddWithValue("@GiaTriDiem", giaTriDiem);
                                    cmd.Parameters.AddWithValue("@DieuKienDiem", dieuKienDiem);
                                    cmd.Parameters.AddWithValue("@ThuTu", thuTu);

                                    if (method == "PUT")
                                    {
                                        cmd.Parameters.AddWithValue("@IdThangDiem", Convert.ToInt32(payload["IdThangDiem"]));
                                    }
                                    cmd.ExecuteNonQuery();
                                }
                            }

                            InvalidateCache();
                            ScoringHandler.InvalidateCache();

                            isSuccess = true;
                            BaseHandler.SendJsonResponse(response, "{\"status\":\"success\"}");
                            break;
                        }
                        catch (SqlException ex) when (ex.Number == 1205 && attempt < 2)
                        {
                            System.Threading.Thread.Sleep(50 * (attempt + 1));
                        }
                        catch (SqlException ex)
                        {
                            if (ex.Number == 547) errorMessage = "Điểm giá trị phải tuân thủ ràng buộc hệ thống!";
                            else errorMessage = ex.Message.Replace("\"", "'");

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

                    if (!isSuccess) BaseHandler.SendJsonResponse(response, $"{{\"status\":\"error\", \"message\":\"{errorMessage}\"}}");
                }
            }

            else if (method == "DELETE")
            {
                BaseHandler.HandleDelete(request, response, connString, "thang_diem", "id_thang_diem", () =>
                {
                    InvalidateCache();
                    ScoringHandler.InvalidateCache();
                });
            }
        }
    }
}