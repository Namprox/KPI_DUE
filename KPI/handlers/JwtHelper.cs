using System;
using System.Collections.Generic;
using System.Text;
using Jose;

namespace KPI.handlers
{
    public static class JwtHelper
    {
        private static readonly byte[] SecretKey = Encoding.UTF8.GetBytes("DUE_RESEARCH_SECRET_KEY_SUPER_SECURE_2026_@!");

        public static string GenerateToken(int userId, int roleId, int? deptId)
        {
            long exp = (long)(DateTime.UtcNow.AddHours(8) - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalSeconds;

            var payload = new Dictionary<string, object>()
            {
                { "UserId", userId },
                { "RoleId", roleId },
                { "DeptId", deptId ?? 0 },
                { "exp", exp }
            };

            return Jose.JWT.Encode(payload, SecretKey, JwsAlgorithm.HS256);
        }

        public static IDictionary<string, object> ValidateToken(string token)
        {
            try
            {
                var payload = Jose.JWT.Decode<Dictionary<string, object>>(token, SecretKey, JwsAlgorithm.HS256);

                if (payload.ContainsKey("exp"))
                {
                    long exp = Convert.ToInt64(payload["exp"]);
                    long now = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalSeconds;
                    if (now > exp) return null;
                }

                return payload;
            }
            catch
            {
                return null;
            }
        }
    }
}