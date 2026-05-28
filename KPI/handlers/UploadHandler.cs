using System;
using System.IO;
using System.Net;
using System.Web.Script.Serialization;

namespace KPI.handlers
{
    public class UploadHandler
    {
        public void ProcessRequest(HttpListenerContext context)
        {
            var request = context.Request;
            var response = context.Response;
            var serializer = new JavaScriptSerializer();

            try
            {
                if (request.HttpMethod == "OPTIONS")
                {
                    response.AddHeader("Access-Control-Allow-Origin", "*");
                    response.AddHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
                    response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, File-Name, file-name");
                    response.StatusCode = 200;
                    response.Close();
                    return;
                }

                response.AddHeader("Access-Control-Allow-Origin", "*");

                if (request.HttpMethod == "POST")
                {
                    string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                    string uploadFolder = Path.Combine(baseDir, "uploads", "minh_chung");
                    if (!Directory.Exists(uploadFolder)) Directory.CreateDirectory(uploadFolder);

                    string originalFileName = "file_dinh_kem";
                    if (request.Headers["File-Name"] != null)
                    {
                        originalFileName = Uri.UnescapeDataString(request.Headers["File-Name"]);
                    }

                    string safeFileName = Guid.NewGuid().ToString("N").Substring(0, 8) + "_" + originalFileName.Replace(" ", "_");
                    string filePath = Path.Combine(uploadFolder, safeFileName);

                    using (var fileStream = File.Create(filePath))
                    {
                        request.InputStream.CopyTo(fileStream);
                    }

                    int fileSizeKB = (int)(new FileInfo(filePath).Length / 1024);
                    string ext = Path.GetExtension(safeFileName).ToLower();

                    BaseHandler.SendJsonResponse(response, serializer.Serialize(new
                    {
                        success = true,
                        fileName = safeFileName,
                        originalName = originalFileName,
                        fileType = ext,
                        fileSizeKB = fileSizeKB
                    }));
                }
                else
                {
                    BaseHandler.SendJsonResponse(response, "{\"success\":false, \"message\":\"Method Not Allowed\"}", 405);
                }
            }
            catch (Exception ex)
            {
                BaseHandler.SendJsonResponse(response, $"{{\"success\":false, \"message\":\"{ex.Message.Replace("\"", "'")}\"}}", 500);
            }
        }
    }
}