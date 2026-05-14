using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.IO;
using System.Net;
using System.Text;
using System.Web.Script.Serialization;
using System.Configuration;

namespace KPI.handlers
{
    public class LoginHandler
    {
        public void ProcessRequest(HttpListenerContext context)
        {
            var request = context.Request;
            var response = context.Response;
            var serializer = new JavaScriptSerializer();
            string connString = ConfigurationManager.ConnectionStrings["DefaultConnection"].ConnectionString;

            if (request.HttpMethod == "POST")
            {
                try
                {
                    using (var reader = new StreamReader(request.InputStream, Encoding.UTF8))
                    {
                        var body = reader.ReadToEnd();
                        var loginData = serializer.Deserialize<Dictionary<string, object>>(body);

                        string username = loginData.ContainsKey("Email") ? loginData["Email"]?.ToString() :
                                         (loginData.ContainsKey("Username") ? loginData["Username"]?.ToString() : "");
                        string password = loginData.ContainsKey("Password") ? loginData["Password"]?.ToString() : "";

                        bool isSuccess = false;
                        string errorMessage = "";

                        for (int attempt = 0; attempt < 3; attempt++)
                        {
                            try
                            {
                                using (SqlConnection conn = new SqlConnection(connString))
                                {
                                    conn.Open();
                                    string sql = @"
                                        SELECT nv.*, cv.ten_chuc_vu 
                                        FROM nhan_vien nv 
                                        LEFT JOIN chuc_vu cv ON nv.id_chuc_vu = cv.id_chuc_vu 
                                        WHERE (nv.email = @Username OR nv.ma_nhan_vien = @Username) 
                                        AND nv.mat_khau = @Password 
                                        AND nv.trang_thai = 1";

                                    using (SqlCommand cmd = new SqlCommand(sql, conn))
                                    {
                                        cmd.Parameters.AddWithValue("@Username", username);
                                        cmd.Parameters.AddWithValue("@Password", password);

                                        int userId = 0;
                                        object userObj = null;

                                        using (SqlDataReader dbReader = cmd.ExecuteReader())
                                        {
                                            if (dbReader.Read())
                                            {
                                                userId = (int)dbReader["id_nhan_vien"];
                                                userObj = new
                                                {
                                                    Id = userId,
                                                    IdNhanVien = userId,
                                                    MaNhanVien = dbReader["ma_nhan_vien"].ToString(),
                                                    HoTen = dbReader["ho_ten"].ToString(),
                                                    FullName = dbReader["ho_ten"].ToString(),
                                                    Email = dbReader["email"] != DBNull.Value ? dbReader["email"].ToString() : "",
                                                    IdChucVu = dbReader["id_chuc_vu"] != DBNull.Value ? (int)dbReader["id_chuc_vu"] : 0,
                                                    RoleId = dbReader["id_chuc_vu"] != DBNull.Value ? (int)dbReader["id_chuc_vu"] : 0,
                                                    RoleName = dbReader["ten_chuc_vu"] != DBNull.Value ? dbReader["ten_chuc_vu"].ToString() : "Giảng viên",
                                                    IdDonVi = dbReader["id_don_vi"] != DBNull.Value ? (int)dbReader["id_don_vi"] : 0,
                                                    IdNhomGv = dbReader["id_nhom_gv"] != DBNull.Value ? (int)dbReader["id_nhom_gv"] : 0,
                                                    ScienceUserId = dbReader["science_user_id"] != DBNull.Value ? (int)dbReader["science_user_id"] : 0,
                                                    IdQuanLyTrucTiep = dbReader["id_quan_ly_truc_tiep"] != DBNull.Value ? (int)dbReader["id_quan_ly_truc_tiep"] : 0
                                                };
                                            }
                                        }

                                        if (userId > 0 && userObj != null)
                                        {
                                            string accessToken = "kpi-token-" + Guid.NewGuid().ToString("N");
                                            string refreshToken = Guid.NewGuid().ToString("N");
                                            DateTime expireDate = DateTime.Now.AddDays(7);

                                            string updateTokenSql = "UPDATE nhan_vien SET refresh_token_hash = @Token, refresh_token_het_han = @Expire WHERE id_nhan_vien = @Id";
                                            using (SqlCommand updateCmd = new SqlCommand(updateTokenSql, conn))
                                            {
                                                updateCmd.Parameters.AddWithValue("@Token", refreshToken);
                                                updateCmd.Parameters.AddWithValue("@Expire", expireDate);
                                                updateCmd.Parameters.AddWithValue("@Id", userId);
                                                updateCmd.ExecuteNonQuery();
                                            }

                                            var successResponse = new
                                            {
                                                success = true,
                                                message = "Đăng nhập thành công!",
                                                accessToken = accessToken,
                                                refreshToken = refreshToken,
                                                user = userObj
                                            };

                                            BaseHandler.SendJsonResponse(response, serializer.Serialize(successResponse));
                                            isSuccess = true;
                                            return;
                                        }
                                        else
                                        {
                                            errorMessage = "Tài khoản hoặc mật khẩu không chính xác hoặc đã bị khóa!";
                                            break;
                                        }
                                    }
                                }
                            }
                            catch (SqlException ex) when (ex.Number == 1205 && attempt < 2)
                            {
                                System.Threading.Thread.Sleep(50 * (attempt + 1));
                            }
                            catch (Exception ex)
                            {
                                errorMessage = "Lỗi CSDL: " + ex.Message.Replace("\"", "'");
                                break;
                            }
                        }

                        if (!isSuccess)
                        {
                            var failResponse = new { success = false, message = errorMessage };
                            BaseHandler.SendJsonResponse(response, serializer.Serialize(failResponse));
                        }
                    }
                }
                catch (Exception ex)
                {
                    var errResponse = new { success = false, message = "Lỗi server: " + ex.Message };
                    BaseHandler.SendJsonResponse(response, serializer.Serialize(errResponse));
                }
            }
            else
            {
                BaseHandler.SendJsonResponse(response, "{\"success\":false, \"message\": \"Method Not Allowed\"}", 405);
            }
        }
    }
}