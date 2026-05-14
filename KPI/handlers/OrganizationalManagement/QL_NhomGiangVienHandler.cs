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
    public class QL_NhomGiangVienHandler
    {
        public static string NhomGiangVienCacheVersion = Guid.NewGuid().ToString("N");
        public static void InvalidateCache() => NhomGiangVienCacheVersion = Guid.NewGuid().ToString("N");

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
                    string cacheKey = $"NhomGiangVienList_{NhomGiangVienCacheVersion}";
                    ObjectCache cache = MemoryCache.Default;
                    if (cache.Contains(cacheKey))
                    {
                        BaseHandler.SendJsonResponse(response, cache.Get(cacheKey).ToString());
                        return;
                    }

                    List<QL_NhomGiangVien> list = new List<QL_NhomGiangVien>();
                    using (SqlConnection conn = new SqlConnection(connString))
                    {
                        conn.Open();
                        using (SqlCommand cmd = new SqlCommand("SELECT * FROM nhom_giang_vien ORDER BY id_nhom_gv DESC", conn))
                        using (SqlDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                list.Add(new QL_NhomGiangVien
                                {
                                    IdNhomGv = Convert.ToInt32(reader["id_nhom_gv"]),
                                    MaNhom = reader["ma_nhom"].ToString(),
                                    TenNhom = reader["ten_nhom"].ToString(),
                                    MoTa = reader["mo_ta"] != DBNull.Value ? reader["mo_ta"].ToString() : "",
                                    TrangThai = Convert.ToBoolean(reader["trang_thai"])
                                });
                            }
                        }
                    }

                    string jsonResponse = serializer.Serialize(list);
                    cache.Set(cacheKey, jsonResponse, new CacheItemPolicy { AbsoluteExpiration = DateTimeOffset.Now.AddMinutes(30) });
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

                            string maNhom = payload.ContainsKey("MaNhom") && payload["MaNhom"] != null ? payload["MaNhom"].ToString() : "";
                            string tenNhom = payload.ContainsKey("TenNhom") && payload["TenNhom"] != null ? payload["TenNhom"].ToString() : "";
                            string moTa = payload.ContainsKey("MoTa") && payload["MoTa"] != null ? payload["MoTa"].ToString() : "";
                            bool trangThai = payload.ContainsKey("TrangThai") && payload["TrangThai"] != null ? Convert.ToBoolean(payload["TrangThai"]) : true;
                            int idNhom = payload.ContainsKey("IdNhomGv") && payload["IdNhomGv"] != null ? Convert.ToInt32(payload["IdNhomGv"]) : 0;

                            using (SqlConnection conn = new SqlConnection(connString))
                            {
                                conn.Open();
                                string sql = method == "POST"
                                    ? "INSERT INTO nhom_giang_vien (ma_nhom, ten_nhom, mo_ta, trang_thai) VALUES (@Ma, @Ten, @MoTa, @TrangThai)"
                                    : "UPDATE nhom_giang_vien SET ma_nhom=@Ma, ten_nhom=@Ten, mo_ta=@MoTa, trang_thai=@TrangThai WHERE id_nhom_gv=@Id";

                                using (SqlCommand cmd = new SqlCommand(sql, conn))
                                {
                                    cmd.Parameters.AddWithValue("@Ma", maNhom);
                                    cmd.Parameters.AddWithValue("@Ten", tenNhom);
                                    cmd.Parameters.AddWithValue("@MoTa", moTa);
                                    cmd.Parameters.AddWithValue("@TrangThai", trangThai);
                                    if (method == "PUT") cmd.Parameters.AddWithValue("@Id", idNhom);

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
                            if (ex.Number == 2627)
                                errorMessage = "Mã nhóm này đã tồn tại!";
                            else
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

                    if (!isSuccess)
                    {
                        BaseHandler.SendJsonResponse(response, $"{{\"status\":\"error\", \"message\":\"Lỗi máy chủ: {errorMessage}\"}}");
                    }
                }
            }

            else if (method == "DELETE")
            {
                BaseHandler.HandleDelete(request, response, connString, "nhom_giang_vien", "id_nhom_gv", () =>
                {
                    InvalidateCache();
                });
            }
        }
    }
}