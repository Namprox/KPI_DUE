import React, { useState, useMemo } from "react";
import ChamDiemNhanVienForm from "../../components/DanhGia/DanhGiaNhanVien/ChamDiemNhanVienForm";
import ChotPhieuNhanVienMockModal from "../../components/DanhGia/DanhGiaNhanVien/ChotPhieuNhanVienMockModal";
import "../../css/Pages.css";

const MOCK_CHI_TIET_FULL = [
    { IdTieuChi: 101, TenTieuChi: "Hoàn thành công việc theo đúng kế hoạch, nhiệm vụ được phân công...", DiemToiDa: 70, LoaiNhom: 1, TenNhomCha: "I. Nhóm các tiêu chí liên quan đến nhiệm vụ cơ bản", MoTa: "Đúng kế hoạch: 70 điểm. Trễ hạn: -5đ, Sai sót: -10đ, Không HT: -20đ.", DiemTuDanhGia: 70, NhanXetTuDanhGia: "Hoàn thành toàn bộ công việc được giao." },
    { IdTieuChi: 102, TenTieuChi: "Tuân thủ các quy định về giờ giấc, tác phong làm việc", DiemToiDa: 30, LoaiNhom: 1, TenNhomCha: "I. Nhóm các tiêu chí liên quan đến nhiệm vụ cơ bản", MoTa: "Tuân thủ: 30 điểm. Đi muộn: -1đ, Tự ý nghỉ: -5đ...", DiemTuDanhGia: 30, NhanXetTuDanhGia: "Đi làm đúng giờ." },
    { IdTieuChi: 201, TenTieuChi: "Có sáng kiến, cải tiến công việc được công nhận", DiemToiDa: 20, LoaiNhom: 2, TenNhomCha: "II. Nhóm các tiêu chí liên quan đến thành tích vượt trội", MoTa: "Cấp Bộ: 20đ. Cấp Trường: 10đ. Đơn vị: 5đ.", DiemTuDanhGia: 10, NhanXetTuDanhGia: "Sáng kiến cấp trường." },
    { IdTieuChi: 202, TenTieuChi: "Được khen thưởng đột xuất vì thành tích", DiemToiDa: 10, LoaiNhom: 2, TenNhomCha: "II. Nhóm các tiêu chí liên quan đến thành tích vượt trội", MoTa: "Cấp Bộ: 15đ. Cấp ĐHĐN/TP: 10đ. Cấp Trường: 5đ.", DiemTuDanhGia: 0 },
    { IdTieuChi: 203, TenTieuChi: "Hoàn thành chương trình đào tạo, bồi dưỡng chuyên môn...", DiemToiDa: 10, LoaiNhom: 2, TenNhomCha: "II. Nhóm các tiêu chí liên quan đến thành tích vượt trội", MoTa: "Khóa <1 tuần: 2đ. Khóa >1 tháng: 5đ. Tổ chức workshop: 5đ.", DiemTuDanhGia: 5, NhanXetTuDanhGia: "Khóa bồi dưỡng nghiệp vụ 1 tháng." },
    { IdTieuChi: 204, TenTieuChi: "Tham gia hoặc tổ chức chương trình, phong trào của Trường...", DiemToiDa: 10, LoaiNhom: 2, TenNhomCha: "II. Nhóm các tiêu chí liên quan đến thành tích vượt trội", MoTa: "Thành phần BTC: 5đ. Tham gia: 2đ. Không tham gia khi yêu cầu: -5đ.", DiemTuDanhGia: 2, NhanXetTuDanhGia: "Tham gia hỗ trợ tuyển sinh." },
    { IdTieuChi: 301, TenTieuChi: "Chính trị, tư tưởng (chấp hành chủ trương, đường lối...)", DiemToiDa: 0, LoaiNhom: 3, TenNhomCha: "III. Chấp hành quy định", MoTa: "Vi phạm: bị trừ tối thiểu 10 điểm/lần.", DiemTuDanhGia: 0, NhanXetTuDanhGia: "Không vi phạm." },
];

const ThamDinhNhanVienMockPage = () => {
    const [diemThamDinh, setDiemThamDinh] = useState({});
    const [nhanXetThamDinh, setNhanXetThamDinh] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleDiemChange = (id, val) => {
        setDiemThamDinh(prev => ({ ...prev, [id]: val }));
    };

    const handleNhanXetChange = (id, val) => {
        setNhanXetThamDinh(prev => ({ ...prev, [id]: val }));
    };

    const tongDiemSieuTinh = useMemo(() => {
        return MOCK_CHI_TIET_FULL.reduce((sum, tc) => {
            const diem = diemThamDinh[tc.IdTieuChi] !== undefined ? diemThamDinh[tc.IdTieuChi] : tc.DiemTuDanhGia;
            return sum + (Number(diem) || 0);
        }, 0);
    }, [diemThamDinh]);

    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: "20px", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px", fontWeight: 700 }}>
                        THẨM ĐỊNH KPI NHÂN VIÊN: Nguyễn Văn Test
                    </h2>
                    <span className="breadcrumb">Phòng Đào tạo • Chế độ dùng thử Đầy đủ tiêu chí</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold' }}>TỔNG ĐIỂM THẨM ĐỊNH</div>
                    <div style={{ fontSize: '24px', color: '#1d4ed8', fontWeight: 'bold' }}>{tongDiemSieuTinh.toFixed(2)}</div>
                </div>
            </div>

            <div className="modern-table-card" style={{ padding: '20px', backgroundColor: '#f8fafc', marginBottom: '20px', borderLeft: '4px solid #f59e0b' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#334155' }}>
                    <i className="fa-solid fa-circle-info" style={{ color: '#f59e0b', marginRight: '8px' }}></i>
                    Đây là màn hình <b>Cấp quản lý chấm điểm</b>. Danh sách tiêu chí đã cập nhật đúng 100% Phụ lục 3.
                </p>
            </div>

            <ChamDiemNhanVienForm
                chiTietList={MOCK_CHI_TIET_FULL}
                diemThamDinh={diemThamDinh}
                nhanXetThamDinh={nhanXetThamDinh}
                onDiemChange={handleDiemChange}
                onNhanXetChange={handleNhanXetChange}
            />

            <div style={{ padding: "20px", display: "flex", justifyContent: "flex-end", gap: "10px", backgroundColor: "#fff", marginTop: "20px", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                <button className="btn-cancel"><i className="fa-solid fa-rotate-left"></i> Trả về bổ sung (Mock)</button>
                <button
                    className="btn-submit"
                    style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                    onClick={() => setIsModalOpen(true)}
                >
                    <i className="fa-solid fa-check-double"></i> Chốt điểm (Mock)
                </button>
            </div>

            <ChotPhieuNhanVienMockModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tongDiem={Number(tongDiemSieuTinh.toFixed(2))}
                tenNhanVien="Nguyễn Văn Test"
            />
        </div>
    );
};

export default ThamDinhNhanVienMockPage;