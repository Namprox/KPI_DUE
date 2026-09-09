import React, { useState } from "react";
import "../../css/Pages.css";

const MOCK_EMPLOYEES = [
    { id: "NV01", name: "Nguyễn Văn Test", currentRank: "B - Hoàn thành nhiệm vụ" },
    { id: "NV02", name: "Trần Thị Demo", currentRank: "A - Hoàn thành tốt nhiệm vụ" }
];

const MOCK_PROPOSALS = [
    // Giả lập trạng thái chưa có đề xuất nào để demo việc giới hạn 1 chỉ tiêu
];

const DeXuatTangXepLoaiMock = () => {
    const [proposals, setProposals] = useState(MOCK_PROPOSALS);
    const [selectedEmp, setSelectedEmp] = useState("");
    const [proposalType, setProposalType] = useState("");
    const [reason, setReason] = useState("");

    const isEligibleUnit = true;
    const quotaReached = proposals.length >= 1;

    const handleAddProposal = () => {
        if (!selectedEmp || !proposalType || !reason) {
            alert("Vui lòng điền đầy đủ thông tin đề xuất và giải trình!");
            return;
        }
        const emp = MOCK_EMPLOYEES.find(e => e.id === selectedEmp);
        setProposals([...proposals, {
            id: Date.now(),
            empName: emp.name,
            oldRank: emp.currentRank,
            newRank: proposalType === "B_to_A" ? "A - Hoàn thành tốt nhiệm vụ" : "A+ - Hoàn thành xuất sắc nhiệm vụ",
            reason: reason,
            status: "Chờ Hiệu trưởng duyệt"
        }]);
        setSelectedEmp("");
        setProposalType("");
        setReason("");
    };

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: "20px" }}>
                <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px" }}>Đề xuất tăng xếp loại (Mock)</h2>
                <span className="breadcrumb">Quản lý Đánh giá • Dành cho Trưởng đơn vị xuất sắc</span>
            </div>

            <div className="modern-table-card" style={{ padding: '20px', backgroundColor: isEligibleUnit ? '#f0fdf4' : '#fef2f2', marginBottom: '20px', borderLeft: isEligibleUnit ? '4px solid #10b981' : '4px solid #ef4444' }}>
                <h4 style={{ margin: "0 0 10px 0", color: isEligibleUnit ? "#166534" : "#991b1b" }}>
                    <i className="fa-solid fa-circle-check" style={{ marginRight: '8px' }}></i>
                    Trạng thái đơn vị: KHOA LUẬT - HOÀN THÀNH XUẤT SẮC NHIỆM VỤ (A+)
                </h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: '1.6' }}>
                    Theo Điều 5 của Quy định: Trường hợp đơn vị được xếp loại <b>A+</b>, được đề xuất tăng <b>tối đa 01 chỉ tiêu</b> xếp loại từ <b>B lên A</b> hoặc từ <b>A lên A+</b> kèm theo đề xuất giải trình riêng.
                </p>
            </div>

            <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
                <div style={{ flex: 1, backgroundColor: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                    <h4 style={{ margin: "0 0 15px 0", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>Tạo đề xuất mới</h4>

                    {quotaReached ? (
                        <div style={{ padding: "15px", backgroundColor: "#fffbeb", color: "#b45309", borderRadius: "6px", border: "1px solid #fde68a", textAlign: "center", fontWeight: "bold" }}>
                            <i className="fa-solid fa-lock" style={{ marginRight: "8px" }}></i>
                            Đơn vị đã sử dụng hết hạn mức 01 chỉ tiêu đề xuất tăng hạng.
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Chọn Nhân viên <span style={{ color: "red" }}>*</span></label>
                                <select className="form-input" style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }} value={selectedEmp} onChange={e => setSelectedEmp(e.target.value)}>
                                    <option value="">-- Chọn nhân viên đang đạt hạng B hoặc A --</option>
                                    {MOCK_EMPLOYEES.map(emp => <option key={emp.id} value={emp.id}>{emp.name} ({emp.currentRank})</option>)}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Hình thức tăng hạng <span style={{ color: "red" }}>*</span></label>
                                <select className="form-input" style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }} value={proposalType} onChange={e => setProposalType(e.target.value)}>
                                    <option value="">-- Chọn hình thức --</option>
                                    <option value="B_to_A">Từ mức B (Hoàn thành NV) lên mức A (Hoàn thành Tốt NV)</option>
                                    <option value="A_to_A_plus">Từ mức A (Hoàn thành Tốt NV) lên mức A+ (Hoàn thành Xuất sắc NV)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Văn bản giải trình riêng <span style={{ color: "red" }}>*</span></label>
                                <textarea
                                    className="form-input"
                                    rows="4"
                                    style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                                    placeholder="Nhập chi tiết lý do, thành tích nổi bật để trình Hiệu trưởng..."
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                ></textarea>
                            </div>

                            <button
                                style={{ padding: "10px", backgroundColor: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" }}
                                onClick={handleAddProposal}
                            >
                                <i className="fa-solid fa-paper-plane" style={{ marginRight: "5px" }}></i> Gửi đề xuất
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ flex: 2, backgroundColor: "#fff", padding: "20px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
                    <h4 style={{ margin: "0 0 15px 0", color: "#1e293b", borderBottom: "1px solid #e2e8f0", paddingBottom: "10px" }}>Danh sách chỉ tiêu đã đề xuất ({proposals.length}/1)</h4>

                    {proposals.length === 0 ? (
                        <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}>
                            Chưa có đề xuất nào được tạo.
                        </div>
                    ) : (
                        <table className="custom-table" style={{ width: "100%", textAlign: "left" }}>
                            <thead>
                                <tr style={{ color: "#64748b", fontSize: "12px", backgroundColor: "#f8fafc" }}>
                                    <th style={{ padding: "10px" }}>NHÂN VIÊN</th>
                                    <th style={{ padding: "10px" }}>NỘI DUNG ĐỀ XUẤT</th>
                                    <th style={{ padding: "10px" }}>GIẢI TRÌNH</th>
                                    <th style={{ padding: "10px", textAlign: "center" }}>TRẠNG THÁI</th>
                                </tr>
                            </thead>
                            <tbody>
                                {proposals.map(p => (
                                    <tr key={p.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                        <td style={{ padding: "10px", fontWeight: "bold", color: "#1e293b" }}>{p.empName}</td>
                                        <td style={{ padding: "10px", fontSize: "13px" }}>
                                            <div style={{ color: "#64748b", textDecoration: "line-through" }}>{p.oldRank}</div>
                                            <div style={{ color: "#10b981", fontWeight: "bold" }}><i className="fa-solid fa-arrow-turn-up"></i> {p.newRank}</div>
                                        </td>
                                        <td style={{ padding: "10px", fontSize: "13px", color: "#475569", maxWidth: "200px" }}>{p.reason}</td>
                                        <td style={{ padding: "10px", textAlign: "center" }}>
                                            <span style={{ backgroundColor: "#fef3c7", color: "#d97706", padding: "4px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}>
                                                {p.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DeXuatTangXepLoaiMock;