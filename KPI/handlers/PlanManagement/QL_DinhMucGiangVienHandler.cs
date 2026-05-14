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
    public class QL_DinhMucGiangVienHandler
    {
        public static string DinhMucCacheVersion = Guid.NewGuid().ToString("N");
        public static void InvalidateCache() => DinhMucCacheVersion = Guid.NewGuid().ToString("N");

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
                    string cacheKey = $"DinhMucList_{DinhMucCacheVersion}";
                    ObjectCache cache = MemoryCache.Default;
                    if (cache.Contains(cacheKey))
                    {
                        BaseHandler.SendJsonResponse(response, cache.Get(cacheKey).ToString());
                        return;
                    }

                    List<QL_DinhMucGiangVien> list = new List<QL_DinhMucGiangVien>();
                    using (SqlConnection conn = new SqlConnection(connString))
                    {
                        conn.Open();
                        string sql = @"
                            SELECT dm.*, n.ten_nhom 
                            FROM dinh_muc_giang_vien dm
                            INNER JOIN nhom_giang_vien n ON dm.id_nhom_gv = n.id_nhom_gv
                            ORDER BY dm.id_nam DESC, n.ten_nhom ASC";

                        using (SqlCommand cmd = new SqlCommand(sql, conn))
                        using (SqlDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                list.Add(new QL_DinhMucGiangVien
                                {
                                    IdDinhMuc = Convert.ToInt32(reader["id_dinh_muc"]),
                                    IdNhomGv = Convert.ToInt32(reader["id_nhom_gv"]),
                                    IdNam = Convert.ToInt32(reader["id_nam"]),
                                    GioGiangLyThuyet = Convert.ToDecimal(reader["gio_giang_ly_thuyet"]),
                                    GioNckh = Convert.ToDecimal(reader["gio_nckh"]),
                                    MoTa = reader["mo_ta"] != DBNull.Value ? reader["mo_ta"].ToString() : "",
                                    TenNhomGv = reader["ten_nhom"].ToString()
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

                            int idNhomGv = Convert.ToInt32(payload["IdNhomGv"]);
                            int idNam = Convert.ToInt32(payload["IdNam"]);
                            decimal gioDay = Convert.ToDecimal(payload["GioGiangLyThuyet"]);
                            decimal gioNC = Convert.ToDecimal(payload["GioNckh"]);
                            string moTa = payload.ContainsKey("MoTa") && payload["MoTa"] != null ? payload["MoTa"].ToString() : "";
                            int idDinhMuc = payload.ContainsKey("IdDinhMuc") && payload["IdDinhMuc"] != null ? Convert.ToInt32(payload["IdDinhMuc"]) : 0;

                            using (SqlConnection conn = new SqlConnection(connString))
                            {
                                conn.Open();
                                string sql = method == "POST"
                                    ? "INSERT INTO dinh_muc_giang_vien (id_nhom_gv, id_nam, gio_giang_ly_thuyet, gio_nckh, mo_ta) VALUES (@Nhom, @Nam, @GioDay, @GioNC, @MoTa)"
                                    : "UPDATE dinh_muc_giang_vien SET id_nhom_gv=@Nhom, id_nam=@Nam, gio_giang_ly_thuyet=@GioDay, gio_nckh=@GioNC, mo_ta=@MoTa WHERE id_dinh_muc=@Id";

                                using (SqlCommand cmd = new SqlCommand(sql, conn))
                                {
                                    cmd.Parameters.AddWithValue("@Nhom", idNhomGv);
                                    cmd.Parameters.AddWithValue("@Nam", idNam);
                                    cmd.Parameters.AddWithValue("@GioDay", gioDay);
                                    cmd.Parameters.AddWithValue("@GioNC", gioNC);
                                    cmd.Parameters.AddWithValue("@MoTa", moTa);

                                    if (method == "PUT") cmd.Parameters.AddWithValue("@Id", idDinhMuc);

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
                                errorMessage = "Định mức cho nhóm này trong năm này đã tồn tại!";
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

                    if (!isSuccess) BaseHandler.SendJsonResponse(response, $"{{\"status\":\"error\", \"message\":\"{errorMessage}\"}}");
                }
            }

            else if (method == "DELETE")
            {
                BaseHandler.HandleDelete(request, response, connString, "dinh_muc_giang_vien", "id_dinh_muc", () =>
                {
                    InvalidateCache();
                });
            }
        }
    }
}