import React, { useState } from "react";

const TieuChiHoanThanhMock = ({ tieuChi }) => {
    const [diem, setDiem] = useState(tieuChi.diemTuCham || "");
    const [nhanXet, setNhanXet] = useState("");

    return (
        <div style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "15px", backgroundColor: "#fff", marginBottom: "15px" }}>
            <div style={{ display: "flex", gap: "20px" }}>
                <div style={{ flex: "1 1 60%" }}>
                    <h4 style={{ margin: "0 0 5px 0", color: "#1e293b" }}>{tieuChi.ten}</h4>
                    <div style={{ fontSize: "13px", color: "#64748b" }}>{tieuChi.moTa}</div>
                </div>
                <div style={{ flex: "1 1 40%", display: "flex", gap: "10px", alignItems: "flex-start", justifyContent: "flex-end" }}>
                    <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b", marginBottom: "4px" }}>ĐIỂM THẨM ĐỊNH</div>
                        <input
                            type="number"
                            placeholder={`Max ${tieuChi.diemToiDa}đ`}
                            style={{ padding: "8px", width: "100px", fontWeight: "bold", textAlign: "center", border: "1px solid #3b82f6", borderRadius: "4px" }}
                            value={diem}
                            onChange={(e) => setDiem(e.target.value)}
                        />
                    </div>
                </div>
            </div>
            <div style={{ marginTop: "12px", borderTop: "1px dashed #e2e8f0", paddingTop: "12px" }}>
                <input
                    type="text"
                    placeholder="Nhập nhận xét hoặc link minh chứng (nếu có)..."
                    style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "13px" }}
                    value={nhanXet}
                    onChange={(e) => setNhanXet(e.target.value)}
                />
            </div>
        </div>
    );
};

export default TieuChiHoanThanhMock;