using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Web.Script.Serialization;
using System.Runtime.Caching;
using KPI.Models;
using System.Configuration;

namespace KPI.handlers
{
    public class QL_NhanVienHandler
    {
        public static string UserCacheVersion = Guid.NewGuid().ToString("N");
        public static void InvalidateUserCache() => UserCacheVersion = Guid.NewGuid().ToString("N");
        public static string ChucDanhCacheVersion = Guid.NewGuid().ToString("N");

        public void ProcessRequest(HttpListenerContext context)
        {
            var request = context.Request;
            var response = context.Response;
            string connectionString = ConfigurationManager.ConnectionStrings["DefaultConnection"].ConnectionString;
            var serializer = new JavaScriptSerializer() { MaxJsonLength = Int32.MaxValue };

            string path = request.Url.LocalPath.Trim('/');
            string endpoint = path.Split('/').LastOrDefault()?.ToLower() ?? "";

            if (endpoint == "nhan-vien")
            {
                HandleUserLogic(request, response, connectionString, serializer);
            }
            else if (endpoint == "chuc-vu")
            {
                HandleChucVuLogic(request, response, connectionString, serializer);
            }
            else if (endpoint == "chuc-danh")
            {
                HandleChucDanhLogic(request, response, connectionString, serializer);
            }
        }

        private void HandleUserLogic(HttpListenerRequest request, HttpListenerResponse response, string connString, JavaScriptSerializer serializer)
        {
            string method = request.HttpMethod;

            if (method == "GET")
            {
                string cacheKey = $"NhanVienList_{UserCacheVersion}";
                ObjectCache cache = MemoryCache.Default;

                if (cache.Contains(cacheKey))
                {
                    BaseHandler.SendJsonResponse(response, cache.Get(cacheKey).ToString());
                    return;
                }

                List<QL_NhanVien> list = new List<QL_NhanVien>();
                using (SqlConnection conn = new SqlConnection(connString))
                {
                    conn.Open();
                    string sql = @"
                        SELECT nv.id_nhan_vien, nv.ma_nhan_vien, nv.ho_ten, nv.email, 
                               nv.id_don_vi, nv.id_chuc_vu, nv.id_quan_ly_truc_tiep, 
                               nv.id_chuc_danh, nv.science_user_id, nv.trang_thai,
                               dv.ten_don_vi, cv.ten_chuc_vu, cd.ten_chuc_danh 
                        FROM nhan_vien nv 
                        LEFT JOIN don_vi dv ON nv.id_don_vi = dv.id_don_vi
                        LEFT JOIN chuc_vu cv ON nv.id_chuc_vu = cv.id_chuc_vu
                        LEFT JOIN chuc_danh_nghe_nghiep cd ON nv.id_chuc_danh = cd.id_chuc_danh";

                    using (SqlCommand cmd = new SqlCommand(sql, conn))
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            list.Add(new QL_NhanVien
                            {
                                IdNhanVien = (int)reader["id_nhan_vien"],
                                MaNhanVien = reader["ma_nhan_vien"].ToString(),
                                HoTen = reader["ho_ten"].ToString(),
                                Email = reader["email"] != DBNull.Value ? reader["email"].ToString() : "",
                                MatKhau = "",
                                IdDonVi = (int)reader["id_don_vi"],
                                IdChucVu = reader["id_chuc_vu"] != DBNull.Value ? (int)reader["id_chuc_vu"] : (int?)null,
                                IdQuanLyTrucTiep = reader["id_quan_ly_truc_tiep"] != DBNull.Value ? (int)reader["id_quan_ly_truc_tiep"] : (int?)null,
                                ScienceUserId = reader["science_user_id"] != DBNull.Value ? (int)reader["science_user_id"] : (int?)null,
                                TrangThai = reader["trang_thai"] != DBNull.Value && (bool)reader["trang_thai"],
                                TenDonVi = reader["ten_don_vi"] != DBNull.Value ? reader["ten_don_vi"].ToString() : "",
                                TenChucVu = reader["ten_chuc_vu"] != DBNull.Value ? reader["ten_chuc_vu"].ToString() : "Chưa cập nhật",
                                IdChucDanh = reader["id_chuc_danh"] != DBNull.Value ? (int)reader["id_chuc_danh"] : (int?)null,
                                TenChucDanh = reader["ten_chuc_danh"] != DBNull.Value ? reader["ten_chuc_danh"].ToString() : ""
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

                            using (SqlConnection conn = new SqlConnection(connString))
                            {
                                conn.Open();

                                string ma = payload.ContainsKey("MaNhanVien") && payload["MaNhanVien"] != null ? payload["MaNhanVien"].ToString() : "";
                                string ten = payload.ContainsKey("HoTen") && payload["HoTen"] != null ? payload["HoTen"].ToString() : "";
                                string email = payload.ContainsKey("Email") && payload["Email"] != null ? payload["Email"].ToString() : "";
                                string pass = payload.ContainsKey("MatKhau") && payload["MatKhau"] != null ? payload["MatKhau"].ToString() : "";
                                bool trangThai = payload.ContainsKey("TrangThai") && payload["TrangThai"] != null ? Convert.ToBoolean(payload["TrangThai"]) : true;

                                int? idDv = payload.ContainsKey("IdDonVi") && payload["IdDonVi"] != null ? (int?)Convert.ToInt32(payload["IdDonVi"]) : null;
                                int? idCv = payload.ContainsKey("IdChucVu") && payload["IdChucVu"] != null ? (int?)Convert.ToInt32(payload["IdChucVu"]) : null;
                                int? idQl = payload.ContainsKey("IdQuanLyTrucTiep") && payload["IdQuanLyTrucTiep"] != null ? (int?)Convert.ToInt32(payload["IdQuanLyTrucTiep"]) : null;
                                int? idScience = payload.ContainsKey("ScienceUserId") && payload["ScienceUserId"] != null ? (int?)Convert.ToInt32(payload["ScienceUserId"]) : null;
                                int idNhanVien = payload.ContainsKey("IdNhanVien") && payload["IdNhanVien"] != null ? Convert.ToInt32(payload["IdNhanVien"]) : 0;

                                int? idChucDanh = payload.ContainsKey("IdChucDanh") && payload["IdChucDanh"] != null ? (int?)Convert.ToInt32(payload["IdChucDanh"]) : null;

                                string sql = "";
                                if (method == "POST")
                                {
                                    sql = @"INSERT INTO nhan_vien (ma_nhan_vien, ho_ten, email, mat_khau, id_don_vi, id_chuc_vu, id_quan_ly_truc_tiep, id_chuc_danh, science_user_id, trang_thai) 
                                            VALUES (@Ma, @Ten, @Email, @Pass, @IdDv, @IdCv, @IdQuanLy, @IdCd, @IdScience, @TrangThai)";
                                    if (string.IsNullOrEmpty(pass)) pass = "123456";
                                }
                                else
                                {
                                    if (!string.IsNullOrEmpty(pass))
                                    {
                                        sql = @"UPDATE nhan_vien SET ma_nhan_vien=@Ma, ho_ten=@Ten, email=@Email, mat_khau=@Pass, id_don_vi=@IdDv, id_chuc_vu=@IdCv, id_quan_ly_truc_tiep=@IdQuanLy, id_chuc_danh=@IdCd, science_user_id=@IdScience, trang_thai=@TrangThai 
                                                WHERE id_nhan_vien=@Id";
                                    }
                                    else
                                    {
                                        sql = @"UPDATE nhan_vien SET ma_nhan_vien=@Ma, ho_ten=@Ten, email=@Email, id_don_vi=@IdDv, id_chuc_vu=@IdCv, id_quan_ly_truc_tiep=@IdQuanLy, id_chuc_danh=@IdCd, science_user_id=@IdScience, trang_thai=@TrangThai 
                                                WHERE id_nhan_vien=@Id";
                                    }
                                }

                                using (SqlCommand cmd = new SqlCommand(sql, conn))
                                {
                                    cmd.Parameters.AddWithValue("@Ma", ma);
                                    cmd.Parameters.AddWithValue("@Ten", ten);
                                    cmd.Parameters.AddWithValue("@Email", string.IsNullOrEmpty(email) ? (object)DBNull.Value : email);

                                    if (method == "POST" || !string.IsNullOrEmpty(pass))
                                    {
                                        cmd.Parameters.AddWithValue("@Pass", pass);
                                    }

                                    cmd.Parameters.AddWithValue("@IdDv", idDv ?? (object)DBNull.Value);
                                    cmd.Parameters.AddWithValue("@IdCv", idCv ?? (object)DBNull.Value);
                                    cmd.Parameters.AddWithValue("@IdQuanLy", idQl ?? (object)DBNull.Value);
                                    cmd.Parameters.AddWithValue("@IdCd", idChucDanh ?? (object)DBNull.Value);
                                    cmd.Parameters.AddWithValue("@IdScience", idScience ?? (object)DBNull.Value);
                                    cmd.Parameters.AddWithValue("@TrangThai", trangThai);

                                    if (method == "PUT") cmd.Parameters.AddWithValue("@Id", idNhanVien);

                                    cmd.ExecuteNonQuery();
                                }
                            }

                            InvalidateUserCache();
                            QL_DonViHandler.InvalidateDepartmentCache();

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
                BaseHandler.HandleDelete(request, response, connString, "nhan_vien", "id_nhan_vien", () =>
                {
                    InvalidateUserCache();
                    QL_DonViHandler.InvalidateDepartmentCache();
                });
            }
        }

        private void HandleChucVuLogic(HttpListenerRequest request, HttpListenerResponse response, string connString, JavaScriptSerializer serializer)
        {
            if (request.HttpMethod == "GET")
            {
                string cacheKey = "ChucVuDropdownList";
                ObjectCache cache = MemoryCache.Default;
                if (cache.Contains(cacheKey))
                {
                    BaseHandler.SendJsonResponse(response, cache.Get(cacheKey).ToString());
                    return;
                }

                List<object> list = new List<object>();
                using (SqlConnection conn = new SqlConnection(connString))
                {
                    conn.Open();
                    using (SqlCommand cmd = new SqlCommand("SELECT id_chuc_vu, ten_chuc_vu FROM chuc_vu WHERE trang_thai = 1", conn))
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            list.Add(new { IdChucVu = (int)reader["id_chuc_vu"], TenChucVu = reader["ten_chuc_vu"].ToString() });
                        }
                    }
                }
                string jsonResponse = serializer.Serialize(list);
                cache.Set(cacheKey, jsonResponse, new CacheItemPolicy { AbsoluteExpiration = DateTimeOffset.Now.AddHours(2) });
                BaseHandler.SendJsonResponse(response, jsonResponse);
            }
        }

        private void HandleChucDanhLogic(HttpListenerRequest request, HttpListenerResponse response, string connString, JavaScriptSerializer serializer)
        {
            if (request.HttpMethod == "GET")
            {
                string cacheKey = $"ChucDanhDropdownList_{ChucDanhCacheVersion}";
                ObjectCache cache = MemoryCache.Default;
                if (cache.Contains(cacheKey))
                {
                    BaseHandler.SendJsonResponse(response, cache.Get(cacheKey).ToString());
                    return;
                }

                List<object> list = new List<object>();
                using (SqlConnection conn = new SqlConnection(connString))
                {
                    conn.Open();
                    using (SqlCommand cmd = new SqlCommand("SELECT id_chuc_danh, ten_chuc_danh FROM chuc_danh_nghe_nghiep WHERE trang_thai = 1", conn))
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            list.Add(new { IdChucDanh = (int)reader["id_chuc_danh"], TenChucDanh = reader["ten_chuc_danh"].ToString() });
                        }
                    }
                }
                string jsonResponse = serializer.Serialize(list);
                cache.Set(cacheKey, jsonResponse, new CacheItemPolicy { AbsoluteExpiration = DateTimeOffset.Now.AddMinutes(30) });
                BaseHandler.SendJsonResponse(response, jsonResponse);
            }
        }
    }
}