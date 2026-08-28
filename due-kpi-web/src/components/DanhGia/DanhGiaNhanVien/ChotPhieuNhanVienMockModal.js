import React, { useState } from "react";
import SearchSelect from "../../Common/SearchSelect";

const ChotPhieuNhanVienMockModal = ({ isOpen, onClose, tongDiem = 0, tenNhanVien = "" }) => {
    const [xepLoai, setXepLoai] = useState("");
    const [ghiChu, setGhiChu] = useState("");

    if (!isOpen) return null;

    let deXuat = "";
    if (tongDiem < 80) deXuat = "Không hoàn thành nhiệm vụ";
    else if (tongDiem <= 100) deXuat = "Hoàn thành nhiệm vụ";
    else deXuat = "Hoàn thành tốt nhiệm vụ";

    return (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
            <div className="modal-box" style={{ width: "90%", maxWidth: "600px" }}>
                <div className="modal-header">
                    <h3>
                        <i className="fa-solid fa-lock" style={{ marginRight: "8px" }}></i>
                        Chốt Phiếu KPI: {tenNhanVien}
                    </h3>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="modal-body" style={{ padding: "20px" }}>
                    <div style={{ backgroundColor: "#f8fafc", padding: "15px", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "20px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#475569" }}>Tổng điểm tích lũy (Thẩm định):</span>
                            <span style={{ fontSize: "20px", fontWeight: "bold", color: "#1d4ed8" }}>{tongDiem}đ</span>
                        </div>
                        <div style={{ marginTop: "10px", fontSize: "13px", color: "#059669" }}>
                            <i className="fa-solid fa-robot"></i> Hệ thống đề xuất: <b>{deXuat}</b>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: "20px" }}>
                        <label style={{ fontWeight: "bold" }}>Xếp loại chính thức <span style={{ color: "red" }}>*</span></label>
                        <SearchSelect
                            value={xepLoai}
                            onChange={(v) => setXepLoai(v)}
                            options={[
                                { value: 1, label: "Mức 1 - Không hoàn thành nhiệm vụ (< 80đ)" },
                                { value: 2, label: "Mức 2 - Hoàn thành nhiệm vụ (80đ - 100đ)" },
                                { value: 3, label: "Mức 3 - Hoàn thành tốt nhiệm vụ (101đ - 150đ)" },
                                { value: 4, label: "Mức 4 - Hoàn thành xuất sắc nhiệm vụ" },
                            ]}
                            placeholder="-- Chọn mức xếp loại --"
                        />
                    </div>

                    {Number(xepLoai) === 4 && (
                        <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", padding: "12px", borderRadius: "6px", color: "#92400e", fontSize: "13px", marginBottom: "20px" }}>
                            <i className="fa-solid fa-triangle-exclamation"></i> <b>Lưu ý mức Xuất sắc:</b>
                            <br />
                            Theo quy định, mức này chỉ dành cho nhân viên có điểm từ <b>101đ - 150đ</b> và phải nằm trong <b>Top 20%</b> có điểm cao nhất đơn vị. Hệ thống sẽ ghi nhận đề xuất này của bạn, kết quả cuối cùng sẽ được quyết định sau khi chốt toàn bộ Khoa/Phòng.
                        </div>
                    )}

                    <div className="form-group">
                        <label style={{ fontWeight: "bold" }}>Ghi chú / Nhận xét chung</label>
                        <textarea
                            className="form-input"
                            rows="3"
                            placeholder="Nhập nhận xét tổng quan về hiệu quả công việc..."
                            value={ghiChu}
                            onChange={(e) => setGhiChu(e.target.value)}
                            style={{ resize: "vertical" }}
                        />
                    </div>
                </div>

                <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "15px 20px" }}>
                    <button className="btn-cancel" onClick={onClose}>Hủy</button>
                    <button className="btn-submit" style={{ backgroundColor: "#10b981", borderColor: "#10b981" }} onClick={onClose}>
                        <i className="fa-solid fa-check-double"></i> Xác nhận Chốt
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChotPhieuNhanVienMockModal;