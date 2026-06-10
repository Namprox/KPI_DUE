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
    public class QL_DonViHandler
    {
        public static string _departmentCacheVersion = Guid.NewGuid().ToString("N");
        public static void InvalidateDepartmentCache() => _departmentCacheVersion = Guid.NewGuid().ToString("N");

        public void ProcessRequest(HttpListenerContext context)
        {
            var request = context.Request;
            var response = context.Response;
            string connectionString = ConfigurationManager.ConnectionStrings["DefaultConnection"].ConnectionString;
            var serializer = new JavaScriptSerializer() { MaxJsonLength = Int32.MaxValue };

            string method = request.HttpMethod;

            if (method == "GET")
            {
                string cacheKey = $"DonViList_Full_{_departmentCacheVersion}";
                ObjectCache cache = MemoryCache.Default;

                if (cache.Contains(cacheKey))
                {
                    BaseHandler.SendJsonResponse(response, cache.Get(cacheKey).ToString());
                    return;
                }

                List<QL_DonVi> list = new List<QL_DonVi>();
                using (SqlConnection conn = new SqlConnection(connectionString))
                {
                    conn.Open();
                    string sql = @"
                        SELECT d.*, p.ten_don_vi as TenDonViCha,
                               (SELECT COUNT(*) FROM nhan_vien nv WHERE nv.id_don_vi = d.id_don_vi) as TotalUsers
                        FROM don_vi d
                        LEFT JOIN don_vi p ON d.id_don_vi_cha = p.id_don_vi";

                    using (SqlCommand cmd = new SqlCommand(sql, conn))
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            list.Add(new QL_DonVi
                            {
                                IdDonVi = (int)reader["id_don_vi"],
                                MaDonVi = reader["ma_don_vi"] != DBNull.Value ? reader["ma_don_vi"].ToString() : "",
                                TenDonVi = reader["ten_don_vi"] != DBNull.Value ? reader["ten_don_vi"].ToString() : "",
                                IdDonViCha = reader["id_don_vi_cha"] != DBNull.Value ? (int)reader["id_don_vi_cha"] : (int?)null,
                                CapDonVi = reader["cap_don_vi"] != DBNull.Value ? (byte)reader["cap_don_vi"] : (byte)1,
                                TrangThai = reader["trang_thai"] != DBNull.Value && (bool)reader["trang_thai"],
                                TenDonViCha = reader["TenDonViCha"] != DBNull.Value ? reader["TenDonViCha"].ToString() : "Không có",
                                TotalUsers = reader["TotalUsers"] != DBNull.Value ? (int)reader["TotalUsers"] : 0
                            });
                        }
                    }
                }

                string jsonResponse = serializer.Serialize(list);
                cache.Set(cacheKey, jsonResponse, new CacheItemPolicy { AbsoluteExpiration = DateTimeOffset.Now.AddMinutes(15) });
                BaseHandler.SendJsonResponse(response, jsonResponse);
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

                            using (SqlConnection conn = new SqlConnection(connectionString))
                            {
                                conn.Open();

                                string maDonVi = payload.ContainsKey("MaDonVi") && payload["MaDonVi"] != null ? payload["MaDonVi"].ToString() : "";
                                string tenDonVi = payload.ContainsKey("TenDonVi") && payload["TenDonVi"] != null ? payload["TenDonVi"].ToString() : "";
                                int? idDonViCha = payload.ContainsKey("IdDonViCha") && payload["IdDonViCha"] != null && payload["IdDonViCha"].ToString() != "" ? (int?)Convert.ToInt32(payload["IdDonViCha"]) : null;
                                byte capDonVi = payload.ContainsKey("CapDonVi") && payload["CapDonVi"] != null ? Convert.ToByte(payload["CapDonVi"]) : (byte)1;
                                bool trangThai = payload.ContainsKey("TrangThai") && payload["TrangThai"] != null ? Convert.ToBoolean(payload["TrangThai"]) : true;

                                int idDonVi = payload.ContainsKey("IdDonVi") && payload["IdDonVi"] != null ? Convert.ToInt32(payload["IdDonVi"]) : 0;

                                string sql = method == "POST"
                                    ? @"INSERT INTO don_vi (ma_don_vi, ten_don_vi, id_don_vi_cha, cap_don_vi, trang_thai) 
                                        VALUES (@Ma, @Ten, @IdCha, @Cap, @TrangThai)"
                                    : @"UPDATE don_vi SET ma_don_vi=@Ma, ten_don_vi=@Ten, id_don_vi_cha=@IdCha, cap_don_vi=@Cap, trang_thai=@TrangThai 
                                        WHERE id_don_vi=@Id";

                                using (SqlCommand cmd = new SqlCommand(sql, conn))
                                {
                                    cmd.Parameters.AddWithValue("@Ma", maDonVi);
                                    cmd.Parameters.AddWithValue("@Ten", tenDonVi);
                                    cmd.Parameters.AddWithValue("@IdCha", idDonViCha ?? (object)DBNull.Value);
                                    cmd.Parameters.AddWithValue("@Cap", capDonVi);
                                    cmd.Parameters.AddWithValue("@TrangThai", trangThai);

                                    if (method == "PUT") cmd.Parameters.AddWithValue("@Id", idDonVi);

                                    cmd.ExecuteNonQuery();
                                }
                            }

                            InvalidateDepartmentCache();
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
                            errorMessage = ex.Message;
                            if (attempt == 2) isSuccess = false;
                        }
                    }

                    if (!isSuccess) BaseHandler.SendJsonResponse(response, "{\"status\":\"error\", \"message\":\"" + errorMessage.Replace("\"", "'") + "\"}");
                }
            }

            else if (method == "DELETE")
            {
                BaseHandler.HandleDelete(request, response, connectionString, "don_vi", "id_don_vi", () =>
                {
                    InvalidateDepartmentCache();
                });
            }
        }
    }
}