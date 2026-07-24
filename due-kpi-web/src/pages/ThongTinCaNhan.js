import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import "../css/Pages.css";

const ThongTinCaNhan = ({ setIsPassModalOpen }) => {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfile = async () => {
    if (!user?.MaNhanVien) return;
    setIsLoading(true);
    try {
      const response = await apiFetch(
        "nhan-vien?search=" + encodeURIComponent(user.MaNhanVien)
      );
      if (response.ok) {
        const result = await response.json();
        const list = result.Items || (Array.isArray(result) ? result : []);
        const found =
          list.find((item) => item.IdNhanVien === user.IdNhanVien) || list[0];
        if (found) {
          setProfile(found);
          setGender(found.GioiTinh !== null ? found.GioiTinh.toString() : "");
          setDob(found.NgaySinh ? found.NgaySinh.split("T")[0] : "");
        }
      }
    } catch (error) {
      console.error("Lỗi khi tải thông tin cá nhân:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.MaNhanVien]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        GioiTinh: gender ? parseInt(gender) : null,
        NgaySinh: dob || null,
      };

      const response = await apiFetch(`nhan-vien/${user.IdNhanVien}/ho-so`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        alert("Cập nhật thông tin cá nhân thành công!");
        await refreshUser();
        await fetchProfile();
      } else {
        const errData = await response.json().catch(() => ({}));
        alert(errData.Message || "Cập nhật thông tin thất bại!");
      }
    } catch (error) {
      console.error("Lỗi cập nhật hồ sơ:", error);
      alert("Có lỗi xảy ra khi kết nối máy chủ!");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setGender(profile.GioiTinh !== null ? profile.GioiTinh.toString() : "");
      setDob(profile.NgaySinh ? profile.NgaySinh.split("T")[0] : "");
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    return parts.pop()[0].toUpperCase();
  };

  if (isLoading) {
    return (
      <div
        className="page-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px",
        }}
      >
        <i
          className="fa-solid fa-spinner fa-spin"
          style={{ fontSize: "32px", color: "#003399" }}
        ></i>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ background: "#f4f6fa", padding: "30px" }}>
      <div className="page-header" style={{ marginBottom: "25px" }}>
        <div className="header-title">
          <h2>Hồ sơ của tôi</h2>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: "30px",
          alignItems: "start",
        }}
        className="form-grid-responsive"
      >
        {/* Left Column: Summary Card */}
        <div
          className="profile-summary-card"
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
            padding: "30px 20px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            border: "1px solid #eef2f6",
          }}
        >
          <div
            className="avatar-container"
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #003399 0%, #0056b3 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "42px",
              fontWeight: "700",
              marginBottom: "20px",
              boxShadow: "0 8px 16px rgba(0, 51, 153, 0.15)",
              border: "4px solid #ffffff",
            }}
          >
            {profile?.AvatarUrl ? (
              <img
                src={profile.AvatarUrl}
                alt="Avatar"
                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              getInitials(profile?.HoTen)
            )}
          </div>

          <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: "700", color: "#1e293b" }}>
            {profile?.HoTen}
          </h3>

          <span
            style={{
              background: "#e0f2fe",
              color: "#0369a1",
              fontSize: "12px",
              fontWeight: "600",
              padding: "4px 12px",
              borderRadius: "20px",
              marginBottom: "20px",
              display: "inline-block",
            }}
          >
            {profile?.TenChucVu || user?.RoleName || "Giảng viên"}
          </span>

          <div
            style={{
              width: "100%",
              borderTop: "1px solid #f1f5f9",
              paddingTop: "20px",
              textAlign: "left",
            }}
          >
            <div style={{ marginBottom: "12px", display: "flex", alignItems: "center" }}>
              <i className="fa-regular fa-envelope" style={{ color: "#64748b", marginRight: "10px", width: "16px" }}></i>
              <span style={{ fontSize: "14px", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {profile?.Email}
              </span>
            </div>
            <div style={{ marginBottom: "12px", display: "flex", alignItems: "center" }}>
              <i className="fa-solid fa-id-card" style={{ color: "#64748b", marginRight: "10px", width: "16px" }}></i>
              <span style={{ fontSize: "14px", color: "#475569" }}>
                Mã nhân viên: <strong>{profile?.MaNhanVien}</strong>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <i className="fa-solid fa-building" style={{ color: "#64748b", marginRight: "10px", width: "16px" }}></i>
              <span style={{ fontSize: "14px", color: "#475569" }}>
                {profile?.TenDonVi}
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsPassModalOpen(true)}
            className="btn-add-new"
            type="button"
            style={{
              width: "100%",
              justifyContent: "center",
              marginTop: "25px",
              marginBottom: "0px",
              backgroundColor: "#ffffff",
              color: "#003399",
              border: "1px solid #003399",
              boxShadow: "none",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#f0f4ff";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#ffffff";
            }}
          >
            <i className="fa-solid fa-key"></i> Đổi mật khẩu
          </button>
        </div>

        {/* Right Column: Profile details form */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
            padding: "30px",
            border: "1px solid #eef2f6",
          }}
        >
          <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: "700", color: "#1e293b", textTransform: "uppercase", borderBottom: "2px solid #f1f5f9", paddingBottom: "10px" }}>
            Thông tin chi tiết tài khoản
          </h3>

          <form onSubmit={handleSave}>
            <div className="form-grid-2">
              {/* Họ tên */}
              <div className="form-group">
                <label>Họ và Tên</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type="text"
                    className="form-input"
                    value={profile?.HoTen || ""}
                    disabled
                    style={{
                      backgroundColor: "#f8fafc",
                      color: "#64748b",
                      cursor: "not-allowed",
                      paddingRight: "36px",
                    }}
                  />
                  <i className="fa-solid fa-lock" style={{ position: "absolute", right: "12px", color: "#cbd5e1" }}></i>
                </div>
              </div>

              {/* Mã nhân viên */}
              <div className="form-group">
                <label>Mã nhân viên</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type="text"
                    className="form-input"
                    value={profile?.MaNhanVien || ""}
                    disabled
                    style={{
                      backgroundColor: "#f8fafc",
                      color: "#64748b",
                      cursor: "not-allowed",
                      paddingRight: "36px",
                    }}
                  />
                  <i className="fa-solid fa-lock" style={{ position: "absolute", right: "12px", color: "#cbd5e1" }}></i>
                </div>
              </div>
            </div>

            <div className="form-grid-2" style={{ marginTop: "15px" }}>
              {/* Email */}
              <div className="form-group">
                <label>Email tài khoản</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type="text"
                    className="form-input"
                    value={profile?.Email || ""}
                    disabled
                    style={{
                      backgroundColor: "#f8fafc",
                      color: "#64748b",
                      cursor: "not-allowed",
                      paddingRight: "36px",
                    }}
                  />
                  <i className="fa-solid fa-lock" style={{ position: "absolute", right: "12px", color: "#cbd5e1" }}></i>
                </div>
              </div>

              {/* Đơn vị */}
              <div className="form-group">
                <label>Đơn vị / Khoa / Phòng</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type="text"
                    className="form-input"
                    value={profile?.TenDonVi || ""}
                    disabled
                    style={{
                      backgroundColor: "#f8fafc",
                      color: "#64748b",
                      cursor: "not-allowed",
                      paddingRight: "36px",
                    }}
                  />
                  <i className="fa-solid fa-lock" style={{ position: "absolute", right: "12px", color: "#cbd5e1" }}></i>
                </div>
              </div>
            </div>

            <div className="form-grid-2" style={{ marginTop: "15px" }}>
              {/* Chức vụ */}
              <div className="form-group">
                <label>Chức vụ hiện hành</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type="text"
                    className="form-input"
                    value={profile?.TenChucVu || "Giảng viên"}
                    disabled
                    style={{
                      backgroundColor: "#f8fafc",
                      color: "#64748b",
                      cursor: "not-allowed",
                      paddingRight: "36px",
                    }}
                  />
                  <i className="fa-solid fa-lock" style={{ position: "absolute", right: "12px", color: "#cbd5e1" }}></i>
                </div>
              </div>

              {/* Chức danh nghề nghiệp */}
              <div className="form-group">
                <label>Chức danh nghề nghiệp</label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type="text"
                    className="form-input"
                    value={profile?.TenChucDanh || "Chưa thiết lập"}
                    disabled
                    style={{
                      backgroundColor: "#f8fafc",
                      color: "#64748b",
                      cursor: "not-allowed",
                      paddingRight: "36px",
                    }}
                  />
                  <i className="fa-solid fa-lock" style={{ position: "absolute", right: "12px", color: "#cbd5e1" }}></i>
                </div>
              </div>
            </div>

            <div className="form-grid-2" style={{ marginTop: "15px" }}>
              {/* Giới tính */}
              <div className="form-group">
                <label htmlFor="gender-select">Giới tính</label>
                <select
                  id="gender-select"
                  className="form-input"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  style={{ cursor: "pointer" }}
                >
                  <option value="">Chọn giới tính</option>
                  <option value="1">Nam</option>
                  <option value="2">Nữ</option>
                  <option value="3">Khác</option>
                </select>
              </div>

              {/* Ngày sinh */}
              <div className="form-group">
                <label htmlFor="dob-input">Ngày sinh</label>
                <input
                  id="dob-input"
                  type="date"
                  className="form-input"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  style={{ cursor: "pointer" }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
                marginTop: "35px",
                borderTop: "1px solid #f1f5f9",
                paddingTop: "20px",
              }}
            >
              <button
                type="button"
                onClick={handleCancel}
                className="btn-cancel"
                disabled={isSaving}
              >
                Hủy thay đổi
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-floppy-disk"></i> Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Add custom media query styling using template tag for cleaner layout */}
      <style>{`
        @media screen and (max-width: 992px) {
          .form-grid-responsive {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ThongTinCaNhan;
