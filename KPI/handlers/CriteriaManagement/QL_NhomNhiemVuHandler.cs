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
    public class QL_NhomNhiemVuHandler
    {
        public static string NhomNhiemVuCacheVersion = Guid.NewGuid().ToString("N");
        public static void InvalidateCache() => NhomNhiemVuCacheVersion = Guid.NewGuid().ToString("N");

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
                    string cacheKey = $"NhomNhiemVuList_{NhomNhiemVuCacheVersion}";
                    ObjectCache cache = MemoryCache.Default;
                    if (cache.Contains(cacheKey))
                    {
                        BaseHandler.SendJsonResponse(response, cache.Get(cacheKey).ToString());
                        return;
                    }

                    List<QL_NhomNhiemVu> list = new List<QL_NhomNhiemVu>();
                    using (SqlConnection conn = new SqlConnection(connString))
                    {
                        conn.Open();
                        using (SqlCommand cmd = new SqlCommand("SELECT id_nhom_nv, ten_nhom, thu_tu, trang_thai FROM danh_muc_nhom_nhiem_vu ORDER BY thu_tu ASC", conn))
                        using (SqlDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                list.Add(new QL_NhomNhiemVu
                                {
                                    IdNhomNv = Convert.ToInt32(reader["id_nhom_nv"]),
                                    TenNhom = reader["ten_nhom"].ToString(),
                                    ThuTu = reader["thu_tu"] != DBNull.Value ? Convert.ToInt32(reader["thu_tu"]) : 0,
                                    TrangThai = reader["trang_thai"] != DBNull.Value ? Convert.ToBoolean(reader["trang_thai"]) : true
                                });
                            }
                        }
                    }
                    string jsonResponse = serializer.Serialize(list);
                    cache.Set(cacheKey, jsonResponse, new CacheItemPolicy { AbsoluteExpiration = DateTimeOffset.Now.AddMinutes(15) });
                    BaseHandler.SendJsonResponse(response, jsonResponse);
                }
                catch (Exception) { BaseHandler.SendJsonResponse(response, "[]"); }
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
                                int thuTu = payload.ContainsKey("ThuTu") && payload["ThuTu"] != null ? Convert.ToInt32(payload["ThuTu"]) : 0;
                                bool trangThai = payload.ContainsKey("TrangThai") && payload["TrangThai"] != null ? Convert.ToBoolean(payload["TrangThai"]) : true;
                                int id = payload.ContainsKey("IdNhomNv") && payload["IdNhomNv"] != null ? Convert.ToInt32(payload["IdNhomNv"]) : 0;

                                string sql = method == "POST"
                                    ? "INSERT INTO danh_muc_nhom_nhiem_vu (ten_nhom, thu_tu, trang_thai) VALUES (@Ten, @ThuTu, @TrangThai)"
                                    : "UPDATE danh_muc_nhom_nhiem_vu SET ten_nhom=@Ten, thu_tu=@ThuTu, trang_thai=@TrangThai WHERE id_nhom_nv=@Id";

                                using (SqlCommand cmd = new SqlCommand(sql, conn))
                                {
                                    cmd.Parameters.AddWithValue("@Ten", tenNhom);
                                    cmd.Parameters.AddWithValue("@ThuTu", thuTu);
                                    cmd.Parameters.AddWithValue("@TrangThai", trangThai);
                                    if (method == "PUT") cmd.Parameters.AddWithValue("@Id", id);
                                    cmd.ExecuteNonQuery();
                                }
                            }
                            InvalidateCache();
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
                            errorMessage = ex.Message.Replace("\"", "'");
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
                BaseHandler.HandleDelete(request, response, connString, "danh_muc_nhom_nhiem_vu", "id_nhom_nv", () =>
                {
                    InvalidateCache();
                });
            }
        }
    }
}