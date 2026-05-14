using System;
using System.Data.SqlClient;
using System.Net;
using System.Text;

namespace KPI.handlers
{
    public static class BaseHandler
    {
        public static void SendJsonResponse(HttpListenerResponse response, string jsonContent, int statusCode = 200)
        {
            try
            {
                byte[] buffer = Encoding.UTF8.GetBytes(jsonContent);
                response.ContentType = "application/json; charset=utf-8";
                response.ContentLength64 = buffer.Length;
                response.StatusCode = statusCode;
                response.OutputStream.Write(buffer, 0, buffer.Length);
            }
            catch (System.Net.HttpListenerException) { }
            catch (System.IO.IOException) { }
            catch (Exception ex)
            {
                Console.WriteLine("[-] Loi tra ve Response: " + ex.Message);
            }
            finally
            {
                try
                {
                    if (response != null)
                    {
                        response.OutputStream.Close();
                        response.Close();
                    }
                }
                catch { }
            }
        }

        public static string GetQueryParam(HttpListenerRequest request, string key)
        {
            try
            {
                string rawQuery = request.Url.Query;
                if (string.IsNullOrEmpty(rawQuery)) return null;

                string[] pairs = rawQuery.TrimStart('?').Split('&');
                foreach (string pair in pairs)
                {
                    string[] kv = pair.Split('=');
                    if (kv.Length == 2 && kv[0].ToLower() == key.ToLower())
                    {
                        return Uri.UnescapeDataString(kv[1].Replace("+", " "));
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("Loi giai ma tham so: " + ex.Message);
            }
            return null;
        }

        public static void HandleDelete(HttpListenerRequest request, HttpListenerResponse response, string connectionString, string tableName, string primaryKeyColumn, Action onSuccessCallback = null)
        {
            string idParam = GetQueryParam(request, "id");
            if (!string.IsNullOrEmpty(idParam))
            {
                bool isSuccess = false;
                string errorMessage = "";

                for (int attempt = 0; attempt < 3; attempt++)
                {
                    try
                    {
                        using (SqlConnection conn = new SqlConnection(connectionString))
                        {
                            conn.Open();
                            string sql = string.Format("DELETE FROM {0} WHERE {1} = @Id", tableName, primaryKeyColumn);
                            using (SqlCommand cmd = new SqlCommand(sql, conn))
                            {
                                cmd.Parameters.AddWithValue("@Id", idParam);
                                cmd.ExecuteNonQuery();
                            }
                        }
                        isSuccess = true;
                        break;
                    }
                    catch (SqlException ex) when (ex.Number == 1205 && attempt < 2)
                    {
                        System.Threading.Thread.Sleep(50 * (attempt + 1));
                    }
                    catch (SqlException ex)
                    {
                        if (ex.Number == 547)
                        {
                            errorMessage = "Không thể xóa do dữ liệu này đang được sử dụng ở nơi khác!";
                        }
                        else
                        {
                            errorMessage = $"Lỗi CSDL: {ex.Message.Replace("\"", "'")}";
                        }
                        break;
                    }
                    catch (Exception ex)
                    {
                        errorMessage = $"Lỗi hệ thống: {ex.Message.Replace("\"", "'")}";
                        break;
                    }
                }

                if (isSuccess)
                {
                    onSuccessCallback?.Invoke();
                    SendJsonResponse(response, "{\"status\": \"success\"}");
                }
                else
                {
                    SendJsonResponse(response, $"{{\"status\": \"error\", \"message\": \"{errorMessage}\"}}");
                }
            }
            else
            {
                SendJsonResponse(response, "{\"status\": \"error\", \"message\": \"ID không hợp lệ hoặc bị trống\"}", 400);
            }
        }
    }
}