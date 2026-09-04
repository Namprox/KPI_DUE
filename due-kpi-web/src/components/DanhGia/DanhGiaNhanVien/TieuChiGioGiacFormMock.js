import React, { useState, useMemo } from "react";

const SUB_CRITERIA = [
    { id: "di_muon", label: "Đi làm muộn", rule: "Trừ 1 đ/lần", type: "counter", penalty: 1 },
    { id: "nghi_kp", label: "Tự ý nghỉ làm không phép", rule: "Trừ 5 đ/lần", type: "counter", penalty: 5 },
    { id: "hu_hong", label: "Làm hư hỏng tài sản (không đền bù)", rule: "Trừ tối thiểu 5 đ/lần", type: "custom" },
    { id: "dao_duc", label: "Vi phạm đạo đức/thái độ", rule: "Trừ 5 - 10 đ/lần", type: "custom" }
];

const TieuChiGioGiacFormMock = () => {
    const [viPhams, setViPhams] = useState({
        di_muon: { count: 0, customDeduction: 0 },
        nghi_kp: { count: 0, customDeduction: 0 },
        hu_hong: { count: 0, customDeduction: 0 },
        dao_duc: { count: 0, customDeduction: 0 }
    });

    const diemTruTong = useMemo(() => {
        return SUB_CRITERIA.reduce((total, sc) => {
            const data = viPhams[sc.id];
            if (sc.type === "counter") return total + (data.count * sc.penalty);
            return total + (Number(data.customDeduction) || 0);
        }, 0);
    }, [viPhams]);

    const diemThucTe = Math.max(30 - diemTruTong, 0);

    const handleCounter = (id, delta) => {
        setViPhams(prev => ({
            ...prev,
            [id]: { ...prev[id], count: Math.max(0, prev[id].count + delta) }
        }));
    };

    const handleCustom = (id, value) => {
        setViPhams(prev => ({
            ...prev,
            [id]: { ...prev[id], customDeduction: value }
        }));
    };

    return (
        <div style={{ border: "1px solid #cbd5e1", borderRadius: "8px", padding: "15px", backgroundColor: "#fff", maxWidth: "700px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px", borderBottom: "2px solid #e2e8f0", paddingBottom: "10px" }}>
                <div>
                    <h4 style={{ margin: 0, color: "#1e293b" }}>2. Tuân thủ quy định giờ giấc, tác phong</h4>
                    <span style={{ fontSize: "13px", color: "#64748b" }}>Tuân thủ nghiêm túc, đầy đủ: 30 điểm.</span>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "12px", fontWeight: "bold", color: "#64748b" }}>ĐIỂM ĐẠT ĐƯỢC</div>
                    <div style={{ fontSize: "22px", fontWeight: "bold", color: diemThucTe < 30 ? "#ef4444" : "#10b981" }}>
                        {diemThucTe} / 30
                    </div>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {SUB_CRITERIA.map(sc => (
                    <div key={sc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px", backgroundColor: viPhams[sc.id].count > 0 || viPhams[sc.id].customDeduction > 0 ? "#fef2f2" : "#f8fafc", borderRadius: "6px" }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: "600", fontSize: "14px", color: "#334155" }}>{sc.label}</div>
                            <div style={{ fontSize: "12px", color: "#ef4444" }}>{sc.rule}</div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {sc.type === "counter" ? (
                                <div style={{ display: "flex", alignItems: "center", border: "1px solid #cbd5e1", borderRadius: "4px", overflow: "hidden" }}>
                                    <button onClick={() => handleCounter(sc.id, -1)} style={{ padding: "4px 10px", backgroundColor: "#e2e8f0", border: "none", cursor: "pointer" }}>-</button>
                                    <div style={{ width: "40px", textAlign: "center", fontSize: "14px", fontWeight: "bold" }}>{viPhams[sc.id].count}</div>
                                    <button onClick={() => handleCounter(sc.id, 1)} style={{ padding: "4px 10px", backgroundColor: "#e2e8f0", border: "none", cursor: "pointer" }}>+</button>
                                </div>
                            ) : (
                                <input
                                    type="number"
                                    placeholder="Nhập số điểm trừ"
                                    min="0"
                                    style={{ width: "140px", padding: "6px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                                    value={viPhams[sc.id].customDeduction || ""}
                                    onChange={(e) => handleCustom(sc.id, e.target.value)}
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TieuChiGioGiacFormMock;