using System;
using System.Configuration;
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
                response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-User-Role-Id, X-User-Dept-Id, X-User-Id");
                response.AddHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");

                if (request.HttpMethod == "OPTIONS")
                {
                    response.StatusCode = 200;
                    return;
                }

                string path = request.Url.LocalPath.Trim('/');
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
    }
}