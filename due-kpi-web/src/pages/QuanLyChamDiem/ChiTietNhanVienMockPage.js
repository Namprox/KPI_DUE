import React from "react";
import ChamDiemNhanVienForm from "../../components/DanhGia/DanhGiaNhanVien/ChamDiemNhanVienForm";
import "../../css/Pages.css";

const MOCK_CHI_TIET_DA_CHOT = [
    { IdTieuChi: 101, TenTieuChi: "Hoàn thành công việc theo đúng kế hoạch", DiemToiDa: 70, LoaiNhom: 1, TenNhomCha: "I. Nhiệm vụ cơ bản", DiemTuDanhGia: 70, NhanXetTuDanhGia: "Đã hoàn thành toàn bộ deadline tháng 10." },
    { IdTieuChi: 102, TenTieuChi: "Tuân thủ các quy định về giờ giấc", DiemToiDa: 30, LoaiNhom: 1, TenNhomCha: "I. Nhiệm vụ cơ bản", DiemTuDanhGia: 25, NhanXetTuDanhGia: "Có đi muộn 1 lần vào ngày 15/10." },
    { IdTieuChi: 201, TenTieuChi: "Có sáng kiến, cải tiến", DiemToiDa: 20, LoaiNhom: 2, TenNhomCha: "II. Thành tích vượt trội", DiemTuDanhGia: 10, NhanXetTuDanhGia: "Cải tiến quy trình số hóa tài liệu nội bộ." },
    { IdTieuChi: 301, TenTieuChi: "Chính trị, tư tưởng, pháp luật Nhà nước", DiemToiDa: 0, LoaiNhom: 3, TenNhomCha: "III. Chấp hành quy định", DiemTuDanhGia: 0, NhanXetTuDanhGia: "Chấp hành tốt, không vi phạm." },
];

const MOCK_DIEM_THAM_DINH = { 101: 70, 102: 25, 201: 10, 301: 0 };
const MOCK_NHAN_XET_THAM_DINH = { 101: "Đồng ý với tự đánh giá", 102: "Cần chú ý đi làm đúng giờ hơn", 201: "Ghi nhận sáng kiến", 301: "Tốt" };

const ChiTietNhanVienMockPage = () => {
    return (
        <div className="page-container">
            <div className="page-header" style={{ marginBottom: "20px", display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2 style={{ margin: 0, color: "#1e293b", fontSize: "22px", fontWeight: 700 }}>
                        KẾT QUẢ KPI: Nguyễn Văn Test
                    </h2>
                    <span className="breadcrumb">Phòng Đào tạo • Trạng thái: Đã chốt</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 'bold', marginBottom: '5px' }}>XẾP LOẠI CUỐI CÙNG</div>
                    <div style={{ fontSize: '18px', color: '#16a34a', fontWeight: 'bold', backgroundColor: '#dcfce7', padding: '6px 14px', borderRadius: '20px', border: '1px solid #86efac' }}>
                        <i className="fa-solid fa-award"></i> Hoàn thành xuất sắc nhiệm vụ
                    </div>
                </div>
            </div>

            <div className="modern-table-card" style={{ padding: '15px 20px', backgroundColor: '#ecfdf5', marginBottom: '20px', border: '1px solid #a7f3d0', borderRadius: '8px' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#065f46' }}>
                    <i className="fa-solid fa-circle-check" style={{ marginRight: '8px' }}></i>
                    Phiếu đánh giá này đã được sếp chốt. Dưới đây là kết quả điểm và nhận xét (Chỉ đọc)
                </p>
            </div>

            <div style={{ pointerEvents: 'none', opacity: 0.95 }}>
                <ChamDiemNhanVienForm
                    chiTietList={MOCK_CHI_TIET_DA_CHOT}
                    diemThamDinh={MOCK_DIEM_THAM_DINH}
                    nhanXetThamDinh={MOCK_NHAN_XET_THAM_DINH}
                    onDiemChange={() => { }}
                    onNhanXetChange={() => { }}
                />
            </div>
        </div>
    );
};

export default ChiTietNhanVienMockPage;