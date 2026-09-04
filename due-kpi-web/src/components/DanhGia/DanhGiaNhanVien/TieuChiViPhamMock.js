import React, { useState, useMemo } from "react";

const TieuChiViPhamMock = ({ tieuChiGoc, danhSachLoi }) => {
    const [viPhams, setViPhams] = useState({});

    const diemTruTong = useMemo(() => {
        return danhSachLoi.reduce((total, loi) => {
            const data = viPhams[loi.id] || { count: 0, custom: 0 };
            if (loi.type === "counter") return total + (data.count * loi.penalty);
            return total + (Number(data.custom) || 0);
        }, 0);
    }, [viPhams, danhSachLoi]);

    const diemThucTe = Math.max(tieuChiGoc.diemToiDa - diemTruTong, 0);

    const handleUpdate = (id, field, value) => {
        setViPhams(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: Math.max(0, value) }
        }));
    };

    return (
        <div style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "15px", backgroundColor: "#fff", marginBottom: "15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px", marginBottom: "15px" }}>
                <div>
                    <h4 style={{ margin: 0, color: "#1e293b" }}>{tieuChiGoc.ten}</h4>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>Quỹ điểm chuẩn: {tieuChiGoc.diemToiDa} điểm.</span>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b" }}>ĐIỂM ĐẠT ĐƯỢC</div>
                    <div style={{ fontSize: "22px", fontWeight: "bold", color: diemThucTe < tieuChiGoc.diemToiDa ? "#ef4444" : "#10b981" }}>
                        {diemThucTe} / {tieuChiGoc.diemToiDa}
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {danhSachLoi.map(loi => {
                    const count = viPhams[loi.id]?.count || 0;
                    const custom = viPhams[loi.id]?.custom || "";

                    return (
                        <div key={loi.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", backgroundColor: (count > 0 || custom > 0) ? "#fef2f2" : "#f8fafc", borderRadius: "6px" }}>
                            <div>
                                <div style={{ fontWeight: "600", fontSize: "14px" }}>{loi.label}</div>
                                <div style={{ fontSize: "12px", color: "#ef4444" }}>{loi.rule}</div>
                            </div>
                            <div>
                                {loi.type === "counter" ? (
                                    <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "4px" }}>
                                        <button onClick={() => handleUpdate(loi.id, 'count', count - 1)} style={{ padding: "4px 10px", border: "none" }}>-</button>
                                        <div style={{ width: "30px", textAlign: "center", fontWeight: "bold" }}>{count}</div>
                                        <button onClick={() => handleUpdate(loi.id, 'count', count + 1)} style={{ padding: "4px 10px", border: "none" }}>+</button>
                                    </div>
                                ) : (
                                    <input type="number" placeholder="Nhập điểm trừ" style={{ padding: "6px", width: "120px" }} value={custom} onChange={(e) => handleUpdate(loi.id, 'custom', e.target.value)} />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TieuChiViPhamMock;