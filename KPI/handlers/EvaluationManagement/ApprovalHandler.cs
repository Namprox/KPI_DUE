using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Net;
using System.Web.Script.Serialization;
using System.Configuration;

namespace KPI.handlers
{
    public class ApprovalHandler
    {
        public void ProcessRequest(HttpListenerContext context)
        {
            var request = context.Request;
            var response = context.Response;
            string connString = ConfigurationManager.ConnectionStrings["DefaultConnection"].ConnectionString;
            var serializer = new JavaScriptSerializer() { MaxJsonLength = Int32.MaxValue };
            string method = request.HttpMethod;

            if (method == "GET")
            {
                try
                {
                    string idQuanLyParam = BaseHandler.GetQueryParam(request, "idQuanLy");
                    string idNamParam = BaseHandler.GetQueryParam(request, "idNam") ?? DateTime.Now.Year.ToString();

                    bool isTopLevel = (BaseHandler.GetQueryParam(request, "isTopLevel") ?? "false").ToLower() == "true";

                    if (string.IsNullOrEmpty(idQuanLyParam))
                    {
                        BaseHandler.SendJsonResponse(response, "{\"status\":\"error\", \"message\":\"Thiếu thông tin người quản lý.\"}", 400);
                        return;
                    }

                    List<Dictionary<string, object>> list = new List<Dictionary<string, object>>();
                    List<int> phieuIds = new List<int>();

                    using (SqlConnection conn = new SqlConnection(connString))
                    {
                        conn.Open();

                        string sql = @"
                            SELECT nv.id_nhan_vien, nv.ma_nhan_vien, nv.ho_ten, cv.ten_chuc_vu,
                                   p.id_phieu, p.id_nam, p.tong_diem_tich_luy, p.trang_thai, p.ngay_gui
                            FROM nhan_vien nv
                            LEFT JOIN chuc_vu cv ON nv.id_chuc_vu = cv.id_chuc_vu
                            JOIN phieu_danh_gia p ON nv.id_nhan_vien = p.id_nhan_vien AND p.id_nam = @IdNam AND p.trang_thai >= 2
                            WHERE (@IsTopLevel = 1 OR nv.id_quan_ly_truc_tiep = @IdQuanLy) 
                            ORDER BY p.trang_thai ASC, p.ngay_gui DESC";

                        using (SqlCommand cmd = new SqlCommand(sql, conn))
                        {
                            cmd.Parameters.AddWithValue("@IdQuanLy", int.Parse(idQuanLyParam));
                            cmd.Parameters.AddWithValue("@IdNam", int.Parse(idNamParam));
                            cmd.Parameters.AddWithValue("@IsTopLevel", isTopLevel ? 1 : 0);

                            using (SqlDataReader reader = cmd.ExecuteReader())
                            {
                                while (reader.Read())
                                {
                                    int idPhieu = Convert.ToInt32(reader["id_phieu"]);
                                    phieuIds.Add(idPhieu);

                                    var item = new Dictionary<string, object>();
                                    item["IdNhanVien"] = Convert.ToInt32(reader["id_nhan_vien"]);
                                    item["MaNhanVien"] = reader["ma_nhan_vien"].ToString();
                                    item["HoTen"] = reader["ho_ten"].ToString();
                                    item["TenChucVu"] = reader["ten_chuc_vu"] != DBNull.Value ? reader["ten_chuc_vu"].ToString() : "Nhân viên";
                                    item["IdPhieu"] = idPhieu;
                                    item["IdNam"] = Convert.ToInt32(reader["id_nam"]);
                                    item["TongDiemTichLuy"] = Convert.ToDecimal(reader["tong_diem_tich_luy"]);
                                    item["TrangThai"] = Convert.ToInt32(reader["trang_thai"]);
                                    item["NgayGui"] = reader["ngay_gui"] != DBNull.Value ? Convert.ToDateTime(reader["ngay_gui"]).ToString("dd/MM/yyyy HH:mm") : "";
                                    item["DanhSachFile"] = new List<object>();

                                    list.Add(item);
                                }
                            }
                        }

                        if (phieuIds.Count > 0)
                        {
                            string ids = string.Join(",", phieuIds);
                            string fileSql = $@"
                                SELECT c.id_phieu, m.ten_file, m.ten_file_goc
                                FROM minh_chung m
                                JOIN chi_tiet_danh_gia c ON m.id_chi_tiet = c.id_chi_tiet
                                WHERE c.id_phieu IN ({ids})";

                            using (SqlCommand cmdFile = new SqlCommand(fileSql, conn))
                            {
                                using (SqlDataReader fileReader = cmdFile.ExecuteReader())
                                {
                                    while (fileReader.Read())
                                    {
                                        int pId = Convert.ToInt32(fileReader["id_phieu"]);
                                        var fileObj = new
                                        {
                                            fileName = fileReader["ten_file"].ToString(),
                                            originalName = fileReader["ten_file_goc"] != DBNull.Value ? fileReader["ten_file_goc"].ToString() : fileReader["ten_file"].ToString()
                                        };

                                        var phieu = list.FirstOrDefault(p => (int)p["IdPhieu"] == pId);
                                        if (phieu != null)
                                        {
                                            ((List<object>)phieu["DanhSachFile"]).Add(fileObj);
                                        }
                                    }
                                }
                            }
                        }
                    }

                    BaseHandler.SendJsonResponse(response, serializer.Serialize(new { success = true, data = list }));
                }
                catch (Exception ex)
                {
                    BaseHandler.SendJsonResponse(response, $"{{\"status\":\"error\", \"message\":\"Lỗi hệ thống: {ex.Message.Replace("\"", "'")}\"}}", 500);
                }
            }
            else if (method == "POST")
            {
                using (var reader = new StreamReader(request.InputStream))
                {
                    var jsonString = reader.ReadToEnd();
                    var payload = serializer.Deserialize<Dictionary<string, object>>(jsonString);

                    string actionType = payload.ContainsKey("Action") ? payload["Action"].ToString().ToUpper() : "";

                    string lyDo = payload.ContainsKey("LyDo") && payload["LyDo"] != null ? payload["LyDo"].ToString() : "";

                    int idPhieu = Convert.ToInt32(payload["IdPhieu"]);
                    int idNhanVien = Convert.ToInt32(payload["IdNhanVien"]);

                    int trangThaiMoi = 0;
                    string hanhDongLog = "";
                    string moTaLog = "";

                    if (actionType == "APPROVE")
                    {
                        trangThaiMoi = 3;
                        hanhDongLog = "APPROVE";
                        moTaLog = "Cấp quản lý đã phê duyệt phiếu";
                    }
                    else if (actionType == "REJECT")
                    {
                        trangThaiMoi = 1;
                        hanhDongLog = "REJECT";
                        moTaLog = string.IsNullOrWhiteSpace(lyDo) ? "Cấp quản lý trả phiếu yêu cầu làm lại" : $"Cấp quản lý trả phiếu. Lý do: {lyDo}";
                    }
                    else if (actionType == "CANCEL_APPROVE")
                    {
                        trangThaiMoi = 2;
                        hanhDongLog = "CANCEL_APPROVE";
                        moTaLog = "Cấp quản lý đã hủy phê duyệt phiếu";
                    }

                    bool isSuccess = false;
                    string errorMessage = "";

                    for (int attempt = 0; attempt < 3; attempt++)
                    {
                        try
                        {
                            using (SqlConnection conn = new SqlConnection(connString))
                            {
                                conn.Open();
                                using (SqlTransaction transaction = conn.BeginTransaction())
                                {
                                    try
                                    {
                                        string updateSql = "UPDATE phieu_danh_gia SET trang_thai = @TrangThai, ngay_cap_nhat = GETDATE() WHERE id_phieu = @IdPhieu";
                                        using (SqlCommand cmd = new SqlCommand(updateSql, conn, transaction))
                                        {
                                            cmd.Parameters.AddWithValue("@TrangThai", trangThaiMoi);
                                            cmd.Parameters.AddWithValue("@IdPhieu", idPhieu);
                                            cmd.ExecuteNonQuery();
                                        }

                                        string insertLogSql = @"INSERT INTO nhat_ky (id_phieu, id_nhan_vien, hanh_dong, mo_ta) 
                                                                VALUES (@IdPhieu, @IdNhanVien, @HanhDong, @MoTa)";
                                        using (SqlCommand cmdLog = new SqlCommand(insertLogSql, conn, transaction))
                                        {
                                            cmdLog.Parameters.AddWithValue("@IdPhieu", idPhieu);
                                            cmdLog.Parameters.AddWithValue("@IdNhanVien", idNhanVien);
                                            cmdLog.Parameters.AddWithValue("@HanhDong", hanhDongLog);
                                            cmdLog.Parameters.AddWithValue("@MoTa", moTaLog);
                                            cmdLog.ExecuteNonQuery();
                                        }

                                        transaction.Commit();
                                        isSuccess = true;
                                        break;
                                    }
                                    catch (Exception)
                                    {
                                        transaction.Rollback();
                                        throw;
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
                            errorMessage = ex.Message;
                            if (attempt == 2) isSuccess = false;
                        }
                    }

                    if (isSuccess)
                    {
                        BaseHandler.SendJsonResponse(response, $"{{\"status\":\"success\", \"message\":\"{moTaLog} thành công!\"}}");
                    }
                    else
                    {
                        BaseHandler.SendJsonResponse(response, $"{{\"status\":\"error\", \"message\":\"Lỗi duyệt phiếu: {errorMessage.Replace("\"", "'")}\"}}", 500);
                    }
                }
            }
            else
            {
                BaseHandler.SendJsonResponse(response, "{\"status\":\"error\", \"message\": \"Method Not Allowed\"}", 405);
            }
        }
    }
}