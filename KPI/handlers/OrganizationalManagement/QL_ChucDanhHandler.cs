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
    public class QL_ChucDanhHandler
    {
        public static string ChucDanhCacheVersion = Guid.NewGuid().ToString("N");
        public static void InvalidateCache() => ChucDanhCacheVersion = Guid.NewGuid().ToString("N");

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
                    string cacheKey = $"ChucDanhList_{ChucDanhCacheVersion}";
                    ObjectCache cache = MemoryCache.Default;
                    if (cache.Contains(cacheKey))
                    {
                        BaseHandler.SendJsonResponse(response, cache.Get(cacheKey).ToString());
                        return;
                    }

                    List<QL_ChucDanh> list = new List<QL_ChucDanh>();
                    using (SqlConnection conn = new SqlConnection(connString))
                    {
                        conn.Open();
                        using (SqlCommand cmd = new SqlCommand("SELECT * FROM chuc_danh_nghe_nghiep ORDER BY id_chuc_danh DESC", conn))
                        using (SqlDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                list.Add(new QL_ChucDanh
                                {
                                    IdChucDanh = Convert.ToInt32(reader["id_chuc_danh"]),
                                    MaChucDanh = reader["ma_chuc_danh"].ToString(),
                                    TenChucDanh = reader["ten_chuc_danh"].ToString(),
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

                            string maChucDanh = payload.ContainsKey("MaChucDanh") && payload["MaChucDanh"] != null ? payload["MaChucDanh"].ToString() : "";
                            string tenChucDanh = payload.ContainsKey("TenChucDanh") && payload["TenChucDanh"] != null ? payload["TenChucDanh"].ToString() : "";
                            string moTa = payload.ContainsKey("MoTa") && payload["MoTa"] != null ? payload["MoTa"].ToString() : "";
                            bool trangThai = payload.ContainsKey("TrangThai") && payload["TrangThai"] != null ? Convert.ToBoolean(payload["TrangThai"]) : true;
                            int idChucDanh = payload.ContainsKey("IdChucDanh") && payload["IdChucDanh"] != null ? Convert.ToInt32(payload["IdChucDanh"]) : 0;

                            using (SqlConnection conn = new SqlConnection(connString))
                            {
                                conn.Open();
                                string sql = method == "POST"
                                    ? "INSERT INTO chuc_danh_nghe_nghiep (ma_chuc_danh, ten_chuc_danh, mo_ta, trang_thai) VALUES (@Ma, @Ten, @MoTa, @TrangThai)"
                                    : "UPDATE chuc_danh_nghe_nghiep SET ma_chuc_danh=@Ma, ten_chuc_danh=@Ten, mo_ta=@MoTa, trang_thai=@TrangThai WHERE id_chuc_danh=@Id";

                                using (SqlCommand cmd = new SqlCommand(sql, conn))
                                {
                                    cmd.Parameters.AddWithValue("@Ma", maChucDanh);
                                    cmd.Parameters.AddWithValue("@Ten", tenChucDanh);
                                    cmd.Parameters.AddWithValue("@MoTa", moTa);
                                    cmd.Parameters.AddWithValue("@TrangThai", trangThai);
                                    if (method == "PUT") cmd.Parameters.AddWithValue("@Id", idChucDanh);

                                    cmd.ExecuteNonQuery();
                                }
                            }

                            InvalidateCache();
                            QL_NhanVienHandler.InvalidateUserCache();
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
                                errorMessage = "Mã chức danh này đã tồn tại!";
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
                BaseHandler.HandleDelete(request, response, connString, "chuc_danh_nghe_nghiep", "id_chuc_danh", () =>
                {
                    InvalidateCache();
                });
            }
        }
    }
}