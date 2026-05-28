using System;
using System.Collections.Generic;
using System.Data.SqlClient;
using System.Net;
using System.Web.Script.Serialization;
using System.Configuration;

namespace KPI.handlers
{
    public class ScienceDataHandler
    {
        public void ProcessRequest(HttpListenerContext context)
        {
            var request = context.Request;
            var response = context.Response;
            var serializer = new JavaScriptSerializer() { MaxJsonLength = Int32.MaxValue };
            
            string connString = ConfigurationManager.ConnectionStrings["DefaultConnection"].ConnectionString;

            if (request.HttpMethod == "GET")
            {
                try
                {
                    string email = BaseHandler.GetQueryParam(request, "email");
                    if (string.IsNullOrEmpty(email))
                    {
                        BaseHandler.SendJsonResponse(response, "{\"success\":false, \"message\":\"Không tìm thấy Email người dùng!\"}", 400);
                        return;
                    }

                    List<object> listArticles = new List<object>();

                    using (SqlConnection conn = new SqlConnection(connString))
                    {
                        conn.Open();
                        // ĐÃ NÂNG CẤP: Dùng LEFT JOIN và quét cả cột CreatedByEmail, dùng LIKE để tránh lỗi dư khoảng trắng
                        string sql = @"
                            SELECT 
                                sa.Id AS ArticleId,
                                sa.Title,
                                j.Name AS JournalName,
                                sa.QRanking,
                                sa.Status,
                                sa.CreatedAt,
                                sa.TotalAuthors
                            FROM DueScienceDB.dbo.ScientificArticles sa
                            LEFT JOIN DueScienceDB.dbo.Users u ON sa.UserId = u.Id
                            LEFT JOIN DueScienceDB.dbo.Journals j ON sa.JournalId = j.Id
                            WHERE (u.Email = @Email OR sa.CreatedByEmail = @Email)
                              AND sa.Status LIKE N'%Đã duyệt%'
                            ORDER BY sa.CreatedAt DESC";

                        using (SqlCommand cmd = new SqlCommand(sql, conn))
                        {
                            cmd.Parameters.AddWithValue("@Email", email);
                            using (SqlDataReader reader = cmd.ExecuteReader())
                            {
                                while (reader.Read())
                                {
                                    listArticles.Add(new
                                    {
                                        ScienceRecordId = Convert.ToInt32(reader["ArticleId"]),
                                        BangNguon = "ScientificArticles",
                                        MoTa = reader["Title"].ToString(),
                                        JournalName = reader["JournalName"] != DBNull.Value ? reader["JournalName"].ToString() : "",
                                        QRanking = reader["QRanking"] != DBNull.Value ? reader["QRanking"].ToString() : "N/A",
                                        CreatedAt = reader["CreatedAt"] != DBNull.Value ? Convert.ToDateTime(reader["CreatedAt"]).ToString("dd/MM/yyyy") : ""
                                    });
                                }
                            }
                        }
                    }
                    
                    BaseHandler.SendJsonResponse(response, serializer.Serialize(new { success = true, data = listArticles }));
                }
                catch (Exception ex)
                {
                    BaseHandler.SendJsonResponse(response, $"{{\"success\":false, \"message\":\"Lỗi kéo dữ liệu NCKH: {ex.Message.Replace("\"", "'")}\"}}", 500);
                }
            }
        }
    }
}