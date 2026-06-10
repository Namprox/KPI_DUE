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
    public class QL_GioThucHienHandler
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
                    string idNhanVien = BaseHandler.GetQueryParam(request, "idNhanVien");
                    string idNam = BaseHandler.GetQueryParam(request, "idNam");

                    if (string.IsNullOrEmpty(idNam))
                    {
                        BaseHandler.SendJsonResponse(response, "{\"success\":false, \"message\":\"Thiếu tham số năm (idNam)\"}");
                        return;
                    }

                    using (SqlConnection conn = new SqlConnection(connString))
                    {
                        conn.Open();

                        if (!string.IsNullOrEmpty(idNhanVien))
                        {
                            string sql = "SELECT gio_giang_thuc_te, gio_nckh_thuc_te, nguon FROM gio_thuc_hien_gv WHERE id_nhan_vien = @IdNV AND id_nam = @IdNam";
                            using (SqlCommand cmd = new SqlCommand(sql, conn))
                            {
                                cmd.Parameters.AddWithValue("@IdNV", int.Parse(idNhanVien));
                                cmd.Parameters.AddWithValue("@IdNam", int.Parse(idNam));
                                using (SqlDataReader reader = cmd.ExecuteReader())
                                {
                                    if (reader.Read())
                                    {
                                        var data = new
                                        {
                                            gio_giang_thuc_te = reader["gio_giang_thuc_te"],
                                            gio_nckh_thuc_te = reader["gio_nckh_thuc_te"],
                                            so_lop_vuot = 0
                                        };
                                        BaseHandler.SendJsonResponse(response, serializer.Serialize(new { success = true, data = data }));
                                        return;
                                    }
                                }
                            }
                            BaseHandler.SendJsonResponse(response, serializer.Serialize(new { success = true, data = new { gio_giang_thuc_te = 0, gio_nckh_thuc_te = 0, so_lop_vuot = 0 } }));
                        }
                        else
                        {
                            string sql = @"
                                SELECT 
                                    nv.id_nhan_vien, nv.ma_nhan_vien, nv.ho_ten, dv.ten_don_vi,
                                    ISNULL(gth.gio_giang_thuc_te, 0) as gio_giang_thuc_te,
                                    ISNULL(gth.gio_nckh_thuc_te, 0) as gio_nckh_thuc_te,
                                    ISNULL(gth.nguon, 1) as nguon
                                FROM nhan_vien nv
                                LEFT JOIN don_vi dv ON nv.id_don_vi = dv.id_don_vi
                                LEFT JOIN gio_thuc_hien_gv gth ON nv.id_nhan_vien = gth.id_nhan_vien AND gth.id_nam = @IdNam
                                WHERE nv.trang_thai = 1 AND nv.id_chuc_danh IS NOT NULL
                                ORDER BY dv.ten_don_vi, nv.ho_ten";

                            var list = new List<object>();
                            using (SqlCommand cmd = new SqlCommand(sql, conn))
                            {
                                cmd.Parameters.AddWithValue("@IdNam", int.Parse(idNam));
                                using (SqlDataReader r = cmd.ExecuteReader())
                                {
                                    while (r.Read())
                                    {
                                        list.Add(new
                                        {
                                            IdNhanVien = r["id_nhan_vien"],
                                            MaNhanVien = r["ma_nhan_vien"].ToString(),
                                            HoTen = r["ho_ten"].ToString(),
                                            TenDonVi = r["ten_don_vi"].ToString(),
                                            GioGiangThucTe = r["gio_giang_thuc_te"],
                                            GioNckhThucTe = r["gio_nckh_thuc_te"],
                                            Nguon = r["nguon"]
                                        });
                                    }
                                }
                            }
                            BaseHandler.SendJsonResponse(response, serializer.Serialize(new { success = true, data = list }));
                        }
                    }
                }
                catch (Exception ex)
                {
                    BaseHandler.SendJsonResponse(response, $"{{\"success\":false, \"message\":\"{ex.Message}\"}}");
                }
            }

            else if (method == "POST")
            {
                using (var reader = new StreamReader(request.InputStream, Encoding.UTF8))
                {
                    try
                    {
                        string json = reader.ReadToEnd();
                        var payload = serializer.Deserialize<Dictionary<string, object>>(json);
                        int idNam = Convert.ToInt32(payload["IdNam"]);

                        var items = (System.Collections.ArrayList)payload["Items"];

                        using (SqlConnection conn = new SqlConnection(connString))
                        {
                            conn.Open();
                            using (SqlTransaction trans = conn.BeginTransaction())
                            {
                                try
                                {
                                    string sqlMerge = @"
                                        MERGE INTO gio_thuc_hien_gv AS Target
                                        USING (SELECT @IdNhanVien as id_nhan_vien, @IdNam as id_nam, @GioGiang as gio_giang, @GioNckh as gio_nckh) AS Source
                                        ON (Target.id_nhan_vien = Source.id_nhan_vien AND Target.id_nam = Source.id_nam)
                                        WHEN MATCHED THEN
                                            UPDATE SET 
                                                Target.gio_giang_thuc_te = Source.gio_giang,
                                                Target.gio_nckh_thuc_te = Source.gio_nckh,
                                                Target.ngay_cap_nhat = GETDATE()
                                        WHEN NOT MATCHED BY TARGET THEN
                                            INSERT (id_nhan_vien, id_nam, gio_giang_thuc_te, gio_nckh_thuc_te, nguon)
                                            VALUES (Source.id_nhan_vien, Source.id_nam, Source.gio_giang, Source.gio_nckh, 1);
                                    ";

                                    using (SqlCommand cmd = new SqlCommand(sqlMerge, conn, trans))
                                    {
                                        cmd.Parameters.Add("@IdNhanVien", System.Data.SqlDbType.Int);
                                        cmd.Parameters.Add("@IdNam", System.Data.SqlDbType.Int);
                                        cmd.Parameters.Add("@GioGiang", System.Data.SqlDbType.Decimal);
                                        cmd.Parameters.Add("@GioNckh", System.Data.SqlDbType.Decimal);

                                        foreach (Dictionary<string, object> item in items)
                                        {
                                            cmd.Parameters["@IdNhanVien"].Value = Convert.ToInt32(item["IdNhanVien"]);
                                            cmd.Parameters["@IdNam"].Value = idNam;
                                            cmd.Parameters["@GioGiang"].Value = Convert.ToDecimal(item["GioGiangThucTe"]);
                                            cmd.Parameters["@GioNckh"].Value = Convert.ToDecimal(item["GioNckhThucTe"]);
                                            cmd.ExecuteNonQuery();
                                        }
                                    }
                                    trans.Commit();
                                    BaseHandler.SendJsonResponse(response, "{\"success\":true, \"message\":\"Đã cập nhật dữ liệu giờ thực tế thành công!\"}");
                                }
                                catch (Exception)
                                {
                                    trans.Rollback();
                                    throw;
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        BaseHandler.SendJsonResponse(response, $"{{\"success\":false, \"message\":\"Lỗi lưu dữ liệu: {ex.Message.Replace("\"", "'")}\"}}");
                    }
                }
            }
        }
    }
}