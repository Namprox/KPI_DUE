import React, { useState, useMemo } from "react";

const NHOM_THANH_TICH = [
    { id: 1, ten: "1. Có sáng kiến, cải tiến công việc được công nhận" },
    { id: 2, ten: "2. Được khen thưởng đột xuất vì thành tích" },
    { id: 3, ten: "3. Hoàn thành chương trình đào tạo, bồi dưỡng" },
    { id: 4, ten: "4. Tham gia/tổ chức chương trình, phong trào của Trường" }
];

const PHAN_LOAI_THANH_TICH = {
    1: [
        { id: "sk_bo", ten: "Sáng kiến cấp Bộ trở lên", diem: 20 },
        { id: "sk_truong", ten: "Sáng kiến cấp Trường", diem: 10 },
        { id: "sk_donvi", ten: "Cải tiến công việc, tham mưu tại đơn vị", diem: 5 }
    ],
    2: [
        { id: "kt_bo", ten: "Khen thưởng từ cấp Bộ trở lên", diem: 15 },
        { id: "kt_dhdn", ten: "Khen thưởng cấp ĐHĐN, thành phố", diem: 10 },
        { id: "kt_truong", ten: "Khen thưởng cấp Trường", diem: 5 }
    ],
    3: [
        { id: "dt_ngan", ten: "Khóa học nâng cao năng lực < 1 tuần", diem: 2 },
        { id: "dt_tb", ten: "Khóa học nâng cao năng lực > 1 tháng", diem: 5 },
        { id: "dt_dai", ten: "Khóa học nâng cao năng lực > 1 năm", diem: 10 },
        { id: "dt_ws", ten: "Tổ chức workshop chia sẻ kiến thức", diem: 5 }
    ],
    4: [
        { id: "pt_btc", ten: "Thành phần Ban Tổ chức", diem: 5 },
        { id: "pt_tg", ten: "Tham gia các hoạt động (tuyển sinh, KĐCL, thiện nguyện...)", diem: 2 },
        { id: "pt_tt", ten: "Được truyền thông, truyền hình biểu dương", diem: 5 }
    ]
};

const ThemThanhTichNhanVienMockModal = ({ isOpen, onClose }) => {
    const [nhomId, setNhomId] = useState("");
    const [loaiId, setLoaiId] = useState("");
    const [fileName, setFileName] = useState("");

    const loaiOptions = useMemo(() => nhomId ? PHAN_LOAI_THANH_TICH[nhomId] : [], [nhomId]);
    const diemTuDong = useMemo(() => {
        const loai = loaiOptions.find(l => l.id === loaiId);
        return loai ? loai.diem : 0;
    }, [loaiId, loaiOptions]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFileName(e.target.files[0].name);
        } else {
            setFileName("");
        }
    };

    const handleClose = () => {
        setNhomId("");
        setLoaiId("");
        setFileName("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
            <div className="modal-box" style={{ backgroundColor: "#fff", width: "700px", borderRadius: "8px", overflow: "hidden", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
                <div style={{ padding: "15px 20px", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, color: "#1e293b" }}>Ghi nhận Thành tích / Điểm thưởng</h3>
                    <button onClick={handleClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" }}>&times;</button>
                </div>

                <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
                    <div style={{ display: "flex", gap: "15px" }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Nhân viên <span style={{ color: "red" }}>*</span></label>
                            <select className="form-input" style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}>
                                <option>-- Chọn nhân viên --</option>
                                <option>Nguyễn Văn Test - NV001</option>
                                <option>Trần Thị Demo - NV002</option>
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Ngày ra Quyết định <span style={{ color: "red" }}>*</span></label>
                            <input type="date" className="form-input" style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Nhóm thành tích (Phụ lục 3) <span style={{ color: "red" }}>*</span></label>
                        <select className="form-input" style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }} value={nhomId} onChange={(e) => { setNhomId(e.target.value); setLoaiId(""); }}>
                            <option value="">-- Chọn nhóm thành tích --</option>
                            {NHOM_THANH_TICH.map(n => <option key={n.id} value={n.id}>{n.ten}</option>)}
                        </select>
                    </div>

                    <div style={{ display: "flex", gap: "15px" }}>
                        <div style={{ flex: 2 }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Phân loại / Mức khen thưởng <span style={{ color: "red" }}>*</span></label>
                            <select className="form-input" style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }} value={loaiId} onChange={(e) => setLoaiId(e.target.value)} disabled={!nhomId}>
                                <option value="">-- Chọn chi tiết --</option>
                                {loaiOptions.map(l => <option key={l.id} value={l.id}>{l.ten}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "5px", color: "#10b981" }}>Điểm cộng (+)</label>
                            <div style={{ padding: "8px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "4px", textAlign: "center", fontWeight: "bold", color: "#166534" }}>
                                {diemTuDong > 0 ? `+${diemTuDong.toFixed(2)}` : "0.00"}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>Mô tả chi tiết / Tên đề tài, sự kiện</label>
                        <textarea className="form-input" rows="3" style={{ width: "100%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }} placeholder="Nhập mô tả cụ thể..."></textarea>
                    </div>

                    <div>
                        <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "5px", color: "#475569" }}>File Minh chứng (PDF, JPG) <span style={{ color: "red" }}>*</span></label>
                        <label style={{
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                            width: "100%", height: "90px", border: fileName ? "2px dashed #10b981" : "2px dashed #94a3b8",
                            borderRadius: "6px", backgroundColor: fileName ? "#f0fdf4" : "#f8fafc", cursor: "pointer", transition: "all 0.2s"
                        }}>
                            <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: "24px", color: fileName ? "#10b981" : "#3b82f6", marginBottom: "8px" }}></i>
                            <span style={{ fontSize: "13px", color: fileName ? "#15803d" : "#64748b", fontWeight: "500" }}>
                                {fileName ? `Đã chọn: ${fileName}` : "Nhấn vào đây để tải tệp lên (Tối đa 5MB)"}
                            </span>
                            <input type="file" style={{ display: "none" }} onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
                        </label>
                    </div>
                </div>

                <div style={{ padding: "15px 20px", backgroundColor: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <button onClick={handleClose} style={{ padding: "8px 16px", backgroundColor: "#e2e8f0", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", color: "#475569" }}>Hủy bỏ</button>
                    <button style={{ padding: "8px 16px", backgroundColor: "#10b981", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "bold", color: "#fff" }}><i className="fa-solid fa-floppy-disk"></i> Lưu ghi nhận</button>
                </div>
            </div>
        </div>
    );
};

export default ThemThanhTichNhanVienMockModal;