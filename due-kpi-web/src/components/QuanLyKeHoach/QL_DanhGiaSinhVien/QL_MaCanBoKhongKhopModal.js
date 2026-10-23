import React, { useEffect, useMemo, useState } from "react";
import { Paginator } from "primereact/paginator";
import { fetchMaCanBoKhongKhop } from "../../../utils/diemTbPhanHoiSvApi";

/**
 * Danh sách mã cán bộ trong dữ liệu khảo sát KHÔNG khớp nhân viên nào.
 *
 * Đây là các mã bị bỏ qua khi chốt điểm TB: giảng viên mang mã đó không có điểm
 * TB phản hồi SV của năm, nên tiêu chí chấm tự động theo điểm này bằng 0. Trước
 * đây người chốt chỉ thấy con số `SoMaKhongKhop` mà không biết là mã nào.
 *
 * Route tính trực tiếp trên dữ liệu thô hiện tại nên mở được cả khi năm CHƯA
 * chốt - đó mới là cách dùng chính: kiểm tra, sửa, rồi mới chốt.
 *
 * Backend không phân trang và cũng không có route hỏi quyền riêng:
 *  - Tìm kiếm / phân trang làm hết ở client trên mảng đã tải.
 *  - Nhận 403 thì gọi `onForbidden` để bên gọi ẩn luôn lối vào, không báo đỏ.
 */

const MOI_TRANG = 10;

const QL_MaCanBoKhongKhopModal = ({ isOpen, onClose, idNam, onForbidden }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loi, setLoi] = useState("");
  const [duLieu, setDuLieu] = useState(null);
  const [tuKhoa, setTuKhoa] = useState("");
  const [first, setFirst] = useState(0);

  useEffect(() => {
    if (!isOpen || !idNam) return undefined;

    // Mở lại là tải lại: dữ liệu thô có thể vừa được import hoặc sửa nhân viên.
    let daHuy = false;
    setIsLoading(true);
    setLoi("");
    setDuLieu(null);
    setTuKhoa("");
    setFirst(0);

    fetchMaCanBoKhongKhop(idNam)
      .then((ketQua) => {
        if (daHuy) return;
        setDuLieu(ketQua);
      })
      .catch((err) => {
        if (daHuy) return;
        if (err?.status === 403) {
          // Người dùng không làm gì được với lỗi quyền ở đây - ẩn khối đi.
          if (onForbidden) onForbidden();
          onClose();
          return;
        }
        setLoi(
          err?.status === 404
            ? `Không tìm thấy năm đánh giá ${idNam}.`
            : err?.message || "Không tải được danh sách mã cán bộ không khớp.",
        );
      })
      .finally(() => {
        if (!daHuy) setIsLoading(false);
      });

    return () => {
      daHuy = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, idNam]);

  const danhSachLoc = useMemo(() => {
    const items = duLieu?.items || [];
    const tu = tuKhoa.trim().toLowerCase();
    if (!tu) return items;
    return items.filter(
      (item) =>
        item.maCanBo.toLowerCase().includes(tu) ||
        item.hoTenGv.toLowerCase().includes(tu),
    );
  }, [duLieu, tuKhoa]);

  if (!isOpen) return null;

  const trangHienTai = danhSachLoc.slice(first, first + MOI_TRANG);

  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }}>
      <div
        className="modal-box form-modal-box"
        style={{ width: "95%", maxWidth: "900px" }}
      >
        <div
          className="modal-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, paddingRight: "20px", lineHeight: "1.4" }}>
            <i
              className="fa-solid fa-user-xmark"
              style={{ marginRight: "8px", color: "#dc2626" }}
            ></i>
            Mã cán bộ không khớp nhân viên{idNam ? ` - Năm ${idNam}` : ""}
          </h3>
          <button
            className="close-btn"
            onClick={onClose}
            style={{ fontSize: "26px", lineHeight: "1", flexShrink: 0 }}
          >
            &times;
          </button>
        </div>

        <div
          className="modal-body"
          style={{ padding: "20px 25px", maxHeight: "70vh", overflowY: "auto" }}
        >
          {isLoading && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <i
                className="fa-solid fa-circle-notch fa-spin fa-2x"
                style={{ color: "#2563eb", marginBottom: "12px" }}
              ></i>
              <p style={{ margin: 0, color: "#64748b", fontWeight: "500" }}>
                Đang kiểm tra dữ liệu khảo sát...
              </p>
            </div>
          )}

          {!isLoading && loi && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: "6px",
                fontSize: "14px",
                backgroundColor: "#fef2f2",
                color: "#991b1b",
                border: "1px solid #fecaca",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{loi}</span>
            </div>
          )}

          {!isLoading && !loi && duLieu && duLieu.items.length === 0 && (
            <div
              style={{
                padding: "30px 20px",
                textAlign: "center",
                borderRadius: "6px",
                backgroundColor: "#ecfdf5",
                color: "#065f46",
                border: "1px solid #a7f3d0",
                fontSize: "14px",
              }}
            >
              <i
                className="fa-solid fa-circle-check"
                style={{
                  fontSize: "28px",
                  marginBottom: "10px",
                  display: "block",
                }}
              ></i>
              Tất cả mã cán bộ trong dữ liệu khảo sát năm {duLieu.idNam ?? idNam}{" "}
              đều khớp nhân viên.
            </div>
          )}

          {!isLoading && !loi && duLieu && duLieu.items.length > 0 && (
            <>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "12px",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "14px",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#b45309",
                  }}
                >
                  <i
                    className="fa-solid fa-triangle-exclamation"
                    style={{ marginRight: "8px" }}
                  ></i>
                  {duLieu.soMaKhongKhop} mã · {duLieu.soLuotDanhGia} lượt đánh
                  giá không được tính khi chốt
                </p>
                <div style={{ position: "relative", flex: "0 1 260px" }}>
                  <i
                    className="fa-solid fa-magnifying-glass"
                    style={{
                      position: "absolute",
                      left: "12px",
                      top: "12px",
                      color: "#94a3b8",
                    }}
                  ></i>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: "100%", paddingLeft: "36px" }}
                    placeholder="Tìm theo mã hoặc họ tên..."
                    aria-label="Tìm theo mã hoặc họ tên"
                    value={tuKhoa}
                    onChange={(e) => {
                      setTuKhoa(e.target.value);
                      setFirst(0);
                    }}
                  />
                </div>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="custom-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th
                        style={{
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          width: "130px",
                        }}
                      >
                        MÃ CÁN BỘ
                      </th>
                      <th style={{ whiteSpace: "nowrap" }}>
                        HỌ TÊN (THEO FILE)
                      </th>
                      <th
                        style={{
                          textAlign: "center",
                          whiteSpace: "nowrap",
                          width: "100px",
                        }}
                      >
                        SỐ LƯỢT
                      </th>
                      <th>KHOA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trangHienTai.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            textAlign: "center",
                            padding: "24px",
                            color: "#94a3b8",
                          }}
                        >
                          Không có mã nào khớp từ khoá “{tuKhoa}”.
                        </td>
                      </tr>
                    ) : (
                      trangHienTai.map((item) => (
                        <tr key={item.maCanBo}>
                          <td
                            style={{
                              textAlign: "center",
                              fontWeight: "600",
                              color: "#b91c1c",
                            }}
                          >
                            {item.maCanBo}
                          </td>
                          <td style={{ color: "#0f172a" }}>{item.hoTenGv}</td>
                          <td style={{ textAlign: "center", color: "#334155" }}>
                            {item.soLuot}
                          </td>
                          <td style={{ color: "#475569", fontSize: "13px" }}>
                            {item.danhSachKhoa.map((khoa, index) => (
                              <div key={khoa.idDonVi ?? `chua-gan-${index}`}>
                                {khoa.tenDonVi || "(Chưa gán Khoa)"} (
                                {khoa.soLuot})
                              </div>
                            ))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {danhSachLoc.length > MOI_TRANG && (
                <div style={{ padding: "10px 0" }}>
                  <Paginator
                    first={first}
                    rows={MOI_TRANG}
                    totalRecords={danhSachLoc.length}
                    onPageChange={(e) => setFirst(e.first)}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div
          className="modal-footer"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            padding: "15px 25px",
          }}
        >
          <button type="button" className="btn-cancel" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default QL_MaCanBoKhongKhopModal;
