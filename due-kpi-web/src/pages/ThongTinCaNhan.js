import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../utils/api";
import "../css/Pages.css";
import SearchSelect from "../components/Common/SearchSelect";

const GIOI_TINH_OPTIONS = [
  { value: "", label: "Chọn giới tính" },
  { value: "1", label: "Nam" },
  { value: "2", label: "Nữ" },
  { value: "3", label: "Khác" },
];

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const ThongTinCaNhan = ({ setIsPassModalOpen }) => {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [chucVuConcurrent, setChucVuConcurrent] = useState([]);
  const [chucDanhHistory, setChucDanhHistory] = useState([]);
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProfile = async () => {
    if (!user?.MaNhanVien) return;
    setIsLoading(true);
    try {
      // 1. Tải thông tin hồ sơ cơ bản
      const response = await apiFetch(
        "nhan-vien?search=" + encodeURIComponent(user.MaNhanVien),
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

      // 2. Tải danh sách đơn vị & chức vụ công tác theo cấu trúc mới
      if (user?.IdNhanVien) {
        const [cvRes, cdRes] = await Promise.all([
          apiFetch(`nhan-vien-chuc-vu/by-nhan-vien/${user.IdNhanVien}`),
          apiFetch(`nhan-vien-chuc-danh/by-nhan-vien/${user.IdNhanVien}`),
        ]);

        if (cvRes.ok) {
          const cvData = await cvRes.json();
          setChucVuConcurrent(
            cvData.Items || (Array.isArray(cvData) ? cvData : []),
          );
        } else if (Array.isArray(user.DonVi) && user.DonVi.length > 0) {
          setChucVuConcurrent(user.DonVi);
        }

        if (cdRes.ok) {
          const cdData = await cdRes.json();
          setChucDanhHistory(
            cdData.Items || (Array.isArray(cdData) ? cdData : []),
          );
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
  }, [user?.MaNhanVien, user?.IdNhanVien]);

  // Danh sách đơn vị & chức vụ thực tế kèm fallback an toàn
  const effectiveChucVuList = useMemo(() => {
    if (chucVuConcurrent && chucVuConcurrent.length > 0) {
      return chucVuConcurrent;
    }
    if (Array.isArray(user?.DonVi) && user.DonVi.length > 0) {
      return user.DonVi;
    }
    if (profile?.TenDonVi || user?.TenDonVi) {
      return [
        {
          IdDonVi: profile?.IdDonVi || user?.IdDonVi,
          TenDonVi: profile?.TenDonVi || user?.TenDonVi,
          IdChucVu: profile?.IdChucVu || user?.IdChucVu,
          TenChucVu: profile?.TenChucVu || user?.RoleName || "Thành viên",
          LaChinh: true,
          TuNgay: null,
          DenNgay: null,
        },
      ];
    }
    return [];
  }, [chucVuConcurrent, user, profile]);

  // Chức danh nghề nghiệp hiện hành
  const currentTitle = useMemo(() => {
    if (chucDanhHistory && chucDanhHistory.length > 0) {
      const active = chucDanhHistory.find((cd) => !cd.DenNgay);
      return active || chucDanhHistory[0];
    }
    return {
      TenChucDanh: profile?.TenChucDanh || "Chưa thiết lập",
      MaChucDanh: "",
    };
  }, [chucDanhHistory, profile]);

  // Đơn vị chính và các đơn vị kiêm nhiệm
  const primaryUnit = useMemo(() => {
    return (
      effectiveChucVuList.find((d) => d.LaChinh) ||
      effectiveChucVuList[0] ||
      null
    );
  }, [effectiveChucVuList]);

  const concurrentUnits = useMemo(() => {
    return effectiveChucVuList.filter((d) => d !== primaryUnit && !d.DenNgay);
  }, [effectiveChucVuList, primaryUnit]);

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
    <div
      className="page-container"
      style={{ background: "#f4f6fa", padding: "30px" }}
    >
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
              marginBottom: "16px",
              boxShadow: "0 8px 16px rgba(0, 51, 153, 0.15)",
              border: "4px solid #ffffff",
            }}
          >
            {profile?.AvatarUrl ? (
              <img
                src={profile.AvatarUrl}
                alt="Avatar"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              getInitials(profile?.HoTen)
            )}
          </div>

          <h3
            style={{
              margin: "0 0 10px 0",
              fontSize: "18px",
              fontWeight: "700",
              color: "#1e293b",
            }}
          >
            {profile?.HoTen}
          </h3>

          {/* Badges Chức danh & Chức vụ */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              justifyContent: "center",
              marginBottom: "18px",
            }}
          >
            <span
              style={{
                background: "#e0f2fe",
                color: "#0369a1",
                fontSize: "12px",
                fontWeight: "600",
                padding: "4px 12px",
                borderRadius: "20px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <i
                className="fa-solid fa-graduation-cap"
                style={{ fontSize: "11px" }}
              ></i>
              {currentTitle?.TenChucDanh ||
                profile?.TenChucDanh ||
                "Giảng viên"}
            </span>

            {primaryUnit?.TenChucVu &&
              primaryUnit.TenChucVu !== "Thành viên" && (
                <span
                  style={{
                    background: "#fef3c7",
                    color: "#92400e",
                    fontSize: "12px",
                    fontWeight: "600",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <i
                    className="fa-solid fa-award"
                    style={{ fontSize: "11px" }}
                  ></i>
                  {primaryUnit.TenChucVu}
                </span>
              )}
          </div>

          <div
            style={{
              width: "100%",
              borderTop: "1px solid #f1f5f9",
              paddingTop: "20px",
              textAlign: "left",
            }}
          >
            <div
              style={{
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <i
                className="fa-regular fa-envelope"
                style={{ color: "#64748b", marginRight: "10px", width: "16px" }}
              ></i>
              <span
                style={{
                  fontSize: "14px",
                  color: "#475569",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {profile?.Email || user?.Email}
              </span>
            </div>

            <div
              style={{
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <i
                className="fa-solid fa-id-card"
                style={{ color: "#64748b", marginRight: "10px", width: "16px" }}
              ></i>
              <span style={{ fontSize: "14px", color: "#475569" }}>
                Mã nhân viên:{" "}
                <strong>{profile?.MaNhanVien || user?.MaNhanVien}</strong>
              </span>
            </div>

            <div style={{ marginBottom: "12px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: "3px",
                }}
              >
                <i
                  className="fa-solid fa-building"
                  style={{
                    color: "#0284c7",
                    marginRight: "10px",
                    width: "16px",
                  }}
                ></i>
                <span
                  style={{
                    fontSize: "13px",
                    color: "#64748b",
                    fontWeight: "500",
                  }}
                >
                  Đơn vị chính:
                </span>
              </div>
              <div
                style={{
                  paddingLeft: "26px",
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#1e293b",
                }}
              >
                {primaryUnit?.TenDonVi || profile?.TenDonVi || "Chưa cập nhật"}
                {primaryUnit?.TenChucVu &&
                  primaryUnit.TenChucVu !== "Thành viên" && (
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#0369a1",
                        fontWeight: "500",
                        marginLeft: "6px",
                      }}
                    >
                      ({primaryUnit.TenChucVu})
                    </span>
                  )}
              </div>
            </div>

            {concurrentUnits.length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "4px",
                  }}
                >
                  <i
                    className="fa-solid fa-layer-group"
                    style={{
                      color: "#8b5cf6",
                      marginRight: "10px",
                      width: "16px",
                    }}
                  ></i>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "#64748b",
                      fontWeight: "500",
                    }}
                  >
                    Đơn vị kiêm nhiệm:
                  </span>
                </div>
                <div
                  style={{
                    paddingLeft: "26px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  {concurrentUnits.map((cu, idx) => (
                    <div
                      key={idx}
                      style={{ fontSize: "13px", color: "#334155" }}
                    >
                      • <strong>{cu.TenDonVi}</strong>{" "}
                      {cu.TenChucVu ? `(${cu.TenChucVu})` : ""}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsPassModalOpen(true)}
            className="btn-add-new"
            type="button"
            style={{
              width: "100%",
              justifyContent: "center",
              marginTop: "20px",
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

        {/* Right Column: Detailed Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>
          {/* Section 1: Form thông tin tài khoản */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
              padding: "30px",
              border: "1px solid #eef2f6",
            }}
          >
            <h3
              style={{
                margin: "0 0 20px 0",
                fontSize: "16px",
                fontWeight: "700",
                color: "#1e293b",
                textTransform: "uppercase",
                borderBottom: "2px solid #f1f5f9",
                paddingBottom: "10px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <i
                className="fa-solid fa-user-gear"
                style={{ color: "#003399" }}
              ></i>
              Thông tin chi tiết tài khoản
            </h3>

            <form onSubmit={handleSave}>
              <div className="form-grid-2">
                {/* Họ tên */}
                <div className="form-group">
                  <label>Họ và Tên</label>
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
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
                    <i
                      className="fa-solid fa-lock"
                      style={{
                        position: "absolute",
                        right: "12px",
                        color: "#cbd5e1",
                      }}
                    ></i>
                  </div>
                </div>

                {/* Mã nhân viên */}
                <div className="form-group">
                  <label>Mã nhân viên</label>
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
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
                    <i
                      className="fa-solid fa-lock"
                      style={{
                        position: "absolute",
                        right: "12px",
                        color: "#cbd5e1",
                      }}
                    ></i>
                  </div>
                </div>
              </div>

              <div className="form-grid-2" style={{ marginTop: "15px" }}>
                {/* Email */}
                <div className="form-group">
                  <label>Email tài khoản</label>
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
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
                    <i
                      className="fa-solid fa-lock"
                      style={{
                        position: "absolute",
                        right: "12px",
                        color: "#cbd5e1",
                      }}
                    ></i>
                  </div>
                </div>

                {/* Chức danh nghề nghiệp */}
                <div className="form-group">
                  <label>Chức danh nghề nghiệp hiện hành</label>
                  <div
                    style={{
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <input
                      type="text"
                      className="form-input"
                      value={
                        currentTitle?.TenChucDanh ||
                        profile?.TenChucDanh ||
                        "Chưa thiết lập"
                      }
                      disabled
                      style={{
                        backgroundColor: "#f8fafc",
                        color: "#64748b",
                        cursor: "not-allowed",
                        paddingRight: "36px",
                      }}
                    />
                    <i
                      className="fa-solid fa-lock"
                      style={{
                        position: "absolute",
                        right: "12px",
                        color: "#cbd5e1",
                      }}
                    ></i>
                  </div>
                </div>
              </div>

              <div className="form-grid-2" style={{ marginTop: "15px" }}>
                {/* Giới tính */}
                <div className="form-group">
                  <label>Giới tính</label>
                  <SearchSelect
                    value={gender}
                    onChange={(v) => setGender(v)}
                    options={GIOI_TINH_OPTIONS}
                    placeholder="Chọn giới tính"
                  />
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
                  marginTop: "30px",
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
                      <i className="fa-solid fa-spinner fa-spin"></i> Đang
                      lưu...
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

          {/* Section 2: Đơn vị & Chức vụ công tác (Cấu trúc mới) */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
              padding: "30px",
              border: "1px solid #eef2f6",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "15px",
                borderBottom: "2px solid #f1f5f9",
                paddingBottom: "10px",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "#1e293b",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <i
                    className="fa-solid fa-building-user"
                    style={{ color: "#003399" }}
                  ></i>
                  Đơn vị & Chức vụ công tác
                </h3>
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "13px",
                    color: "#64748b",
                  }}
                >
                  Danh sách đơn vị chính và các đơn vị kiêm nhiệm / công tác của
                  nhân viên
                </p>
              </div>
              <span
                style={{
                  backgroundColor: "#f1f5f9",
                  color: "#475569",
                  fontSize: "12px",
                  fontWeight: "600",
                  padding: "4px 10px",
                  borderRadius: "12px",
                }}
              >
                Tổng số: {effectiveChucVuList.length} đơn vị
              </span>
            </div>

            <div
              style={{
                overflowX: "auto",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
              }}
            >
              <table
                className="custom-table"
                style={{
                  width: "100%",
                  fontSize: "13px",
                  background: "#fff",
                }}
              >
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        width: "28%",
                      }}
                    >
                      ĐƠN VỊ CÔNG TÁC
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        width: "22%",
                      }}
                    >
                      CHỨC VỤ
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        width: "15%",
                      }}
                    >
                      ĐỊNH MỨC GIỜ
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        width: "18%",
                      }}
                    >
                      THỜI GIAN
                    </th>
                    <th
                      style={{
                        padding: "12px",
                        textAlign: "left",
                        width: "17%",
                      }}
                    >
                      GHI CHÚ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveChucVuList.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          padding: "20px",
                          textAlign: "center",
                          color: "#64748b",
                          fontStyle: "italic",
                        }}
                      >
                        Chưa có dữ liệu đơn vị & chức vụ công tác
                      </td>
                    </tr>
                  ) : (
                    effectiveChucVuList.map((item, idx) => {
                      const isMain = !!item.LaChinh;
                      return (
                        <tr
                          key={item.IdNvChucVu || idx}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            backgroundColor: isMain ? "#f8fbff" : "inherit",
                          }}
                        >
                          {/* Đơn vị */}
                          <td
                            style={{
                              padding: "12px",
                              fontWeight: "500",
                              color: "#1e293b",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "6px",
                              }}
                            >
                              <span style={{ fontWeight: "600" }}>
                                {item.TenDonVi || `Đơn vị #${item.IdDonVi}`}
                              </span>
                              {isMain ? (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    backgroundColor: "#e0f2fe",
                                    color: "#0369a1",
                                    border: "1px solid #bae6fd",
                                  }}
                                >
                                  <i
                                    className="fa-solid fa-star"
                                    style={{
                                      marginRight: "4px",
                                      fontSize: "9px",
                                    }}
                                  ></i>
                                  Đơn vị chính
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "2px 8px",
                                    borderRadius: "10px",
                                    fontSize: "11px",
                                    fontWeight: "600",
                                    backgroundColor: "#f5f3ff",
                                    color: "#6d28d9",
                                    border: "1px solid #ede9fe",
                                  }}
                                >
                                  <i
                                    className="fa-solid fa-layer-group"
                                    style={{
                                      marginRight: "4px",
                                      fontSize: "9px",
                                    }}
                                  ></i>
                                  Kiêm nhiệm
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Chức vụ */}
                          <td style={{ padding: "12px", color: "#334155" }}>
                            {item.TenChucVu ? (
                              <span
                                style={{
                                  fontWeight:
                                    item.TenChucVu !== "Thành viên"
                                      ? "600"
                                      : "400",
                                  color:
                                    item.TenChucVu !== "Thành viên"
                                      ? "#0284c7"
                                      : "#475569",
                                }}
                              >
                                {item.TenChucVu}
                              </span>
                            ) : (
                              <span
                                style={{
                                  color: "#94a3b8",
                                  fontStyle: "italic",
                                }}
                              >
                                Thành viên
                              </span>
                            )}
                          </td>

                          {/* Định mức giờ giảng */}
                          <td
                            style={{
                              padding: "12px",
                              textAlign: "center",
                              color: "#475569",
                            }}
                          >
                            {item.TyLeDinhMucGiang !== null &&
                            item.TyLeDinhMucGiang !== undefined ? (
                              <span
                                style={{
                                  fontWeight: "600",
                                  color: "#0f766e",
                                  backgroundColor: "#f0fdfa",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  border: "1px solid #ccfbf1",
                                }}
                              >
                                {item.TyLeDinhMucGiang}%
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>

                          {/* Thời gian công tác */}
                          <td style={{ padding: "12px", color: "#475569" }}>
                            {item.TuNgay && (
                              <div style={{ fontSize: "12px" }}>
                                Từ: <strong>{formatDate(item.TuNgay)}</strong>
                              </div>
                            )}
                            {item.DenNgay ? (
                              <div
                                style={{ fontSize: "12px", color: "#64748b" }}
                              >
                                Đến: <strong>{formatDate(item.DenNgay)}</strong>
                              </div>
                            ) : (
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "2px 8px",
                                  borderRadius: "10px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  backgroundColor: "#dcfce7",
                                  color: "#166534",
                                  border: "1px solid #bbf7d0",
                                  marginTop: item.TuNgay ? "4px" : "0",
                                }}
                              >
                                <i
                                  className="fa-solid fa-circle-check"
                                  style={{
                                    marginRight: "4px",
                                    fontSize: "9px",
                                  }}
                                ></i>
                                Đang công tác
                              </span>
                            )}
                          </td>

                          {/* Ghi chú */}
                          <td
                            style={{
                              padding: "12px",
                              color: "#64748b",
                              fontSize: "12px",
                            }}
                          >
                            {item.GhiChu || "-"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Lịch sử Chức danh nghề nghiệp (nếu có dữ liệu) */}
          {chucDanhHistory.length > 0 && (
            <div
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
                padding: "30px",
                border: "1px solid #eef2f6",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "15px",
                  borderBottom: "2px solid #f1f5f9",
                  paddingBottom: "10px",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "16px",
                      fontWeight: "700",
                      color: "#1e293b",
                      textTransform: "uppercase",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <i
                      className="fa-solid fa-graduation-cap"
                      style={{ color: "#003399" }}
                    ></i>
                    Chức danh nghề nghiệp
                  </h3>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "13px",
                      color: "#64748b",
                    }}
                  >
                    Lịch sử bổ nhiệm chức danh nghề nghiệp
                  </p>
                </div>
              </div>

              <div
                style={{
                  overflowX: "auto",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              >
                <table
                  className="custom-table"
                  style={{
                    width: "100%",
                    fontSize: "13px",
                    background: "#fff",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          width: "35%",
                        }}
                      >
                        CHỨC DANH
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          width: "20%",
                        }}
                      >
                        TỪ NGÀY
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          width: "20%",
                        }}
                      >
                        ĐẾN NGÀY / TRẠNG THÁI
                      </th>
                      <th
                        style={{
                          padding: "12px",
                          textAlign: "left",
                          width: "25%",
                        }}
                      >
                        GHI CHÚ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {chucDanhHistory.map((item, idx) => (
                      <tr
                        key={item.IdNvChucDanh || idx}
                        style={{ borderBottom: "1px solid #f1f5f9" }}
                      >
                        <td
                          style={{
                            padding: "12px",
                            fontWeight: "600",
                            color: "#1e293b",
                          }}
                        >
                          {item.TenChucDanh}{" "}
                          {item.MaChucDanh ? `(${item.MaChucDanh})` : ""}
                        </td>
                        <td style={{ padding: "12px", color: "#475569" }}>
                          {formatDate(item.TuNgay) || "-"}
                        </td>
                        <td style={{ padding: "12px" }}>
                          {!item.DenNgay ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                fontSize: "11px",
                                fontWeight: "600",
                                backgroundColor: "#dcfce7",
                                color: "#166534",
                                border: "1px solid #bbf7d0",
                              }}
                            >
                              <i
                                className="fa-solid fa-circle-check"
                                style={{ marginRight: "4px", fontSize: "9px" }}
                              ></i>
                              Hiện hành
                            </span>
                          ) : (
                            formatDate(item.DenNgay)
                          )}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            color: "#64748b",
                            fontSize: "12px",
                          }}
                        >
                          {item.GhiChu || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
