import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import bgImage from "../images/background.jpg";
import myLogo from "../images/logo.png";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [credentials, setCredentials] = useState({ Email: "", Password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 992);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleChange = (e) => {
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await login(credentials);

      if (result.success) {
        navigate("/");
      } else {
        setError(result.message || "Sai thông tin đăng nhập!");
      }
    } catch (err) {
      console.error("[LỖI MẠNG/BACKEND]:", err);
      setError(`Lỗi kết nối tới máy chủ - Chi tiết: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100vw",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          flex: 1,
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          display: isDesktop ? "block" : "none",
        }}
      ></div>

      <div
        style={{
          width: isDesktop ? "450px" : "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: isDesktop ? "40px" : "20px",
          backgroundColor: "#fff",
          boxShadow: isDesktop ? "-4px 0 15px rgba(0,0,0,0.1)" : "none",
          zIndex: 1,
          boxSizing: "border-box",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <img
            src={myLogo}
            alt="Logo của tôi"
            style={{ width: "150px", marginBottom: "15px" }}
          />
          <h2 style={{ color: "#003399", margin: 0 }}>DUE KPI</h2>
          <p style={{ color: "#666", fontSize: "14px", marginTop: "5px" }}>
            Đăng nhập hệ thống đánh giá KPI
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "#f8d7da",
              color: "#721c24",
              padding: "10px",
              borderRadius: "4px",
              marginBottom: "20px",
              fontSize: "14px",
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Email đăng nhập
            </label>
            <input
              type="email"
              name="Email"
              value={credentials.Email}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "30px", position: "relative" }}>
            <label
              style={{
                display: "block",
                marginBottom: "5px",
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Mật khẩu
            </label>
            <input
              type={showPassword ? "text" : "password"}
              name="Password"
              value={credentials.Password}
              onChange={handleChange}
              required
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
                paddingRight: "40px",
              }}
            />
            <i
              className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
              style={{
                position: "absolute",
                right: "12px",
                top: "38px",
                cursor: "pointer",
                color: "#666",
              }}
              onClick={() => setShowPassword(!showPassword)}
            ></i>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: "100%",
              padding: "12px",
              backgroundColor: "#003399",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              fontSize: "16px",
              fontWeight: "bold",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {isLoading ? (
              <i className="fa-solid fa-spinner fa-spin"></i>
            ) : (
              "Đăng nhập"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
