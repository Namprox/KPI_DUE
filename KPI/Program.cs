using System;
using System.Configuration;
using System.IO;
using System.Linq;
using System.Net;
using System.Threading;
using System.Web.Script.Serialization;
using KPI.handlers;

namespace KPI
{
    class Program
    {
        static void Main(string[] args)
        {
            string apiPrefix = ConfigurationManager.AppSettings["ApiPrefix"];
            HttpListener listener = new HttpListener();
            listener.Prefixes.Add(apiPrefix);
            listener.Start();

            Console.WriteLine("Backend .NET dang hoat dong tai: " + apiPrefix);

            while (true)
            {
                try
                {
                    var context = listener.GetContext();
                    ThreadPool.QueueUserWorkItem(o => ProcessRequest(context));
                }
                catch (HttpListenerException) { }
                catch (Exception ex)
                {
                    Console.WriteLine("[-] Loi vong lap chinh: " + ex.Message);
                }
            }
        }

        static void ProcessRequest(HttpListenerContext context)
        {
            var request = context.Request;
            var response = context.Response;
            var serializer = new JavaScriptSerializer() { MaxJsonLength = Int32.MaxValue };

            try
            {
                response.AddHeader("Access-Control-Allow-Origin", "*");
                response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Role-Id, X-User-Dept-Id, X-User-Id, File-Name, file-name");
                response.AddHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");

                if (request.HttpMethod == "OPTIONS")
                {
                    response.StatusCode = 200;
                    return;
                }

                string path = Uri.UnescapeDataString(request.Url.LocalPath.Trim('/'));

                if (path.StartsWith("uploads/", StringComparison.OrdinalIgnoreCase))
                {
                    ServeStaticFile(context, path);
                    return;
                }

                string endpoint = path.Split('/').LastOrDefault()?.ToLower() ?? "";

                if (endpoint == "favicon.ico")
                {
                    response.StatusCode = 404;
                    return;
                }

                if (endpoint == "login" || endpoint == "changepassword")
                {
                    new LoginHandler().ProcessRequest(context);
                }
                else if (endpoint == "nhan-vien" || endpoint == "chuc-vu")
                {
                    new QL_NhanVienHandler().ProcessRequest(context);
                }
                else if (endpoint == "don-vi")
                {
                    new QL_DonViHandler().ProcessRequest(context);
                }
                else if (endpoint == "tieu-chi")
                {
                    new QL_TieuChiHandler().ProcessRequest(context);
                }
                else if (endpoint == "nhom-nhiem-vu")
                {
                    new QL_NhomNhiemVuHandler().ProcessRequest(context);
                }
                else if (endpoint == "nhom-tieu-chi")
                {
                    new QL_NhomTieuChiHandler().ProcessRequest(context);
                }
                else if (endpoint == "nam-danh-gia")
                {
                    new QL_NamDanhGiaHandler().ProcessRequest(context);
                }
                else if (endpoint == "mau-danh-gia")
                {
                    new QL_MauDanhGiaHandler().ProcessRequest(context);
                }
                else if (endpoint == "thang-diem")
                {
                    new QL_ThangDiemHandler().ProcessRequest(context);
                }
                else if (endpoint == "dinh-muc-gv")
                {
                    new QL_DinhMucGiangVienHandler().ProcessRequest(context);
                }
                else if (endpoint == "nhom-giang-vien")
                {
                    new QL_NhomGiangVienHandler().ProcessRequest(context);
                }
                else if (endpoint == "scoring")
                {
                    new ScoringHandler().ProcessRequest(context);
                }
                else if (endpoint == "approval")
                {
                    new ApprovalHandler().ProcessRequest(context);
                }
                else if (endpoint == "upload")
                {
                    new UploadHandler().ProcessRequest(context);
                }
                else if (endpoint == "science-data")
                {
                    new ScienceDataHandler().ProcessRequest(context);
                }
                else if (endpoint == "download")
                {
                    string query = request.Url.Query;
                    string fileName = "";
                    if (query.Contains("file="))
                    {
                        fileName = Uri.UnescapeDataString(query.Substring(query.IndexOf("file=") + 5));
                    }
                    ServeStaticFile(context, fileName);
                }
                else
                {
                    response.StatusCode = 404;
                    byte[] buffer = System.Text.Encoding.UTF8.GetBytes("{\"error\": \"API khong ton tai trong he thong KPI\"}");
                    response.OutputStream.Write(buffer, 0, buffer.Length);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[LOI HE THONG - {request.Url.LocalPath}]: " + ex.Message);
                response.StatusCode = 500;
                try
                {
                    byte[] buffer = System.Text.Encoding.UTF8.GetBytes("{\"error\": \"Loi Server Internal\"}");
                    response.OutputStream.Write(buffer, 0, buffer.Length);
                }
                catch { }
            }
            finally
            {
                try { response.Close(); } catch { }
            }
        }

        static void ServeStaticFile(HttpListenerContext context, string fileName)
        {
            var response = context.Response;
            try
            {
                if (string.IsNullOrEmpty(fileName))
                {
                    response.StatusCode = 400;
                    return;
                }

                string filePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "uploads", "minh_chung", fileName);

                if (File.Exists(filePath))
                {
                    string ext = Path.GetExtension(filePath).ToLower();
                    string contentType = "application/octet-stream";

                    if (ext == ".pdf") contentType = "application/pdf";
                    else if (ext == ".png") contentType = "image/png";
                    else if (ext == ".jpg" || ext == ".jpeg") contentType = "image/jpeg";
                    else if (ext == ".docx") contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                    else if (ext == ".doc") contentType = "application/msword";
                    else if (ext == ".xlsx") contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

                    response.ContentType = contentType;

                    string safeHeaderFileName = Uri.EscapeDataString(Path.GetFileName(filePath));
                    response.AddHeader("Content-Disposition", "attachment; filename*=UTF-8''" + safeHeaderFileName);

                    byte[] fileBytes = File.ReadAllBytes(filePath);
                    response.ContentLength64 = fileBytes.Length;
                    response.OutputStream.Write(fileBytes, 0, fileBytes.Length);
                    response.StatusCode = 200;
                }
                else
                {
                    response.StatusCode = 404;
                    response.ContentType = "text/plain";
                    byte[] buffer = System.Text.Encoding.UTF8.GetBytes($"404 - Không tìm thấy file minh chứng: {fileName}");
                    response.OutputStream.Write(buffer, 0, buffer.Length);
                }
            }
            catch (Exception ex)
            {
                response.StatusCode = 500;
                response.ContentType = "text/plain";
                byte[] buffer = System.Text.Encoding.UTF8.GetBytes("Lỗi server: " + ex.Message);
                response.OutputStream.Write(buffer, 0, buffer.Length);
            }
        }
    }
}