using System;
using System.Data.SqlClient;
using System.Net;
using System.Web.Script.Serialization;
using System.Configuration;

namespace KPI.handlers
{
    public class SyncHandler
    {
        public void ProcessRequest(HttpListenerContext context)
        {
            var request = context.Request;
            var response = context.Response;
            string connString = ConfigurationManager.ConnectionStrings["DefaultConnection"].ConnectionString;
            var serializer = new JavaScriptSerializer();

            if (request.HttpMethod == "POST")
            {
                try
                {
                    string idNamStr = BaseHandler.GetQueryParam(request, "idNam") ?? DateTime.Now.Year.ToString();
                    int idNam = int.Parse(idNamStr);

                    using (SqlConnection conn = new SqlConnection(connString))
                    {
                        conn.Open();
                        string sqlMerge = @"
                            MERGE INTO gio_thuc_hien_gv AS Target
                            USING (
                                SELECT 
                                    nv.id_nhan_vien, 
                                    @IdNam as id_nam,
                                    ISNULL(ush.ActualPercentage, 0) as gio_nckh
                                FROM nhan_vien nv
                                JOIN DueScienceDB.dbo.Users u ON nv.email = u.Email
                                JOIN DueScienceDB.dbo.UserStandardHours ush ON u.Id = ush.UserId
                                WHERE ush.Status = N'Đã duyệt' AND ush.IsCurrent = 1
                            ) AS Source
                            ON (Target.id_nhan_vien = Source.id_nhan_vien AND Target.id_nam = Source.id_nam)
                            
                            WHEN MATCHED THEN
                                UPDATE SET 
                                    Target.gio_nckh_thuc_te = Source.gio_nckh,
                                    Target.nguon = 2, -- 2: Đồng bộ từ hệ thống khác
                                    Target.ngay_cap_nhat = GETDATE()
                            
                            WHEN NOT MATCHED BY TARGET THEN
                                INSERT (id_nhan_vien, id_nam, gio_giang_thuc_te, gio_nckh_thuc_te, nguon)
                                VALUES (Source.id_nhan_vien, Source.id_nam, 0, Source.gio_nckh, 2);
                        ";

                        using (SqlCommand cmd = new SqlCommand(sqlMerge, conn))
                        {
                            cmd.Parameters.AddWithValue("@IdNam", idNam);
                            int rowsAffected = cmd.ExecuteNonQuery();

                            BaseHandler.SendJsonResponse(response, serializer.Serialize(new
                            {
                                success = true,
                                message = $"Đồng bộ thành công! Đã cập nhật giờ NCKH cho {rowsAffected} Giảng viên"
                            }));
                        }
                    }
                }
                catch (Exception ex)
                {
                    BaseHandler.SendJsonResponse(response, $"{{\"success\":false, \"message\":\"Lỗi đồng bộ: {ex.Message.Replace("\"", "'")}\"}}");
                }
            }
        }
    }
}