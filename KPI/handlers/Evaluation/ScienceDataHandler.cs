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
                    string type = BaseHandler.GetQueryParam(request, "type") ?? "article";

                    if (string.IsNullOrEmpty(email))
                    {
                        BaseHandler.SendJsonResponse(response, "{\"success\":false, \"message\":\"Không tìm thấy Email người dùng!\"}", 400);
                        return;
                    }

                    List<object> listArticles = new List<object>();

                    using (SqlConnection conn = new SqlConnection(connString))
                    {
                        conn.Open();
                        string sql = "";

                        if (type == "article")
                        {
                            sql = @"
                                SELECT 
                                    sa.Id AS RecordId,
                                    sa.Title AS MoTa,
                                    'ScientificArticles' AS BangNguon,
                                    j.Name AS JournalName,
                                    sa.QRanking,
                                    sa.Status,
                                    sa.CreatedAt,
                                    sa.TotalAuthors,
                                    sa.PrimaryAuthors,
                                    sa.JournalScore,
                                    sa.BonusCoefficient,
                                    sa.MembersJSON
                                FROM DueScienceDB.dbo.ScientificArticles sa
                                LEFT JOIN DueScienceDB.dbo.Users u ON sa.UserId = u.Id
                                LEFT JOIN DueScienceDB.dbo.Journals j ON sa.JournalId = j.Id
                                WHERE (u.Email = @Email OR sa.CreatedByEmail = @Email)
                                  AND sa.Status LIKE N'%Đã duyệt%'
                                ORDER BY sa.CreatedAt DESC";
                        }
                        else if (type == "book")
                        {
                            sql = @"
                                SELECT 
                                    b.Id AS RecordId,
                                    b.BookName AS MoTa, 
                                    'PublicationBooks' AS BangNguon,
                                    '' AS JournalName,
                                    N'SÁCH' AS QRanking,
                                    b.Status,
                                    b.PublishDate AS CreatedAt,
                                    b.TotalAuthors,
                                    b.MainAuthors AS PrimaryAuthors,
                                    1.0 AS JournalScore,
                                    1.0 AS BonusCoefficient,
                                    b.MembersJSON
                                FROM DueScienceDB.dbo.PublicationBooks b
                                LEFT JOIN DueScienceDB.dbo.Users u ON b.UserId = u.Id
                                WHERE u.Email = @Email
                                  AND b.Status LIKE N'%Đã duyệt%'
                                ORDER BY b.Id DESC";
                        }
                        else if (type == "project")
                        {
                            sql = @"
                                SELECT 
                                    p.Id AS RecordId,
                                    p.Title AS MoTa, 
                                    'ScientificProjects' AS BangNguon,
                                    '' AS JournalName,
                                    N'ĐỀ TÀI' AS QRanking,
                                    p.Status,
                                    p.StartDate AS CreatedAt,
                                    1 AS TotalAuthors,
                                    1 AS PrimaryAuthors,
                                    1.0 AS JournalScore,
                                    1.0 AS BonusCoefficient,
                                    p.MembersJSON
                                FROM DueScienceDB.dbo.ScientificProjects p
                                LEFT JOIN DueScienceDB.dbo.Users u ON p.UserId = u.Id
                                WHERE u.Email = @Email
                                  AND p.Status LIKE N'%Đã duyệt%'
                                ORDER BY p.Id DESC";
                        }
                        else if (type == "invention")
                        {
                            sql = @"
                                SELECT 
                                    i.Id AS RecordId,
                                    i.Name AS MoTa, 
                                    'Initiatives' AS BangNguon,
                                    '' AS JournalName,
                                    N'SHTT' AS QRanking,
                                    i.Status,
                                    i.ApprovalDate AS CreatedAt,
                                    1 AS TotalAuthors,
                                    1 AS PrimaryAuthors,
                                    1.0 AS JournalScore,
                                    1.0 AS BonusCoefficient,
                                    i.MembersJSON
                                FROM DueScienceDB.dbo.Initiatives i
                                LEFT JOIN DueScienceDB.dbo.Users u ON i.UserId = u.Id
                                WHERE u.Email = @Email
                                  AND i.Status LIKE N'%Đã duyệt%'
                                ORDER BY i.Id DESC";
                        }
                        else if (type == "student_research")
                        {
                            sql = @"
                                SELECT 
                                    sr.Id AS RecordId,
                                    sr.TopicName AS MoTa, 
                                    'StudentResearches' AS BangNguon,
                                    '' AS JournalName,
                                    N'SV NCKH' AS QRanking,
                                    sr.Status,
                                    sr.StartDate AS CreatedAt,
                                    1 AS TotalAuthors,
                                    1 AS PrimaryAuthors,
                                    1.0 AS JournalScore,
                                    1.0 AS BonusCoefficient,
                                    '[]' AS MembersJSON -- Bảng này Giảng viên tự đăng ký nên mặc định là của GV đó
                                FROM DueScienceDB.dbo.StudentResearches sr
                                LEFT JOIN DueScienceDB.dbo.Users u ON sr.UserId = u.Id
                                WHERE u.Email = @Email 
                                  AND sr.Status LIKE N'%Đã duyệt%'
                                ORDER BY sr.Id DESC";
                        }
                        else if (type == "conference")
                        {
                            sql = @"
                                SELECT 
                                    c.Id AS RecordId,
                                    c.ArticleName AS MoTa, 
                                    'ConferenceRegistrations' AS BangNguon,
                                    c.ConferenceName AS JournalName,
                                    N'HỘI NGHỊ' AS QRanking,
                                    c.Status,
                                    c.StartDate AS CreatedAt,
                                    1 AS TotalAuthors,
                                    1 AS PrimaryAuthors,
                                    1.0 AS JournalScore,
                                    1.0 AS BonusCoefficient,
                                    '[]' AS MembersJSON
                                FROM DueScienceDB.dbo.ConferenceRegistrations c
                                LEFT JOIN DueScienceDB.dbo.Users u ON c.UserId = u.Id
                                WHERE u.Email = @Email 
                                  AND c.Status LIKE N'%Đã duyệt%'
                                ORDER BY c.Id DESC";
                        }
                        else if (type == "other_research")
                        {
                            sql = @"
                                SELECT 
                                    o.Id AS RecordId,
                                    o.ContentName AS MoTa, 
                                    'PublicationOtherResearches' AS BangNguon,
                                    '' AS JournalName,
                                    N'NCKH KHÁC' AS QRanking,
                                    o.Status,
                                    o.ApplyDate AS CreatedAt,
                                    ISNULL(o.MemberCount, 1) AS TotalAuthors,
                                    1 AS PrimaryAuthors,
                                    1.0 AS JournalScore,
                                    1.0 AS BonusCoefficient,
                                    '[]' AS MembersJSON
                                FROM DueScienceDB.dbo.PublicationOtherResearches o
                                LEFT JOIN DueScienceDB.dbo.Users u ON o.UserId = u.Id
                                WHERE u.Email = @Email 
                                  AND o.Status LIKE N'%Đã duyệt%'
                                ORDER BY o.Id DESC";
                        }
                        else if (type == "standard_hour")
                        {
                            sql = @"
                                SELECT 
                                    ush.Id AS RecordId,
                                    sh.Name AS MoTa, 
                                    'UserStandardHours' AS BangNguon,
                                    sh.Name AS JournalName, 
                                    N'GIỜ THỰC TẾ' AS QRanking,
                                    ush.Status,
                                    ush.StartDate AS CreatedAt,
                                    1 AS TotalAuthors,
                                    1 AS PrimaryAuthors,
                                    ush.ActualPercentage AS JournalScore, 
                                    1.0 AS BonusCoefficient,
                                    '[]' AS MembersJSON
                                FROM DueScienceDB.dbo.UserStandardHours ush
                                LEFT JOIN DueScienceDB.dbo.StandardHours sh ON ush.StandardHourId = sh.Id
                                LEFT JOIN DueScienceDB.dbo.Users u ON ush.UserId = u.Id
                                WHERE u.Email = @Email 
                                  AND ush.Status = N'Đã duyệt'
                                  AND ush.IsCurrent = 1
                                ORDER BY ush.Id DESC";
                        }

                        using (SqlCommand cmd = new SqlCommand(sql, conn))
                        {
                            cmd.Parameters.AddWithValue("@Email", email);
                            using (SqlDataReader reader = cmd.ExecuteReader())
                            {
                                while (reader.Read())
                                {
                                    listArticles.Add(new
                                    {
                                        ScienceRecordId = Convert.ToInt32(reader["RecordId"]),
                                        BangNguon = reader["BangNguon"].ToString(),
                                        MoTa = reader["MoTa"].ToString(),
                                        JournalName = reader["JournalName"].ToString(),
                                        QRanking = reader["QRanking"].ToString(),
                                        CreatedAt = reader["CreatedAt"] != DBNull.Value ? Convert.ToDateTime(reader["CreatedAt"]).ToString("dd/MM/yyyy") : "",
                                        TotalAuthors = reader["TotalAuthors"] != DBNull.Value ? Convert.ToInt32(reader["TotalAuthors"]) : 1,
                                        PrimaryAuthors = reader["PrimaryAuthors"] != DBNull.Value ? Convert.ToInt32(reader["PrimaryAuthors"]) : 1,
                                        JournalScore = reader["JournalScore"] != DBNull.Value ? Convert.ToDecimal(reader["JournalScore"]) : 0m,
                                        BonusCoefficient = reader["BonusCoefficient"] != DBNull.Value ? Convert.ToDecimal(reader["BonusCoefficient"]) : 1m,
                                        MembersJSON = reader["MembersJSON"] != DBNull.Value ? reader["MembersJSON"].ToString() : "[]"
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