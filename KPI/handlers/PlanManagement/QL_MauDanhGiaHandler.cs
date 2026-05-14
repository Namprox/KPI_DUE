using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.IO;
using System.Net;
using System.Text;
using System.Web.Script.Serialization;
using System.Runtime.Caching;
using System.Linq;
using KPI.Models;
using System.Configuration;

namespace KPI.handlers
{
    public class QL_MauDanhGiaHandler
    {
        public static string MauDanhGiaCacheVersion = Guid.NewGuid().ToString("N");
        public static void InvalidateCache() => MauDanhGiaCacheVersion = Guid.NewGuid().ToString("N");

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
                    string cacheKey = $"MauDanhGiaList_{MauDanhGiaCacheVersion}";
                    ObjectCache cache = MemoryCache.Default;
                    if (cache.Contains(cacheKey))
                    {
                        BaseHandler.SendJsonResponse(response, cache.Get(cacheKey).ToString());
                        return;
                    }

                    List<QL_MauDanhGia> listMau = new List<QL_MauDanhGia>();

                    using (SqlConnection conn = new SqlConnection(connString))
                    {
                        conn.Open();
                        using (SqlCommand cmd = new SqlCommand("SELECT * FROM mau_danh_gia ORDER BY id_mau DESC", conn))
                        using (SqlDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                listMau.Add(new QL_MauDanhGia
                                {
                                    IdMau = Convert.ToInt32(reader["id_mau"]),
                                    TenMau = reader["ten_mau"].ToString(),
                                    IdNam = Convert.ToInt32(reader["id_nam"]),
                                    MoTa = reader["mo_ta"] != DBNull.Value ? reader["mo_ta"].ToString() : "",
                                    TrangThai = Convert.ToBoolean(reader["trang_thai"]),
                                    DanhSachIdTieuChi = new List<int>()
                                });
                            }
                        }

                        if (listMau.Count > 0)
                        {
                            using (SqlCommand cmd = new SqlCommand("SELECT id_mau, id_tieu_chi FROM chi_tiet_mau_danh_gia", conn))
                            using (SqlDataReader reader = cmd.ExecuteReader())
                            {
                                while (reader.Read())
                                {
                                    int idMau = Convert.ToInt32(reader["id_mau"]);
                                    int idTieuChi = Convert.ToInt32(reader["id_tieu_chi"]);

                                    var mau = listMau.FirstOrDefault(m => m.IdMau == idMau);
                                    if (mau != null)
                                    {
                                        mau.DanhSachIdTieuChi.Add(idTieuChi);
                                    }
                                }
                            }
                        }
                    }

                    string jsonResponse = serializer.Serialize(listMau);
                    cache.Set(cacheKey, jsonResponse, new CacheItemPolicy { AbsoluteExpiration = DateTimeOffset.Now.AddMinutes(10) });
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

                            string tenMau = payload.ContainsKey("TenMau") && payload["TenMau"] != null ? payload["TenMau"].ToString() : "";
                            int idNam = payload.ContainsKey("IdNam") && payload["IdNam"] != null ? Convert.ToInt32(payload["IdNam"]) : 0;
                            string moTa = payload.ContainsKey("MoTa") && payload["MoTa"] != null ? payload["MoTa"].ToString() : "";
                            bool trangThai = payload.ContainsKey("TrangThai") && payload["TrangThai"] != null ? Convert.ToBoolean(payload["TrangThai"]) : true;
                            int idMau = payload.ContainsKey("IdMau") && payload["IdMau"] != null ? Convert.ToInt32(payload["IdMau"]) : 0;

                            List<int> danhSachTieuChi = new List<int>();
                            if (payload.ContainsKey("DanhSachIdTieuChi") && payload["DanhSachIdTieuChi"] is System.Collections.ArrayList listArr)
                            {
                                foreach (var item in listArr) danhSachTieuChi.Add(Convert.ToInt32(item));
                            }

                            using (SqlConnection conn = new SqlConnection(connString))
                            {
                                conn.Open();
                                using (SqlTransaction transaction = conn.BeginTransaction())
                                {
                                    try
                                    {
                                        if (method == "POST")
                                        {
                                            string sql = "INSERT INTO mau_danh_gia (ten_mau, id_nam, mo_ta, trang_thai) OUTPUT INSERTED.id_mau VALUES (@Ten, @Nam, @MoTa, @TrangThai)";
                                            using (SqlCommand cmd = new SqlCommand(sql, conn, transaction))
                                            {
                                                cmd.Parameters.AddWithValue("@Ten", tenMau);
                                                cmd.Parameters.AddWithValue("@Nam", idNam);
                                                cmd.Parameters.AddWithValue("@MoTa", moTa);
                                                cmd.Parameters.AddWithValue("@TrangThai", trangThai);
                                                idMau = (int)cmd.ExecuteScalar();
                                            }
                                        }
                                        else
                                        {
                                            string sql = "UPDATE mau_danh_gia SET ten_mau=@Ten, id_nam=@Nam, mo_ta=@MoTa, trang_thai=@TrangThai WHERE id_mau=@Id";
                                            using (SqlCommand cmd = new SqlCommand(sql, conn, transaction))
                                            {
                                                cmd.Parameters.AddWithValue("@Ten", tenMau);
                                                cmd.Parameters.AddWithValue("@Nam", idNam);
                                                cmd.Parameters.AddWithValue("@MoTa", moTa);
                                                cmd.Parameters.AddWithValue("@TrangThai", trangThai);
                                                cmd.Parameters.AddWithValue("@Id", idMau);
                                                cmd.ExecuteNonQuery();
                                            }

                                            using (SqlCommand cmdDel = new SqlCommand("DELETE FROM chi_tiet_mau_danh_gia WHERE id_mau=@IdMau", conn, transaction))
                                            {
                                                cmdDel.Parameters.AddWithValue("@IdMau", idMau);
                                                cmdDel.ExecuteNonQuery();
                                            }
                                        }

                                        if (danhSachTieuChi.Count > 0)
                                        {
                                            string sqlInsertDetail = "INSERT INTO chi_tiet_mau_danh_gia (id_mau, id_tieu_chi) VALUES (@IdMau, @IdTieuChi)";
                                            foreach (int idTieuChi in danhSachTieuChi)
                                            {
                                                using (SqlCommand cmdDet = new SqlCommand(sqlInsertDetail, conn, transaction))
                                                {
                                                    cmdDet.Parameters.AddWithValue("@IdMau", idMau);
                                                    cmdDet.Parameters.AddWithValue("@IdTieuChi", idTieuChi);
                                                    cmdDet.ExecuteNonQuery();
                                                }
                                            }
                                        }
                                        transaction.Commit();
                                    }
                                    catch (Exception)
                                    {
                                        transaction.Rollback();
                                        throw;
                                    }
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
                        catch (Exception ex)
                        {
                            errorMessage = ex.Message.Replace("\"", "'");
                            if (attempt == 2) isSuccess = false;
                            break;
                        }
                    }

                    if (!isSuccess)
                    {
                        BaseHandler.SendJsonResponse(response, $"{{\"status\":\"error\", \"message\":\"Lỗi khi lưu Mẫu đánh giá: {errorMessage}\"}}");
                    }
                }
            }

            else if (method == "DELETE")
            {
                BaseHandler.HandleDelete(request, response, connString, "mau_danh_gia", "id_mau", () =>
                {
                    InvalidateCache();
                });
            }
        }
    }
}