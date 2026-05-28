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
    public class QL_NamDanhGiaHandler
    {
        public static string NamDanhGiaCacheVersion = Guid.NewGuid().ToString("N");
        public static void InvalidateCache() => NamDanhGiaCacheVersion = Guid.NewGuid().ToString("N");

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
                    string cacheKey = $"NamDanhGiaList_{NamDanhGiaCacheVersion}";
                    ObjectCache cache = MemoryCache.Default;
                    if (cache.Contains(cacheKey))
                    {
                        BaseHandler.SendJsonResponse(response, cache.Get(cacheKey).ToString());
                        return;
                    }

                    List<QL_NamDanhGia> list = new List<QL_NamDanhGia>();
                    DateTime today = DateTime.Now.Date;

                    using (SqlConnection conn = new SqlConnection(connString))
                    {
                        conn.Open();
                        using (SqlCommand cmd = new SqlCommand("SELECT * FROM nam_danh_gia ORDER BY id_nam DESC", conn))
                        using (SqlDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                DateTime? ngayMoTu = reader["ngay_mo_tu_danh_gia"] != DBNull.Value ? (DateTime?)Convert.ToDateTime(reader["ngay_mo_tu_danh_gia"]) : null;
                                DateTime? ngayDongCapTren = reader["ngay_dong_danh_gia_cap_tren"] != DBNull.Value ? (DateTime?)Convert.ToDateTime(reader["ngay_dong_danh_gia_cap_tren"]) : null;
                                byte trangThaiGoc = Convert.ToByte(reader["trang_thai"]);
                                byte calculatedStatus = trangThaiGoc;

                                if (ngayMoTu.HasValue && ngayDongCapTren.HasValue)
                                {
                                    DateTime startDate = ngayMoTu.Value.Date;
                                    DateTime endDate = ngayDongCapTren.Value.Date;

                                    if (today < startDate) calculatedStatus = 1;
                                    else if (today >= startDate && today <= endDate) calculatedStatus = 2;
                                    else if (today > endDate) calculatedStatus = 3;
                                }

                                list.Add(new QL_NamDanhGia
                                {
                                    IdNam = Convert.ToInt32(reader["id_nam"]),
                                    NgayBatDau = Convert.ToDateTime(reader["ngay_bat_dau"]),
                                    NgayKetThuc = Convert.ToDateTime(reader["ngay_ket_thuc"]),
                                    NgayMoTuDanhGia = ngayMoTu,
                                    NgayDongTuDanhGia = reader["ngay_dong_tu_danh_gia"] != DBNull.Value ? (DateTime?)Convert.ToDateTime(reader["ngay_dong_tu_danh_gia"]) : null,
                                    NgayMoDanhGiaCapTren = reader["ngay_mo_danh_gia_cap_tren"] != DBNull.Value ? (DateTime?)Convert.ToDateTime(reader["ngay_mo_danh_gia_cap_tren"]) : null,
                                    NgayDongDanhGiaCapTren = ngayDongCapTren,
                                    TrangThai = calculatedStatus,
                                    GhiChu = reader["ghi_chu"] != DBNull.Value ? reader["ghi_chu"].ToString() : ""
                                });
                            }
                        }
                    }
                    string jsonResponse = serializer.Serialize(list);
                    cache.Set(cacheKey, jsonResponse, new CacheItemPolicy { AbsoluteExpiration = DateTimeOffset.Now.AddMinutes(5) });
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

                                int idNam = Convert.ToInt32(payload["IdNam"]);
                                DateTime ngayBatDau = Convert.ToDateTime(payload["NgayBatDau"]);
                                DateTime ngayKetThuc = Convert.ToDateTime(payload["NgayKetThuc"]);

                                object ngayMoTu = payload.ContainsKey("NgayMoTuDanhGia") && payload["NgayMoTuDanhGia"] != null && payload["NgayMoTuDanhGia"].ToString() != "" ? (object)Convert.ToDateTime(payload["NgayMoTuDanhGia"]) : DBNull.Value;
                                object ngayDongTu = payload.ContainsKey("NgayDongTuDanhGia") && payload["NgayDongTuDanhGia"] != null && payload["NgayDongTuDanhGia"].ToString() != "" ? (object)Convert.ToDateTime(payload["NgayDongTuDanhGia"]) : DBNull.Value;
                                object ngayMoCapTren = payload.ContainsKey("NgayMoDanhGiaCapTren") && payload["NgayMoDanhGiaCapTren"] != null && payload["NgayMoDanhGiaCapTren"].ToString() != "" ? (object)Convert.ToDateTime(payload["NgayMoDanhGiaCapTren"]) : DBNull.Value;
                                object ngayDongCapTren = payload.ContainsKey("NgayDongDanhGiaCapTren") && payload["NgayDongDanhGiaCapTren"] != null && payload["NgayDongDanhGiaCapTren"].ToString() != "" ? (object)Convert.ToDateTime(payload["NgayDongDanhGiaCapTren"]) : DBNull.Value;

                                string ghiChu = payload.ContainsKey("GhiChu") && payload["GhiChu"] != null ? payload["GhiChu"].ToString() : "";

                                byte trangThai = 1;
                                if (ngayMoTu != DBNull.Value && ngayDongCapTren != DBNull.Value)
                                {
                                    DateTime today = DateTime.Now.Date;
                                    DateTime startDate = Convert.ToDateTime(ngayMoTu).Date;
                                    DateTime endDate = Convert.ToDateTime(ngayDongCapTren).Date;

                                    if (today < startDate) trangThai = 1;
                                    else if (today >= startDate && today <= endDate) trangThai = 2;
                                    else if (today > endDate) trangThai = 3;
                                }
                                else
                                {
                                    trangThai = payload.ContainsKey("TrangThai") && payload["TrangThai"] != null ? Convert.ToByte(payload["TrangThai"]) : (byte)1;
                                }

                                string sql = method == "POST"
                                    ? @"INSERT INTO nam_danh_gia (id_nam, ngay_bat_dau, ngay_ket_thuc, ngay_mo_tu_danh_gia, ngay_dong_tu_danh_gia, ngay_mo_danh_gia_cap_tren, ngay_dong_danh_gia_cap_tren, trang_thai, ghi_chu) 
                                        VALUES (@IdNam, @BatDau, @KetThuc, @MoTu, @DongTu, @MoCapTren, @DongCapTren, @TrangThai, @GhiChu)"
                                    : @"UPDATE nam_danh_gia 
                                        SET ngay_bat_dau=@BatDau, ngay_ket_thuc=@KetThuc, ngay_mo_tu_danh_gia=@MoTu, ngay_dong_tu_danh_gia=@DongTu, ngay_mo_danh_gia_cap_tren=@MoCapTren, ngay_dong_danh_gia_cap_tren=@DongCapTren, trang_thai=@TrangThai, ghi_chu=@GhiChu 
                                        WHERE id_nam=@IdNam";

                                using (SqlCommand cmd = new SqlCommand(sql, conn))
                                {
                                    cmd.Parameters.AddWithValue("@IdNam", idNam);
                                    cmd.Parameters.AddWithValue("@BatDau", ngayBatDau);
                                    cmd.Parameters.AddWithValue("@KetThuc", ngayKetThuc);
                                    cmd.Parameters.AddWithValue("@MoTu", ngayMoTu);
                                    cmd.Parameters.AddWithValue("@DongTu", ngayDongTu);
                                    cmd.Parameters.AddWithValue("@MoCapTren", ngayMoCapTren);
                                    cmd.Parameters.AddWithValue("@DongCapTren", ngayDongCapTren);
                                    cmd.Parameters.AddWithValue("@TrangThai", trangThai);
                                    cmd.Parameters.AddWithValue("@GhiChu", ghiChu);
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
                                errorMessage = "Năm đánh giá này đã tồn tại!";
                            else if (ex.Number == 547)
                                errorMessage = "Lỗi vi phạm mốc thời gian (Kiểm tra lại tính hợp lý của các ngày đã nhập)!";
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
                        BaseHandler.SendJsonResponse(response, $"{{\"status\":\"error\", \"message\":\"{errorMessage}\"}}");
                    }
                }
            }

            else if (method == "DELETE")
            {
                string idParam = BaseHandler.GetQueryParam(request, "id") ?? request.QueryString["id"];
                if (!string.IsNullOrEmpty(idParam))
                {
                    try
                    {
                        using (SqlConnection conn = new SqlConnection(connString))
                        {
                            conn.Open();
                            using (SqlCommand cmd = new SqlCommand("DELETE FROM nam_danh_gia WHERE id_nam = @Id", conn))
                            {
                                cmd.Parameters.AddWithValue("@Id", idParam);
                                cmd.ExecuteNonQuery();
                            }
                        }
                        InvalidateCache();
                        BaseHandler.SendJsonResponse(response, "{\"status\":\"success\"}");
                    }
                    catch (SqlException ex)
                    {
                        if (ex.Number == 547) BaseHandler.SendJsonResponse(response, "{\"status\":\"error\", \"message\":\"Không thể xóa vì Năm đánh giá này đã có dữ liệu (Phiếu, Tiêu chí... liên kết)!\"}");
                        else BaseHandler.SendJsonResponse(response, $"{{\"status\":\"error\", \"message\":\"{ex.Message.Replace("\"", "'")}\"}}");
                    }
                }
            }
        }
    }
}